import { Platform } from '../types/content';

export const FALLBACK_IMAGES = {
  youtube: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  instagram: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80',
  aparat: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
  article: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
};

/**
 * Returns a reliable fallback image URL based on platform or URL content.
 */
export const getPlatformFallbackImage = (platform?: Platform | string, rawUrl?: string): string => {
  if (platform === 'youtube' || (rawUrl && (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')))) {
    // Extract video ID if available
    const ytMatch = rawUrl?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    return FALLBACK_IMAGES.youtube;
  }

  if (platform === 'instagram' || (rawUrl && rawUrl.includes('instagram.com'))) {
    return FALLBACK_IMAGES.instagram;
  }

  if (platform === 'aparat' || (rawUrl && rawUrl.includes('aparat.com'))) {
    return FALLBACK_IMAGES.aparat;
  }

  if (platform === 'avatar') {
    return FALLBACK_IMAGES.avatar;
  }

  return FALLBACK_IMAGES.article;
};

/**
 * Image onError handler to replace broken or unreachable image URLs with reliable fallbacks.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl?: string
) => {
  const target = e.currentTarget;
  const safeFallback = fallbackUrl || FALLBACK_IMAGES.article;
  if (target.src !== safeFallback) {
    target.src = safeFallback;
  }
};
