import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, LogIn, LogOut, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { button } from './ui/buttonStyles.ts';

const NavBar: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Camera className="h-7 w-7 text-indigo-600" />
            <span className="text-lg font-bold text-slate-900">MercuryMap</span>
          </Link>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              to="/app"
              className="hidden sm:inline-block px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Explore Map
            </Link>
            <Link to="/upload" className={button('secondary', 'sm')}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload Photo</span>
            </Link>
            {user ? (
              <>
                <span className="hidden md:inline text-sm text-slate-500 max-w-[160px] truncate">
                  {user.email}
                </span>
                <button onClick={signOut} className={button('ghost', 'sm')}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <Link to="/login" className={button('primary', 'sm')}>
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
