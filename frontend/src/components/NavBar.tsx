import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, LogIn, LogOut, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { button, focusRing } from './ui/buttonStyles.ts';

const segment =
  `rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${focusRing}`;
const segmentActive = 'bg-white text-sand-900 shadow-card';
const segmentInactive = 'text-sand-600 hover:text-sand-900';

const NavBar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();

  return (
    <>
      {/* Every page renders the same nav before its <main>, so one skip link
          here covers the whole app. Hidden until it takes focus. */}
      <a
        href="#main-content"
        className={`sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-clay-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white ${focusRing}`}
      >
        Skip to Main Content
      </a>
      <nav className="bg-white/80 backdrop-blur-md border-b border-sand-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className={`flex items-center space-x-2 rounded-lg hover:opacity-80 transition-opacity ${focusRing}`}
            >
              <Camera className="h-7 w-7 text-clay-600" aria-hidden="true" />
              <span className="font-display text-lg font-bold text-sand-900" translate="no">
                MercuryMap
              </span>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user ? (
                // Signed in: a two-way switch, not one link that used to point
                // somewhere different depending on auth state. Both maps are a
                // single click away and the current one is always visible.
                <div
                  role="group"
                  aria-label="Choose which map to view"
                  className="flex items-center gap-0.5 rounded-lg bg-sand-100 p-0.5"
                >
                  <Link
                    to="/public"
                    aria-current={pathname === '/public' ? 'page' : undefined}
                    className={`${segment} ${pathname === '/public' ? segmentActive : segmentInactive}`}
                  >
                    Public
                  </Link>
                  <Link
                    to="/app"
                    aria-current={pathname === '/app' ? 'page' : undefined}
                    className={`${segment} ${pathname === '/app' ? segmentActive : segmentInactive}`}
                  >
                    <span className="sm:hidden">Mine</span>
                    <span className="hidden sm:inline">My Map</span>
                  </Link>
                </div>
              ) : (
                // Signed out: there is no private map to switch to, so this is
                // always the public map, not the /app route (which happens to
                // render public content today only because there's no user).
                <Link
                  to="/public"
                  className={`rounded-lg px-3 py-2 text-sm font-medium text-sand-600 hover:text-sand-900 hover:bg-sand-100 transition-colors ${focusRing}`}
                >
                  Explore Map
                </Link>
              )}
              <Link to="/upload" className={button('secondary', 'sm')}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Upload Photo</span>
                <span className="sr-only sm:hidden">Upload Photo</span>
              </Link>
              {user ? (
                <>
                  <span className="hidden md:inline text-sm text-sand-500 max-w-[160px] truncate">
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
