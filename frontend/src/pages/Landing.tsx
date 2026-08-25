import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Upload, ArrowRight, LogIn, MapPin, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import CommunityRecommendationsPanel from '../components/CommunityRecommendationsPanel.tsx';
import NavBar from '../components/NavBar.tsx';
import Card from '../components/ui/Card.tsx';
import { button } from '../components/ui/buttonStyles.ts';

// Mapbox GL is a heavy dependency this page doesn't need for its first
// paint -- lazy-loading it here means the headline and nav render before it
// finishes downloading, instead of blocking on a library only the preview
// card below actually uses.
const LandingMapPreview = React.lazy(() => import('../components/LandingMapPreview.tsx'));

const mapPreviewSkeletonClasses =
  'h-96 sm:h-[32rem] lg:h-[38rem] rounded-3xl border border-sand-200 shadow-card animate-pulse bg-gradient-to-br from-sand-100 to-sand-200';

const Landing: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      <main id="main-content">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-clay-50/60 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 text-center">
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-sand-900 mb-4 text-balance">
              Your Travel Memories,<span className="text-clay-600"> Mapped</span>
            </h1>
            <p className="text-lg md:text-xl text-sand-600 mb-6 max-w-2xl mx-auto text-pretty">
              Your photos belong on a map, not lost in a camera roll. See every trip you've taken
              and exactly where each memory happened.
            </p>

            <Suspense fallback={<div className={mapPreviewSkeletonClasses} />}>
              <LandingMapPreview />
            </Suspense>

            <p className="mt-5 text-sm text-sand-500">
              Have your own trips to add?{' '}
              {user ? (
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-1 rounded px-1 font-semibold text-clay-600 hover:text-clay-700 hover:underline"
                >
                  <span>Upload a photo</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 rounded px-1 font-semibold text-clay-600 hover:text-clay-700 hover:underline"
                >
                  <span>Sign in to upload</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </p>
          </div>
        </section>

        {/* AI Community Recommendations Teaser */}
        <section className="pt-8 pb-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <CommunityRecommendationsPanel compact />
          </div>
        </section>

        {/* Features Section */}
        <section aria-labelledby="features-heading" className="py-10 bg-sand-50 border-y border-sand-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2
                id="features-heading"
                className="font-display text-3xl md:text-4xl font-bold text-sand-900 mb-4 text-balance"
              >
                Maps Tell Better Travel Stories
              </h2>
              <p className="text-lg text-sand-600 max-w-2xl mx-auto text-pretty">
                From interactive maps to seamless photo sharing, <span translate="no">MercuryMap</span>{' '}
                makes it easy to document and discover travel experiences worldwide.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center p-8">
                <div className="bg-clay-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <MapPin className="h-7 w-7 text-clay-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-sand-900 mb-2 text-balance">
                  Interactive Mapping
                </h3>
                <p className="text-sand-600 text-sm text-pretty">
                  Upload photos with precise location data and explore a beautiful interactive map
                  powered by Mapbox with search and clustering features.
                </p>
              </Card>

              <Card className="text-center p-8">
                <div className="bg-sea-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="h-7 w-7 text-sea-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-sand-900 mb-2 text-balance">
                  AI Trip Recommendations
                </h3>
                <p className="text-sand-600 text-sm text-pretty">
                  Claude reads a photo history and suggests real destinations with map coordinates
                  and a grounded reason — checked against a live geocoder, not hallucinated.
                </p>
              </Card>

              <Card className="text-center p-8">
                <div className="bg-sun-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <ShieldCheck className="h-7 w-7 text-sun-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-sand-900 mb-2 text-balance">
                  Evaluated, Not Vibe-Coded
                </h3>
                <p className="text-sand-600 text-sm text-pretty">
                  A 20-case eval suite with deterministic checks and an LLM judge runs in CI on
                  every push, because a hallucinated map pin is a bug, not a fun fact.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section aria-labelledby="cta-heading" className="pt-10 pb-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* clay-700 rather than -600: the muted paragraph below reads
                clay-100, which only clears AA (5.74:1) against the deeper
                shade. It also gives the block a richer, less mid-tone
                terracotta. */}
            <div className="bg-clay-700 bg-grain rounded-3xl px-8 py-14 text-center">
              <h2
                id="cta-heading"
                className="font-display text-3xl md:text-4xl font-bold text-white mb-4 text-balance"
              >
                Have Photos to Share?
              </h2>
              <p className="text-lg text-clay-100 mb-8 max-w-xl mx-auto text-pretty">
                Sign in to add your own trips — keep them on your private map, or share them with
                everyone on the public one.
              </p>
              {user ? (
                <Link to="/upload" className={button('inverse', 'lg')}>
                  <Upload className="h-5 w-5" aria-hidden="true" />
                  <span>Upload a Photo</span>
                </Link>
              ) : (
                <Link to="/login" className={button('inverse', 'lg')}>
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                  <span>Sign In to Get Started</span>
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-sand-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-clay-400" aria-hidden="true" />
              <span className="font-display text-base font-semibold" translate="no">
                MercuryMap
              </span>
            </div>
            <div className="text-sand-400 text-sm text-center">
              © {new Date().getFullYear()} <span translate="no">MercuryMap</span>. Made with ❤️ for
              travelers worldwide.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
