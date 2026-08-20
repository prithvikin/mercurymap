import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, MapPin, Globe, Upload, ArrowRight, Users, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import CommunityRecommendationsPanel from '../components/CommunityRecommendationsPanel.tsx';
import NavBar from '../components/NavBar.tsx';
import Card from '../components/ui/Card.tsx';
import { button } from '../components/ui/buttonStyles.ts';

const Landing: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-50/60 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-100 p-3 rounded-2xl">
              <Camera className="h-10 w-10 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
            Your Travel Memories,<span className="text-indigo-600"> Mapped</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
            MercuryMap displays your travel photos on a map, allowing them to tell
            better stories. Showcase your travel highlights and share photos and
            destinations with fellow travelers.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
            <Card className="p-6 flex flex-col items-start">
              <div className="bg-indigo-50 p-2.5 rounded-xl mb-4">
                <Globe className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Explore the Public Map
              </h2>
              <p className="text-slate-600 text-sm mb-5">
                Check out the public MercuryMap with photos shared by the
                creator — no account needed!
              </p>
              <Link to="/public" className={button('primary', 'md')}>
                <span>Explore Public Map</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card className="p-6 flex flex-col items-start">
              <div className="bg-emerald-50 p-2.5 rounded-xl mb-4">
                <Upload className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Upload to Your Personal Map
              </h2>
              <p className="text-slate-600 text-sm mb-5">
                Sign in to create your own private travel map. Upload your
                photos and see your journeys visualized.
              </p>
              {user ? (
                <Link to="/upload" className={button('primary', 'md', 'bg-emerald-600 hover:bg-emerald-700')}>
                  <span>Upload to My Map</span>
                  <Upload className="h-4 w-4" />
                </Link>
              ) : (
                <Link to="/login" className={button('primary', 'md', 'bg-emerald-600 hover:bg-emerald-700')}>
                  <span>Sign In to Upload</span>
                  <LogIn className="h-4 w-4" />
                </Link>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* AI Community Recommendations Teaser */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <CommunityRecommendationsPanel compact />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Maps tell better travel stories
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From interactive maps to seamless photo sharing, MercuryMap makes
              it easy to document and discover travel experiences worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center p-8">
              <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <MapPin className="h-7 w-7 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Interactive Mapping
              </h3>
              <p className="text-slate-600 text-sm">
                Upload photos with precise location data and explore a
                beautiful interactive map powered by Mapbox with search and
                clustering features.
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Camera className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Seamless Upload
              </h3>
              <p className="text-slate-600 text-sm">
                Drag and drop your travel photos with location autocomplete.
                Add descriptions and dates to create rich travel memories.
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="bg-amber-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Users className="h-7 w-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Global Community
              </h3>
              <p className="text-slate-600 text-sm">
                Discover photos from travelers around the world. Explore
                destinations through the eyes of the community.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-indigo-600 rounded-3xl px-8 py-14 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to start your journey?
            </h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-xl mx-auto">
              Join travelers from around the world in sharing and discovering
              amazing destinations. Let Mercury guide your way.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/upload"
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl text-base font-semibold hover:bg-indigo-50 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span>Upload Your First Photo</span>
              </Link>
              <Link
                to="/app"
                className="inline-flex items-center justify-center gap-2 bg-indigo-500/40 text-white border border-white/40 px-6 py-3 rounded-xl text-base font-semibold hover:bg-indigo-500/60 transition-colors"
              >
                <Globe className="h-5 w-5" />
                <span>Explore the World</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-indigo-400" />
              <span className="text-base font-semibold">MercuryMap</span>
            </div>
            <div className="text-slate-400 text-sm">
              © 2026 MercuryMap. Made with ❤️ for travelers worldwide.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
