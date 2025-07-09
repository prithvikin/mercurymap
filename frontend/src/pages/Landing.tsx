import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, MapPin, Globe, Upload, ArrowRight, Users, Sparkles } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Camera className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">MercuryMap</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/app"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Explore Map
              </Link>
              <Link
                to="/upload"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Photo
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <Camera className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Your Travel Memories,
              <span className="text-blue-600"> Mapped</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Map your travels with photos on your personal MercuryMap. Connect with fellow travelers and share photos and destinations. 
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/app"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Globe className="h-5 w-5" />
                <span>Explore the Map</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/upload"
                className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
              >
                <Upload className="h-5 w-5" />
                <span>Share Your Photos</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to share your adventures
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From interactive maps to seamless photo sharing, MercuryMap makes it easy to 
              document and discover travel experiences worldwide. Just as Mercury guided travelers 
              across the ancient world, we guide your digital journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Interactive Mapping
              </h3>
              <p className="text-gray-600">
                Upload photos with precise location data and explore a beautiful interactive map 
                powered by Mapbox with search and clustering features.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Seamless Upload
              </h3>
              <p className="text-gray-600">
                Drag and drop your travel photos with location autocomplete. 
                Add descriptions and dates to create rich travel memories.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Global Community
              </h3>
              <p className="text-gray-600">
                Discover photos from travelers around the world. 
                Explore destinations through the eyes of the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <div className="bg-white/20 p-3 rounded-full">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to start your journey?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join travelers from around the world in sharing and discovering amazing destinations. 
              Let Mercury guide your way.
            </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/upload"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
            >
              <Upload className="h-5 w-5" />
              <span>Upload Your First Photo</span>
            </Link>
            <Link
              to="/app"
              className="bg-transparent text-white border-2 border-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors flex items-center justify-center space-x-2"
            >
              <Globe className="h-5 w-5" />
              <span>Explore the World</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Camera className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-semibold">MercuryMap</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2025 MercuryMap. Made with ❤️ for travelers worldwide.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing; 