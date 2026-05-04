import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MagazineViewer } from './components/MagazineViewer';
import { Globe, BookOpen, Layers } from 'lucide-react';

export function PublicLibrary() {
  const [magazines, setMagazines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/magazines')
      .then(res => res.json())
      .then(data => {
        setMagazines(data.magazines || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-tech-void text-white font-sans">
      <header className="bg-tech-surface border-b border-[#333] p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-tech-accent uppercase tracking-widest flex items-center gap-2">
              <Globe size={24} />
              DigiMagAI Podcast
            </h1>
            <p className="text-[10px] text-tech-dim uppercase tracking-widest mt-1">Free digital magazines + AI Podcasts</p>
          </div>
          <div className="flex gap-4">
             <Link to="/publisher" className="px-4 py-2 bg-[#333] hover:bg-[#444] rounded text-xs font-bold uppercase tracking-widest transition-colors">Publisher Portal</Link>
             <Link to="/signup" className="px-4 py-2 bg-tech-accent text-black rounded font-bold text-xs uppercase tracking-widest transition-colors hover:scale-105">Sign Up (Free)</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        <div className="mb-12 flex items-center justify-between border-b border-[#333] pb-6">
           <div>
             <h2 className="text-3xl font-display font-bold">Discover Issues</h2>
             <p className="text-tech-dim mt-2 relative">Explore interactive editions with intelligent insights.</p>
           </div>
        </div>
        
        {loading ? (
          <div className="text-center p-20 animate-pulse text-tech-dim tracking-widest uppercase font-bold">Loading Library...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {magazines.map(mag => (
              <Link key={mag.id} to={`/issue/${mag.id}`} className="group block">
                <div className="bg-tech-surface rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 border border-[#333] group-hover:border-tech-accent shadow-xl flex flex-col h-full">
                  <div className="h-48 bg-[#111] overflow-hidden relative flex items-center justify-center">
                    {mag.coverImage ? (
                      <img src={mag.coverImage} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                    ) : (
                       <BookOpen size={48} className="text-tech-dim opacity-30" />
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-tech-accent transition-colors">{mag.title || 'Untitled Edition'}</h3>
                    <p className="text-xs text-tech-dim line-clamp-3 mb-4 flex-1">{mag.description || (mag.analysisJson?.executiveSummary) || 'No summary available.'}</p>
                    <div className="text-[10px] text-tech-accent font-mono uppercase font-bold flex items-center gap-2">
                      <Layers size={12} /> Read Issue Now
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export function FreeIssueViewer() {
  const { issueId } = useParams();
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/issues/${issueId}`)
      .then(res => res.json())
      .then(data => {
        setIssue(data);
        setLoading(false);
      });
  }, [issueId]);

  if (loading) return <div className="min-h-screen bg-tech-void flex items-center justify-center"><div className="animate-pulse tracking-widest uppercase text-tech-dim font-bold">Loading...</div></div>;
  if (!issue) return <div className="p-20 text-center">Issue not found</div>;

  return (
    <div className="min-h-screen bg-tech-void text-white flex flex-col">
       <header className="bg-tech-surface border-b border-[#333] p-4 flex justify-between items-center">
         <Link to="/" className="text-tech-dim hover:text-white font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2">&larr; Back to Library</Link>
         <h2 className="font-display font-bold text-lg truncate max-w-md">{issue.title}</h2>
         <Link to="/signup" className="px-4 py-1.5 bg-tech-accent/20 text-tech-accent border border-tech-accent/40 rounded text-[10px] font-bold uppercase tracking-widest">Sign in to save</Link>
       </header>
       <div className="flex-1 overflow-hidden p-6">
         <MagazineViewer 
           pdfUrl={issue.pdfUrl || ''} 
           aiSummary={issue.reportMarkdown || issue.aiSummary || ''} 
           audioUrl={issue.episodes?.[0]?.audioUrl}
           articles={issue.analysisJson?.articles || []}
         />
       </div>
    </div>
  );
}
