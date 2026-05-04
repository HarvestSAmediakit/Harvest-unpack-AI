import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import ReactMarkdown from 'react-markdown';

// Define workerSrc so PDF.js works using local Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const MagazineViewer = ({ 
  issueId: _issueId, 
  pdfUrl, 
  aiSummary, 
  audioUrl,
  articles = [],
  onGeneratePodcastForArticle
}: { 
  issueId?: string, 
  pdfUrl: string, 
  aiSummary?: string, 
  audioUrl?: string,
  articles?: any[],
  onGeneratePodcastForArticle?: (article: any) => void
}) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showPodcast, setShowPodcast] = useState(true);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    if (!pdfUrl) {
      setLoading(false);
      return;
    }
    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          try {
            await renderTaskRef.current.promise;
          } catch (err) {}
          renderTaskRef.current = null;
        }
        
        if (!isMounted) return;
        setLoading(true);
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        if (!isMounted) return;
        
        setNumPages(pdf.numPages);
        const page = await pdf.getPage(pageNumber);
        if (!isMounted) return;
        
        let scale = 1.0;
        const containerWidth = canvasRef.current?.parentElement?.clientWidth || window.innerWidth * 0.5;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        scale = containerWidth / unscaledViewport.width;
        if (scale > 2) scale = 2; // limit scale
        
        const viewport = page.getViewport({ scale: scale || 1.5 });
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext: any = { canvasContext: context!, viewport };
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
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    renderPage();
    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    }
  }, [pdfUrl, pageNumber]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-h-[85vh]">
      {/* PDF Viewer */}
      <div className="flex-1 bg-gray-800 rounded-lg overflow-auto border border-gray-700 shadow-xl flex flex-col">
        <div className="sticky top-0 bg-gray-900/90 backdrop-blur-md p-3 flex justify-between items-center z-10 border-b border-gray-700">
          <button 
            onClick={() => setPageNumber(p => Math.max(1, p-1))} 
            disabled={pageNumber === 1 || loading || !pdfUrl} 
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          <span className="font-mono text-sm tracking-widest text-gray-400">
            PAGE {pageNumber} {numPages ? `/ ${numPages}` : ''}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPageNumber(p => Math.min(numPages, p+1))} 
              disabled={pageNumber === numPages || loading || !pdfUrl} 
              className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              Next
            </button>
            {pdfUrl && (
              <button 
                onClick={() => window.open(pdfUrl)} 
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Download PDF
              </button>
            )}
          </div>
        </div>
        
        <div className="p-4 flex justify-center items-center flex-1 bg-[#1A1A1A] overflow-auto">
          {loading && <div className="text-tech-dim font-sans font-bold uppercase tracking-widest absolute animate-pulse">Loading Document...</div>}
          {!pdfUrl && !loading && (
            <div className="text-tech-dim font-sans font-bold uppercase tracking-widest">
              Digital Analyzer successfully queried document online.
            </div>
          )}
          <canvas 
            ref={canvasRef} 
            className="max-w-full h-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]" 
            style={{ display: loading || !pdfUrl ? 'none' : 'block' }} 
          />
        </div>
      </div>

      {/* Sidebar with summary + podcast */}
      <div className="w-full lg:w-[450px] flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        {aiSummary && (
          <div className="bg-[#1A1A1A] p-5 rounded-lg border border-[#333] shadow-xl">
            <h3 className="text-tech-accent font-sans font-black uppercase tracking-widest text-xl mb-4 flex items-center gap-2">
              <span className="text-2xl">⚡</span> Advanced Analysis
            </h3>
            <div className="text-sm text-gray-300 leading-relaxed markdown-body">
              <ReactMarkdown>{aiSummary}</ReactMarkdown>
            </div>
          </div>
        )}
        
        <div className="bg-[#1A1A1A] rounded-lg border border-[#333] shadow-xl flex-1 flex flex-col min-h-[300px]">
          <div className="p-4 border-b border-[#333] flex justify-between items-center bg-black/20">
            <h3 className="text-tech-accent font-sans font-black uppercase tracking-widest text-lg flex items-center gap-2">
              <span className="text-2xl">🎙️</span> Edition DeepDive
            </h3>
            {audioUrl && (
              <button onClick={() => setShowPodcast(!showPodcast)} className="text-xs text-tech-dim hover:text-white font-medium uppercase tracking-widest">
                {showPodcast ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
          {showPodcast && audioUrl ? (
            <div className="flex-1 p-6 flex flex-col justify-center items-center bg-gradient-to-b from-black/0 to-tech-accent/5">
              <audio src={audioUrl} controls className="w-full rounded-full bg-tech-surface mb-6 border border-[#333]" />
              <div className="text-center font-sans">
                <span className="inline-block px-3 py-1 bg-tech-accent/20 text-tech-accent border border-tech-accent/40 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse">Now Playing</span>
                <h4 className="text-white font-bold mt-3 text-lg leading-tight">Digital Edition Overview</h4>
              </div>
            </div>
           ) : showPodcast ? (
             <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <p className="text-tech-dim font-medium max-w-xs text-sm">Please head to the Generate tab to synthesize this edition's audio podcast.</p>
             </div>
          ) : null}
        </div>

        {/* Articles List */}
        {articles && articles.length > 0 && (
          <div className="bg-[#1A1A1A] rounded-lg border border-[#333] shadow-xl flex flex-col mt-4">
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-black/20">
              <h3 className="text-white font-sans font-black uppercase tracking-widest text-lg flex items-center gap-2">
                <span className="text-xl">📰</span> Individual Articles
              </h3>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {articles.map((article: any, index: number) => (
                <div key={index} className="border border-[#333] rounded-lg p-4 bg-gradient-to-br from-[#222] to-[#111]">
                  <h4 className="text-tech-accent font-bold text-md mb-2">{article.title}</h4>
                  <div className="flex justify-between items-center mt-3">
                     <span className="text-xs text-tech-dim bg-black/40 px-2 py-1 rounded">
                       {article.wordCount} words
                     </span>
                     <button
                        onClick={() => onGeneratePodcastForArticle && onGeneratePodcastForArticle(article)}
                        className="bg-tech-accent text-slate-900 border-none font-bold text-xs py-1.5 px-3 rounded hover:bg-white transition-colors"
                     >
                        Generate Episode (≤3m)
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MagazineViewer;
