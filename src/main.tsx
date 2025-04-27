
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// Create storage bucket for bill images
import { supabase } from './lib/supabase'

// Initialize the app
const initApp = async () => {
  try {
    // Check if storage bucket exists, create if not
    const { data: buckets } = await supabase.storage.listBuckets()
    
    if (!buckets?.find(bucket => bucket.name === 'bill-images')) {
      await supabase.storage.createBucket('bill-images', {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      })
    }
  } catch (error) {
    console.error('Error initializing app:', error)
  }

  // Render the app
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Toaster position="top-center" />
      <App />
    </React.StrictMode>,
  )
}

initApp()