import React, { useState } from 'react';
import { 
  Home, 
  Compass, 
  Library, 
  MessageCircle, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Search, 
  Heart, 
  ChevronLeft,
  MoreVertical,
  Users,
  Flame,
  Clock,
  Mic2,
  BookOpen,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AppLayout } from './AppLayout';

// --- Types ---

type Tab = 'HOME' | 'DISCOVER' | 'LIBRARY' | 'CHAT';

interface Episode {
  id: string;
  title: string;
  duration: string;
  plays: string;
  author: string;
  cover: string;
}

interface Magazine {
  id: string;
  title: string;
  issue: string;
  category: string;
  cover: string;
  tags: string[];
  description: string;
  episodes: Episode[];
}

// --- Mock Data ---

const CATEGORIES = ['All', 'Culture', 'Business', 'Travel', 'Lifestyle', 'Sport', 'Investigative'];

const MOCK_MAGAZINES: Magazine[] = [
  {
    id: 'm1',
    title: 'Harvest SA',
    issue: 'Summer Edition 2024',
    category: 'Business',
    cover: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=400',
    tags: ['TRENDING', 'AGRI-TECH'],
    description: 'Deep dive into the latest agricultural innovations shaping South Africa s farming future.',
    episodes: [
      { id: 'e1', title: 'The Future of Wheat', duration: '12:45', plays: '1.2k', author: 'Thandi & Njabulo', cover: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=100' },
      { id: 'e2', title: 'Smart Irrigation', duration: '08:20', plays: '840', author: 'Thandi & Njabulo', cover: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=100' },
    ]
  },
  {
    id: 'm2',
    title: 'Cape Vibe',
    issue: 'March 2024',
    category: 'Culture',
    cover: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80&w=400',
    tags: ['LOCAL', 'ARTS'],
    description: 'Exploring the hidden gems of the Western Cape s artistic community.',
    episodes: [
      { id: 'e3', title: 'Street Art of Woodstock', duration: '15:10', plays: '3.5k', author: 'Thandi & Njabulo', cover: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80&w=100' },
    ]
  },
  {
    id: 'm3',
    title: 'Safari Journal',
    issue: 'Special Issue',
    category: 'Travel',
    cover: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80&w=400',
    tags: ['WILDLIFE'],
    description: 'A journey through Kruger National Park s most remote corners.',
    episodes: []
  }
];

// --- Sub-Components ---

const MagazineCard = ({ magazine, onClick }: { magazine: Magazine; onClick: () => void }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex gap-4 p-4 glass-panel cursor-pointer"
  >
    <div className="relative w-24 h-32 flex-shrink-0">
      <img src={magazine.cover} alt={magazine.title} className="w-full h-full object-cover rounded-lg" />
      {magazine.tags.includes('TRENDING') && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-tech-accent text-[10px] font-black text-black rounded-sm flex items-center gap-1">
          <Flame size={10} fill="currentColor" />
          TRENDING
        </div>
      )}
    </div>
    <div className="flex flex-col justify-center gap-1 flex-1">
      <span className="text-[10px] font-bold text-tech-accent uppercase tracking-widest">{magazine.category}</span>
      <h3 className="text-lg font-display font-bold leading-tight">{magazine.title}</h3>
      <p className="text-xs text-tech-grey line-clamp-2">{magazine.description}</p>
    </div>
  </motion.div>
);

const HeroCard = ({ magazine, onClick }: { magazine: Magazine, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className="relative w-full h-[240px] sm:h-[300px] rounded-3xl overflow-hidden group cursor-pointer shadow-2xl shadow-tech-void/50"
  >
    <img src={magazine.cover} alt={magazine.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
    <div className="absolute inset-0 bg-gradient-to-t from-tech-void via-tech-void/20 to-transparent" />
    <div className="absolute bottom-6 left-6 right-6">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {magazine.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[10px] font-bold text-white tracking-widest">{tag}</span>
        ))}
      </div>
      <h2 className="text-2xl sm:text-3xl font-display font-black text-white leading-none mb-1 truncate">{magazine.title}</h2>
      <p className="text-xs sm:text-sm text-white/70">{magazine.issue}</p>
    </div>
  </div>
);

// --- Main Views ---

const HomeView = ({ onSelectMagazine }: { onSelectMagazine: (m: Magazine) => void }) => (
  <div className="space-y-8 pb-32">
    <div className="flex items-center justify-between px-6 pt-4">
      <div>
        <h1 className="text-2xl font-display font-black tracking-tight">DigiMagAI</h1>
        <div className="flex items-center gap-1 text-tech-accent text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-tech-accent animate-pulse" />
          <span>South Africa</span>
        </div>
      </div>
      <div className="relative w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-tech-surface">
        <img src="https://i.pravatar.cc/100?img=11" alt="Profile" />
        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-tech-void rounded-full" />
      </div>
    </div>

    <div className="px-6">
      <HeroCard magazine={MOCK_MAGAZINES[0]} onClick={() => onSelectMagazine(MOCK_MAGAZINES[0])} />
    </div>

    <section className="space-y-4">
      <div className="px-6 flex items-center justify-between">
        <h2 className="font-display font-bold text-lg">Trending Now</h2>
        <button className="text-xs text-tech-accent font-bold">See all</button>
      </div>
      <div className="flex gap-4 overflow-x-auto px-6 pb-2 no-scrollbar">
        {MOCK_MAGAZINES.map(m => (
          <div key={m.id} className="min-w-[280px]">
            <MagazineCard magazine={m} onClick={() => onSelectMagazine(m)} />
          </div>
        ))}
      </div>
    </section>

    <section className="px-6 space-y-4">
       <h2 className="font-display font-bold text-lg">Continue Listening</h2>
       <div className="glass-panel p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-tech-accent/20 flex items-center justify-center text-tech-accent">
            <Play size={20} fill="currentColor" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm">The Future of Wheat</h4>
            <div className="w-full h-1 bg-white/10 rounded-full mt-2">
              <div className="w-2/3 h-full bg-tech-accent rounded-full" />
            </div>
          </div>
          <span className="text-[10px] text-tech-grey font-bold">08:20 left</span>
       </div>
    </section>
  </div>
);

const DiscoverView = ({ onSelectMagazine }: { onSelectMagazine: (m: Magazine) => void }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  
  return (
    <div className="space-y-6 pb-32 pt-4">
      <div className="px-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tech-grey" size={20} />
          <input 
            type="text" 
            placeholder="Search magazine or podcast..."
            className="w-full bg-tech-surface border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:border-tech-accent transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-6 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
              activeCategory === cat ? "bg-tech-accent text-black" : "bg-white/5 text-tech-grey"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="px-6 grid grid-cols-1 gap-4">
        {MOCK_MAGAZINES.filter(m => activeCategory === 'All' || m.category === activeCategory).map(m => (
          <MagazineCard key={m.id} magazine={m} onClick={() => onSelectMagazine(m)} />
        ))}
      </div>
    </div>
  );
};

const LibraryView = () => (
  <div className="space-y-6 pb-32 pt-4">
    <div className="px-6 flex items-center justify-between">
      <h1 className="text-2xl font-display font-black">My Podcasts</h1>
      <button className="p-2 bg-white/5 rounded-full"><Clock size={18} /></button>
    </div>
    
    <div className="px-6 space-y-4">
      {MOCK_MAGAZINES.flatMap(m => m.episodes).map((ep, idx) => (
        <div key={idx} className="flex items-center gap-4 group">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
            <img src={ep.cover} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm leading-tight text-white/90">{ep.title}</h4>
            <p className="text-xs text-tech-grey">{ep.author} • {ep.duration}</p>
          </div>
          <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-tech-accent group-hover:bg-tech-accent group-hover:text-black transition-all">
            <Play size={16} fill="currentColor" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

const ChatView = () => (
  <div className="h-[calc(100vh-160px)] flex flex-col pt-4">
    <div className="px-6 pb-4 border-b border-white/5 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-display font-black text-lg">Live Chat</h2>
          <span className="px-2 py-0.5 bg-red-500 rounded text-[10px] font-black text-white animate-pulse">LIVE</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-tech-grey font-bold">
          <Users size={12} />
          <span>Harvest SA Summer Edition • 1.2k viewing</span>
        </div>
      </div>
      <div className="flex -space-x-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-7 h-7 rounded-full border-2 border-tech-void overflow-hidden">
            <img src={`https://i.pravatar.cc/50?img=${i + 20}`} alt="" />
          </div>
        ))}
      </div>
    </div>

    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar">
       <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-tech-surface flex-shrink-0 overflow-hidden">
            <img src="https://i.pravatar.cc/50?img=33" alt="" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-tech-accent">Pieter van der Merwe</span>
              <span className="text-[10px] text-tech-grey">Just now</span>
            </div>
            <div className="bg-tech-surface px-4 py-3 rounded-2xl rounded-tl-none inline-block max-w-[80%]">
              <p className="text-sm text-white/90 leading-relaxed">That segment about the hydro-drones was absolute madness! 🚀</p>
            </div>
          </div>
       </div>

       <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-tech-surface flex-shrink-0 overflow-hidden">
            <img src="https://i.pravatar.cc/50?img=25" alt="" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-protea-pink">Lerato Khoza</span>
              <span className="text-[10px] text-tech-grey">2m ago</span>
            </div>
            <div className="bg-tech-surface px-4 py-3 rounded-2xl rounded-tl-none inline-block max-w-[80%]">
              <p className="text-sm text-white/90 leading-relaxed">Thandi s laugh is too much today 😂 NJ is catching hands!</p>
            </div>
          </div>
       </div>
    </div>

    <div className="p-4 border-t border-white/5">
      <div className="relative flex items-center">
        <input 
          type="text" 
          placeholder="Say something..."
          className="w-full bg-tech-surface rounded-full py-4 px-6 text-sm focus:outline-none placeholder:text-tech-grey"
        />
        <button className="absolute right-2 w-10 h-10 rounded-full bg-tech-accent text-black flex items-center justify-center">
          <Play size={16} fill="currentColor" />
        </button>
      </div>
    </div>
  </div>
);

const PlayerView = ({ episode, onClose }: { episode: Episode; onClose: () => void }) => (
  <motion.div 
    initial={{ y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    className="fixed inset-0 z-[200] bg-tech-void overflow-y-auto no-scrollbar"
  >
    <div className="px-6 py-6 flex items-center justify-between">
      <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-tech-grey hover:text-white"><ChevronLeft size={24} /></button>
      <div className="text-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-tech-grey">NOW PLAYING</span>
        <h4 className="text-xs font-bold text-tech-accent">{episode.author}</h4>
      </div>
      <button className="p-2 rounded-full bg-white/5 text-tech-grey hover:text-white"><MoreVertical size={20} /></button>
    </div>

    <div className="px-10 py-10">
      <div className="aspect-square w-full rounded-3xl overflow-hidden shadow-2xl shadow-tech-accent/10 border border-white/5 bg-tech-surface">
        <img src={episode.cover} alt={episode.title} className="w-full h-full object-cover" />
      </div>
    </div>

    <div className="px-10 pb-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <h2 className="text-3xl font-display font-black leading-tight mb-1">{episode.title}</h2>
          <p className="text-lg font-bold text-tech-accent">{episode.author}</p>
        </div>
        <button className="text-tech-accent"><Heart size={28} /></button>
      </div>

      <div className="space-y-2 mb-10">
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '40%' }}
            className="h-full bg-tech-accent shadow-[0_0_10px_rgba(234,179,8,0.5)]"
          />
        </div>
        <div className="flex justify-between text-[10px] font-black text-tech-grey tracking-widest">
          <span>04:20</span>
          <span>{episode.duration}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 mb-12">
        <button className="text-tech-grey hover:text-white"><SkipBack size={32} /></button>
        <button className="w-24 h-24 rounded-full bg-tech-accent text-black flex items-center justify-center shadow-2xl shadow-tech-accent/20 active:scale-95 transition-transform">
          <Play size={44} fill="currentColor" />
        </button>
        <button className="text-tech-grey hover:text-white"><SkipForward size={32} /></button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-tech-grey">Transcript</h3>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        
        <div className="space-y-6 opacity-60">
           <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-tech-accent/20 flex-shrink-0 flex items-center justify-center text-tech-accent font-black text-[10px]">TH</div>
              <p className="text-sm leading-relaxed text-white/90 font-medium">So Njabulo, I was looking at these new hydro-drones in the Free State...</p>
           </div>
           <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-protea-pink/20 flex-shrink-0 flex items-center justify-center text-protea-pink font-black text-[10px]">NJ</div>
              <p className="text-sm leading-relaxed text-white/90 font-medium">Wait, did they actually name them Gutter-Ducks? I cannot believe it!</p>
           </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// --- Reader Detail Screen ---

const ReaderDetail = ({ magazine, onClose }: { magazine: Magazine; onClose: () => void }) => {
  const [showGenerateDrawer, setShowGenerateDrawer] = useState(false);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-tech-void overflow-y-auto no-scrollbar pb-32"
    >
      {/* Header with Adaptive Gradient */}
      <div className="relative p-6 px-6 pt-12 space-y-8" style={{
        background: `linear-gradient(180deg, #1a1f26 0%, #0a0a0b 100%)`
      }}>
        <div className="flex justify-between items-center">
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/70 hover:text-white"><ChevronLeft /></button>
          <button className="p-2 bg-white/5 rounded-full text-white/70 hover:text-white"><MoreVertical /></button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 pb-4 items-center sm:items-stretch text-center sm:text-left">
          <div className="w-40 h-56 sm:w-32 sm:h-44 rounded-xl overflow-hidden flex-shrink-0 shadow-2xl border border-white/10">
            <img src={magazine.cover} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center gap-3 w-full">
             <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {magazine.tags.map(t => (
                  <span key={t} className="text-[10px] font-black tracking-widest text-tech-accent border border-tech-accent/30 px-2 py-0.5 rounded-sm uppercase">{t}</span>
                ))}
              </div>
            <h1 className="text-3xl lg:text-4xl font-display font-black leading-tight text-white">{magazine.title}</h1>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-bold text-tech-accent uppercase tracking-widest">{magazine.category}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-xs font-bold text-tech-grey">{magazine.issue}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button className="flex-1 bg-tech-accent text-black font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-tech-accent/20 active:scale-95 transition-all">
                <Play size={14} fill="currentColor" /> Play Latest
              </button>
              <button className="p-3 border border-white/10 rounded-xl text-white/50 hover:text-tech-accent transition-colors flex items-center justify-center gap-2 text-xs font-bold">
                 <Heart size={16} /> <span className="sm:hidden">Favorite</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stacked Content Flow */}
      <div className="p-6 space-y-10">
        {/* About Section */}
        <section>
          <h4 className="text-[10px] font-black uppercase text-tech-accent mb-3 tracking-widest">Overview</h4>
          <p className="text-sm text-tech-grey leading-relaxed">{magazine.description}</p>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-tech-surface/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
            <BookOpen size={18} className="text-tech-accent mb-2" />
            <span className="block text-xl font-bold text-white">12</span>
            <span className="text-[9px] text-tech-grey uppercase tracking-widest font-black">Articles</span>
          </div>
          <div className="bg-tech-surface/40 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
            <Users size={18} className="text-tech-accent mb-2" />
            <span className="block text-xl font-bold text-white">4.2k</span>
            <span className="text-[9px] text-tech-grey uppercase tracking-widest font-black">Listeners</span>
          </div>
        </div>

        {/* Episodes Section */}
        <section className="space-y-4">
          <h4 className="text-[10px] font-black uppercase text-tech-accent mb-4 tracking-widest">Episodes</h4>
          <div className="space-y-3">
            {magazine.episodes.length > 0 ? magazine.episodes.map((ep, idx) => (
              <div key={ep.id} className="flex items-center gap-4 p-4 bg-tech-surface/40 rounded-2xl border border-white/5 group hover:bg-tech-surface transition-colors">
                <div className="w-10 h-10 rounded-xl bg-tech-void flex items-center justify-center font-display font-bold text-tech-accent text-sm">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-white group-hover:text-tech-accent transition-colors">{ep.title}</h4>
                  <p className="text-[10px] text-tech-grey uppercase tracking-widest font-bold mt-0.5">{ep.duration} • {ep.plays} plays</p>
                </div>
                <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-tech-accent group-hover:bg-tech-accent group-hover:text-black transition-all">
                  <Play size={14} fill="currentColor" />
                </button>
              </div>
            )) : (
              <div className="py-12 text-center bg-white/5 rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-tech-grey">
                  <Mic2 size={24} />
                </div>
                <p className="text-xs text-tech-grey font-bold">No episodes generated yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating Action Button (FAB) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowGenerateDrawer(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-tech-accent rounded-full shadow-2xl shadow-tech-accent/40 flex items-center justify-center text-tech-void z-[110]"
      >
        <Mic2 size={28} />
      </motion.button>

      {/* Generate Drawer (Half-Sheet) */}
      <AnimatePresence>
        {showGenerateDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGenerateDrawer(false)}
              className="fixed inset-0 bg-tech-void/80 backdrop-blur-sm z-[150]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: '30%' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[160] bg-tech-surface rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 flex flex-col items-center">
                <div className="w-12 h-1.5 bg-white/10 rounded-full mb-8" />
                <div className="text-center space-y-2 mb-10">
                   <h3 className="text-2xl font-display font-black text-white">Generate with AI</h3>
                   <p className="text-sm text-tech-grey max-w-[240px] mx-auto">Upload a PDF to turn this issue into a podcast hosted by Thandi & Njabulo.</p>
                </div>

                <div className="w-full px-4 space-y-6">
                  <div className="border-2 border-dashed border-white/5 rounded-3xl p-10 text-center space-y-4 hover:border-tech-accent/30 transition-colors cursor-pointer group">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-tech-grey group-hover:text-tech-accent transition-colors">
                      <Upload size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Upload PDF Issue</h4>
                      <p className="text-[10px] text-tech-grey uppercase tracking-widest font-black mt-1">Maximum 50MB</p>
                    </div>
                  </div>

                  <button className="w-full py-5 bg-tech-accent text-tech-void font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-tech-accent/20 active:scale-95 transition-transform">
                    Start Generation
                  </button>
                  
                  <button 
                    onClick={() => setShowGenerateDrawer(false)}
                    className="w-full py-4 text-tech-grey font-bold text-xs uppercase tracking-widest"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Main Mobile OS Shell ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) => (
  <div className="flex flex-col h-full p-6">
    <div className="mb-12">
      <h1 className="text-2xl font-display font-black tracking-tight text-tech-accent uppercase">DigiMag</h1>
      <p className="text-[10px] text-tech-grey font-black tracking-widest mt-1">THE FUTURE IS AUDIO</p>
    </div>

    <nav className="flex-1 space-y-2">
      <div className="text-[10px] text-tech-grey font-black tracking-[0.2em] mb-4 uppercase">Main Menu</div>
      <SidebarItem active={activeTab === 'HOME'} onClick={() => setActiveTab('HOME')} icon={<Home size={20} />} label="Home" />
      <SidebarItem active={activeTab === 'DISCOVER'} onClick={() => setActiveTab('DISCOVER')} icon={<Compass size={20} />} label="Discover" />
      <SidebarItem active={activeTab === 'LIBRARY'} onClick={() => setActiveTab('LIBRARY')} icon={<Library size={20} />} label="Library" />
      <SidebarItem active={activeTab === 'CHAT'} onClick={() => setActiveTab('CHAT')} icon={<MessageCircle size={20} />} label="Community" />
    </nav>

    <div className="mt-auto pt-6 border-t border-white/5 space-y-6">
       <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tech-surface overflow-hidden">
            <img src="https://i.pravatar.cc/100?img=11" alt="Profile" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Thandi M.</h4>
            <p className="text-[10px] text-tech-grey font-bold uppercase tracking-widest">Premium Member</p>
          </div>
       </div>
    </div>
  </div>
);

const SidebarItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
      active ? "bg-tech-accent text-black font-black" : "text-tech-grey hover:bg-white/5 hover:text-white"
    )}
  >
    <span className={cn(active ? "text-black" : "text-tech-accent group-hover:scale-110 transition-transform")}>{icon}</span>
    <span className="text-sm">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-black shadow-lg" />}
  </button>
);

export const MobileOS = () => {
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const currentEpisode = MOCK_MAGAZINES[0].episodes[0];

  const renderView = () => {
    switch (activeTab) {
      case 'HOME': return <HomeView onSelectMagazine={setSelectedMagazine} />;
      case 'DISCOVER': return <DiscoverView onSelectMagazine={setSelectedMagazine} />;
      case 'LIBRARY': return <LibraryView />;
      case 'CHAT': return <ChatView />;
      default: return <HomeView onSelectMagazine={setSelectedMagazine} />;
    }
  };

  return (
    <AppLayout
      sidebar={<Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
      bottomNav={
        <div className="flex items-center justify-around p-2">
          <TabButton active={activeTab === 'HOME'} onClick={() => setActiveTab('HOME')} icon={<Home size={22} />} label="Home" />
          <TabButton active={activeTab === 'DISCOVER'} onClick={() => setActiveTab('DISCOVER')} icon={<Compass size={22} />} label="Discover" />
          <TabButton active={activeTab === 'LIBRARY'} onClick={() => setActiveTab('LIBRARY')} icon={<Library size={22} />} label="Library" />
          <TabButton active={activeTab === 'CHAT'} onClick={() => setActiveTab('CHAT')} icon={<MessageCircle size={22} />} label="Community" />
        </div>
      }
      playerBar={
        <AnimatePresence>
          {currentEpisode && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={() => setIsPlayerExpanded(true)}
              className="glass-panel mb-2 overflow-hidden cursor-pointer backdrop-blur-3xl shadow-2xl shadow-black/50 border border-white/10"
            >
              <div className="h-1 bg-white/5">
                <div className="h-full bg-tech-accent w-1/3 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              </div>
              <div className="p-3 flex items-center justify-between gap-3">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                      <img src={currentEpisode.cover} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-sm truncate text-white">{currentEpisode.title}</h4>
                      <div className="flex items-center gap-2">
                         <div className="flex items-end gap-0.5 h-3">
                           <div className="w-1 h-2 bg-tech-accent rounded-sm animate-bounce" />
                           <div className="w-1 h-3 bg-tech-accent rounded-sm animate-bounce [animation-delay:0.1s]" />
                           <div className="w-1 h-1.5 bg-tech-accent rounded-sm animate-bounce [animation-delay:0.2s]" />
                         </div>
                         <span className="text-[10px] font-bold text-tech-grey uppercase tracking-widest">{currentEpisode.author}</span>
                      </div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-1">
                    <button className="p-2 text-white/60 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}><SkipBack size={18} /></button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPlaying(!isPlaying);
                      }}
                      className="w-12 h-12 rounded-full bg-tech-accent text-black flex items-center justify-center shadow-xl shadow-tech-accent/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>
                    <button className="p-2 text-white/60 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}><SkipForward size={18} /></button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      }
    >
      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>

      {/* Reader Screen Overlay */}
      <AnimatePresence>
        {selectedMagazine && (
          <ReaderDetail 
            magazine={selectedMagazine} 
            onClose={() => setSelectedMagazine(null)} 
          />
        )}
      </AnimatePresence>

      {/* Full Player View Overlay */}
      <AnimatePresence>
        {isPlayerExpanded && currentEpisode && (
          <PlayerView 
            episode={currentEpisode} 
            onClose={() => setIsPlayerExpanded(false)} 
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-300",
      active ? "text-tech-accent" : "text-tech-grey hover:text-white"
    )}
  >
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    {active && <motion.div layoutId="tab-indicator" className="w-1 h-1 rounded-full bg-tech-accent mt-0.5" />}
  </button>
);

export default MobileOS;
