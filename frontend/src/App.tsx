import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext.tsx';
import Home from './pages/Home.tsx';
import PhotoUpload from './pages/PhotoUpload.tsx';

function App() {
  console.log('App component loading...');
  console.log('Environment variables:', {
    supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
    hasAnonKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY
  });
  
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<PhotoUpload />} />
          </Routes>
        </main>
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}

export default App; 