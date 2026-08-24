import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, LogIn, LogOut, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { button, focusRing } from './ui/buttonStyles.ts';

const NavBar: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Every page renders the same nav before its <main>, so one skip link
          here covers the whole app. Hidden until it takes focus. */}
      <a
        href="#main-content"
        className={`sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white ${focusRing}`}
      >
        Skip to Main Content
      </a>
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className={`flex items-center space-x-2 rounded-lg hover:opacity-80 transition-opacity ${focusRing}`}
            >
              <Camera className="h-7 w-7 text-indigo-600" aria-hidden="true" />
              <span className="text-lg font-bold text-slate-900" translate="no">
                MercuryMap
              </span>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                to="/app"
                className={`hidden sm:inline-block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ${focusRing}`}
              >
                Explore Map
              </Link>
              <Link to="/upload" className={button('secondary', 'sm')}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Upload Photo</span>
                <span className="sr-only sm:hidden">Upload Photo</span>
              </Link>
              {user ? (
                <>
                  <span className="hidden md:inline text-sm text-slate-500 max-w-[160px] truncate">
                    {user.email}
                  </span>
                  <button onClick={signOut} className={button('ghost', 'sm')}>
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sr-only sm:hidden">Sign Out</span>
                  </button>
                </>
              ) : (
                <Link to="/login" className={button('primary', 'sm')}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Sign In</span>
                  <span className="sr-only sm:hidden">Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default NavBar;
