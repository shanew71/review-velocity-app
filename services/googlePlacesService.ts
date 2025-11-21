import { ReviewData, BusinessProfile } from "../types";
import { augmentReviews } from "./geminiService";

// Robustly check for the key
const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || process.env.API_KEY;

declare var google: any;

/**
 * Helper: Dynamically load the Google Maps Script
 */
const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        // Give it a tiny buffer to initialize
        setTimeout(() => {
            if ((window as any).google && (window as any).google.maps) {
                resolve();
            } else {
                reject(new Error("Google Maps script loaded but failed to initialize."));
            }
        }, 100);
    };
    
    script.onerror = () => {
        reject(new Error("Failed to load Google Maps script. Check API Key restriction."));
    };

    document.head.appendChild(script);
  });
};

/**
 * INTERNAL HELPER: Resolve 'Input' to 'Place ID'
 * If the user types a name or URL, we find the ID first.
 */
const resolveToPlaceId = (input: string, service: any): Promise<string> => {
    return new Promise((resolve, reject) => {
        // 1. If it looks like a Place ID (starts with ChIJ), use it directly
        if (input.startsWith('ChIJ')) {
            resolve(input);
            return;
        }

        // 2. Otherwise, treat it as a Search Query (Name or Link)
        console.log("Searching for Place ID via text query:", input);
        const request = {
            query: input,
            fields: ['place_id', 'name'],
        };

        service.findPlaceFromQuery(request, (results: any[], status: any) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                console.log("Found Place ID:", results[0].place_id);
                resolve(results[0].place_id);
            } else {
                console.error("Search failed:", status);
                reject(new Error(`Could not find a business named "${input}". Try the exact Place ID.`));
            }
        });
    });
};

export const fetchGooglePlaceData = async (input: string, tier: 'standard' | 'pro' | 'live_pro' | 'demo' = 'standard', token?: string): Promise<{ profile: BusinessProfile, reviews: ReviewData[], totalCount: number, rating: number }> => {
  
  // 1. Check Key
  if (!API_KEY) throw new Error("Google Maps API Key is missing.");

  // 2. Load Script
  await loadGoogleMapsScript();

  return new Promise(async (resolve, reject) => {
    const mapDiv = document.createElement('div');
    const service = new google.maps.places.PlacesService(mapDiv);

    try {
        // 3. Resolve Input -> Place ID
        const placeId = await resolveToPlaceId(input, service);

        // 4. Get Details using the resolved ID
        const request = {
          placeId: placeId,
          fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'reviews', 'types', 'place_id']
        };

        service.getDetails(request, async (place: any, status: any) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK) {
            // Specific error handling
            if (status === 'ZERO_RESULTS') reject(new Error("Place ID not found."));
            else if (status === 'REQUEST_DENIED') reject(new Error("API Key Rejected. Check Google Cloud Console settings."));
            else reject(new Error(`Google Maps API Error: ${status}`));
            return;
          }

          // 5. Map Data
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

              if (tier === 'live_pro' && token) {
                  try {
                      const augmented = await augmentReviews(reviews, place.name);
                      reviews = [...reviews, ...augmented.map(r => ({...r, source: 'Google' as const}))]; 
                  } catch(e) {}
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

    } catch (error) {
        reject(error);
    }
  });
};
