import React, { useState } from 'react';

export default function MasterDemo() {
  const [activeTab, setActiveTab] = useState<'publisher' | 'reader'>('publisher');
  const [magazines, setMagazines] = useState<any[]>([]);
  const [selectedMagazine, setSelectedMagazine] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [nowPlayingScript, setNowPlayingScript] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate analyzing and generating content
    const title = urlInput ? `Magazine from ${new URL(urlInput).hostname}` : `Uploaded Issue ${new Date().toLocaleDateString()}`;
    
    setTimeout(() => {
      const geminiOutput = `Thandi: Welcome to today's issue! Did you see the new energy protocols?
Njabulo: Indeed, South Africa is making moves.
Thandi: And healthcare AI breakthroughs are fascinating.
Njabulo: Absolutely, early diagnosis is key.`;
      
      const newMag = {
        id: Date.now(),
        title,
        coverEmoji: "🤖",
        report: "Executive Summary: South African tech sector accelerates.\n\n" + geminiOutput,
        episodes: [{ id: `ep-${Date.now()}`, title: `AI Podcast: ${title}`, script: geminiOutput, audioUrl: null }],
        createdAt: new Date().toISOString()
      };
      setMagazines([newMag, ...magazines]);
      setIsLoading(false);
      alert("✅ Issue published! Switch to Reader Library to listen.");
    }, 2000);
  };

  const playPodcast = (scriptText: string) => {
    setNowPlayingScript(scriptText);
    setIsPlaying(true);
    const lines = scriptText.match(/(Thandi:|Njabulo:)[^\n]+/g) || [scriptText];
    let idx = 0;
    
    const speak = () => {
      if (idx >= lines.length) {
        setIsPlaying(false);
        return;
      }
      let text = lines[idx].replace(/^(Thandi:|Njabulo:)/, '').trim();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onend = () => { idx++; speak(); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };
    speak();
  };

  const closePlayer = () => {
    window.speechSynthesis.cancel();
    setNowPlayingScript(null);
    setIsPlaying(false);
  };

  // Seed demo initial data if empty
  React.useEffect(() => {
    if (magazines.length === 0) {
      const demo = "Thandi: Have you seen the leadership magazine for March 2026?\nNjabulo: Yes, the focus on South Africa's new AI tech plan is quite compelling.\nThandi: It aligns perfectly with the latest structural investments.";
      const demoMag = {
        id: 1,
        title: "DigiMagAI Edition – March 2026",
        coverEmoji: "🚀",
        report: "📊 AI Analysis & Transcript\n\nExecutive Summary: A deep dive into AI advancements.\n\n" + demo,
        episodes: [{ id: `ep-1`, title: `AI Podcast: DigiMagAI Edition`, script: demo, audioUrl: null }],
        createdAt: new Date().toISOString()
      };
      setMagazines([demoMag]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-200 font-sans selection:bg-purple-500/30">
      {/* Ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        {/* Futuristic Header & Tabs */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 border-b border-white/5 pb-8">
          <div className="flex items-center gap-4 mb-6 md:mb-0">
             <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <div className="w-full h-full bg-[#05070A] rounded-2xl flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full mix-blend-overlay" />
                </div>
             </div>
             <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
               DigiMagAI<span className="text-indigo-400">.Live</span>
             </h1>
          </div>
          <div className="flex gap-2 p-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-inner">
            <button 
              className={`px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all ${activeTab === 'publisher' ? 'bg-gradient-to-b from-white/10 to-white/5 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setActiveTab('publisher')}
            >
              Publisher Studio
            </button>
            <button 
              className={`px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all ${activeTab === 'reader' ? 'bg-gradient-to-b from-white/10 to-white/5 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setActiveTab('reader')}
            >
              Reader Feed
            </button>
          </div>
        </div>

        {activeTab === 'publisher' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Generate Panel */}
            <div className="bg-[#0A0D14]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 w-32 h-32 bg-indigo-500/10 blur-3xl" />
              <h2 className="text-xl font-bold mb-2 text-white">Synthesize New Issue</h2>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                Provide a PDF or URL. Our Deep Research Agent will extract themes and dynamically generate an immersive audio session.
              </p>
              
              <div className="space-y-6 relative z-10">
                <div className="group">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Upload Source File</label>
                  <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-white/10 group-hover:border-indigo-500/50 rounded-2xl bg-white/[0.02] cursor-pointer transition-colors">
                    <span className="text-sm text-slate-400 font-medium">Drag & Drop or Click</span>
                    <input type="file" accept=".pdf,.txt" className="hidden" />
                  </label>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  <div className="flex-1 h-px bg-white/5" />
                  Or Link Article
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                <div>
                  <input 
                    type="url" 
                    placeholder="https://example.com/article" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full bg-[#05070a]/50 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-white placeholder-slate-600 transition-shadow" 
                  />
                </div>

                <button 
                  onClick={handleAnalyze} 
                  disabled={isLoading}
                  className="w-full relative overflow-hidden rounded-2xl group transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500 to-indigo-600 group-hover:from-indigo-400 group-hover:to-indigo-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" />
                  <div className="relative px-6 py-4 flex items-center justify-center gap-3">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="font-semibold text-white tracking-wide shadow-sm">Execute Deep Analysis</span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Published Issues List */}
            <div className="bg-[#0A0D14]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col">
              <h3 className="text-xl font-bold mb-6 text-white">Archives</h3>
              <div className="grid gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {magazines.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-white/10 rounded-2xl">
                    No issues published yet.
                  </div>
                ) : (
                  magazines.map(m => (
                    <div key={m.id} className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl p-4 transition-all flex items-center gap-5 cursor-pointer">
                      <div className="w-16 h-20 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white/10">
                        {m.coverEmoji}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">{m.title}</h4>
                        <p className="text-xs text-slate-500 font-mono">{new Date(m.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reader' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row gap-8">
            {/* Feed */}
            <div className="md:w-1/3 flex flex-col gap-4">
               <h2 className="text-xl font-bold mb-2 text-white px-2">Immersive Feed</h2>
               {magazines.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-white/10 rounded-2xl">
                    Library is empty.
                  </div>
                ) : (
                  magazines.map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => setSelectedMagazine(m)}
                      className={`group relative backdrop-blur-xl border rounded-3xl p-5 transition-all cursor-pointer overflow-hidden
                        ${selectedMagazine?.id === m.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[#0A0D14]/60 border-white/5 hover:border-white/10'}`}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent blur-2xl" />
                      <div className="relative z-10 flex gap-4 items-center">
                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/10">
                          {m.coverEmoji}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-white leading-tight mb-1">{m.title}</h4>
                          <div className="flex gap-2 items-center text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                            <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full" />
                            <span>3 MIN</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
            </div>

            {/* Viewer / Player Surface */}
            <div className="md:w-2/3">
              {selectedMagazine ? (
                <div className="bg-[#0A0D14]/80 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col">
                  {/* Decorative */}
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full" />
                  
                  <div className="relative z-10">
                    <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest rounded-full mb-6 border border-indigo-500/20">
                      Generated Episode
                    </span>
                    <h3 className="text-3xl font-black tracking-tight text-white mb-8">{selectedMagazine.title}</h3>
                    
                    <div className="mb-8 p-6 bg-white/[0.02] border border-white/5 rounded-2xl shadow-inner">
                       <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Live Transcript Details</h4>
                       <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-400">
                         {selectedMagazine.report.split('\n').slice(0,6).join('\n')}
                       </div>
                    </div>

                    <button 
                      onClick={() => playPodcast(selectedMagazine.episodes[0].script)}
                      className="group relative inline-flex items-center justify-center gap-3 rounded-full border border-transparent px-8 py-4 font-semibold shadow-[0_2px_15px_rgba(16,185,129,0.3)] transition-all bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-[#05070A]"
                    >
                      <div className="absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] pointer-events-none" />
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      Initialize Playback
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0A0D14]/40 border border-white/5 border-dashed rounded-3xl h-[500px] flex items-center justify-center text-slate-600">
                  Select an issue from the feed to view
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Skeuomorphic Player (Surgical Glassmorphism) */}
      {nowPlayingScript && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-[#1A1D24]/70 backdrop-blur-3xl border border-white/10 rounded-full p-3 shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-bottom-12 duration-500">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-white/20">
            <svg className={`w-6 h-6 text-white ${isPlaying ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M17.657 6.343a8 8 0 010 11.314M19.778 4.222a11 11 0 010 15.556" /></svg>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-0.5">Live Audio Stream</p>
            <p className="text-sm font-medium text-white truncate w-full">
              {selectedMagazine?.title || 'Generative Podcast Session'}
            </p>
          </div>
          
          <div className="flex items-center gap-3 pr-2">
            <div className="hidden sm:flex gap-1 items-center h-8 px-4 bg-black/40 rounded-full border border-white/5">
               {[1,2,3,4].map(i => (
                 <div key={i} className={`w-1 bg-emerald-400 rounded-full ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: isPlaying ? `${Math.random() * 100}%` : '20%', transition: 'height 0.2s' }} />
               ))}
            </div>
            <button 
              onClick={closePlayer}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


