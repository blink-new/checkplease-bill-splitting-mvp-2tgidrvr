
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowRight, Receipt, Users, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">CheckPlease</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">Effortless Restaurant Bill Splitting</p>
        </header>

        <div className="max-w-3xl mx-auto">
          <Card className="mb-8 shadow-lg border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-2xl">Split restaurant bills in seconds</CardTitle>
              <CardDescription>No downloads, no accounts, no hassle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                CheckPlease makes splitting restaurant bills with friends quick and painless. 
                Upload a photo of your bill, share a QR code, and let everyone claim their items.
              </p>
              
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                  <Receipt className="h-10 w-10 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-medium">Scan Your Bill</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Upload a photo and we'll extract all items</p>
                </div>
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                  <Users className="h-10 w-10 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-medium">Share with Friends</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Everyone joins via QR code - no app needed</p>
                </div>
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                  <Zap className="h-10 w-10 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-medium">Split Instantly</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Claim items and see who owes what in real-time</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link to="/create">
                  Create a New Session <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8">
            <p>CheckPlease - No sign-up required, no data stored beyond 24 hours</p>
          </div>
        </div>
      </div>
    </div>
  );
}