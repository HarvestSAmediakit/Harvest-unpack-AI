import { useState, useEffect } from "react";
import { Link as LinkIcon, Code } from "lucide-react";

interface Publisher {
  id: string;
  name: string;
  bio: string;
  website: string;
  logoUrl: string;
  rssFeedUrl: string;
  followers: number;
}

interface Episode {
  id: string;
  title: string;
  description?: string;
  audioUrl: string;
  duration: number;
  created_at: string;
  articleId: string;
}

export function PublisherChannel({ publisherId, onEmbed }: { publisherId: string, onEmbed: (ep: Episode) => void }) {
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [following] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublisher() {
      try {
        const res = await fetch(`/api/publishers/${publisherId}`);
        const data = await res.json();
        setPublisher(data);
        setEpisodes(data.episodes);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    fetchPublisher();
  }, [publisherId]);

  if (loading) return <div className="text-white">Loading...</div>;
  if (!publisher) return <div className="text-white">Publisher not found</div>;

  return (
    <div className="space-y-12">
      <header className="glass-panel rounded-xl p-6 lg:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 lg:gap-8 text-center md:text-left">
        <img src={publisher.logoUrl} alt={publisher.name} className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-tech-surface shadow-2xl" />
        <div className="flex-1 space-y-4 w-full">
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-white tracking-tight">{publisher.name}</h1>
          <p className="text-tech-grey line-clamp-3 text-sm lg:text-base">{publisher.bio}</p>
          <div className="flex items-center justify-center md:justify-start gap-4 text-tech-dim text-xs lg:text-sm">
            <span className="font-mono">{publisher.followers.toLocaleString()} followers</span>
            {publisher.website && <a href={publisher.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-tech-accent transition-colors"><LinkIcon size={14}/> Website</a>}
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 lg:gap-4 pt-2">
            <button className="bg-tech-accent text-slate-900 font-bold px-6 py-2.5 rounded-lg hover:opacity-90 active:scale-95 transition-all text-sm">
              {following ? "Following" : "Follow"}
            </button>
            <button className="border border-tech-dim/30 text-white px-6 py-2.5 rounded-lg hover:bg-tech-surface active:scale-95 transition-all text-sm">
              Subscribe (RSS)
            </button>
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-2xl font-display font-bold text-white mb-6 px-1">Recent Episodes</h2>
        <div className="space-y-4">
          {episodes.map(ep => (
            <div key={ep.id} className="glass-panel p-5 lg:p-6 flex flex-col gap-4 hover:border-tech-accent/20 transition-colors">
              <div className="flex flex-col sm:flex-row items-start justify-between w-full gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-white text-base lg:text-lg hover:text-tech-accent transition-colors cursor-pointer">{ep.title}</h3>
                  <p className="text-[10px] lg:text-xs font-mono text-tech-dim uppercase tracking-widest mt-1.5">{ep.duration} seconds • {new Date(ep.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => onEmbed(ep)}
                    className="p-2.5 bg-tech-surface hover:bg-slate-700 text-tech-dim hover:text-white rounded-lg transition-colors border border-white/5"
                    title="Embed"
                  >
                    <Code size={18} />
                  </button>
                  <button className="flex-1 sm:flex-none px-8 py-2.5 bg-tech-accent text-slate-900 rounded-lg font-black uppercase tracking-widest text-[10px] hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-tech-accent/10">
                    Play
                  </button>
                </div>
              </div>
              {ep.description && (
                <div className="bg-[#111] p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-tech-grey leading-relaxed italic">
                    "{ep.description}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
