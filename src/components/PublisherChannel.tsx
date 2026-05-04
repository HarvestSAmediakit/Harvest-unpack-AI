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
      <header className="glass-panel rounded-xl p-8 flex items-start gap-8">
        <img src={publisher.logoUrl} alt={publisher.name} className="w-32 h-32 rounded-full object-cover border-4 border-tech-surface" />
        <div className="flex-1 space-y-4">
          <h1 className="text-4xl font-display font-bold text-white">{publisher.name}</h1>
          <p className="text-tech-grey">{publisher.bio}</p>
          <div className="flex items-center gap-4 text-tech-dim text-sm">
            <span>{publisher.followers} followers</span>
            {publisher.website && <a href={publisher.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-tech-accent"><LinkIcon size={14}/> Website</a>}
          </div>
          <div className="flex gap-4">
            <button className="bg-tech-accent text-slate-900 font-bold px-6 py-2 rounded-lg hover:opacity-90">
              {following ? "Following" : "Follow"}
            </button>
            <button className="border border-tech-dim text-white px-6 py-2 rounded-lg hover:bg-tech-surface">
              Subscribe (RSS)
            </button>
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-2xl font-display font-bold text-white mb-6">Episodes</h2>
        <div className="space-y-4">
          {episodes.map(ep => (
            <div key={ep.id} className="glass-panel p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between w-full">
                <div>
                  <h3 className="font-bold text-white text-lg">{ep.title}</h3>
                  <p className="text-sm text-tech-grey mt-1">{ep.duration} seconds</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => onEmbed(ep)}
                    className="p-2 bg-tech-surface hover:bg-slate-700 text-tech-dim hover:text-white rounded-lg transition-colors"
                    title="Embed"
                  >
                    <Code size={18} />
                  </button>
                  <button className="px-6 py-2 bg-tech-accent text-slate-900 rounded-lg font-bold hover:opacity-90 transition-opacity">
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
