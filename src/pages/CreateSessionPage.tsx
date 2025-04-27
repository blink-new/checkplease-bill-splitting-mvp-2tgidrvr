
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { createWorker } from 'tesseract.js';
import { useDropzone } from 'react-dropzone';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Camera, Edit, Loader2, Plus, Receipt, Trash, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CreateSessionPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [billImage, setBillImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setBillImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        processImage(file);
      }
    },
    disabled: isProcessing
  });

  const processImage = async (file: File) => {
    setIsProcessing(true);
    try {
      const worker = await createWorker('eng');
      
      const { data } = await worker.recognize(file);
      console.log('OCR Result:', data.text);
      
      // Simple parsing logic - this would need to be improved for production
      const lines = data.text.split('\n').filter(line => line.trim());
      const extractedItems: BillItem[] = [];
      
      for (const line of lines) {
        // Look for patterns like "Item name $12.99" or "2x Item name $12.99"
        const priceMatch = line.match(/\$?(\d+\.\d{2})/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          let name = line.substring(0, priceMatch.index).trim();
          let quantity = 1;
          
          // Check for quantity pattern like "2x" or "2 x"
          const quantityMatch = name.match(/^(\d+)\s*x\s*/i);
          if (quantityMatch) {
            quantity = parseInt(quantityMatch[1]);
            name = name.substring(quantityMatch[0].length).trim();
          }
          
          if (name && price > 0) {
            extractedItems.push({
              id: uuidv4(),
              name,
              price,
              quantity
            });
          }
        }
      }
      
      await worker.terminate();
      
      if (extractedItems.length > 0) {
        setItems(extractedItems);
        setActiveTab('review');
        toast.success(`Found ${extractedItems.length} items on the bill`);
      } else {
        toast.error('Could not detect items. Please add them manually.');
        setActiveTab('manual');
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error('Error processing image. Please try again or add items manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: uuidv4(), name: '', price: 0, quantity: 1 }
    ]);
  };

  const updateItem = (id: string, field: keyof BillItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const createSession = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item to the bill');
      return;
    }

    // Validate items
    const invalidItems = items.filter(item => !item.name || item.price <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please fill in all item details (name and price)');
      return;
    }

    setIsCreatingSession(true);

    try {
      // Create a new bill
      const billId = uuidv4();
      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const { error: billError } = await supabase
        .from('bills')
        .insert({
          bill_id: billId,
          total_amount: totalAmount,
          tip_percentage: 15
        });

      if (billError) throw billError;

      // Upload image if available
      if (billImage) {
        const { error: uploadError } = await supabase.storage
          .from('bill-images')
          .upload(`${billId}.jpg`, billImage, {
            contentType: billImage.type,
            upsert: true
          });
          
        if (uploadError) {
          console.error('Image upload error:', uploadError);
          // Continue even if image upload fails
        }
      }

      // Add items to the database
      const { error: itemsError } = await supabase
        .from('items')
        .insert(
          items.map(item => ({
            bill_id: billId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        );

      if (itemsError) throw itemsError;

      // Navigate to the session page
      navigate(`/session/${billId}`);
      
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create a New Session</h1>
          <p className="text-gray-600 dark:text-gray-400">Upload your bill or add items manually</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
            <CardDescription>
              We'll extract items from your bill or you can add them manually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload">Upload Bill</TabsTrigger>
                <TabsTrigger value="review" disabled={items.length === 0}>Review Items</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="py-4">
                <div 
                  {...getRootProps()} 
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <input {...getInputProps()} />
                  {isProcessing ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Processing your bill...</p>
                    </div>
                  ) : previewUrl ? (
                    <div className="flex flex-col items-center">
                      <img 
                        src={previewUrl} 
                        alt="Bill preview" 
                        className="max-h-64 mb-4 rounded-md shadow-md" 
                      />
                      <p className="text-gray-600 dark:text-gray-400">
                        {items.length > 0 
                          ? `Found ${items.length} items. Click "Review Items" to continue.` 
                          : 'Processing complete. Please review or add items manually.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-10 w-10 text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        Drag & drop your bill image here, or click to select
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Supports JPG, PNG (max 10MB)
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-center">
                  <Button 
                    variant="outline" 
                    className="flex items-center"
                    onClick={() => setActiveTab('manual')}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Add Items Manually
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="review" className="py-4">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                    <div className="w-1/2">Item</div>
                    <div className="w-1/6 text-center">Qty</div>
                    <div className="w-1/4 text-right">Price</div>
                    <div className="w-1/12"></div>
                  </div>
                  
                  <Separator />
                  
                  {items.map(item => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <div className="w-1/2">
                        <Input
                          value={item.name}
                          onChange={e => updateItem(item.id, 'name', e.target.value)}
                          placeholder="Item name"
                        />
                      </div>
                      <div className="w-1/6">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="text-center"
                        />
                      </div>
                      <div className="w-1/4">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="text-right"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="w-1/12 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={addItem}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="manual" className="py-4">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                    <div className="w-1/2">Item</div>
                    <div className="w-1/6 text-center">Qty</div>
                    <div className="w-1/4 text-right">Price</div>
                    <div className="w-1/12"></div>
                  </div>
                  
                  <Separator />
                  
                  {items.map(item => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <div className="w-1/2">
                        <Input
                          value={item.name}
                          onChange={e => updateItem(item.id, 'name', e.target.value)}
                          placeholder="Item name"
                        />
                      </div>
                      <div className="w-1/6">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="text-center"
                        />
                      </div>
                      <div className="w-1/4">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="text-right"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="w-1/12 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {items.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No items added yet</p>
                      <p className="text-sm">Click the button below to add your first item</p>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={addItem}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link to="/">Cancel</Link>
            </Button>
            <Button 
              onClick={createSession} 
              disabled={items.length === 0 || isCreatingSession}
            >
              {isCreatingSession && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Session
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}