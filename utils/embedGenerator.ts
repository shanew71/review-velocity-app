import { BusinessProfile, BusinessStats } from '../types';

/**
 * OPTION 1: LIVE IFRAME
 */
export const generateEmbedCode = (stats: BusinessStats, profile: BusinessProfile): string => {
  const appUrl = window.location.origin;
  const placeIdParam = profile.googlePlaceId ? `&placeId=${profile.googlePlaceId}` : '';
  // We purposely DO NOT include `&mode=pro` or `token` to keep client embeds safe/public.
  const widgetUrl = `${appUrl}/?mode=widget${placeIdParam}`;

  return `
<!-- ReviewVelocity Live Widget -->
<iframe 
  src="${widgetUrl}" 
  width="100%" 
  height="600" 
  style="border:none; overflow:hidden; max-width: 600px; margin: 0 auto; display: block; border-radius: 16px;" 
  title="Live Business Intelligence for ${profile.name}"
  loading="lazy"
></iframe>
<!-- End Widget -->
  `;
};

/**
 * OPTION 2: STATIC SNAPSHOT (Cost: $0)
 */
export const generateStaticEmbedCode = (stats: BusinessStats, profile: BusinessProfile): string => {
  const safeDescription = `${profile.description} ${stats.aiOverview}`.replace(/"/g, '&quot;');
  const formattedDate = new Date().toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": profile.name,
    "image": profile.logoUrl,
    "url": profile.url,
    "description": safeDescription,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": stats.averageScore.toString(),
      "reviewCount": stats.totalReviews.toString()
    },
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/WriteAction",
      "userInteractionCount": stats.reviewsLast30Days,
      "description": "Reviews in the last 30 days"
    }
  };
  
  return `
<!-- ReviewVelocity Static Snapshot (Generated: ${new Date().toLocaleDateString()}) -->
<div id="rv-widget-${Date.now()}" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
  
  <!-- Header -->
  <div style="background: linear-gradient(to right, #312e81, #1e3a8a); padding: 16px; color: white; position: relative; overflow: hidden;">
    <!-- Decorative Star -->
    <div style="position: absolute; top: -8px; right: -8px; color: #93c5fd; opacity: 0.1; pointer-events: none; transform: rotate(12deg);">
        <svg width="96" height="96" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/></svg>
    </div>

    <div style="position: relative; z-index: 10;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; color: #bfdbfe; margin-bottom: 4px;">
        <span style="width: 12px; height: 12px; background-color: #4ade80; border-radius: 50%; box-shadow: 0 0 8px rgba(74,222,128,0.8);"></span>
        Live Business Intelligence
        </div>
        <h1 style="font-size: 18px; font-weight: bold; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${profile.name}</h1>
    </div>
  </div>

  <!-- Body -->
  <div style="padding: 20px;">
    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 16px;">
      <div>
        <div style="display: flex; align-items: baseline; gap: 4px;">
           <span style="font-size: 36px; font-weight: 800; color: #0f172a;">${stats.averageScore}</span>
           <span style="font-size: 18px; font-weight: 500; color: #94a3b8;">/ 5</span>
        </div>
        <div style="color: #facc15; font-size: 14px;">★★★★★</div>
        <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-top: 4px; letter-spacing: 0.5px;">Verified Reviews (${stats.totalReviews.toLocaleString()})</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 24px; font-weight: bold; color: #1e293b;">+${stats.reviewsLast30Days}</div>
        <div style="font-size: 10px; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 999px; font-weight: bold; display: inline-block;">Last 30 Days</div>
        ${stats.velocityTrend === 'up' 
          ? `<div style="margin-top: 8px; font-size: 10px; background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Trending Up ↗</div>`
          : `<div style="margin-top: 8px; font-size: 10px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Stable Volume</div>`
        }
      </div>
    </div>

    <!-- Analysis Grid: Flex for static -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 16px; display: flex; gap: 16px;">
      
      <!-- Services (Left) -->
      <div style="flex: 1; border-right: 1px solid #f1f5f9; padding-right: 8px;">
        <h3 style="font-size: 10px; font-weight: bold; color: #94a3b8; margin: 0 0 8px 0;">Identified Services</h3>
        <div style="display: flex; flex-direction: column; gap: 4px;">
            ${stats.identifiedServices.slice(0, 5).map(s => `<span style="padding: 4px 8px; background: white; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 11px; font-weight: bold; color: #475569; box-shadow: 0 1px 2px rgba(0,0,0,0.05); text-transform: capitalize;">${s}</span>`).join('')}
        </div>
      </div>

      <!-- AI Summary (Right) -->
      <div style="flex: 2;">
        <h3 style="font-size: 10px; font-weight: bold; color: #60a5fa; margin: 0 0 8px 0;">AI Summary</h3>
        <div style="background: white; border: 1px solid #dbeafe; border-radius: 8px; padding: 12px;">
            <p style="font-size: 12px; color: #334155; line-height: 1.5; margin: 0; font-style: italic;">"${stats.aiOverview}"</p>
        </div>
         <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
            ${stats.positiveAttributes.slice(0, 3).map(a => `<span style="font-size: 10px; color: #15803d; background: #f0fdf4; padding: 2px 8px; border-radius: 99px; border: 1px solid #dcfce7; text-transform: capitalize;">✓ ${a}</span>`).join('')}
        </div>
      </div>

    </div>
  </div>

  <!-- Footer -->
  <div style="background: #0f172a; color: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 9px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <strong style="font-size: 10px; letter-spacing: 0.5px;">Review Velocity&trade;</strong>
      <span style="color: white; border-left: 1px solid #334155; padding-left: 8px; font-weight: bold;">Updated: ${formattedDate}</span>
    </div>
    <span style="background: #1e293b; color: #cbd5e1; padding: 2px 6px; border-radius: 4px;">Schema.org Ready</span>
  </div>
</div>

<!-- AI & Search Schema -->
<script type="application/ld+json">
${JSON.stringify(jsonLd)}
</script>
  `;
};