import { Routes, Route, Link } from 'react-router-dom';
import { SubscriptionManager } from './components/SubscriptionManager';
import { PublisherStudio } from './components/PublisherStudio';

export function PublisherDashboard() {
  return (
    <div className="min-h-screen bg-tech-void text-white font-sans flex flex-col">
       <header className="bg-tech-surface border-b border-[#333] p-4 flex justify-between items-center z-50 sticky top-0">
         <div className="flex items-center gap-4">
           <h1 className="text-2xl font-black text-white uppercase tracking-widest bg-tech-accent text-black px-3 py-1 rounded">Publisher</h1>
           <nav className="flex items-center gap-4 ml-8">
             <Link to="/publisher" className="text-tech-dim hover:text-white font-bold text-xs uppercase tracking-widest transition-colors">Overview</Link>
             <Link to="/publisher/studio" className="text-tech-dim hover:text-white font-bold text-xs uppercase tracking-widest transition-colors">Creator Studio</Link>
             <Link to="/publisher/billing" className="text-tech-dim hover:text-white font-bold text-xs uppercase tracking-widest transition-colors">Billing</Link>
             <a href="/" className="text-tech-dim hover:text-white font-bold text-xs uppercase tracking-widest transition-colors">View Public Library</a>
           </nav>
         </div>
         <button className="px-4 py-2 bg-[#333] rounded text-xs font-bold uppercase tracking-widest">Sign Out</button>
       </header>

       <main className="flex-1 max-w-7xl mx-auto w-full p-6">
          <Routes>
             <Route path="/" element={<Overview />} />
             <Route path="/billing" element={<SubscriptionManager />} />
             <Route path="/studio" element={<PublisherStudio />} />
          </Routes>
       </main>
    </div>
  );
}

// Dashboard Home Component
function Overview() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-display font-bold">Dashboard</h2>
      <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6">
         <p className="text-tech-dim">Welcome to your publisher portal. To use premium features, make sure your subscription is active.</p>
         <div className="mt-8 flex gap-4">
            <Link to="/publisher/billing" className="bg-tech-accent text-black font-bold uppercase tracking-widest text-xs px-6 py-3 rounded hover:bg-white transition-colors">Manage Subscription</Link>
            <Link to="/publisher/studio" className="border border-tech-accent text-tech-accent font-bold uppercase tracking-widest text-xs px-6 py-3 rounded hover:bg-tech-accent hover:text-black transition-colors">Open Creator Studio</Link>
         </div>
      </div>
      <div className="grid grid-cols-3 gap-6 mt-6">
         <div className="bg-[#111] border border-[#333] rounded-xl p-6">
           <h4 className="text-tech-dim text-xs font-bold uppercase tracking-widest mb-2">Total Issues</h4>
           <p className="text-3xl font-black text-white">0</p>
         </div>
         <div className="bg-[#111] border border-[#333] rounded-xl p-6">
           <h4 className="text-tech-dim text-xs font-bold uppercase tracking-widest mb-2">Total Readers</h4>
           <p className="text-3xl font-black text-white">0</p>
         </div>
         <div className="bg-[#111] border border-[#333] rounded-xl p-6">
           <h4 className="text-tech-dim text-xs font-bold uppercase tracking-widest mb-2">Audio Listens</h4>
           <p className="text-3xl font-black text-white">0</p>
         </div>
      </div>
    </div>
  );
}
