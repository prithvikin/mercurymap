import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './contexts/AuthContext.tsx';
import Landing from './pages/Landing.tsx';
import Home from './pages/Home.tsx';
import PhotoUpload from './pages/PhotoUpload.tsx';
import Login from './pages/Login.tsx';
import NotFound from './pages/NotFound.tsx';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<Home />} />
        <Route path="/public" element={<Home showPublicMap={true} />} />
        <Route path="/upload" element={<PhotoUpload />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-right" />
      <Analytics />
    </AuthProvider>
  );
}

export default App; 