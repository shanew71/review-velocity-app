import React, { useState, useEffect } from 'react';
import { ReviewWidget } from './components/ReviewWidget';
import { SchemaMarkup } from './components/SchemaMarkup';
import { getSmartAnalysis, parseRawReviews, generateBusinessData } from './services/geminiService';
import { fetchGooglePlaceData } from './services/googlePlacesService';
import { generateEmbedCode, generateStaticEmbedCode } from './utils/embedGenerator';
import { BusinessStats, ReviewData, BusinessProfile, ViewMode } from './types';

const INITIAL_PROFILE: BusinessProfile = {
  name: "Connect Your Business",
  url: "#",
  logoUrl: "https://ui-avatars.com/api/?name=RV",
  description: "Enter a Google Place ID to generate live intelligence.",
};

const App: React.FC = () => {
  // View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  
  // Data State
  const [profile, setProfile] = useState<BusinessProfile>(INITIAL_PROFILE);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Config State
  const [connectionTier, setConnectionTier] = useState<'demo' | 'live_pro'>('demo');
  
  // Input State
  const [placeIdInput, setPlaceIdInput] = useState('');
  const [gbpToken, setGbpToken] = useState(''); // For Real Live Data
  const [embedCode, setEmbedCode] = useState('');
  const [embedType, setEmbedType] = useState<'static' | 'live'>('static');
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Manual Text Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawReviewText, setRawReviewText] = useState('');

  // 1. Router Logic (On Mount)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const placeIdParam = params.get('placeId');
    const tokenParam = params.get('token');

    if (modeParam === 'widget') {
      setViewMode('widget');
      if (placeIdParam) {
        const tier = tokenParam ? 'live_pro' : 'demo';
        loadPlaceData(placeIdParam, tier, tokenParam || undefined); 
      }
    } else {
      setViewMode('dashboard');
    }
  }, []);

  // 2. Load Data
  const loadPlaceData = async (placeId: string, tier: 'demo' | 'live_pro', token?: string) => {
    setLoading(true);
    setErrorMsg(null);
    setStats(null);

    try {
      const placeData = await fetchGooglePlaceData(placeId, tier, token);

      setProfile(placeData.profile);
      setReviews(placeData.reviews);

      const analysis = await getSmartAnalysis(
        placeData.profile.googlePlaceId || "unknown", 
        placeData.reviews, 
        placeData.totalCount, 
        placeData.rating,
        tier === 'demo'
      );
      setStats(analysis);

    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Failed to load business data";
      
      if (msg.includes("CORS")) {
          setErrorMsg("Browser Blocked Request. We are switching to JS API to fix this...");
      } else {
          setErrorMsg(`Error: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeIdInput) return;
    loadPlaceData(placeIdInput, connectionTier, gbpToken);
  };
  
  const handleManualImport = async () => {
      setLoading(true);
      setShowImportModal(false);
      try {
          const parsedReviews = await parseRawReviews(rawReviewText);
          setReviews(parsedReviews);
          setProfile({ ...INITIAL_PROFILE, name: "Imported Business Data", googlePlaceId: "manual-import" });
          
          const analysis = await getSmartAnalysis(
              "manual", 
              parsedReviews, 
              parsedReviews.length, 
              parsedReviews.length > 0 ? 4.8 : 0,
              false
          );
          setStats(analysis);
      } catch (e) {
          alert("Failed to parse text. Try pasting cleaner review text.");
      } finally {
          setLoading(false);
      }
  };

  const handleGenerateCode = () => {
    if (!stats) return;
    const profileWithId = { ...profile, googlePlaceId: profile.googlePlaceId || placeIdInput };
    
    let code = '';
    if (embedType === 'static') {
        code = generateStaticEmbedCode(stats, profileWithId);
    } else {
        code = generateEmbedCode(stats, profileWithId);
    }
    setEmbedCode(code);
    setShowEmbedModal(true);
  };
  
  useEffect(() => {
      if (showEmbedModal && stats) {
          handleGenerateCode();
      }
  }, [embedType]);

  if (viewMode === 'widget') {
    return (
      <div className="min-h-screen bg-transparent font-sans p-4 flex items-center justify-center">
        {errorMsg ? (
          <div className="text-red-500 font-bold text-sm bg-white p-4 rounded shadow">{errorMsg}</div>
        ) : (
          <>
            {stats && <SchemaMarkup stats={stats} profile={profile} />}
            <ReviewWidget stats={stats || {
                totalReviews: 0, averageScore: 0, reviewsLast30Days: 0, velocityTrend: 'stable',
                identifiedServices: [], positiveAttributes: [], aiOverview: '', lastUpdated: '', lastAiAnalysis: ''
            }} loading={loading} profile={profile} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="bg-indigo-600 text-white p-1.5 rounded font-bold text-xl">RV</div>
             <span className="font-bold text-slate-700">ReviewVelocity <span className="text-xs text-slate-400 font-normal ml-1">Console</span></span>
           </div>
           <button 
             onClick={() => setShowImportModal(true)}
             className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded border border-indigo-200 transition-colors"
           >
             Import Text
           </button>
        </div>
      </div>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Configure Client Widget</h1>
            <p className="text-slate-500 mb-6 text-sm">
              Enter the client's <strong>Google Place ID</strong> to begin.
              <br/>
              <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Find a Place ID here</a>.
            </p>
            
            {errorMsg && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm animate-pulse">
                    <p className="font-bold">Connection Error:</p>
                    <p className="text-sm">{errorMsg}</p>
                </div>
            )}
            
            <form onSubmit={handleDashboardSubmit} className="space-y-6">
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Ex: ChIJN1t_tDeuEmsRUsoyG83frY4" 
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm"
                  value={placeIdInput}
                  onChange={(e) => setPlaceIdInput(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className={`text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 ${connectionTier === 'live_pro' ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {loading ? 'Connect' : 'Connect'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`border rounded-xl p-4 cursor-pointer transition-all ${connectionTier === 'demo' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <input type="radio" name="tier" className="w-4 h-4 text-indigo-600" checked={connectionTier === 'demo'} onChange={() => setConnectionTier('demo')} />
                    <span className="font-bold text-sm text-slate-800">1. Standard (Public Audit)</span>
                  </div>
                  <p className="text-xs text-slate-500">Uses the 5 most recent public reviews. AI generates a factual summary based strictly on this data.</p>
                </label>

                <label className={`border rounded-xl p-4 cursor-pointer transition-all ${connectionTier === 'live_pro' ? 'border-green-600 bg-green-50 ring-1 ring-green-600' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <input type="radio" name="tier" className="w-4 h-4 text-green-600" checked={connectionTier === 'live_pro'} onChange={() => setConnectionTier('live_pro')} />
                    <span className="font-bold text-sm text-green-700">2. Client (Real 25 Reviews)</span>
                  </div>
                  <p className="text-xs text-slate-500">Connects to your Google Account (GBP) to fetch 25 recent reviews.</p>
                </label>
              </div>
              
              {connectionTier === 'live_pro' && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 animate-fade-in">
                  <label className="block text-xs font-bold text-green-800 mb-1">Agency Access Token (OAuth)</label>
                  <input 
                    type="password" 
                    placeholder="Enter your Google Account Access Token..." 
                    className="w-full border border-green-200 rounded px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-green-500 outline-none"
                    value={gbpToken}
                    onChange={(e) => setGbpToken(e.target.value)}
                  />
                  <p className="text-[10px] text-green-600 mt-1">Since you manage this client, use your token to fetch 25 reviews from the 'mybusiness' API.</p>
                </div>
              )}
            </form>
          </div>

          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex justify-between items-end mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Live Preview</h3>
                    <div className="flex gap-2">
                        {connectionTier === 'demo' && (
                            <span className="text-[10px] text-white bg-indigo-600 px-2 py-1 rounded font-bold">STANDARD AUDIT</span>
                        )}
                        {connectionTier === 'live_pro' && (
                            <span className="text-[10px] text-white bg-green-600 px-2 py-1 rounded font-bold">LIVE CLIENT DATA</span>
                        )}
                    </div>
                </div>
                <ReviewWidget stats={stats} loading={loading} profile={profile} />
              </div>

              <div className="space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <h3 className="font-bold text-slate-800 mb-2">Ready to Deploy?</h3>
                   <p className="text-xs text-slate-500 mb-4">
                     Generate the code to send to your client. 
                   </p>
                   <button 
                    onClick={handleGenerateCode}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                     Get Embed Code
                   </button>
                </div>

                <div className="bg-slate-100 p-4 rounded-xl text-xs text-slate-500">
                  <strong>System Status:</strong>
                  <ul className="mt-2 space-y-1">
                    <li className="flex justify-between"><span>Place ID:</span> <span className="font-mono truncate w-24">{profile.googlePlaceId || '...'}</span></li>
                    <li className="flex justify-between"><span>Reviews Analyzed:</span> <span className="text-slate-800 font-bold">{reviews.length}</span></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </main>
      
      {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold mb-2">Paste Real Review Text</h3>
            <p className="text-xs text-slate-500 mb-4">Go to Google Maps, highlight the reviews, copy, and paste here.</p>
            <textarea 
                className="w-full h-48 border border-slate-200 rounded-lg p-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Paste text here..."
                value={rawReviewText}
                onChange={(e) => setRawReviewText(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowImportModal(false)} className="text-slate-500 font-bold text-sm">Cancel</button>
                <button onClick={handleManualImport} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Analyze Data</button>
            </div>
          </div>
          </div>
      )}

      {showEmbedModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold mb-4">Client Embed Code</h3>
              
              <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                  <button 
                    onClick={() => setEmbedType('static')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${embedType === 'static' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      🟢 Static Snapshot (Recommended)
                  </button>
                  <button 
                    onClick={() => setEmbedType('live')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${embedType === 'live' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      🔴 Live Auto-Pilot (Requires Deployment)
                  </button>
              </div>
              
              <p className="mt-4 text-xs text-slate-500">
                  {embedType === 'static' 
                    ? "Generates a standalone HTML block with current data. Does not call any API. Update monthly."
                    : "Requires you to host this app on Vercel/Netlify. Calls API on every visitor load."}
              </p>
            </div>
            
            <div className="flex-1 bg-slate-900 overflow-hidden relative group">
               <textarea 
                 readOnly
                 className="w-full h-full p-4 bg-slate-900 text-green-400 font-mono text-xs resize-none focus:outline-none"
                 value={embedCode}
               />
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowEmbedModal(false)} className="text-slate-500 hover:text-slate-700 text-sm font-medium">Close</button>
              <button 
                onClick={() => navigator.clipboard.writeText(embedCode)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
