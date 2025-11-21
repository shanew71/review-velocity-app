import { ReviewData, BusinessProfile } from "../types";
import { augmentReviews } from "./geminiService";

// Robustly check for the key
const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || process.env.API_KEY;

declare var google: any;

/**
 * Helper: Dynamically load the Google Maps Script
 * Includes a timeout so the app doesn't spin forever if the key is wrong.
 */
const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If already loaded, success
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      resolve();
      return;
    }

    // 1. TIMEOUT SAFETY NET
    const timeoutId = setTimeout(() => {
        reject(new Error("Google Maps Script timed out. Check your Internet or API Key restrictions."));
    }, 8000); // 8 seconds max

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        clearTimeout(timeoutId);
        // Double check that the object actually exists
        if ((window as any).google && (window as any).google.maps) {
            resolve();
        } else {
            reject(new Error("Google Maps script loaded, but 'google' object is missing."));
        }
    };
    
    script.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error("Failed to load Google Maps script. Check API Key or Browser Blockers."));
    };

    document.head.appendChild(script);
  });
};

/**
 * REAL PRODUCTION FUNCTION for fetching private GBP Data
 */
const fetchReviewsFromGBP = async (placeId: string, accessToken: string): Promise<ReviewData[]> => {
    console.log("Fetching from PRIVATE Google Business Profile API...");
    return []; 
}

export const fetchGooglePlaceData = async (placeId: string, tier: 'standard' | 'pro' | 'live_pro' | 'demo' = 'standard', token?: string): Promise<{ profile: BusinessProfile, reviews: ReviewData[], totalCount: number, rating: number }> => {
  
  // 1. Check if Key Exists
  if (!API_KEY) {
      throw new Error("Google Maps API Key is missing in Vercel Settings.");
  }

  // 2. Load the Script
  await loadGoogleMapsScript();

  // 3. Use the PlacesService (Official Client-Side Method)
  return new Promise((resolve, reject) => {
    // Safety Timeout for the API Call itself
    const apiTimeout = setTimeout(() => {
        reject(new Error("Google API Request timed out. Is the Place ID correct?"));
    }, 10000);

    const mapDiv = document.createElement('div'); // Dummy div required for service
    const service = new google.maps.places.PlacesService(mapDiv);

    const request = {
      placeId: placeId,
      fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'reviews', 'types', 'place_id']
    };

    service.getDetails(request, async (place: any, status: any) => {
      clearTimeout(apiTimeout);

      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        console.error("Google Maps API Error:", status);
        // Give a user-friendly error for common codes
        if (status === 'ZERO_RESULTS') reject(new Error("Place ID not found."));
        else if (status === 'REQUEST_DENIED') reject(new Error("API Key Rejected. Check Google Cloud Console."));
        else reject(new Error(`Google Maps API Error: ${status}`));
        return;
      }

      // 4. Map the Data
      try {
          const profile: BusinessProfile = {
            name: place.name,
            url: place.website || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            description: `${place.name} is a local business located in ${place.formatted_address}.`,
            logoUrl: `https://ui-avatars.com/api/?name=${place.name.replace(/ /g, '+')}&background=random`,
            address: place.formatted_address,
            telephone: place.formatted_phone_number,
            googlePlaceId: place.place_id,
            categories: place.types || []
          };

          let reviews: ReviewData[] = (place.reviews || []).map((r: any, idx: number) => ({
            id: `g-${idx}-${Date.now()}`,
            author: r.author_name,
            rating: r.rating,
            text: r.text,
            date: new Date(r.time * 1000).toISOString(),
            source: 'Google'
          }));

          // LOGIC TREE:
          if (tier === 'live_pro') {
              if (token) {
                  try {
                      const augmented = await augmentReviews(reviews, place.name);
                      reviews = [...reviews, ...augmented.map(r => ({...r, source: 'Google' as const}))]; 
                  } catch(e) {}
              }
          } 

          resolve({
            profile,
            reviews,
            totalCount: place.user_ratings_total || 0,
            rating: place.rating || 0
          });

      } catch (err) {
          reject(err);
      }
    });
  });
};
