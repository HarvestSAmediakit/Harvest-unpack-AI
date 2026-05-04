import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Play, 
  Trash2, 
  Plus, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Mic2,
  Settings,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { cn } from '../lib/utils';
import { 
  extractArticlesFromText, 
  extractArticlesFromPdfFile, 
  generatePodcastScript, 
  synthesizePodcastAudio 
} from '../services/geminiService';
import { extractTextFromPdf } from '../services/pdfService';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Dialogue {
  id: string;
  speaker: 'Thando' | 'Simba' | 'Narrator';
  text: string;
}

interface Article {
  title: string;
  summary: string;
  content: string;
  status: 'pending' | 'extracting' | 'generating' | 'completed' | 'error';
  audioUrl?: string;
}

export const PublisherStudio = () => {
  const [script, setScript] = useState<Dialogue[]>([
    { id: '1', speaker: 'Thando', text: "Sawubona! Welcome to another edition of DigiMag. I'm Thando." },
    { id: '2', speaker: 'Simba', text: "And I'm Simba. Today we're diving deep into the latest trends from the Summer Edition of Harvest SA." },
    { id: '3', speaker: 'Thando', text: "The main focus is on the impact of sustainable innovation. It's a game changer, don't you think?" }
  ]);
  
  const [pdfUrl, setPdfUrl] = useState('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf');
  const [extractedText, setExtractedText] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [studioMode, setStudioMode] = useState<'manual' | 'autopilot'>('manual');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeDialogueId, setActiveDialogueId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setPageNumber(1);

      try {
        // Step 1: Trigger Layout-Aware Extraction (Native PDF Ingestion)
        await extractArticlesBatch(file);
        
        // Parallel fallback: Local text extraction (legacy support or text-based features)
        const text = await extractTextFromPdf(file);
        setExtractedText(text);

        // EXTRA ARCHITECTURAL STEP: If in manual mode, automatically generate script once text is extracted
        if (studioMode === 'manual' && text) {
          const scriptData = await generatePodcastScript(text);
          if (scriptData && scriptData.length > 0) {
            setScript(scriptData.map((s: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              speaker: s.speaker,
              text: s.text
            })));
          }
        }
      } catch (err) {
        console.error("Layout analysis error:", err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const extractArticlesBatch = async (source: string | File) => {
    setIsProcessing(true);
    try {
      let articlesData;
      if (source instanceof File) {
        // ARCHITECTURAL STEP 1: Native PDF Ingestion
        articlesData = await extractArticlesFromPdfFile(source);
      } else {
        articlesData = await extractArticlesFromText(source);
      }

      if (articlesData && articlesData.length > 0) {
        const initialArticles = articlesData.map((a: any) => ({ ...a, status: 'pending' }));
        setArticles(initialArticles);
        if (studioMode === 'autopilot') {
          setTimeout(() => {
            generateAllEpisodes(initialArticles);
          }, 500);
        }
      }
    } catch (err) {
      console.error("Article extraction error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateEpisodeForArticle = async (index: number, overrideArticles?: Article[]) => {
    const list = overrideArticles || articles;
    const article = list[index];
    const newArticles = [...list];
    newArticles[index].status = 'generating';
    setArticles([...newArticles]);

    try {
      // 1. Generate Script
      const script = await generatePodcastScript(article.content, article.title);
      
      // 2. Generate Audio
      const audioUrl = await synthesizePodcastAudio(script);

      const finalArticles = [...newArticles];
      finalArticles[index].status = 'completed';
      finalArticles[index].audioUrl = audioUrl;
      setArticles([...finalArticles]);
    } catch (err) {
      console.error("Article generation error:", err);
      const errorArticles = [...newArticles];
      errorArticles[index].status = 'error';
      setArticles([...errorArticles]);
    }
  };

  const generateAllEpisodes = async (overrideArticles?: Article[]) => {
    const list = overrideArticles || articles;
    for (let i = 0; i < list.length; i++) {
      await generateEpisodeForArticle(i, overrideArticles);
    }
  };

  const generateScriptFromAI = async () => {
    if (!extractedText) {
      alert("Please upload a PDF first to extract text.");
      return;
    }
    setIsProcessing(true);
    try {
      const script = await generatePodcastScript(extractedText);
      if (script && script.length > 0) {
        const formattedScript = script.map((s: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          speaker: s.speaker,
          text: s.text
        }));
        setScript(formattedScript);
      }
    } catch (err) {
      console.error("Script generation error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAudioFromAI = async () => {
    setIsProcessing(true);
    try {
      const url = await synthesizePodcastAudio(script);
      if (url) {
        setAudioUrl(url);
        alert("Audio generated! You can now preview it.");
      }
    } catch (err) {
      console.error("Audio generation error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const renderPage = async () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        try {
          await renderTaskRef.current.promise;
        } catch (err) {}
        renderTaskRef.current = null;
      }
      
      if (!isMounted || !pdfUrl || !canvasRef.current) return;
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        if (!isMounted) return;
        setNumPages(pdf.numPages);
        const page = await pdf.getPage(pageNumber);
        if (!isMounted) return;
        
        const containerWidth = canvasRef.current.parentElement?.clientWidth || 600;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = containerWidth / unscaledViewport.width;
        
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (canvas && context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const renderContext: any = { canvasContext: context, viewport };
          const renderTask = page.render(renderContext);
          renderTaskRef.current = renderTask;
          await renderTask.promise;
          if (isMounted) {
            renderTaskRef.current = null;
          }
        }
      } catch (err: any) {
        if (isMounted) renderTaskRef.current = null;
        if (err.name !== 'RenderingCancelledException') {
          console.error("PDF Render Error:", err);
        }
      }
    };
    renderPage();
    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfUrl, pageNumber]);

  const addDialogue = () => {
    const newDialogue: Dialogue = {
      id: Math.random().toString(36).substr(2, 9),
      speaker: 'Thando',
      text: ''
    };
    setScript([...script, newDialogue]);
  };

  const updateDialogue = (id: string, text: string) => {
    setScript(script.map(d => d.id === id ? { ...d, text } : d));
  };

  const toggleSpeaker = (id: string) => {
    setScript(script.map(d => {
      if (d.id === id) {
        const speakers: Dialogue['speaker'][] = ['Thando', 'Simba', 'Narrator'];
        const currentIdx = speakers.indexOf(d.speaker);
        const nextIdx = (currentIdx + 1) % speakers.length;
        return { ...d, speaker: speakers[nextIdx] };
      }
      return d;
    }));
  };

  const removeDialogue = (id: string) => {
    setScript(script.filter(d => d.id !== id));
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsPublishing(false);
    alert("Issue Published Successfully!");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Action Bar */}
      <div className="bg-tech-surface border border-white/5 rounded-t-xl p-4 flex justify-between items-center bg-gradient-to-r from-tech-surface to-[#222]">
        <div className="flex items-center gap-4">
          <div className="bg-tech-accent/10 border border-tech-accent/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Settings size={14} className="text-tech-accent" />
            <span className="text-xs font-bold text-tech-accent uppercase tracking-widest">Studio Workspace: Harvest SA</span>
          </div>
          <div className="flex items-center bg-[#111] p-1 rounded-lg border border-white/5">
            <button 
              onClick={() => setStudioMode('manual')}
              className={cn(
                "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                studioMode === 'manual' ? "bg-tech-accent text-black" : "text-tech-dim hover:text-white"
              )}
            >
              Fine-Tune
            </button>
            <button 
              onClick={() => setStudioMode('autopilot')}
              className={cn(
                "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                studioMode === 'autopilot' ? "bg-tech-accent text-black" : "text-tech-dim hover:text-white"
              )}
            >
              Issue Auto-Pilot
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="application/pdf" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Plus size={14} /> {studioMode === 'autopilot' ? "Upload Full Issue" : "Upload Article PDF"}
          </button>
          <button 
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-2 px-6 py-2 bg-tech-accent text-black hover:bg-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-tech-accent/20"
          >
            {isPublishing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {isPublishing ? "Publishing..." : "Publish to Library"}
          </button>
        </div>
      </div>

      {/* Main Studio Split Area */}
      <div className="flex flex-1 overflow-hidden border-x border-b border-white/5 rounded-b-xl">
        
        {/* LEFT: PDF PREVIEW */}
        <div className="flex-1 bg-[#111] overflow-hidden flex flex-col border-r border-white/5">
          <div className="p-3 bg-black/40 flex justify-between items-center border-b border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-tech-grey flex items-center gap-2">
              <ImageIcon size={12} className="text-tech-accent" />
              Source Material: {studioMode === 'autopilot' ? "Entire Magazine Issue" : "Single Article"}
            </h3>
            <div className="flex items-center gap-4 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <button 
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                className="text-tech-grey hover:text-white transition-colors"
                disabled={pageNumber === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[10px] font-mono text-tech-dim tracking-widest uppercase">
                Page {pageNumber} / {numPages}
              </span>
              <button 
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                className="text-tech-grey hover:text-white transition-colors"
                disabled={pageNumber === numPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-8 flex justify-center bg-[#151515] custom-scrollbar">
            <div className="shadow-2xl shadow-black relative group">
              <canvas ref={canvasRef} className="max-w-full h-auto" />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                   <div className="flex flex-col items-center gap-4">
                      <RefreshCw size={32} className="text-tech-accent animate-spin" />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Extracting Magazine Articles...</span>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: WORKSPACE */}
        <div className="w-[520px] bg-tech-surface flex flex-col">
          {studioMode === 'autopilot' ? (
            /* AUTO-PILOT DASHBOARD */
            <div className="flex flex-col h-full bg-[#1A1A1A]">
               <div className="p-6 border-b border-white/5 bg-gradient-to-br from-tech-accent/5 to-transparent">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-xl font-display font-medium text-white mb-1">Issue Auto-Pilot</h4>
                      <p className="text-xs text-tech-grey">AI processing queue for all articles in this issue.</p>
                    </div>
                    <button 
                      onClick={() => generateAllEpisodes()}
                      disabled={articles.length === 0 || isProcessing}
                      className="px-4 py-2 bg-tech-accent text-black text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-tech-accent/20 disabled:opacity-50"
                    >
                      Start All Conversions
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                     <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] text-tech-dim uppercase mb-1">Detected</p>
                        <p className="text-xl font-display text-white">{articles.length}</p>
                     </div>
                     <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] text-tech-dim uppercase mb-1">Processed</p>
                        <p className="text-xl font-display text-white">{articles.filter(a => a.status === 'completed').length}</p>
                     </div>
                     <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] text-tech-dim uppercase mb-1">Failed</p>
                        <p className="text-xl font-display text-white">{articles.filter(a => a.status === 'error').length}</p>
                     </div>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {articles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                       <ImageIcon size={48} className="mb-4 text-tech-dim" />
                       <p className="text-sm font-medium text-white">No articles detected yet.</p>
                       <p className="text-xs text-tech-grey mt-2">Upload a magazine PDF to begin.</p>
                    </div>
                  ) : (
                    articles.map((article, idx) => (
                      <div key={idx} className="glass-panel p-4 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-3">
                         <div className="flex justify-between items-start">
                            <div className="flex-1 mr-4">
                               <h5 className="text-sm font-bold text-white mb-1 line-clamp-1">{article.title}</h5>
                               <p className="text-[10px] text-tech-grey line-clamp-2 leading-relaxed">{article.summary}</p>
                            </div>
                            <div className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded",
                              article.status === 'completed' ? "bg-green-500/20 text-green-400" :
                              article.status === 'generating' ? "bg-tech-accent/20 text-tech-accent animate-pulse" :
                              article.status === 'error' ? "bg-red-500/20 text-red-400" : "bg-white/5 text-tech-dim"
                            )}>
                               {article.status}
                            </div>
                         </div>
                         
                         <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <div className="flex items-center gap-4">
                               <div className="flex -space-x-2">
                                  <div className="w-5 h-5 rounded-full border-2 border-[#1A1A1A] bg-tech-accent flex items-center justify-center text-[8px] font-bold text-black" title="Host: Thando">T</div>
                                  <div className="w-5 h-5 rounded-full border-2 border-[#1A1A1A] bg-indigo-600 flex items-center justify-center text-[8px] font-bold text-white" title="Host: Simba">S</div>
                               </div>
                               <span className="text-[10px] font-mono text-tech-dim">Script: Ready</span>
                            </div>
                            {article.status === 'completed' && article.audioUrl ? (
                              <button 
                                onClick={() => {
                                  const audio = new Audio(article.audioUrl);
                                  audio.play();
                                }}
                                className="text-tech-accent hover:text-white transition-colors"
                              >
                                <Play size={14} />
                              </button>
                            ) : (
                              <button 
                                onClick={() => generateEpisodeForArticle(idx)}
                                disabled={article.status === 'generating'}
                                className="text-[10px] font-bold text-tech-accent hover:underline uppercase tracking-widest"
                              >
                                {article.status === 'generating' ? '...' : 'Process Now'}
                              </button>
                            )}
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          ) : (
            /* MANUAL (FINE-TUNE) SCRIPT EDITOR */
            <>
              <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-tech-accent flex items-center gap-2">
                    <Mic2 size={12} />
                    Podcast Script Orchestrator
                 </h3>
                 <div className="flex gap-2">
                   {audioUrl && (
                      <audio src={audioUrl} className="hidden" id="studio-preview-audio" />
                   )}
                   <button 
                    onClick={addDialogue}
                    className="p-1.5 bg-tech-accent text-black rounded hover:rotate-90 transition-transform duration-300"
                   >
                      <Plus size={16} />
                   </button>
                 </div>
              </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {script.map((item, index) => (
              <div 
                key={item.id}
                className={cn(
                  "group relative rounded-xl border p-4 transition-all duration-300",
                  activeDialogueId === item.id 
                    ? "bg-[#252525] border-tech-accent/30 shadow-lg" 
                    : "bg-white/5 border-white/5 hover:border-white/10"
                )}
                onFocus={() => setActiveDialogueId(item.id)}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleSpeaker(item.id)}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded transition-colors",
                        item.speaker === 'Thando' ? "bg-tech-accent text-black" : 
                        item.speaker === 'Simba' ? "bg-indigo-600 text-white" : "bg-gray-600 text-white"
                      )}
                    >
                      {item.speaker}
                    </button>
                    <span className="text-[10px] text-tech-grey font-mono uppercase tracking-widest">
                       Segment #{index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        const audio = document.getElementById('studio-preview-audio') as HTMLAudioElement;
                        audio?.play();
                      }}
                      className="p-1.5 text-tech-grey hover:text-tech-accent transition-colors"
                    >
                      <Play size={14} />
                    </button>
                    <button 
                      onClick={() => removeDialogue(item.id)}
                      className="p-1.5 text-tech-grey hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <textarea 
                  value={item.text}
                  onChange={(e) => updateDialogue(item.id, e.target.value)}
                  placeholder="Type or generate dialogue..."
                  className="w-full bg-transparent border-none text-sm leading-relaxed text-gray-200 focus:ring-0 resize-none p-0 custom-scrollbar"
                  rows={2}
                />
                
                <div className="mt-3 flex items-center justify-between">
                   <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const audio = document.getElementById('studio-preview-audio') as HTMLAudioElement;
                          audio?.play();
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-tech-grey hover:text-white transition-colors bg-white/5 px-2 py-1 rounded"
                      >
                         <Play size={10} /> Preview Voice
                      </button>
                   </div>
                   <div className="text-[10px] font-mono text-tech-dim">
                     {item.text.length} characters
                   </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={addDialogue}
              className="w-full py-8 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-tech-grey hover:text-tech-accent hover:border-tech-accent/30 transition-all group"
            >
               <Plus className="group-hover:scale-110 transition-transform" />
               <span className="text-xs font-bold uppercase tracking-widest">Add Dialogue Segment</span>
            </button>
          </div>

          <div className="p-4 bg-tech-surface border-t border-white/5 space-y-4">
            <div className="bg-black/30 p-3 rounded-lg flex items-start gap-3 border border-white/5">
                <AlertCircle size={16} className="text-tech-accent mt-0.5" />
                <div>
                   <h4 className="text-[10px] font-black uppercase text-white mb-1">AI Recommendation</h4>
                   <p className="text-[10px] leading-relaxed text-tech-grey">
                      {!extractedText ? "Upload a PDF to start script generation." : "Script is ready for fine-tuning."}
                   </p>
                </div>
            </div>
            <div className="flex gap-2">
               <button 
                onClick={generateScriptFromAI}
                disabled={isProcessing || !extractedText}
                className="flex-1 py-1.5 bg-tech-accent/10 border border-tech-accent/30 text-tech-accent rounded text-[10px] font-black uppercase tracking-tighter hover:bg-tech-accent/20 transition-all disabled:opacity-50"
               >
                  {isProcessing ? "Generating..." : "Re-Generate Full Script"}
               </button>
               <button 
                onClick={generateAudioFromAI}
                disabled={isProcessing || script.length === 0}
                className="flex-1 py-1.5 bg-white/5 border border-white/10 text-white rounded text-[10px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all disabled:opacity-50"
               >
                  {isProcessing ? "Synthesizing..." : "Convert to Audio"}
               </button>
            </div>
          </div>
         </>
         )}
        </div>
      </div>
    </div>
  );
};
