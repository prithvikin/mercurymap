import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Globe, Home as HomeIcon } from 'lucide-react';
import NavBar from '../components/NavBar.tsx';
import Card from '../components/ui/Card.tsx';
import { button } from '../components/ui/buttonStyles.ts';

const NotFound: React.FC = () => (
  <div className="min-h-screen bg-slate-50">
    <NavBar />

    <main id="main-content" className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <Card className="p-6 sm:p-10 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-50 p-3 rounded-2xl">
            <Compass className="h-9 w-9 text-indigo-600" aria-hidden="true" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3 text-balance">
          This Place Isn’t on the Map
        </h1>
        <p className="text-slate-600 mb-8 text-pretty">
          We couldn’t find the page you were looking for. It may have moved, or the link may be
          wrong. Try the map, or head back home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className={button('primary', 'md')}>
            <HomeIcon className="h-4 w-4" aria-hidden="true" />
            <span>Back Home</span>
          </Link>
          <Link to="/public" className={button('secondary', 'md')}>
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span>Explore the Public Map</span>
          </Link>
        </div>
      </Card>
    </main>
  </div>
);

export default NotFound;
