
export interface ReviewData {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string; // ISO Date string
  source: 'Google' | 'Direct' | 'Other' | 'Simulated';
}

export interface BusinessStats {
  totalReviews: number;
  averageScore: number;
  reviewsLast30Days: number;
  velocityTrend: 'up' | 'down' | 'stable';
  identifiedServices: string[];
  positiveAttributes: string[];
  aiOverview: string;
  lastUpdated: string; // When the numbers were last checked (Daily)
  lastAiAnalysis: string; // When the AI text was last generated (Weekly)
}

export interface BusinessProfile {
  name: string;
  url: string;
  logoUrl: string;
  description: string;
  address?: string;
  priceRange?: string;
  telephone?: string;
  googlePlaceId?: string;
  categories?: string[];
}

// New interfaces for the Live Engine
export type ViewMode = 'dashboard' | 'widget';

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  user_ratings_total: number;
  rating: number;
  reviews: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number; // Unix timestamp
    relative_time_description: string;
  }>;
  website?: string;
  formatted_phone_number?: string;
}