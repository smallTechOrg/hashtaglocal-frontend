import { ImageSourcePropType } from 'react-native';

/**
 * Processes media URLs from issue data and returns an array of valid image URLs
 * @param mediaUrls - Array of media objects from the API
 * @returns Array of processed image URLs or sources
 */
export const processImageUrls = (
    mediaUrls: Array<{ url: string }> | undefined,
    defaultImage: ImageSourcePropType
): (string | ImageSourcePropType)[] => {
    // Get all image URLs from media
    const imageUrls = mediaUrls && mediaUrls.length > 0
        ? mediaUrls.map(media => media.url)
            .filter(url => url && url.trim() !== '')
            .map(url => {
                // If URL is relative, make it absolute (assuming it's from the backend)
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    return url;
                }
                return url;
            })
        : [];

    // Fallback to default image if no images available
    return imageUrls.length > 0 ? imageUrls : [defaultImage];
};

/**
 * Formats location string from location data
 * @param location - Location object from the API
 * @returns Formatted location string
 */
export const formatLocationString = (location: any): string | undefined => {
    if (!location) return undefined;

    return `${location.address || ''}${location.colloquialName ? `, ${location.colloquialName}` : ''} Lat: ${location.lat || 'N/A'}°N Long: ${location.lng || 'N/A'}°E`.trim();
};
