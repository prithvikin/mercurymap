import React, { useState } from 'react';
import { resizedImageUrl } from '../lib/imageUrl.ts';

interface PhotoImageProps {
  src: string;
  alt: string;
  /** Requested width in px. Omit to load the original at full size. */
  width?: number;
  className?: string;
}

/**
 * An <img> that requests a resized copy from Supabase Storage and quietly falls
 * back to the original if the transform endpoint isn't available (it's a paid
 * feature, so it may 404 depending on the project's plan). The fallback fires
 * at most once, so a genuinely broken image can't loop.
 */
const PhotoImage: React.FC<PhotoImageProps> = ({ src, alt, width, className }) => {
  const [useOriginal, setUseOriginal] = useState(false);

  return (
    <img
      src={!width || useOriginal ? src : resizedImageUrl(src, width)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setUseOriginal(true)}
      className={className}
    />
  );
};

export default PhotoImage;
