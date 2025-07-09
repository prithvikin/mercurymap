import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import Landing from './pages/Landing.tsx';
import Home from './pages/Home.tsx';
import PhotoUpload from './pages/PhotoUpload.tsx';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Home />} />
        <Route path="/upload" element={<PhotoUpload />} />
      </Routes>
      <Toaster position="top-right" />
      <Analytics />
    </>
  );
}

export default App; 