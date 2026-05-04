import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Play, Pause, X, Headphones, Layers, CheckCircle2, Mic, Globe, BarChart3, TrendingUp, Settings, LayoutDashboard, Users, Zap, Image as ImageIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { PublisherStudio } from './components/PublisherStudio';
import { PodcastGenerator } from './components/PodcastGenerator';

const mockIssues = [
  { id: '1', title: 'Tech Pulse: AI Advances', publisher: 'DigiMag Weekly', coverUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop', duration: '12 min', subscribed: false },
  { id: '2', title: 'AgriTech Innovations', publisher: 'Farming Future', coverUrl: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=800&auto=format&fit=crop', duration: '8 min', subscribed: true },
  { id: '3', title: 'Global Markets Q3', publisher: 'Finance Today', coverUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop', duration: '15 min', subscribed: false }
];

const subscriberData = [
  { name: 'Mon', listeners: 4000 },
  { name: 'Tue', listeners: 3000 },
  { name: 'Wed', listeners: 5000 },
  { name: 'Thu', listeners: 8780 },
  { name: 'Fri', listeners: 11900 },
  { name: 'Sat', listeners: 15900 },
  { name: 'Sun', listeners: 24500 },
];

function DiscoveryDashboard() {
  const navigate = useNavigate();
  // Filter mock issues to simulate tailored feed
  const subscribedIssues = mockIssues.filter(i => i.subscribed);
  
  return (
    <div className="min-h-screen pt-20 px-6 max-w-7xl mx-auto pb-32">
      <header className="mb-16">
        <h1 className="text-4xl font-display font-bold tracking-tight mb-2">My Library</h1>
        <p className="text-tech-grey text-lg">Your personalized audio editions based on your subscriptions and interests.</p>
      </header>

      {/* Subscribed Library Feed */}
      <section className="mb-20">
        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-electric-cyan" /> New from Subscriptions
        </h2>
        {subscribedIssues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscribedIssues.map((issue) => (
              <div key={issue.id} onClick={() => navigate(`/issue/${issue.id}`)} className="group relative rounded-2xl overflow-hidden cursor-pointer h-[400px] border border-[#333]">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${issue.coverUrl})` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-void via-charcoal-void/50 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-electric-cyan/10 transition-opacity duration-500 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-electric-cyan/20 backdrop-blur-md flex items-center justify-center border border-electric-cyan/50 shadow-[0_0_30px_rgba(0,229,255,0.4)]">
                     <Play className="w-8 h-8 text-electric-cyan fill-current" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-electric-cyan text-xs font-bold uppercase tracking-widest mb-2">{issue.publisher}</p>
                  <h3 className="text-2xl font-display font-medium text-white mb-2 leading-tight">{issue.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-tech-grey font-mono">
                    <span>{issue.duration}</span>
                    <span className="w-1 h-1 bg-tech-grey rounded-full" />
                    <span>Interactive Audio</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-8 text-center">
             <p className="text-tech-dim mb-4">You haven't subscribed to any publishers yet.</p>
             <button onClick={() => navigate('/discover')} className="btn-primary py-2 px-6">Explore Directory</button>
          </div>
        )}
      </section>

      {/* Discovery Feed */}
      <section>
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <Headphones className="w-5 h-5 text-electric-cyan" /> Discover More
           </h2>
           <button onClick={() => navigate('/discover')} className="text-sm font-mono text-electric-cyan hover:text-white transition-colors">View Directory &rarr;</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-8 custom-scrollbar">
          {mockIssues.map((issue) => (
            <div key={'feed'+issue.id} className="flex-shrink-0 w-[300px] glass-panel p-4 group">
              <div onClick={() => navigate(`/issue/${issue.id}`)} className="h-32 rounded-lg bg-cover bg-center mb-4 relative cursor-pointer" style={{ backgroundImage: `url(${issue.coverUrl})` }}>
                <div className="absolute inset-0 bg-charcoal-void/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute bottom-2 right-2 bg-charcoal-void/80 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-electric-cyan">
                  {issue.duration}
                </div>
              </div>
              <div 
                onClick={() => navigate(`/publisher/farming-future`)}
                className="cursor-pointer hover:opacity-80"
              >
                <p className="text-tech-dim text-xs uppercase tracking-wider mb-1 hover:text-electric-cyan transition-colors">{issue.publisher}</p>
              </div>
              <h4 onClick={() => navigate(`/issue/${issue.id}`)} className="font-medium text-white group-hover:text-electric-cyan transition-colors line-clamp-2 leading-snug cursor-pointer">{issue.title}</h4>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PublisherChannel() {
  const { id } = useParams();
  const [isSubscribed, setIsSubscribed] = useState(mockIssues.some(i => i.subscribed && i.publisher === 'Farming Future'));
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-charcoal-void pt-20 pb-32">
      <div className="max-w-5xl mx-auto px-6">
        {/* Publisher Public Profile Hero */}
        <div className="glass-panel p-8 mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-electric-cyan/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="w-32 h-32 rounded-full border-2 border-electric-cyan/30 p-1 bg-charcoal-base">
            <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=400&fit=crop)' }} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-display font-medium text-white mb-2">{id === 'farming-future' ? 'Farming Future' : 'DigiMag Weekly'}</h1>
            <p className="text-tech-grey max-w-xl mb-6 leading-relaxed">The premier digital publication covering agricultural technology, sustainable farming, and global supply chains.</p>
            <button 
              onClick={() => setIsSubscribed(!isSubscribed)}
              className={`py-3 px-8 text-sm font-bold uppercase tracking-widest rounded-xl transition-all ${isSubscribed ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10' : 'btn-primary'}`}
            >
              {isSubscribed ? '✔ Subscribed' : 'Subscribe for Free'}
            </button>
            <p className="text-[10px] text-tech-dim mt-3 uppercase tracking-widest">Join 24,500+ listeners growing their careers</p>
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-6 text-white border-b border-[#333] pb-4">Latest Audio Editions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           {/* Render mock issues */}
           {mockIssues.map(i => (
             <div key={i.id} onClick={() => navigate(`/issue/${i.id}`)} className="group cursor-pointer">
               <div className="aspect-[3/4] bg-cover bg-center rounded-xl mb-3 border border-white/5 group-hover:border-electric-cyan/50 transition-colors relative" style={{ backgroundImage: `url(${i.coverUrl})` }}>
                 <div className="absolute inset-0 bg-gradient-to-t from-charcoal-void/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                   <div className="w-full flex justify-between items-center text-xs text-white uppercase tracking-widest font-mono">
                     <span>Listen</span>
                     <Play className="w-4 h-4 text-electric-cyan" />
                   </div>
                 </div>
               </div>
               <h4 className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors">{i.title}</h4>
               <p className="text-xs text-tech-dim mt-1">Oct 2026</p>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function PublisherDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics'|'studio'|'settings'>('analytics');

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-16 flex font-sans">
      {/* Publisher Sidebar */}
      <div className="w-64 border-r border-[#222] bg-[#111] h-[calc(100vh-64px)] p-6 fixed left-0 top-16 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
           <div className="w-10 h-10 rounded-lg bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=100&fit=crop)' }} />
           <div>
              <h3 className="font-bold text-white text-sm">Farming Future</h3>
              <p className="text-xs text-tech-accent uppercase tracking-widest">Pro Plan</p>
           </div>
        </div>

        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-tech-accent/10 border border-tech-accent/30 text-white glow-cyan' : 'text-tech-dim hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={18} className={activeTab === 'analytics' ? 'text-tech-accent' : ''} /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('studio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'studio' ? 'bg-tech-accent/10 border border-tech-accent/30 text-white glow-cyan' : 'text-tech-dim hover:bg-white/5 hover:text-white'}`}
          >
            <Mic size={18} className={activeTab === 'studio' ? 'text-tech-accent' : ''} /> Production Studio
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-tech-accent/10 border border-tech-accent/30 text-white glow-cyan' : 'text-tech-dim hover:bg-white/5 hover:text-white'}`}
          >
            <Settings size={18} className={activeTab === 'settings' ? 'text-tech-accent' : ''} /> Channel Settings
          </button>
        </nav>

        <div className="mt-8 p-4 bg-gradient-to-tr from-[#1A1A1A] to-[#222] border border-[#333] rounded-xl">
           <p className="text-xs text-tech-dim mb-2 uppercase tracking-widest">Audio Minutes</p>
           <div className="flex justify-between items-baseline mb-2">
              <span className="text-xl font-display text-white">450</span>
              <span className="text-[10px] text-tech-grey">/ 500 utilized</span>
           </div>
           <div className="w-full h-1 bg-black rounded-full overflow-hidden">
               <div className="h-full bg-tech-accent" style={{ width: '90%' }} />
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ml-64 flex-1 p-10 max-w-6xl">
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
             <div className="flex justify-between items-end mb-10">
                <div>
                  <h1 className="text-3xl font-display font-medium text-white mb-2">Command Center</h1>
                  <p className="text-tech-grey">Real-time audience engagement and lead generation data.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live Data Sync
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="glass-panel p-6">
                   <div className="flex justify-between items-start mb-6">
                     <div className="w-10 h-10 rounded-full bg-tech-accent/10 flex items-center justify-center">
                       <Users className="w-5 h-5 text-tech-accent" />
                     </div>
                     <span className="text-xs font-bold text-tech-accent bg-tech-accent/10 px-2 py-1 rounded-full">+12.5%</span>
                   </div>
                   <h3 className="text-tech-dim text-sm tracking-widest uppercase mb-1">Total Subscribers</h3>
                   <p className="text-4xl font-display text-white">24,580</p>
                </div>
                <div className="glass-panel p-6">
                   <div className="flex justify-between items-start mb-6">
                     <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                       <Headphones className="w-5 h-5 text-purple-400" />
                     </div>
                     <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">+8.2%</span>
                   </div>
                   <h3 className="text-tech-dim text-sm tracking-widest uppercase mb-1">Weekly Listens</h3>
                   <p className="text-4xl font-display text-white">128.4k</p>
                </div>
                <div className="glass-panel p-6">
                   <div className="flex justify-between items-start mb-6">
                     <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                       <Zap className="w-5 h-5 text-blue-400" />
                     </div>
                     <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">+18%</span>
                   </div>
                   <h3 className="text-tech-dim text-sm tracking-widest uppercase mb-1">Average Completion</h3>
                   <p className="text-4xl font-display text-white">82%</p>
                </div>
             </div>

             <div className="glass-panel p-8 mb-10 h-[400px]">
                <h3 className="font-display text-xl text-white mb-6">Subscriber Growth</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={subscriberData}>
                    <defs>
                      <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#555" tick={{ fill: '#888', fontSize: 12 }} />
                    <YAxis stroke="#555" tick={{ fill: '#888', fontSize: 12 }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: '#00E5FF' }}
                    />
                    <Area type="monotone" dataKey="listeners" stroke="#00E5FF" strokeWidth={3} fillOpacity={1} fill="url(#colorListeners)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
             
             <div className="glass-panel p-8">
               <h3 className="font-display text-xl text-white mb-6 border-b border-[#333] pb-4">Subscriber Lead Capture</h3>
               <p className="text-tech-grey mb-6 text-sm">Targeted analytics on users who have tapped "Subscribe" on your channel page.</p>
               <table className="w-full text-left font-mono text-sm text-tech-grey">
                 <thead>
                   <tr className="border-b border-[#333] uppercase tracking-widest text-[10px] text-tech-dim">
                     <th className="pb-3">Industry Segment</th>
                     <th className="pb-3">Subscribers</th>
                     <th className="pb-3">Engagement Score</th>
                     <th className="pb-3 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#222]">
                   <tr>
                     <td className="py-4">Logistics & Supply Chain</td>
                     <td className="text-white">8,450</td>
                     <td><span className="text-green-500">High</span></td>
                     <td className="text-right"><button className="text-tech-accent hover:underline">Export Leads</button></td>
                   </tr>
                   <tr>
                     <td className="py-4">Venture Capital / AgTech</td>
                     <td className="text-white">4,200</td>
                     <td><span className="text-yellow-500">Medium</span></td>
                     <td className="text-right"><button className="text-tech-accent hover:underline">Export Leads</button></td>
                   </tr>
                   <tr>
                     <td className="py-4">Enterprise Farming Ops</td>
                     <td className="text-white">11,930</td>
                     <td><span className="text-green-500">High</span></td>
                     <td className="text-right"><button className="text-tech-accent hover:underline">Export Leads</button></td>
                   </tr>
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
             <div className="mb-10">
                <h1 className="text-3xl font-display font-medium text-white mb-2">Production Studio</h1>
                <p className="text-tech-grey">Initiate AI text-to-audio conversion for your magazine articles.</p>
             </div>
             
             {/* We can use the PodcastGenerator here for simple workflow or the PublisherStudio for advanced */}
             <div className="glass-panel p-8 mb-10 border border-[#333]">
                <h3 className="font-display text-xl text-white mb-6 border-b border-[#333] pb-4">Quick Podcast Conversion</h3>
                <PodcastGenerator />
             </div>
             
             <div className="mt-12">
               <h3 className="font-display text-xl text-white mb-6">Advanced Layout Studio</h3>
               <p className="text-tech-grey mb-6">Upload PDFs to visually extract dialogue and manage fine-grained voice generation.</p>
               <PublisherStudio />
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
             <div className="mb-10">
                <h1 className="text-3xl font-display font-medium text-white mb-2">Channel Settings</h1>
                <p className="text-tech-grey">Customize your public-facing magazine profile.</p>
             </div>
             
             <div className="glass-panel p-8 max-w-2xl">
                <div className="space-y-8">
                  <div>
                    <label className="block text-tech-dim text-xs uppercase tracking-widest mb-3">Channel Avatar</label>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-2xl bg-cover bg-center border border-[#333]" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=200&fit=crop)' }} />
                      <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all">
                        <ImageIcon size={14} /> Upload New
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-tech-dim text-xs uppercase tracking-widest mb-3">Publication Name</label>
                    <input type="text" className="input-field w-full" defaultValue="Farming Future" />
                  </div>
                  
                  <div>
                    <label className="block text-tech-dim text-xs uppercase tracking-widest mb-3">Company Bio</label>
                    <textarea rows={4} className="input-field w-full" defaultValue="The premier digital publication covering agricultural technology, sustainable farming, and global supply chains." />
                  </div>
                  
                  <div>
                    <label className="block text-tech-dim text-xs uppercase tracking-widest mb-3">Brand Accent Color</label>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-electric-cyan border-2 border-white ring-2 ring-electric-cyan/50 cursor-pointer" />
                      <div className="w-10 h-10 rounded-full bg-purple-500 border border-white/20 cursor-pointer hover:border-white/50 transition-colors" />
                      <div className="w-10 h-10 rounded-full bg-emerald-500 border border-white/20 cursor-pointer hover:border-white/50 transition-colors" />
                      <div className="w-10 h-10 rounded-full bg-blue-500 border border-white/20 cursor-pointer hover:border-white/50 transition-colors" />
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-[#333]">
                    <button className="btn-primary px-8 py-3 w-full sm:w-auto">Save Changes</button>
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}


function PulsePlayer() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Mock auto-progress
  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress(p => (p >= 100 ? 0 : p + 0.5));
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const transcript = [
    { start: 0, end: 20, speaker: 'Njabulo', text: "Welcome to Farming Future's audio edition. Today we are exploring the agricultural technology boom." },
    { start: 20, end: 40, speaker: 'Thandi', text: "That's right Njabulo. Modern logistics and precision farming are truly reshaping global supply chains." },
    { start: 40, end: 60, speaker: 'Njabulo', text: "Exactly. The pace is faster than regulatory adaptation. Let's look at the data." },
    { start: 60, end: 80, speaker: 'Thandi', text: "By analyzing data through multi-spectral drones, crop yields have increased by an unprecedented 22%." },
    { start: 80, end: 100, speaker: 'Njabulo', text: "It's an exciting time for the industry. Stay tuned for our deep dive into predictive analytics." }
  ];

  return (
    <div className="fixed inset-0 bg-charcoal-void z-50 flex flex-col md:flex-row overflow-hidden">
      {/* Left: Interactive Transcript */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-full border-b md:border-b-0 md:border-r border-[#333] relative bg-[#111] flex flex-col p-10 overflow-y-auto custom-scrollbar">
        <button onClick={() => navigate(-1)} className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10">
          <X className="w-5 h-5" />
        </button>
        
        <div className="mt-12 max-w-lg mx-auto w-full">
           <h3 className="text-tech-dim text-xs uppercase tracking-widest mb-8 font-bold flex items-center gap-2">
             <Layers className="w-4 h-4 text-electric-cyan" /> Interactive Audio Transcript
           </h3>
           
           <div className="space-y-6">
             {transcript.map((line, idx) => {
               const isActive = progress >= line.start && progress < line.end;
               return (
                 <div 
                   key={idx} 
                   className={`transition-all duration-500 cursor-pointer p-4 rounded-xl ${isActive ? 'bg-tech-accent/10 border border-tech-accent/30 scale-105 shadow-[0_10px_30px_rgba(0,229,255,0.1)]' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}`}
                   onClick={() => setProgress(line.start + 1)}
                 >
                   <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isActive ? 'text-tech-accent' : 'text-tech-dim'}`}>
                     {line.speaker}
                   </p>
                   <p className={`text-lg leading-relaxed ${isActive ? 'text-white' : 'text-slate-300'}`}>
                     {line.text}
                   </p>
                 </div>
               );
             })}
           </div>
        </div>
      </div>

      {/* Right: The Audio (DigiMag Podcast) */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-full bg-charcoal-base relative flex flex-col items-center justify-center p-8">
        <div className="absolute top-0 right-0 w-[120%] h-[120%] bg-electric-cyan/5 blur-[120px] rounded-full pointer-events-none opacity-50" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center gap-3 mb-8 justify-center">
             <div className="w-2 h-2 rounded-full bg-electric-cyan animate-pulse" />
             <span className="text-xs font-mono tracking-widest text-electric-cyan uppercase">Pulse AI Sync Active</span>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-medium text-white mb-2">The Agricultural Technology Boom</h2>
            <p className="text-tech-grey">Farming Future • Page 12</p>
          </div>

          <div className="glass-panel p-6 mb-12 flex flex-col items-center">
             <div className="w-full flex justify-between text-xs font-mono text-tech-dim mb-3">
               <span>{String(Math.floor((progress/100)*12)).padStart(2, '0')}:{(Math.floor(((progress/100)*12)*60)%60).toString().padStart(2, '0')}</span>
               <span>12:00</span>
             </div>
             <div className="w-full h-1 bg-[#333] rounded-full overflow-hidden mb-8 relative">
               <div className="absolute top-0 left-0 bottom-0 bg-electric-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)] transition-all duration-500 ease-linear" style={{ width: `${progress}%` }} />
             </div>

             <div className="flex items-center gap-8">
               <button className="text-tech-dim hover:text-white transition-colors">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
               </button>
               <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 rounded-full bg-electric-cyan text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                 {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
               </button>
               <button className="text-tech-dim hover:text-white transition-colors">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" /></svg>
               </button>
             </div>
          </div>

          <div className="flex items-center justify-center gap-2 pr-2 h-8">
             {[1,2,3,4,5,6,7].map(i => (
               <div key={i} className={`w-1 bg-electric-cyan rounded-full transition-all duration-200 ${isPlaying ? 'opacity-100' : 'opacity-20'}`} style={{ height: isPlaying ? `${Math.random() * 100}%` : '20%' }} />
             ))}
          </div>

        </div>
      </div>
    </div>
  );
}

function PublisherPricing() {
  return (
    <div className="min-h-screen bg-charcoal-void pt-28 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-electric-cyan/10 blur-[120px] rounded-full pointer-events-none" />
          <h1 className="text-5xl md:text-6xl font-display font-medium text-white mb-6 leading-tight relative z-10">Automate Your Audio Strategy</h1>
          <p className="text-xl text-tech-grey max-w-3xl mx-auto leading-relaxed relative z-10">
            Replace expensive, slow podcast production agencies with our lightning-fast 
            <span className="text-electric-cyan"> AI-to-Audio pipeline</span>. Scale your content and drive revenue.
          </p>
        </div>

        {/* Analytics Hook */}
        <section className="mb-24">
          <div className="glass-panel p-10 md:p-12 relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-electric-cyan/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1">
                <h2 className="text-3xl font-display font-medium text-white mb-4">The ROI of Interactive Audio</h2>
                <p className="text-tech-grey text-lg leading-relaxed mb-6">
                  Embedded audio transforms your digital magazine into a habitual experience. Industry data shows 
                  <strong className="text-electric-cyan font-bold mx-2">25% of audio listeners return weekly.</strong>
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-electric-cyan/10 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-electric-cyan" />
                    </div>
                    <div className="text-sm">
                      <p className="text-white font-medium mb-0.5">Deep Analytics</p>
                      <p className="text-tech-dim">Event tracking & CRM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-electric-cyan/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-electric-cyan" />
                    </div>
                    <div className="text-sm">
                      <p className="text-white font-medium mb-0.5">Attribution</p>
                      <p className="text-tech-dim">Prove listener LTV</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-[400px]">
                 <div className="bg-charcoal-base border border-[#333] rounded-xl p-6">
                   <div className="flex justify-between items-end mb-6">
                     <div>
                       <p className="text-xs font-mono text-tech-dim uppercase tracking-widest mb-1">Weekly Listeners</p>
                       <p className="text-3xl font-display text-white">24.5k<span className="text-electric-cyan text-sm ml-2">↑ 12%</span></p>
                     </div>
                     <div className="flex gap-1 items-end h-16">
                       {[0.4, 0.7, 0.5, 0.9, 0.6, 1.0, 0.8].map((v, i) => (
                         <div key={i} className="w-3 bg-electric-cyan/80 rounded-t-sm" style={{ height: `${v * 100}%` }} />
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          <div className="glass-panel p-8 border border-white/5 hover:border-electric-cyan/30 transition-colors flex flex-col">
            <h3 className="text-2xl font-display font-medium text-white mb-2">Starter</h3>
            <p className="text-tech-dim text-sm mb-6">For smaller, niche magazines</p>
            <div className="mb-8">
              <span className="text-4xl font-display text-white">$500</span>
              <span className="text-tech-dim">/mo</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              {[
                "10 AI-generated audio episodes/mo", 
                "Standard text-to-speech voices", 
                "Basic hosting & embed codes",
                "Up to 60 minutes of audio/mo"
              ].map(f => (
                <li key={f} className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-electric-cyan/70 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-4 rounded-xl border border-[#333] hover:border-electric-cyan text-white hover:text-electric-cyan font-medium transition-all">Get Started</button>
          </div>

          <div className="glass-panel p-8 border-2 border-electric-cyan relative flex flex-col transform md:-translate-y-4 shadow-[0_10px_40px_rgba(0,229,255,0.15)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-electric-cyan text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Most Popular</div>
            <h3 className="text-2xl font-display font-medium text-white mb-2">Growth</h3>
            <p className="text-tech-dim text-sm mb-6">Full-service AI production suite</p>
            <div className="mb-8">
              <span className="text-4xl font-display text-white">$2,000</span>
              <span className="text-tech-dim">/mo</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              {[
                "40 AI-generated audio episodes/mo", 
                "Advanced AI Host interactions", 
                "Auto-generated show notes & transcripts",
                "AI blog post summaries",
                "Social media audiogram exports"
              ].map(f => (
                <li key={f} className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-electric-cyan shrink-0" />
                  <span className="font-medium text-white/90">{f}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-4 rounded-xl btn-primary text-black font-bold uppercase text-sm tracking-widest">Start Free Trial</button>
          </div>

          <div className="glass-panel p-8 border border-white/5 hover:border-electric-cyan/30 transition-colors flex flex-col">
            <h3 className="text-2xl font-display font-medium text-white mb-2">Enterprise</h3>
            <p className="text-tech-dim text-sm mb-6">Designed for major publishing houses</p>
            <div className="mb-8">
              <span className="text-4xl font-display text-white">$8,000+</span>
              <span className="text-tech-dim">/mo</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              {[
                "Unlimited audio generation", 
                "Multi-platform citation tracking", 
                "White-label mobile app integration",
                "Dedicated CRM & analytics APIs",
                "Priority 24/7 technical support"
              ].map(f => (
                <li key={f} className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-electric-cyan/70 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-4 rounded-xl border border-[#333] hover:border-electric-cyan text-white hover:text-electric-cyan font-medium transition-all">Contact Sales</button>
          </div>
        </div>

        {/* Premium Add-ons */}
        <section>
          <h2 className="text-3xl font-display font-medium text-white mb-10 text-center">Premium Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#121212] border border-[#333] rounded-2xl p-8 hover:border-electric-cyan/50 transition-colors group">
               <div className="w-14 h-14 rounded-full bg-electric-cyan/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <Mic className="w-7 h-7 text-electric-cyan" />
               </div>
               <h4 className="text-xl font-display text-white mb-3">Professional Voice Cloning</h4>
               <p className="text-tech-grey leading-relaxed">
                 Preserve your trusted brand identity. We offer consented, secure voice cloning models so your magazine maintains a consistent, authoritative voice across all audio formats without the hassle of studio bookings.
               </p>
            </div>
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#121212] border border-[#333] rounded-2xl p-8 hover:border-electric-cyan/50 transition-colors group">
               <div className="w-14 h-14 rounded-full bg-electric-cyan/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <Globe className="w-7 h-7 text-electric-cyan" />
               </div>
               <h4 className="text-xl font-display text-white mb-3">Multilingual Expansion</h4>
               <p className="text-tech-grey leading-relaxed">
                 Instantly open up global markets. Our translation layer automatically converts your audio editions into dozens of languages, preserving the original tone and emotion of your localized content.
               </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-charcoal-void/80 backdrop-blur-xl border-b border-[#333]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-electric-cyan flex items-center justify-center">
            <Headphones className="w-5 h-5 text-black" />
          </div>
          <span className="text-white font-display font-medium text-lg tracking-wide">DigiMag<span className="text-electric-cyan">Pulse</span></span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/publishers')} className="text-sm font-medium text-electric-cyan hover:text-white transition-colors border-r border-[#333] pr-4 mr-1">For Publishers</button>
          <button onClick={() => navigate('/publisher/farming-future')} className="text-sm font-medium text-tech-grey hover:text-white transition-colors">Channels</button>
          <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-electric-cyan hover:text-white transition-colors border border-electric-cyan/20 px-4 py-1.5 rounded-full">Sign In</button>
        </div>
      </div>
    </nav>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-charcoal-void text-slate-100 font-sans min-h-screen selection:bg-electric-cyan/30">
        <Navbar />
        <Routes>
          <Route path="/" element={<DiscoveryDashboard />} />
          <Route path="/discover" element={<DiscoveryDashboard />} />
          <Route path="/publisher/:id" element={<PublisherChannel />} />
          <Route path="/dashboard" element={<PublisherDashboard />} />
          <Route path="/issue/:id" element={<PulsePlayer />} />
          <Route path="/publishers" element={<PublisherPricing />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
