import React, { useState } from 'react';
import { resizedImageUrl } from '../lib/imageUrl.ts';

interface PhotoImageProps {
  src: string;
  alt: string;
  /** Requested width in px. Omit to load the original at full size. */
  width?: number;
  className?: string;
  /** Above-the-fold images should fetch eagerly at high priority. */
  priority?: boolean;
}

/**
 * An <img> that requests a resized copy from Supabase Storage and quietly falls
 * back to the original if the transform endpoint isn't available (it's a paid
 * feature, so it may 404 depending on the project's plan). The fallback fires
 * at most once, so a genuinely broken image can't loop.
 *
 * Intrinsic width/height are always emitted so the browser can reserve the box
 * before the bytes arrive; every caller crops with object-cover, so the 3:2
 * ratio here is a layout hint, not the rendered shape.
 */
const PhotoImage: React.FC<PhotoImageProps> = ({
  src,
  alt,
  width,
  className,
  priority = false,
}) => {
  const [useOriginal, setUseOriginal] = useState(false);
  const intrinsicWidth = width ?? 1200;

  return (
    <img
      src={!width || useOriginal ? src : resizedImageUrl(src, width)}
      alt={alt}
      width={intrinsicWidth}
      height={Math.round((intrinsicWidth * 2) / 3)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setUseOriginal(true)}
      className={className}
    />
  );
};

export default PhotoImage;
