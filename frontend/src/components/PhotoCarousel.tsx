import React from 'react';
import Slider from 'react-slick';
import { Photo } from '../lib/supabase.ts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoCarouselProps {
  photos: Photo[];
  onClose: () => void;
}

const PhotoCarousel: React.FC<PhotoCarouselProps> = ({ photos, onClose }) => {
  const isSinglePhoto = photos.length === 1;
  
  const settings = {
    dots: !isSinglePhoto,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: !isSinglePhoto,
    prevArrow: isSinglePhoto ? null : <ChevronLeft className="slick-prev" />,
    nextArrow: isSinglePhoto ? null : <ChevronRight className="slick-next" />,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          arrows: false,
          dots: !isSinglePhoto
        }
      }
    ]
  };

  return (
    <div className={`photo-carousel-popup ${isSinglePhoto ? 'single-photo-popup' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {photos.length} Photo{photos.length > 1 ? 's' : ''} at this location
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          ✕
        </button>
      </div>
      
      <Slider {...settings} className="photo-slider">
        {photos.map((photo) => (
          <div key={photo.id} className="photo-slide">
            <img
              src={photo.file_url}
              alt={photo.title || 'Photo'}
              className="w-full h-40 object-cover rounded mb-3"
            />
            <div className="photo-info">
              {photo.title && (
                <h4 className="font-semibold text-sm mb-1">{photo.title}</h4>
              )}
              <p className="text-xs text-gray-600 mb-1">{photo.country}</p>
              {photo.description && (
                <p className="text-xs text-gray-500 mb-2">{photo.description}</p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(photo.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default PhotoCarousel; 