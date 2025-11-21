import { GoogleGenAI, Type } from "@google/genai";
import { ReviewData, BusinessStats } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.REACT_APP_GEMINI_KEY || process.env.API_KEY });

/**
 * Caching Wrapper with Hybrid Strategy
 * Rule 1: Update Stats (Numbers/Velocity) every 24 hours.
 * Rule 2: Update AI Sentiment (Text/Overview) every 7 days.
 */
export const getSmartAnalysis = async (placeId: string, reviews: ReviewData[], totalCount: number, avgRating: number, isDemoMode: boolean = false): Promise<BusinessStats> => {
  const CACHE_KEY = `rv_stats_${placeId}`;
  const cachedStr = localStorage.getItem(CACHE_KEY);
  
  let previousStats: BusinessStats | null = null;

  if (cachedStr) {
    previousStats = JSON.parse(cachedStr) as BusinessStats;
    
    const lastUpdate = new Date(previousStats.lastUpdated).getTime();
    const now = new Date().getTime();
    const hoursSinceLastCheck = (now - lastUpdate) / (1000 * 60 * 60);

    // If stats are fresh (less than 24 hours), return the whole cached object. No API calls.
    if (hoursSinceLastCheck < 24) {
      console.log("Returning fully cached analysis for", placeId);
      return previousStats;
    }
  }

  console.log("Stats stale. Calculating new numbers...");
  
  // 1. Always recalculate the hard numbers (Velocity, Counts) because this is cheap and local.
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  // Determine how many reviews are from the last 30 days
  // Note: If fetching from Google API, 'reviews' is usually the top 5.
  // If manual import, it could be 25+. We analyze what we have.
  const recentReviews = reviews.filter(r => new Date(r.date) >= thirtyDaysAgo);
  const reviewsLast30Days = recentReviews.length;

  let velocityTrend: 'up' | 'down' | 'stable' = 'stable';
  if (reviewsLast30Days > 0) {
    velocityTrend = 'up';
  }

  const freshStatsBase = {
    totalReviews: totalCount,
    averageScore: parseFloat(avgRating.toFixed(1)),
    reviewsLast30Days: reviewsLast30Days, 
    velocityTrend: velocityTrend,
    lastUpdated: new Date().toISOString(),
  };

  // 2. Check if we need to re-run the AI (Weekly Rule)
  let aiResult = {
    identifiedServices: previousStats?.identifiedServices || [],
    positiveAttributes: previousStats?.positiveAttributes || [],
    aiOverview: previousStats?.aiOverview || "Analysis pending...",
    lastAiAnalysis: previousStats?.lastAiAnalysis || new Date(0).toISOString()
  };

  const lastAiCheck = new Date(aiResult.lastAiAnalysis).getTime();
  const daysSinceAiCheck = (now.getTime() - lastAiCheck) / (1000 * 60 * 60 * 24);

  // If we have no previous data OR it's been more than 7 days, run Gemini.
  // Or if review count significantly changed (like switching to Pro Mode)
  const isProMode = reviews.length > 10;

  if (!previousStats || daysSinceAiCheck >= 7 || (isProMode && previousStats.identifiedServices.length < 3) || isDemoMode) {
    console.log(`AI Text is stale or mode changed. Running Gemini analysis...`);
    
    const aiGenerated = await runGeminiAnalysis(reviews, totalCount, avgRating, isDemoMode);
    
    aiResult = {
      identifiedServices: aiGenerated.identifiedServices,
      positiveAttributes: aiGenerated.positiveAttributes,
      aiOverview: aiGenerated.aiOverview,
      lastAiAnalysis: new Date().toISOString()
    };
  } else {
    console.log("AI Text is fresh. Skipping Gemini call.");
  }

  // 3. Merge and Save
  const finalStats: BusinessStats = {
    ...freshStatsBase,
    ...aiResult
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(finalStats));
  return finalStats;
};

/**
 * Core Gemini Analysis
 */
const runGeminiAnalysis = async (reviews: ReviewData[], total: number, avg: number, isDemoMode: boolean) => {
  const modelId = "gemini-2.5-flash";
  
  const sample = reviews.slice(0, 50); 
  const reviewContext = sample.map(r => `[${r.date.split('T')[0]}] ${r.rating} Stars: ${r.text}`).join("\n");

  let instruction = `
    1. Identify specific services/products mentioned.
    2. Extract positive attributes.
    3. Write a concise "AI Overview". 
       - Focus on the *quality* and *recency* of the feedback.
       - If the input sample contains around 25 reviews, explicitely mention "Based on a deep analysis of 25 recent reviews...".
       - If the sample size is small (e.g. 5 reviews), say "Recent customer feedback highlights...".
       - Be professional and marketing-forward.
  `;

  if (isDemoMode) {
      instruction = `
        **SALES VISION MODE ENABLED**
        The user is auditing this business. The provided reviews are only the most recent 5.
        Your goal is to paint a picture of what their reputation looks like.
        
        1. Infer likely services based on the business category and limited text.
        2. Write a high-energy, comprehensive "AI Overview" that demonstrates the potential of this tool.
        3. Use phrases like "Consistently high-rated..." and "Customers frequently praise..." to show the vision.
        4. Fill in gaps with industry-standard positive traits for this business type.
      `;
  }

  const prompt = `
    You are an expert sentiment analysis model.
    
    **BUSINESS CONTEXT:**
    Total Lifetime Reviews: ${total}
    Average Rating: ${avg}
    Recent Sample Reviews (${sample.length}):
    ${reviewContext}

    **INSTRUCTIONS:**
    ${instruction}

    **OUTPUT JSON:**
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          identifiedServices: {
             type: Type.ARRAY,
             items: { type: Type.STRING }
          },
          positiveAttributes: {
             type: Type.ARRAY,
             items: { type: Type.STRING }
          },
          aiOverview: { type: Type.STRING }
        },
        required: ["identifiedServices", "positiveAttributes", "aiOverview"]
      }
    }
  });

  const text = response.text;
  if (!text) return { identifiedServices: [], positiveAttributes: [], aiOverview: "Analysis unavailable." };
  
  return JSON.parse(text);
};

export const parseRawReviews = async (rawText: string): Promise<ReviewData[]> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `
    Clean this pasted review text into JSON. Current Date: ${new Date().toISOString()}.
    Extract: id, author, rating, text, date (ISO), source='Google'.
    Text: ${rawText.substring(0, 10000)}
  `;
  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "[]");
};

export const generateBusinessData = async (input: string): Promise<any> => {
  return {
      profile: { name: input, description: "Demo Business" },
      reviews: []
  }
};

export const augmentReviews = async (realReviews: ReviewData[], businessName: string): Promise<ReviewData[]> => {
  const modelId = "gemini-2.5-flash";
  const context = realReviews.map(r => r.text).join("\n");
  
  const prompt = `
    I have 5 real reviews for ${businessName}. I need to simulate the previous 20 reviews.
    Generate 20 realistic short reviews.
    REAL EXAMPLES:
    ${context}
    OUTPUT JSON ARRAY of objects: { author, rating, text, date (ISO) }
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  const generated = JSON.parse(response.text || "[]");
  return generated.map((r: any, idx: number) => ({
      id: `sim-${idx}`,
      author: r.author || "Customer",
      rating: r.rating || 5,
      text: r.text,
      date: r.date,
      source: 'Simulated'
  }));
}