
import { useState, useEffect } from 'react';
import { useParams,
  useNavigate,
  Link
} from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  MinusCircle,
  PlusCircle,
  QrCode,
  Receipt,
  Share2,
  User,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface Bill {
  bill_id: string;
  created_at: string;
  total_amount: number | null;
  tip_percentage: number;
}

interface Item {
  item_id: string;
  bill_id: string;
  name: string;
  price: number;
  quantity: number;
  unclaimed_quantity: number;
}

interface Guest {
  guest_id: string;
  bill_id: string;
  name: string;
  color: string;
  joined_at: string;
}

interface Claim {
  claim_id: string;
  item_id: string;
  guest_id: string;
  quantity_claimed: number;
}

interface GuestWithTotal extends Guest {
  subtotal: number;
  tipAmount: number;
  total: number;
}

export default function SessionPage() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tipPercentage, setTipPercentage] = useState(15);
  const [sessionUrl, setSessionUrl] = useState('');
  const [activeTab, setActiveTab] = useState('items');

  useEffect(() => {
    // Set the session URL for QR code and sharing
    const url = window.location.origin + `/join/${billId}`;
    setSessionUrl(url);

    // Check if user has already joined this session
    const storedGuestData = localStorage.getItem(`checkplease-guest-${billId}`);
    
    if (storedGuestData) {
      try {
        const guestData = JSON.parse(storedGuestData);
        setCurrentGuest({
          guest_id: guestData.guestId,
          bill_id: billId || '',
          name: guestData.name,
          color: guestData.color,
          joined_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error parsing stored guest data:', error);
      }
    }

    // Fetch initial data
    fetchSessionData();

    // Set up real-time subscriptions
    const billSubscription = supabase
      .channel('bill-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bills',
        filter: `bill_id=eq.${billId}`
      }, (payload) => {
        setBill(payload.new as Bill);
      })
      .subscribe();

    const itemsSubscription = supabase
      .channel('items-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `bill_id=eq.${billId}`
      }, () => {
        fetchItems();
      })
      .subscribe();

    const guestsSubscription = supabase
      .channel('guests-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guests',
        filter: `bill_id=eq.${billId}`
      }, () => {
        fetchGuests();
      })
      .subscribe();

    const claimsSubscription = supabase
      .channel('claims-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'claims'
      }, () => {
        fetchClaims();
      })
      .subscribe();

    return () => {
      billSubscription.unsubscribe();
      itemsSubscription.unsubscribe();
      guestsSubscription.unsubscribe();
      claimsSubscription.unsubscribe();
    };
  }, [billId]);

  const fetchSessionData = async () => {
    if (!billId) return;

    setIsLoading(true);
    try {
      await Promise.all([
        fetchBill(),
        fetchItems(),
        fetchGuests(),
        fetchClaims()
      ]);
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error('Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBill = async () => {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('bill_id', billId)
      .single();

    if (error) throw error;
    setBill(data);
    setTipPercentage(data.tip_percentage);
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('bill_id', billId)
      .order('created_at');

    if (error) throw error;
    setItems(data);
  };

  const fetchGuests = async () => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('bill_id', billId)
      .order('joined_at');

    if (error) throw error;
    setGuests(data);
  };

  const fetchClaims = async () => {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('created_at');

    if (error) throw error;
    setClaims(data);
  };

  const updateTipPercentage = async (percentage: number) => {
    if (!billId) return;

    try {
      const { error } = await supabase
        .from('bills')
        .update({ tip_percentage: percentage })
        .eq('bill_id', billId);

      if (error) throw error;
      setTipPercentage(percentage);
    } catch (error) {
      console.error('Error updating tip percentage:', error);
      toast.error('Failed to update tip percentage');
    }
  };

  const handleClaimItem = async (itemId: string, quantity: number = 1) => {
    if (!currentGuest || !billId) {
      toast.error('You need to join the session first');
      navigate(`/join/${billId}`);
      return;
    }

    const item = items.find(i => i.item_id === itemId);
    if (!item) return;

    // Check if user already has a claim for this item
    const existingClaim = claims.find(
      c => c.item_id === itemId && c.guest_id === currentGuest.guest_id
    );

    try {
      if (existingClaim) {
        // Update existing claim
        const newQuantity = existingClaim.quantity_claimed + quantity;
        
        if (newQuantity <= 0) {
          // Delete claim if quantity would be zero or negative
          const { error } = await supabase
            .from('claims')
            .delete()
            .eq('claim_id', existingClaim.claim_id);
            
          if (error) throw error;
        } else if (newQuantity <= item.quantity) {
          // Update claim with new quantity
          const { error } = await supabase
            .from('claims')
            .update({ quantity_claimed: newQuantity })
            .eq('claim_id', existingClaim.claim_id);
            
          if (error) throw error;
        } else {
          toast.error(`Cannot claim more than ${item.quantity} of this item`);
        }
      } else if (quantity > 0 && item.unclaimed_quantity >= quantity) {
        // Create new claim
        const { error } = await supabase
          .from('claims')
          .insert({
            claim_id: uuidv4(),
            item_id: itemId,
            guest_id: currentGuest.guest_id,
            quantity_claimed: quantity
          });
          
        if (error) throw error;
      } else {
        toast.error(`Cannot claim more than ${item.unclaimed_quantity} of this item`);
      }
    } catch (error) {
      console.error('Error claiming item:', error);
      toast.error('Failed to claim item');
    }
  };

  const copySessionLink = () => {
    navigator.clipboard.writeText(sessionUrl)
      .then(() => toast.success('Link copied to clipboard'))
      .catch(() => toast.error('Failed to copy link'));
  };

  const shareSessionLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my CheckPlease session',
        text: 'Scan this QR code or click the link to join our bill splitting session',
        url: sessionUrl
      })
      .catch((error) => console.error('Error sharing:', error));
    } else {
      copySessionLink();
    }
  };

  // Calculate totals for each guest
  const calculateGuestTotals = (): GuestWithTotal[] => {
    return guests.map(guest => {
      // Get all claims for this guest
      const guestClaims = claims.filter(claim => claim.guest_id === guest.guest_id);
      
      // Calculate subtotal
      let subtotal = 0;
      for (const claim of guestClaims) {
        const item = items.find(i => i.item_id === claim.item_id);
        if (item) {
          subtotal += (item.price * claim.quantity_claimed);
        }
      }
      
      // Calculate tip amount based on percentage of total
      const billTotal = bill?.total_amount || 
        items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const tipAmount = billTotal > 0 
        ? (subtotal / billTotal) * (billTotal * tipPercentage / 100)
        : 0;
      
      return {
        ...guest,
        subtotal,
        tipAmount,
        total: subtotal + tipAmount
      };
    });
  };

  // Get claims for a specific item
  const getItemClaims = (itemId: string) => {
    return claims.filter(claim => claim.item_id === itemId);
  };

  // Get current guest's claim for an item
  const getCurrentGuestClaim = (itemId: string) => {
    if (!currentGuest) return null;
    
    return claims.find(
      claim => claim.item_id === itemId && claim.guest_id === currentGuest.guest_id
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl text-center text-red-500">Session Not Found</CardTitle>
            <CardDescription className="text-center">
              This session does not exist or has expired
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Calculate bill totals
  const billSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tipAmount = billSubtotal * (tipPercentage / 100);
  const billTotal = billSubtotal + tipAmount;
  
  // Calculate unclaimed total
  const unclaimedTotal = items.reduce((sum, item) => {
    return sum + (item.price * item.unclaimed_quantity);
  }, 0);

  const guestTotals = calculateGuestTotals();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-3xl p-4">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" asChild className="p-0">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Home
            </Link>
          </Button>
          
          {!currentGuest && (
            <Button asChild>
              <Link to={`/join/${billId}`}>
                <User className="mr-2 h-4 w-4" /> Join Session
              </Link>
            </Button>
          )}
          
          {currentGuest && (
            <div className="flex items-center">
              <div 
                className="w-6 h-6 rounded-full mr-2"
                style={{ backgroundColor: currentGuest.color }}
              ></div>
              <span className="text-sm font-medium">{currentGuest.name}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bill Splitting Session</h1>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <QrCode className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Others to Join</DialogTitle>
                <DialogDescription>
                  Share this QR code or link with others to join this bill splitting session
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-4">
                <div className="bg-white p-4 rounded-lg mb-4">
                  <QRCodeSVG value={sessionUrl} size={200} />
                </div>
                <div className="flex w-full max-w-sm items-center space-x-2">
                  <Input value={sessionUrl} readOnly />
                  <Button size="icon" onClick={copySessionLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  className="mt-4" 
                  onClick={shareSessionLink}
                  variant="outline"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="items">
              <Receipt className="mr-2 h-4 w-4" />
              Items
            </TabsTrigger>
            <TabsTrigger value="people">
              <Users className="mr-2 h-4 w-4" />
              People ({guests.length})
            </TabsTrigger>
            <TabsTrigger value="summary">
              <Check className="mr-2 h-4 w-4" />
              Summary
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="items" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Bill Items</CardTitle>
                <CardDescription>
                  Tap on items to claim them for yourself
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No items found</p>
                    </div>
                  ) : (
                    items.map(item => {
                      const itemClaims = getItemClaims(item.item_id);
                      const currentUserClaim = getCurrentGuestClaim(item.item_id);
                      const claimedQuantity = item.quantity - item.unclaimed_quantity;
                      
                      return (
                        <div 
                          key={item.item_id} 
                          className={`border rounded-lg p-4 ${
                            item.unclaimed_quantity === 0 
                              ? 'bg-gray-50 dark:bg-gray-800' 
                              : 'bg-white dark:bg-gray-900'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-medium">{item.name}</h3>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                ${item.price.toFixed(2)} {item.quantity > 1 && `× ${item.quantity}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                ${(item.price * item.quantity).toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {item.unclaimed_quantity} of {item.quantity} left
                              </div>
                            </div>
                          </div>
                          
                          {/* Claims display */}
                          {itemClaims.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {itemClaims.map(claim => {
                                const claimGuest = guests.find(g => g.guest_id === claim.guest_id);
                                if (!claimGuest) return null;
                                
                                return (
                                  <div 
                                    key={claim.claim_id} 
                                    className="flex items-center text-sm"
                                  >
                                    <div 
                                      className="w-3 h-3 rounded-full mr-2"
                                      style={{ backgroundColor: claimGuest.color }}
                                    ></div>
                                    <span>
                                      {claimGuest.name} 
                                      {item.quantity > 1 && ` (${claim.quantity_claimed})`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Claim controls */}
                          {currentGuest && item.unclaimed_quantity > 0 && (
                            <div className="mt-3 flex justify-end space-x-2">
                              {currentUserClaim && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleClaimItem(item.item_id, -1)}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button 
                                variant={currentUserClaim ? "outline" : "default"}
                                size="sm"
                                onClick={() => handleClaimItem(item.item_id, 1)}
                              >
                                {currentUserClaim ? (
                                  <PlusCircle className="h-4 w-4" />
                                ) : (
                                  <>Claim</>
                                )}
                              </Button>
                            </div>
                          )}
                          
                          {/* Fully claimed message */}
                          {item.unclaimed_quantity === 0 && !currentUserClaim && (
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              This item has been fully claimed
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="people" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>People in this Session</CardTitle>
                <CardDescription>
                  {guests.length} {guests.length === 1 ? 'person' : 'people'} have joined
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {guests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No one has joined yet</p>
                      <p className="text-sm">Share the QR code to invite others</p>
                    </div>
                  ) : (
                    guests.map(guest => {
                      const guestWithTotal = guestTotals.find(g => g.guest_id === guest.guest_id);
                      const guestClaims = claims.filter(claim => claim.guest_id === guest.guest_id);
                      const claimedItems = guestClaims.map(claim => {
                        const item = items.find(i => i.item_id === claim.item_id);
                        return {
                          ...claim,
                          item
                        };
                      });
                      
                      return (
                        <div 
                          key={guest.guest_id} 
                          className="border rounded-lg p-4"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center">
                              <div 
                                className="w-6 h-6 rounded-full mr-2"
                                style={{ backgroundColor: guest.color }}
                              ></div>
                              <span className="font-medium">{guest.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                ${guestWithTotal?.total.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {claimedItems.length} {claimedItems.length === 1 ? 'item' : 'items'}
                              </div>
                            </div>
                          </div>
                          
                          {claimedItems.length > 0 && (
                            <div className="mt-2 space-y-1 text-sm">
                              {claimedItems.map(claim => {
                                if (!claim.item) return null;
                                
                                return (
                                  <div 
                                    key={claim.claim_id} 
                                    className="flex justify-between"
                                  >
                                    <span>
                                      {claim.item.name}
                                      {claim.quantity_claimed > 1 && ` (${claim.quantity_claimed})`}
                                    </span>
                                    <span>
                                      ${(claim.item.price * claim.quantity_claimed).toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="summary" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Bill Summary</CardTitle>
                <CardDescription>
                  Review what everyone owes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Tip selector */}
                  <div className="space-y-2">
                    <Label>Tip Percentage</Label>
                    <div className="flex space-x-2">
                      {[15, 18, 20, 25].map(percent => (
                        <Button
                          key={percent}
                          variant={tipPercentage === percent ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateTipPercentage(percent)}
                          className="flex-1"
                        >
                          {percent}%
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Bill totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span>${billSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tip ({tipPercentage}%)</span>
                      <span>${tipAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>${billTotal.toFixed(2)}</span>
                    </div>
                    
                    {unclaimedTotal > 0 && (
                      <div className="flex justify-between text-sm text-red-500 mt-2">
                        <span>Unclaimed items</span>
                        <span>${unclaimedTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Individual totals */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Individual Totals</h3>
                    
                    {guestTotals.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p>No one has claimed any items yet</p>
                      </div>
                    ) : (
                      guestTotals.map(guest => (
                        <div 
                          key={guest.guest_id} 
                          className="flex justify-between items-center p-3 border rounded-lg"
                        >
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2"
                              style={{ backgroundColor: guest.color }}
                            ></div>
                            <span>{guest.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${guest.total.toFixed(2)}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ${guest.subtotal.toFixed(2)} + ${guest.tipAmount.toFixed(2)} tip
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Unclaimed items */}
                  {unclaimedTotal > 0 && (
                    <div className="space-y-3 mt-4">
                      <h3 className="font-medium text-red-500">Unclaimed Items</h3>
                      
                      {items
                        .filter(item => item.unclaimed_quantity > 0)
                        .map(item => (
                          <div 
                            key={item.item_id} 
                            className="flex justify-between p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-900"
                          >
                            <div>
                              <span>{item.name}</span>
                              {item.unclaimed_quantity < item.quantity && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {' '}({item.unclaimed_quantity} of {item.quantity})
                                </span>
                              )}
                            </div>
                            <div>
                              ${(item.price * item.unclaimed_quantity).toFixed(2)}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}