import React from 'react';
import { BusinessStats, BusinessProfile } from '../types';

interface ReviewWidgetProps {
  stats: BusinessStats;
  loading: boolean;
  profile?: BusinessProfile;
}

export const ReviewWidget: React.FC<ReviewWidgetProps> = ({ stats, loading, profile }) => {
  if (loading) {
    return (
      <div className="animate-pulse bg-white rounded-2xl p-6 w-full h-full border border-slate-200 shadow-sm flex flex-col justify-center">
        <div className="flex justify-between items-start mb-6">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
        </div>
        <div className="h-24 bg-slate-100 rounded-xl mb-6"></div>
      </div>
    );
  }

  const formattedDate = stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : 'Just now';

  const isProAnalysis = stats.aiOverview && stats.aiOverview.includes("25");

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden w-full h-full flex flex-col font-sans group relative">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-blue-900 p-4 text-white relative overflow-hidden flex-shrink-0">
        {/* Decorative Star */}
        <div className="absolute -top-2 -right-2 text-blue-300 opacity-10 pointer-events-none">
            <svg className="w-24 h-24 transform rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/></svg>
        </div>

        <div className="relative z-10">
            <h2 className="text-[11px] font-bold tracking-wide flex items-center gap-2 text-blue-200 mb-1">
                <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                Live Business Intelligence
            </h2>
            <h1 className="text-lg font-bold text-white tracking-tight truncate">
                {profile?.name || "Business Analytics"}
            </h1>
        </div>
      </div>

      {/* Content Scroll Area (for iframe fit) */}
      <div className="flex-grow overflow-y-auto">
        {/* Stats Grid */}
        <div className="p-5 grid grid-cols-2 gap-4 border-b border-slate-100">
          <div>
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.averageScore}</span>
                <span className="text-lg text-slate-400 font-medium">/ 5</span>
            </div>
            <div className="flex items-center gap-0.5 mt-1 text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className={`w-4 h-4 ${star <= Math.round(stats.averageScore) ? 'fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
            </div>
            <p className="text-slate-500 text-[11px] mt-1 font-bold tracking-wide">Verified Reviews ({stats.totalReviews.toLocaleString()})</p>
          </div>

          <div className="flex flex-col justify-center items-end">
             <div className="text-right">
               <span className="block text-2xl font-bold text-slate-800">+{stats.reviewsLast30Days}</span>
               <span className="text-[10px] text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded-full">Last 30 Days</span>
             </div>
             {stats.velocityTrend === 'up' ? (
               <div className="mt-2 flex items-center text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded" title="Total review count is increasing">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  Trending Up
               </div>
             ) : (
               <div className="mt-2 flex items-center text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">Stable</div>
             )}
          </div>
        </div>

        {/* Analysis Grid - Left Column Services, Right Column Text */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50">
          
          {/* Left Column: Services */}
          <div className="md:col-span-1 border-r border-slate-100 pr-2">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wide mb-3">Identified Services</h3>
            {stats.identifiedServices.length > 0 ? (
              <div className="flex flex-col gap-2">
                {stats.identifiedServices.slice(0, 6).map((service, idx) => (
                  <span key={idx} className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-600 shadow-sm whitespace-normal capitalize">
                    {service}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Analyzing...</span>
            )}
          </div>

          {/* Right Column: AI Overview */}
          <div className="md:col-span-2">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-bold text-blue-400 tracking-wide flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                AI Summary
                </h3>
                {isProAnalysis && (
                    <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold tracking-wider shadow-sm animate-pulse">DEEP ANALYSIS (25+)</span>
                )}
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
              <p className="text-xs text-slate-700 leading-relaxed italic">"{stats.aiOverview}"</p>
            </div>
            
            {stats.positiveAttributes.length > 0 && (
               <div className="mt-3 flex flex-wrap gap-1">
                  {stats.positiveAttributes.slice(0, 3).map((attr, i) => (
                      <span key={i} className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 capitalize">✓ {attr}</span>
                  ))}
               </div>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-white p-2.5 px-4 flex justify-between items-center flex-shrink-0">
         <div className="flex items-center gap-2">
             <span className="font-bold text-[10px] tracking-wide">Review Velocity&trade;</span>
             <span className="text-[10px] text-white font-bold border-l border-slate-700 pl-2 hidden sm:inline">Updated: {formattedDate}</span>
         </div>
         <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Schema.org Ready</span>
      </div>
    </div>
  );
};