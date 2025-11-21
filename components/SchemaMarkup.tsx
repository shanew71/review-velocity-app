import React from 'react';
import { BusinessStats, BusinessProfile } from '../types';

interface SchemaMarkupProps {
  stats: BusinessStats;
  profile: BusinessProfile;
}

export const SchemaMarkup: React.FC<SchemaMarkupProps> = ({ stats, profile }) => {
  // This constructs the structured data that Google, ChatGPT, Perplexity, etc. parse.
  // We append the AI overview to the description to ensure bots pick up the latest sentiment summary.
  const enhancedDescription = `${profile.description} ${stats.aiOverview}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": profile.name,
    "image": profile.logoUrl,
    "url": profile.url,
    "description": enhancedDescription,
    "telephone": profile.telephone,
    "address": profile.address ? {
      "@type": "PostalAddress",
      "streetAddress": profile.address
    } : undefined,
    "priceRange": profile.priceRange || "$$",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": stats.averageScore.toString(),
      "reviewCount": stats.totalReviews.toString(),
      "bestRating": "5",
      "worstRating": "1"
    },
    // Custom extension for AI agents looking for velocity
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/WriteAction",
      "userInteractionCount": stats.reviewsLast30Days,
      "description": "Reviews in the last 30 days"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
};