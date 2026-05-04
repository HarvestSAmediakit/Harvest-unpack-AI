import React, { useState } from 'react';
import { Loader2, Mic } from 'lucide-react';
import { generatePodcastScript, synthesizePodcastAudio } from '../services/geminiService';

export const PodcastGenerator: React.FC = () => {
  const [articleText, setArticleText] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [publisher, setPublisher] = useState("");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    try {
      // 1. Generate Script
      const script = await generatePodcastScript(articleText, title);
      
      // 2. Synthesize Audio
      const url = await synthesizePodcastAudio(script);
      
      setAudioUrl(url);
    } catch (err: any) {
      setError(err.message);
      alert("Generation failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 rounded-2xl flex flex-col gap-6">
      <h2 className="text-2xl font-display font-bold text-tech-accent glow-cyan">AI Podcast Generator</h2>
      <div className="space-y-4">
        <input
          type="text"
          className="input-field"
          placeholder="Publisher Name (e.g. DigiMagAI)"
          value={publisher || ""}
          onChange={(e) => setPublisher(e.target.value)}
        />
        <input
          type="text"
          className="input-field"
          placeholder="Article Title"
          value={title || ""}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="url"
          className="input-field"
          placeholder="Article URL (Optional)"
          value={articleUrl || ""}
          onChange={(e) => setArticleUrl(e.target.value)}
        />
        <textarea
          className="input-field min-h-[200px]"
          placeholder="Paste your magazine article here..."
          value={articleText || ""}
          onChange={(e) => setArticleText(e.target.value)}
        />
      </div>
      
      <button
        onClick={handleGenerate}
        disabled={isLoading || !articleText || !publisher || !title}
        className="btn-primary w-full"
      >
        {isLoading ? <Loader2 className="animate-spin" /> : <Mic />}
        {isLoading ? 'Synthesizing...' : 'Generate Podcast Episode'}
      </button>

      {audioUrl && (
        <div className="mt-4 p-4 bg-tech-accent/10 border border-tech-accent/30 rounded-xl animate-in fade-in slide-in-from-bottom-4">
          <p className="text-xs font-bold text-tech-accent uppercase tracking-widest mb-2">Generation Complete!</p>
          <audio src={audioUrl} controls className="w-full" autoPlay />
          <div className="mt-4 flex gap-4">
            <button 
              onClick={() => window.open(audioUrl)} 
              className="text-xs font-bold underline hover:text-white transition-colors"
            >
              Download MP3
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm font-medium">Error: {error}</p>}
    </div>
  );
};
