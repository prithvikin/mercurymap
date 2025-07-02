import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext.tsx';
import Home from './pages/Home.tsx';
import PhotoUpload from './pages/PhotoUpload.tsx';

function App() {
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