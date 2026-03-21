/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  Mic2, 
  Play, 
  Pause, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Volume2,
  Users,
  Sprout,
  Tractor,
  Wheat,
  Download,
  FileText,
  Share2,
  Copy,
  Check,
  Zap,
  Clock,
  BookOpen,
  Eye,
  Trash2,
  Save,
  ExternalLink,
  Search,
  Image as ImageIcon,
  Type,
  FileText as FileTextIcon,
  Plus,
  FlaskConical,
  Cpu,
  Heart,
  Thermometer,
  Twitter,
  Facebook,
  Linkedin
} from 'lucide-react';
import Markdown from 'react-markdown';
import { extractTextFromFile, InputType } from './services/textExtractionService';
import { 
  generatePodcastScript, 
  generatePodcastAudio, 
  generateSampleAudio, 
  generatePodcastSummary,
  generatePodcastChapters,
  generateShowNotes,
  PodcastSegment,
  PodcastChapter,
  PodcastLanguage,
  AVAILABLE_CHARACTERS,
  PodcastSpeaker
} from './services/geminiService';
import { saveMedia, getMedia, deleteMedia } from './utils/db';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LibraryEntry {
  id: string;
  title: string;
  description: string;
  date: string;
  chapters: PodcastChapter[];
  showNotes: string;
  language: PodcastLanguage;
  duration: number;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [inputType, setInputType] = useState<InputType | 'manual'>('pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [script, setScript] = useState<PodcastSegment[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [chapters, setChapters] = useState<PodcastChapter[]>([]);
  const [showNotes, setShowNotes] = useState<string>('');
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [currentPodcast, setCurrentPodcast] = useState<{
    title: string;
    summary: string;
    chapters: PodcastChapter[];
    showNotes: string;
    script: PodcastSegment[];
    language: PodcastLanguage;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState<PodcastLanguage>('English');
  const [selectedCharacters, setSelectedCharacters] = useState<PodcastSpeaker[]>(['Thabo', 'Lindiwe']);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasCustomKey(selected);
      }
    };
    checkKey();
  }, []);

  const openKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasCustomKey(true);
      setError(null);
    }
  };

  useEffect(() => {
    const savedLibrary = localStorage.getItem('harvest_sa_library');
    if (savedLibrary) {
      try {
        setLibrary(JSON.parse(savedLibrary));
      } catch (e) {
        console.error("Failed to parse library from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('harvest_sa_library', JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [audioUrl, pdfUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const mimeType = selectedFile.type;
    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');
    const isWord = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword';

    if (!isPdf && !isImage && !isWord) {
      setError('Unsupported file type. Please upload a PDF, Image, or Word document.');
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setRawText('');
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    
    if (isPdf || isImage) {
      setPdfUrl(URL.createObjectURL(selectedFile));
    } else {
      setPdfUrl(null);
    }
    
    setError(null);
  };

  const processPodcast = async () => {
    if (!file && !rawText.trim()) return;

    setIsProcessing(true);
    setCurrentStep(1);
    setError(null);
    setScript([]);
    setAudioUrl(null);

    try {
      let text = '';
      let title = 'Podcast';

      if (file) {
        setStatus(`Extracting text from ${file.name}...`);
        try {
          const result = await extractTextFromFile(file);
          text = result.text;
          title = result.title;
        } catch (err: any) {
          console.error("Text Extraction Error:", err);
          if (err.message?.includes("Failed to fetch") || err.message?.includes("network")) {
            throw new Error("Network error while uploading file. Please check your connection and try again.");
          }
          throw new Error(`Failed to process file: ${err.message || 'Unknown error'}`);
        }
      } else {
        setStatus('Processing your text...');
        text = rawText;
        title = 'Custom DeepDive';
      }
      
      if (!text.trim()) {
        throw new Error("Could not extract any readable text. Please try a different file or paste the text directly.");
      }

      setCurrentStep(2);
      setStatus(`Generating ${selectedLanguage} DeepDive script...`);
      const generatedScript = await generatePodcastScript(text, selectedLanguage, selectedCharacters);
      setScript(generatedScript);

      setCurrentStep(3);
      setStatus(`Synthesizing ${selectedLanguage} voices...`);
      const generatedAudio = await generatePodcastAudio(generatedScript, selectedLanguage);
      
      if (generatedAudio) {
        setCurrentStep(4);
        setAudioUrl(generatedAudio);
        setStatus('Generating summary, chapters, and show notes...');
        
        const [summary, generatedChapters] = await Promise.all([
          generatePodcastSummary(generatedScript, selectedLanguage),
          generatePodcastChapters(generatedScript, selectedLanguage)
        ]);
        
        const generatedShowNotes = await generateShowNotes(generatedScript, generatedChapters, selectedLanguage);
        
        setChapters(generatedChapters);
        setShowNotes(generatedShowNotes);
        setCurrentPodcast({
          title: title,
          summary: summary,
          chapters: generatedChapters,
          showNotes: generatedShowNotes,
          script: generatedScript,
          language: selectedLanguage
        });
        
        const entryId = Date.now().toString();

        // Save to IndexedDB for persistence
        const audioBlob = await fetch(generatedAudio).then(r => r.blob());
        const pdfBlob = file ? file : new Blob([text], { type: 'text/plain' });
        
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
        const duration = audioBuffer.duration;

        await saveMedia({
          id: entryId,
          pdfBlob: pdfBlob,
          audioBlob: audioBlob,
          script: generatedScript
        });

        const newEntry: LibraryEntry = {
          id: entryId,
          title: title,
          description: summary,
          date: new Date().toLocaleDateString(),
          chapters: generatedChapters,
          showNotes: generatedShowNotes,
          language: selectedLanguage,
          duration: duration
        };
        
        setLibrary(prev => [newEntry, ...prev]);
        setStatus('Podcast ready!');
      } else {
        throw new Error('Failed to generate audio.');
      }
    } catch (err) {
      console.error("Podcast Generation Error:", err);
      let message = 'Something went wrong. Please try again.';
      
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }

      if (message.toLowerCase().includes("quota") || message.toLowerCase().includes("429")) {
        message = "Gemini API quota exceeded. This usually happens on the free tier. Please wait a moment or connect your own API key for higher limits.";
      }
      
      setError(message);
      setCurrentStep(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadFromLibrary = async (entry: LibraryEntry) => {
    setIsProcessing(true);
    setStatus('Loading from library...');
    try {
      const media = await getMedia(entry.id);
      if (media) {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        
        setAudioUrl(URL.createObjectURL(media.audioBlob));
        setPdfUrl(URL.createObjectURL(media.pdfBlob));
        setScript(media.script);
        setChapters(entry.chapters);
        setShowNotes(entry.showNotes);
        setSelectedLanguage(entry.language || 'English');
        setFile(new File([media.pdfBlob], entry.title + ".pdf", { type: 'application/pdf' }));
        setCurrentPodcast({
          title: entry.title,
          summary: entry.description,
          chapters: entry.chapters,
          showNotes: entry.showNotes,
          script: media.script,
          language: entry.language
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError('Could not find the media files for this entry.');
      }
    } catch (e) {
      console.error("Failed to load from library", e);
      setError('Failed to load media from storage.');
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  const saveToLibrary = async () => {
    if (!currentPodcast || !audioUrl) return;
    const entryId = Date.now().toString();
    const audioBlob = await fetch(audioUrl).then(r => r.blob());
    const pdfBlob = file ? file : new Blob([rawText], { type: 'text/plain' });
    
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
    const duration = audioBuffer.duration;

    await saveMedia({
      id: entryId,
      pdfBlob: pdfBlob,
      audioBlob: audioBlob,
      script: currentPodcast.script
    });

    const newEntry: LibraryEntry = {
      id: entryId,
      title: currentPodcast.title,
      description: currentPodcast.summary,
      date: new Date().toLocaleDateString(),
      chapters: currentPodcast.chapters,
      showNotes: currentPodcast.showNotes,
      language: currentPodcast.language,
      duration: duration
    };
    
    setLibrary(prev => [newEntry, ...prev]);
    setStatus('Podcast saved to library!');
  };

  const deleteFromLibrary = async (id: string) => {
    if (confirm('Are you sure you want to delete this podcast from your library?')) {
      await deleteMedia(id);
      setLibrary(prev => prev.filter(e => e.id !== id));
    }
  };

  const filteredLibrary = library.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          entry.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = languageFilter === 'all' || entry.language === languageFilter;
    const matchesKeyword = keywordFilter === '' || entry.description.toLowerCase().includes(keywordFilter.toLowerCase());
    
    let matchesDate = true;
    if (dateRangeFilter !== 'all') {
      const entryDate = new Date(entry.date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - entryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (dateRangeFilter === 'last7') matchesDate = diffDays <= 7;
      else if (dateRangeFilter === 'last30') matchesDate = diffDays <= 30;
    }

    return matchesSearch && matchesLanguage && matchesKeyword && matchesDate;
  });

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const exportTranscript = () => {
    if (script.length === 0) return;
    const text = script.map(s => `${s.speaker.toUpperCase()}: ${s.text}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HarvestUnpacked_Transcript_${file?.name.replace('.pdf', '') || 'Podcast'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sharePodcast = async () => {
    const shareData = {
      title: 'Harvest Unpacked DeepDive AI Podcasts',
      text: `Check out this agricultural DeepDive on "${file?.name || 'an article'}"!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        } else {
          console.warn('Share canceled by user');
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const toggleCharacter = (charId: PodcastSpeaker) => {
    if (selectedCharacters.includes(charId)) {
      if (selectedCharacters.length > 1) {
        setSelectedCharacters(prev => prev.filter(id => id !== charId));
      }
    } else {
      if (selectedCharacters.length < 2) {
        setSelectedCharacters(prev => [...prev, charId]);
      } else {
        // Replace the first one if already 2
        setSelectedCharacters(prev => [prev[1], charId]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-serif selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a1a]/10 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
              <Sprout size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Harvest Unpacked</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-[#5A5A40]">DeepDive AI Podcasts</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-6 text-sm font-sans font-medium opacity-60">
              <span>Magazine</span>
              <span>Insights</span>
              <span>Community</span>
            </div>
            <button 
              onClick={sharePodcast}
              className="flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-full text-xs font-sans font-bold hover:bg-[#4a4a35] transition-all shadow-sm"
            >
              {isCopied ? <Check size={14} /> : <Share2 size={14} />}
              {isCopied ? 'Link Copied' : 'Share App'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[1fr,400px] gap-12">
          
          {/* Left Column: Upload & Content */}
          <div className="space-y-12">
            <section>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl sm:text-7xl font-light leading-[0.9] tracking-tight mb-8"
              >
                Turn your <span className="italic">content</span> into <span className="text-[#5A5A40]">conversations.</span>
              </motion.h2>
              <p className="text-xl text-[#1a1a1a]/60 max-w-xl leading-relaxed">
                Upload PDFs, images, Word docs, or paste text to let our team of experts break down agricultural insights in a 6-8 minute deep dive.
              </p>
            </section>

            <section className="bg-white rounded-[32px] p-8 shadow-sm border border-[#1a1a1a]/5">
              <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-[#f5f5f0] rounded-2xl w-fit">
                  <button 
                    onClick={() => setInputType('pdf')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all flex items-center gap-2",
                      inputType !== 'manual' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#1a1a1a]/40 hover:text-[#1a1a1a]"
                    )}
                  >
                    <FileUp size={14} />
                    Upload File
                  </button>
                  <button 
                    onClick={() => setInputType('manual')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all flex items-center gap-2",
                      inputType === 'manual' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#1a1a1a]/40 hover:text-[#1a1a1a]"
                    )}
                  >
                    <Type size={14} />
                    Paste Text
                  </button>
                </div>

                {inputType !== 'manual' ? (
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-12 transition-all flex flex-col items-center justify-center text-center gap-4",
                      file ? "border-[#5A5A40] bg-[#5A5A40]/5" : "border-[#1a1a1a]/10 hover:border-[#5A5A40]/40"
                    )}
                  >
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" 
                      onChange={handleFileChange} 
                      className="hidden" 
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-[#f5f5f0] rounded-full flex items-center justify-center text-[#5A5A40]">
                        <FileUp size={32} />
                      </div>
                      <div>
                        <p className="text-lg font-medium">{file ? file.name : 'Choose a file'}</p>
                        <p className="text-sm text-[#1a1a1a]/40 font-sans">PDF, Image, or Word (Max 10MB)</p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Paste your article text here..."
                      className="w-full h-48 p-6 bg-[#f5f5f0] rounded-2xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 border border-transparent focus:border-[#5A5A40]/20 transition-all resize-none"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <label className="text-xs font-sans font-bold uppercase tracking-widest text-[#1a1a1a]/40">Select 2 AI Characters</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AVAILABLE_CHARACTERS.map((char) => (
                      <button
                        key={char.id}
                        onClick={() => toggleCharacter(char.id)}
                        className={cn(
                          "p-4 rounded-2xl text-left transition-all border flex items-start gap-3",
                          selectedCharacters.includes(char.id)
                            ? "bg-[#5A5A40]/5 border-[#5A5A40] ring-1 ring-[#5A5A40]"
                            : "bg-white border-[#1a1a1a]/10 hover:border-[#5A5A40]/40"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                          selectedCharacters.includes(char.id) ? "bg-[#5A5A40] border-[#5A5A40]" : "border-[#1a1a1a]/20"
                        )}>
                          {selectedCharacters.includes(char.id) && <Check size={12} className="text-white" />}
                        </div>
                        <div>
                          <p className={cn(
                            "text-sm font-bold",
                            selectedCharacters.includes(char.id) ? "text-[#5A5A40]" : "text-[#1a1a1a]"
                          )}>{char.name}</p>
                          <p className="text-[10px] text-[#1a1a1a]/60 font-sans leading-tight mt-1">{char.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#1a1a1a]/40 font-sans italic">
                    {selectedCharacters.length === 2 
                      ? "Perfect! 2 characters selected." 
                      : `Please select ${2 - selectedCharacters.length} more character${2 - selectedCharacters.length === 1 ? '' : 's'}.`}
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-sans font-bold uppercase tracking-widest text-[#1a1a1a]/40">Select Language</label>
                  <div className="flex flex-wrap gap-2">
                    {(['English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'Sesotho', 'Setswana'] as PodcastLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all border",
                          selectedLanguage === lang 
                            ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm" 
                            : "bg-white text-[#1a1a1a]/60 border-[#1a1a1a]/10 hover:border-[#5A5A40]/40"
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={processPodcast}
                  disabled={(!file && !rawText.trim()) || isProcessing}
                  className={cn(
                    "w-full py-4 rounded-full font-sans font-bold text-lg transition-all flex items-center justify-center gap-3",
                    (!file && !rawText.trim()) || isProcessing 
                      ? "bg-[#1a1a1a]/10 text-[#1a1a1a]/30 cursor-not-allowed" 
                      : "bg-[#5A5A40] text-white hover:bg-[#4a4a35] shadow-lg shadow-[#5A5A40]/20"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Mic2 size={20} />
                      Generate DeepDive
                    </>
                  )}
                </button>

                {!hasCustomKey && (
                  <p className="text-[10px] text-center text-[#1a1a1a]/40 font-sans">
                    Using shared API quota. <button onClick={openKeySelector} className="underline hover:text-[#5A5A40]">Connect your own key</button> for faster generation.
                  </p>
                )}

                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-6 border-t border-[#1a1a1a]/5"
                  >
                    <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-[#5A5A40]/10 text-[#5A5A40] rounded-lg w-fit text-[10px] font-bold uppercase tracking-widest">
                      <Clock size={12} />
                      Concise Generation (3-4 mins)
                    </div>
                    {[
                      { id: 1, label: 'Extracting text from content' },
                      { id: 2, label: 'Generating 2-minute deep dive script' },
                      { id: 3, label: 'Synthesizing South African voices (Batch processing)' },
                      { id: 4, label: 'Finalizing long-form podcast' },
                    ].map((step) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500",
                          currentStep > step.id ? "bg-green-500 text-white" :
                          currentStep === step.id ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20 scale-110" :
                          "bg-[#1a1a1a]/5 text-[#1a1a1a]/20"
                        )}>
                          {currentStep > step.id ? <Check size={14} /> : step.id}
                        </div>
                        <span className={cn(
                          "text-sm font-sans transition-all duration-500",
                          currentStep === step.id ? "text-[#1a1a1a] font-bold" : 
                          currentStep > step.id ? "text-[#1a1a1a]/60" : "text-[#1a1a1a]/20"
                        )}>
                          {step.label}
                          {currentStep === step.id && <span className="ml-2 inline-block w-1 h-1 bg-[#5A5A40] rounded-full animate-bounce" />}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}

                {audioUrl && !isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pt-6 border-t border-[#1a1a1a]/5"
                  >
                    <a 
                      href={audioUrl} 
                      download={`HarvestUnpacked_DeepDive_${file?.name.replace('.pdf', '') || 'Podcast'}.wav`}
                      className="w-full py-4 bg-[#5A5A40] text-white rounded-full font-sans font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#5A5A40]/20 hover:bg-[#4a4a35]"
                    >
                      <Download size={20} />
                      Download Your DeepDive
                    </a>
                  </motion.div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-col gap-3 text-red-600 bg-red-50 p-6 rounded-2xl border border-red-100"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle size={18} />
                      Oops! Something went wrong
                    </div>
                    <p className="text-sm opacity-80 leading-relaxed">
                      {error}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {(error.includes("quota") || error.includes("429") || error.includes("key")) && (
                        <button 
                          onClick={openKeySelector}
                          className="text-xs font-sans font-bold uppercase tracking-wider text-red-700 hover:underline flex items-center gap-1"
                        >
                          Connect your own API Key <ExternalLink size={10} />
                        </button>
                      )}
                      <button 
                        onClick={() => setError(null)}
                        className="text-xs font-sans font-bold uppercase tracking-wider text-[#1a1a1a]/40 hover:underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </section>

            {/* Audio Player */}
            <AnimatePresence>
              {audioUrl && (
                <motion.section 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#1a1a19] text-white rounded-[32px] p-8 shadow-2xl"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-8">
                    <div className="w-32 h-32 bg-gradient-to-br from-[#5A5A40] to-[#3a3a2a] rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                      <Volume2 size={48} className="relative z-10" />
                    </div>
                    <div className="flex-1 space-y-4 text-center sm:text-left w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-bold">Latest DeepDive</h3>
                          <p className="text-white/60 font-sans text-sm uppercase tracking-widest">Harvest Unpacked • Episode 01</p>
                        </div>
                        <button 
                          onClick={handleSpeedChange}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-sans font-bold transition-colors flex items-center gap-2"
                        >
                          <Zap size={12} />
                          {playbackSpeed}x
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-center sm:justify-start gap-4">
                          <button 
                            onClick={togglePlayback}
                            className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                          >
                            {isPlaying ? <Pause fill="black" /> : <Play fill="black" className="ml-1" />}
                          </button>
                          
                          <a 
                            href={audioUrl} 
                            download={`HarvestUnpacked_DeepDive_${file?.name.replace('.pdf', '') || 'Podcast'}.wav`}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-sans font-bold transition-all border border-white/20 hover:border-white/40"
                            title="Download Podcast"
                          >
                            <Download size={18} />
                            <span>Download</span>
                          </a>

                          <button 
                            onClick={saveToLibrary}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-sans font-bold transition-all border border-white/20 hover:border-white/40"
                            title="Save to Library"
                          >
                            <Save size={18} />
                            <span>Save</span>
                          </button>

                          <div className="flex items-center gap-2">
                             <a href={`https://twitter.com/intent/tweet?text=Check out this DeepDive: ${currentPodcast?.title || 'Podcast'}&url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/20 hover:border-white/40" title="Share on Twitter">
                               <Twitter size={18} />
                             </a>
                             <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/20 hover:border-white/40" title="Share on Facebook">
                               <Facebook size={18} />
                             </a>
                             <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/20 hover:border-white/40" title="Share on LinkedIn">
                               <Linkedin size={18} />
                             </a>
                          </div>

                          <button 
                            onClick={sharePodcast}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-sans font-bold transition-all border border-white/20 hover:border-white/40"
                            title="Share Podcast"
                          >
                            {isCopied ? <Check size={18} /> : <Share2 size={18} />}
                            <span>{isCopied ? 'Copied' : 'Share'}</span>
                          </button>

                          <div className="flex-1 space-y-1">
                            <input 
                              type="range" 
                              min="0" 
                              max={duration || 0} 
                              value={currentTime} 
                              onChange={handleSeek}
                              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#5A5A40] hover:bg-white/30 transition-all"
                            />
                            <div className="flex justify-between text-[10px] font-sans font-bold text-white/40 uppercase tracking-tighter">
                              <span>{formatTime(currentTime)}</span>
                              <span>{formatTime(duration)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <audio 
                    ref={audioRef} 
                    src={audioUrl} 
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </motion.section>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {pdfUrl && !isProcessing && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] p-8 border border-[#1a1a1a]/5"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <FileText size={24} className="text-[#5A5A40]" />
                      Source Document
                    </h3>
                    <a 
                      href={pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-bold text-[#5A5A40] hover:underline"
                    >
                      Open in New Tab <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="aspect-[16/9] w-full bg-[#f5f5f0] rounded-2xl overflow-hidden border border-[#1a1a1a]/5">
                    <iframe 
                      src={`${pdfUrl}#toolbar=0`} 
                      className="w-full h-full"
                      title="PDF Preview"
                    />
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showNotes && !isProcessing && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] p-8 border border-[#1a1a1a]/5"
                >
                  <h3 className="text-2xl font-bold flex items-center gap-2 mb-6">
                    <BookOpen size={24} className="text-[#5A5A40]" />
                    Show Notes
                  </h3>
                  <div className="prose prose-sm max-w-none text-[#1a1a1a]/80 prose-headings:text-[#1a1a1a] prose-headings:font-bold prose-p:leading-relaxed prose-li:leading-relaxed">
                    <Markdown>{showNotes}</Markdown>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {chapters.length > 0 && !isProcessing && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] p-8 border border-[#1a1a1a]/5"
                >
                  <h3 className="text-2xl font-bold flex items-center gap-2 mb-6">
                    <Clock size={24} className="text-[#5A5A40]" />
                    Podcast Chapters
                  </h3>
                  <div className="grid gap-4">
                    {chapters.map((chapter, idx) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-2xl hover:bg-[#f5f5f0] transition-colors group cursor-default">
                        <div className="w-10 h-10 rounded-full bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] font-bold shrink-0 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1a1a1a]">{chapter.title}</h4>
                          <p className="text-sm text-[#1a1a1a]/60 leading-relaxed">{chapter.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Characters & Info */}
          <div className="space-y-8">
            <div className="bg-white rounded-[32px] p-8 border border-[#1a1a1a]/5 space-y-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Users size={24} className="text-[#5A5A40]" />
                The Team
              </h3>
              
              <div className="space-y-6">
                <CharacterCard 
                  name="Thabo" 
                  role="Senior Agronomist" 
                  desc="The high-energy tech enthusiast. Loves innovation, data, and a good laugh."
                  icon={<Tractor size={16} />}
                  avatarUrl="https://picsum.photos/seed/thabo/100/100"
                  samplePhrase="Lekker man! I've been looking at the latest data and it's looking very promising for our farmers."
                  selectedLanguage={selectedLanguage}
                  pronunciationGuide={[
                    { term: "Agronomy", phonetic: "uh-GRON-uh-mee" },
                    { term: "Hydroponics", phonetic: "hahy-druh-PON-iks" }
                  ]}
                />
                <CharacterCard 
                  name="Lindiwe" 
                  role="Livestock Specialist" 
                  desc="Practical and witty. Brings the real-world farm stories to life."
                  icon={<Sprout size={16} />}
                  avatarUrl="https://picsum.photos/seed/lindiwe/100/100"
                  samplePhrase="Howzit! Let's get our hands dirty and see what's really happening on the ground."
                  selectedLanguage={selectedLanguage}
                  pronunciationGuide={[
                    { term: "Bovine", phonetic: "BOH-vahyn" },
                    { term: "Veterinary", phonetic: "VET-er-uh-ner-ee" }
                  ]}
                />
                <CharacterCard 
                  name="Dr. Thandi" 
                  role="Soil Scientist" 
                  desc="Dry, sarcastic wit. Sharp as a cracked earth pan."
                  icon={<FlaskConical size={16} />}
                  avatarUrl="https://picsum.photos/seed/thandi/100/100"
                  samplePhrase="Your soil pH is 6.2? Congrats, you've invented acidic soup."
                  selectedLanguage={selectedLanguage}
                  pronunciationGuide={[
                    { term: "Pedology", phonetic: "pi-DOL-uh-jee" },
                    { term: "Nitrogen", phonetic: "NAY-truh-juhn" }
                  ]}
                />
                <CharacterCard 
                  name="JP BoerBot" 
                  role="Farmer-Bot" 
                  desc="Cheeky Boer humor. Speaks a mix of English and Afrikaans with a heavy accent."
                  icon={<Cpu size={16} />}
                  avatarUrl="https://picsum.photos/seed/jp/100/100"
                  samplePhrase="Luister hier boet, this drone spots weeds faster than my ex spotting a bargain at Pick n Pay! Dis 'n feit!"
                  selectedLanguage={selectedLanguage}
                  pronunciationGuide={[
                    { term: "Boer", phonetic: "boor" },
                    { term: "Veld", phonetic: "felt" }
                  ]}
                />
                <CharacterCard 
                  name="Gogo Nomsa" 
                  role="Rural Development Specialist" 
                  desc="Wise, maternal figure. Focuses on community, tradition, and sustainable small-scale farming."
                  icon={<Heart size={16} />}
                  avatarUrl="https://picsum.photos/seed/nomsa/100/100"
                  samplePhrase="Mntanami, we must look after the soil as our ancestors did. It is our legacy."
                  selectedLanguage={selectedLanguage}
                  pronunciationGuide={[
                    { term: "Ubuntu", phonetic: "oo-BOON-too" },
                    { term: "Imbizo", phonetic: "im-BEE-zoh" }
                  ]}
                />
                <CharacterCard 
                  name="Prof. Dewald" 
                  role="Climate Change Expert" 
                  desc="Meticulous academic. Passionate about green tech and climate resilience."
                  icon={<Thermometer size={16} />}
                  avatarUrl="https://picsum.photos/seed/dewald/100/100"
                  samplePhrase="The data is clear: we are approaching a tipping point. We must adapt our irrigation strategies now."
                  selectedLanguage={selectedLanguage}
                  pronunciationGuide={[
                    { term: "Meteorology", phonetic: "mee-tee-uh-ROL-uh-jee" },
                    { term: "Sustainability", phonetic: "suh-stey-nuh-BIL-i-tee" }
                  ]}
                />
              </div>
            </div>

            <div className="bg-[#5A5A40] text-white rounded-[32px] p-8">
              <h4 className="font-sans font-bold uppercase tracking-widest text-xs opacity-60 mb-4">How it works</h4>
              <ul className="space-y-4 font-sans text-sm">
                <li className="flex gap-3">
                  <span className="opacity-40">01</span>
                  <span>Upload PDF, Image, Word doc or paste text.</span>
                </li>
                <li className="flex gap-3">
                  <span className="opacity-40">02</span>
                  <span>AI extracts the core insights and data.</span>
                </li>
                <li className="flex gap-3">
                  <span className="opacity-40">03</span>
                  <span>A custom script is written for our 2 experts.</span>
                </li>
                <li className="flex gap-3">
                  <span className="opacity-40">04</span>
                  <span>Listen to an engaging, South African DeepDive.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-[32px] p-8 border border-[#1a1a1a]/5 space-y-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <FileText size={24} className="text-[#5A5A40]" />
                  Library
                </h3>
                {library.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1a1a]/40" size={16} />
                    <input
                      type="text"
                      placeholder="Search library..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#f5f5f0] rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 border border-transparent focus:border-[#5A5A40]/20 transition-all"
                    />
                  </div>
                )}
                {library.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={languageFilter}
                      onChange={(e) => setLanguageFilter(e.target.value)}
                      className="bg-[#f5f5f0] rounded-xl text-xs font-sans p-2 border border-transparent focus:border-[#5A5A40]/20 transition-all"
                    >
                      <option value="all">All Languages</option>
                      {['English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'Sesotho', 'Setswana'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select
                      value={dateRangeFilter}
                      onChange={(e) => setDateRangeFilter(e.target.value)}
                      className="bg-[#f5f5f0] rounded-xl text-xs font-sans p-2 border border-transparent focus:border-[#5A5A40]/20 transition-all"
                    >
                      <option value="all">All Time</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                    </select>
                  </div>
                )}
                {library.length > 0 && (
                  <input
                    type="text"
                    placeholder="Filter by description keywords..."
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-[#f5f5f0] rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 border border-transparent focus:border-[#5A5A40]/20 transition-all"
                  />
                )}
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {library.length === 0 ? (
                  <div className="text-center py-12 text-[#1a1a1a]/40 italic">
                    No podcasts saved yet. Generate a podcast to see it here.
                  </div>
                ) : filteredLibrary.length > 0 ? (
                  filteredLibrary.map((entry) => (
                    <div key={entry.id} className="group p-4 rounded-2xl hover:bg-[#1a1a1a]/5 transition-colors border border-[#1a1a1a]/5 hover:border-[#5A5A40]/20">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-[#1a1a1a] group-hover:text-[#5A5A40] transition-colors line-clamp-1">
                            {entry.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-widest font-bold">
                              {entry.date}
                            </p>
                            <span className="w-1 h-1 bg-[#1a1a1a]/10 rounded-full" />
                            <p className="text-[10px] text-[#5A5A40] uppercase tracking-widest font-bold">
                              {entry.language || 'English'}
                            </p>
                            <span className="w-1 h-1 bg-[#1a1a1a]/10 rounded-full" />
                            <p className="text-[10px] text-[#5A5A40] uppercase tracking-widest font-bold">
                              {Math.floor(entry.duration / 60)}:{Math.floor(entry.duration % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => loadFromLibrary(entry)}
                            className="p-2 rounded-full hover:bg-white text-[#5A5A40] transition-all shadow-sm opacity-0 group-hover:opacity-100"
                            title="Open Podcast"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => deleteFromLibrary(entry.id)}
                            className="p-2 rounded-full hover:bg-white text-red-500 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[#1a1a1a]/60 line-clamp-2 mb-4 italic leading-relaxed">
                        {entry.description}
                      </p>
                      <button 
                        onClick={() => loadFromLibrary(entry)}
                        className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#5A5A40] hover:underline flex items-center gap-1"
                      >
                        Listen & View Details <Play size={10} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#1a1a1a]/40 italic">
                    No podcasts found matching your filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Section */}
        {script.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-24 space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <h3 className="text-4xl font-light italic">Podcast Transcript</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={exportTranscript}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-[#1a1a1a]/10 rounded-full text-sm font-sans font-medium hover:bg-[#f5f5f0] transition-colors"
                >
                  <FileText size={16} />
                  Export .txt
                </button>
                {audioUrl && (
                  <a 
                    href={audioUrl} 
                    download={`HarvestUnpacked_DeepDive_${file?.name.replace('.pdf', '') || 'Podcast'}.wav`}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#1a1a1a]/10 rounded-full text-sm font-sans font-medium hover:bg-[#f5f5f0] transition-colors"
                  >
                    <Download size={16} />
                    Download Audio
                  </a>
                )}
                <button 
                  onClick={sharePodcast}
                  className="flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-full text-sm font-sans font-medium hover:bg-[#4a4a35] transition-colors shadow-sm"
                >
                  {isCopied ? <Check size={16} /> : <Share2 size={16} />}
                  {isCopied ? 'Link Copied' : 'Share App'}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {script.map((segment, i) => (
                <div key={i} className="flex gap-6 items-start group">
                  <span className={cn(
                    "w-24 shrink-0 font-sans font-bold text-xs uppercase tracking-widest mt-1.5",
                    segment.speaker === 'Thabo' ? 'text-blue-600' : 
                    segment.speaker === 'Lindiwe' ? 'text-emerald-600' : 
                    segment.speaker === 'Dr. Thandi' ? 'text-purple-600' : 
                    segment.speaker === 'JP BoerBot' ? 'text-orange-600' : 'text-amber-600'
                  )}>
                    {segment.speaker}
                  </span>
                  <p className="text-lg leading-relaxed text-[#1a1a1a]/80 group-hover:text-[#1a1a1a] transition-colors">
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </main>

      <footer className="border-t border-[#1a1a1a]/10 py-12 mt-24">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40 font-sans text-xs uppercase tracking-[0.2em]">
          <p>© 2026 Harvest Unpacked</p>
          <div className="flex gap-8">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CharacterCard({ name, role, desc, icon, avatarUrl, samplePhrase, selectedLanguage, pronunciationGuide }: { name: string, role: string, desc: string, icon: React.ReactNode, avatarUrl: string, samplePhrase: string, selectedLanguage: PodcastLanguage, pronunciationGuide?: { term: string; phonetic: string }[] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSample = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current?.src) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    try {
      const audioUrl = await generateSampleAudio(name as any, samplePhrase, selectedLanguage);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Failed to play sample", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-4 items-start group">
      <div className="relative shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-md bg-[#f5f5f0] ring-1 ring-[#1a1a1a]/10">
          <img 
            src={avatarUrl} 
            alt={name} 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[#5A5A40] shadow-sm border border-[#1a1a1a]/5 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors duration-300">
          {icon}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div>
            <h4 className="font-bold leading-none">{name}</h4>
            <p className="text-[10px] uppercase tracking-widest font-sans font-semibold text-[#5A5A40] mt-1">{role}</p>
          </div>
          <button 
            onClick={playSample}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-[#f5f5f0] flex items-center justify-center text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white transition-all duration-300 disabled:opacity-50"
            title={`Hear ${name}'s voice`}
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={14} />
            ) : (
              <Volume2 size={14} />
            )}
          </button>
        </div>
        <p className="text-xs text-[#1a1a1a]/60 leading-relaxed italic">"{desc}"</p>
        {pronunciationGuide && pronunciationGuide.length > 0 && (
          <div className="mt-3 p-3 bg-[#f5f5f0] rounded-xl border border-[#1a1a1a]/5">
            <p className="text-[9px] font-bold text-[#5A5A40] uppercase tracking-widest mb-1.5">Pronunciation Guide</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {pronunciationGuide.map((item, index) => (
                <span key={index} className="text-[11px] text-[#1a1a1a]">
                  <span className="font-bold">{item.term}</span>: <span className="italic text-[#5A5A40]">/{item.phonetic}/</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
