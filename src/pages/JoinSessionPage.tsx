
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HexColorPicker } from 'react-colorful';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function JoinSessionPage() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6'); // Default blue
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [billExists, setBillExists] = useState(false);

  useEffect(() => {
    const checkBillExists = async () => {
      if (!billId) return;

      try {
        const { data, error } = await supabase
          .from('bills')
          .select('bill_id')
          .eq('bill_id', billId)
          .single();

        if (error) throw error;
        setBillExists(!!data);
      } catch (error) {
        console.error('Error checking bill:', error);
        toast.error('This session does not exist or has expired');
      } finally {
        setIsLoading(false);
      }
    };

    checkBillExists();
  }, [billId]);

  const handleJoin = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!billId) {
      toast.error('Invalid session');
      return;
    }

    setIsJoining(true);

    try {
      const guestId = uuidv4();
      
      const { error } = await supabase
        .from('guests')
        .insert({
          guest_id: guestId,
          bill_id: billId,
          name: name.trim(),
          color
        });

      if (error) throw error;

      // Store guest info in localStorage
      localStorage.setItem(`checkplease-guest-${billId}`, JSON.stringify({
        guestId,
        name: name.trim(),
        color
      }));

      navigate(`/session/${billId}`);
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session. Please try again.');
    } finally {
      setIsJoining(false);
    }
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

  if (!billExists) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">Join Bill Splitting Session</CardTitle>
          <CardDescription className="text-center">
            Enter your name and choose a color to identify yourself
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Choose Your Color</Label>
            <div className="flex justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-full border-4 border-white shadow-md flex items-center justify-center"
                style={{ backgroundColor: color }}
              >
                <UserRound className="h-8 w-8 text-white" />
              </div>
            </div>
            <HexColorPicker color={color} onChange={setColor} className="w-full" />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join Session
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}