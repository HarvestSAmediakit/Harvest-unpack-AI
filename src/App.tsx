/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  Key,
  Mic2, 
  Play, 
  Pause, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Volume2,
  Volume1,
  VolumeX,
  RotateCcw,
  RotateCw,
  Users,
  Sprout,
  Tractor,
  Wheat,
  Download,
  FileText,
  Share2,
  Copy,
  Check,
  Code,
  Zap,
  Clock,
  BookOpen,
  Eye,
  Trash2,
  ExternalLink,
  Search,
  Cloud,
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
  Linkedin,
  MessageCircle,
  Link as LinkIcon,
  X,
  ChevronRight
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
  generateGlossary,
  aiSearchPodcasts,
  generateMetadata,
  generatePodcastCover,
  GlossaryTerm,
  PodcastSegment,
  PodcastChapter,
  PodcastLanguage,
  AVAILABLE_CHARACTERS,
  PodcastSpeaker
} from './services/geminiService';
import { saveMedia, getMedia, deleteMedia } from './utils/db';
import { PodcastError } from './types';
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
  glossary?: GlossaryTerm[];
  language: PodcastLanguage;
  duration: number;
  driveLink?: string;
  metadata?: {
    keywords: string[];
    topics: string[];
  };
  coverUrl?: string;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function MainApp() {
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
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [currentPodcast, setCurrentPodcast] = useState<{
    title: string;
    summary: string;
    chapters: PodcastChapter[];
    showNotes: string;
    glossary?: GlossaryTerm[];
    script: PodcastSegment[];
    language: PodcastLanguage;
    metadata?: {
      keywords: string[];
      topics: string[];
    };
    coverUrl?: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<string[] | null>(null);
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<PodcastError | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [shareWithTimestamp, setShareWithTimestamp] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<PodcastLanguage>('English');
  const [selectedCharacters, setSelectedCharacters] = useState<PodcastSpeaker[]>(['Thabo', 'Lindiwe']);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEntry, setShareEntry] = useState<LibraryEntry | null>(null);
  const [googleTokens, setGoogleTokens] = useState<string | null>(localStorage.getItem('google_drive_tokens'));
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveLink, setDriveLink] = useState<string | null>(null);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean>(false);
  const [inputImageBase64, setInputImageBase64] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const initialSeekDone = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      const storedKey = localStorage.getItem('gemini_custom_api_key');
      if (storedKey) {
        setHasCustomKey(true);
        setCustomKeyInput(storedKey);
        return;
      }
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasCustomKey(selected);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const tokens = JSON.stringify(event.data.tokens);
        localStorage.setItem('google_drive_tokens', tokens);
        setGoogleTokens(tokens);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleAuth = async () => {
    if (googleTokens) {
      setGoogleTokens(null);
      localStorage.removeItem('google_drive_tokens');
      return;
    }

    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_auth_popup', 'width=600,height=700');
    } catch (err) {
      console.error('Failed to get Google Auth URL:', err);
      setError('Failed to connect to Google Drive');
    }
  };

  const uploadToDrive = async (entry: LibraryEntry) => {
    if (entry.driveLink) {
      window.open(entry.driveLink, '_blank');
      return;
    }

    if (!googleTokens) {
      handleGoogleAuth();
      return;
    }

    setIsUploadingToDrive(true);
    setDriveLink(null);
    setStatus('Uploading to Google Drive...');
    try {
      const media = await getMedia(entry.id);
      if (!media) throw new Error('Podcast media not found');

      const formData = new FormData();
      formData.append('file', media.audioBlob);
      formData.append('tokens', googleTokens);
      formData.append('title', entry.title);
      formData.append('description', entry.description);

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setDriveLink(data.link);
      
      // Update entry in library with drive link
      const updatedLibrary = library.map(e => 
        e.id === entry.id ? { ...e, driveLink: data.link } : e
      );
      setLibrary(updatedLibrary);
      localStorage.setItem('harvest_sa_library', JSON.stringify(updatedLibrary));
      
      // Update shareEntry if it's the one being uploaded
      if (shareEntry && shareEntry.id === entry.id) {
        setShareEntry({ ...shareEntry, driveLink: data.link });
      }

      setStatus('Uploaded to Google Drive successfully!');
      
    } catch (err: any) {
      console.error('Drive Upload Error:', err);
      setError(`Failed to upload to Google Drive: ${err.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const saveCustomKey = () => {
    if (customKeyInput.trim()) {
      localStorage.setItem('gemini_custom_api_key', customKeyInput.trim());
      setHasCustomKey(true);
      setIsKeyModalOpen(false);
      setError(null);
    }
  };

  const clearCustomKey = () => {
    localStorage.removeItem('gemini_custom_api_key');
    setCustomKeyInput('');
    setHasCustomKey(false);
  };

  const openKeySelector = async () => {
    setIsKeyModalOpen(true);
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

  useEffect(() => {
    if (rawText.trim()) {
      setError(null);
      setDetailedError(null);
    }
  }, [rawText]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const mimeType = selectedFile.type;
    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');
    const isWord = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword';
    const isText = mimeType.startsWith('text/');

    if (!isPdf && !isImage && !isWord && !isText) {
      setError('Unsupported file type. Please upload a PDF, Image, Word, or Text document.');
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
      if (isImage) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setInputImageBase64(base64);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setInputImageBase64(null);
      }
    } else {
      setPdfUrl(null);
      setInputImageBase64(null);
    }
    
    setError(null);
    setDetailedError(null);
  };

  const processPodcast = async () => {
    if (!file && !rawText.trim()) return;

    // Strictly require a custom key as requested by the user
    if (!hasCustomKey) {
      setError("An API key is required to generate podcasts.");
      setDetailedError(new PodcastError(
        "An API key is required to generate podcasts.",
        "No API key has been connected to the application.",
        "Please connect your Google Gemini API key using the button below to continue.",
        "MISSING_API_KEY"
      ));
      openKeySelector();
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);
    setError(null);
    setDetailedError(null);
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
      const generatedAudioBlob = await generatePodcastAudio(generatedScript, selectedLanguage, (current, total) => {
        setStatus(`Synthesizing ${selectedLanguage} voices (${current}/${total} segments)...`);
      });
      
      if (generatedAudioBlob) {
        setCurrentStep(4);
        const generatedAudioUrl = URL.createObjectURL(generatedAudioBlob);
        setAudioUrl(generatedAudioUrl);
        setStatus('Generating summary, chapters, show notes, and glossary...');
        
        const [summary, generatedChapters, metadata, generatedGlossary] = await Promise.all([
          generatePodcastSummary(generatedScript, selectedLanguage),
          generatePodcastChapters(generatedScript, selectedLanguage),
          generateMetadata(generatedScript, selectedLanguage),
          generateGlossary(generatedScript, selectedLanguage)
        ]);

        setStatus('Generating episode cover art...');
        const coverUrl = await generatePodcastCover(title, metadata.topics, inputImageBase64 || undefined);
        
        const generatedShowNotes = await generateShowNotes(generatedScript, generatedChapters, selectedLanguage);
        
        setChapters(generatedChapters);
        setShowNotes(generatedShowNotes);
        setGlossary(generatedGlossary);
        setCurrentPodcast({
          title: title,
          summary: summary,
          chapters: generatedChapters,
          showNotes: generatedShowNotes,
          glossary: generatedGlossary,
          script: generatedScript,
          language: selectedLanguage,
          metadata: metadata,
          coverUrl: coverUrl || undefined
        });
        
        const entryId = Date.now().toString();

        // Save to IndexedDB for persistence
        const pdfBlob = file ? file : new Blob([text], { type: 'text/plain' });
        
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(await generatedAudioBlob.arrayBuffer());
        const duration = audioBuffer.duration;

        await saveMedia({
          id: entryId,
          pdfBlob: pdfBlob,
          audioBlob: generatedAudioBlob,
          script: generatedScript
        });

        const newEntry: LibraryEntry = {
          id: entryId,
          title: title,
          description: summary,
          date: new Date().toLocaleDateString(),
          chapters: generatedChapters,
          showNotes: generatedShowNotes,
          glossary: generatedGlossary,
          language: selectedLanguage,
          duration: duration,
          metadata: metadata,
          coverUrl: coverUrl || undefined
        };
        
        setLibrary(prev => [newEntry, ...prev]);
        setStatus('Podcast ready and saved to library!');

        // Auto-upload to Google Drive if authenticated
        if (googleTokens) {
          setStatus('Auto-uploading to Google Drive...');
          try {
            const formData = new FormData();
            formData.append('file', generatedAudioBlob);
            formData.append('tokens', googleTokens);
            formData.append('title', newEntry.title);
            formData.append('description', newEntry.description);

            const driveResponse = await fetch('/api/drive/upload', {
              method: 'POST',
              body: formData,
            });

            if (driveResponse.ok) {
              const driveData = await driveResponse.json();
              const entryWithDrive = { ...newEntry, driveLink: driveData.link };
              setLibrary(prev => prev.map(e => e.id === entryId ? entryWithDrive : e));
              localStorage.setItem('harvest_sa_library', JSON.stringify([entryWithDrive, ...library]));
              setStatus('Podcast ready, saved to library, and uploaded to Google Drive!');
            }
          } catch (driveErr) {
            console.error('Auto-upload to Drive failed:', driveErr);
            // Don't fail the whole process if drive upload fails
          }
        }
      } else {
        throw new Error('Failed to generate audio.');
      }
    } catch (err: any) {
      console.error("Podcast Generation Error:", err);
      let message = 'Something went wrong. Please try again.';
      
      if (err instanceof PodcastError) {
        setDetailedError(err);
        setError(null);
      } else {
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'string') {
          message = err;
        }

        if (message.toLowerCase().includes("quota") || message.toLowerCase().includes("429")) {
          message = "Gemini API quota exceeded. This usually happens on the free tier. Please wait a moment or connect your own API key for higher limits.";
        }
        
        setError(message);
        setDetailedError(null);
      }
      
      setCurrentStep(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const openShareModal = (entry: LibraryEntry) => {
    setShareEntry(entry);
    setIsShareModalOpen(true);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setShareEntry(null);
  };

  const getEntryShareUrl = (entry: LibraryEntry) => {
    if (entry.driveLink) return entry.driveLink;
    const url = new URL(window.location.origin);
    // In a real app, you'd have a way to load this by ID from a server
    // For now, we'll just point to the app
    return url.toString();
  };

  const copyEntryDirectLink = async (entry: LibraryEntry) => {
    try {
      await navigator.clipboard.writeText(getEntryShareUrl(entry));
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
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
          language: entry.language,
          metadata: entry.metadata,
          coverUrl: entry.coverUrl
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

  const deleteFromLibrary = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteMedia(deleteConfirmId);
      setLibrary(prev => prev.filter(e => e.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setAiSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await aiSearchPodcasts(
          searchQuery,
          library.map(p => ({ id: p.id, title: p.title, description: p.description }))
        );
        setAiSearchResults(results);
      } catch (error) {
        console.error("AI Search failed:", error);
        setAiSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, library]);

  const filteredLibrary = library.filter(entry => {
    const matchesSearch = aiSearchResults 
      ? aiSearchResults.includes(entry.id)
      : (entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
         entry.metadata?.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
         entry.metadata?.topics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
         
    const matchesLanguage = languageFilter === 'all' || entry.language === languageFilter;
    const matchesKeyword = keywordFilter === '' || 
      entry.description.toLowerCase().includes(keywordFilter.toLowerCase()) ||
      entry.metadata?.keywords.some(k => k.toLowerCase().includes(keywordFilter.toLowerCase())) ||
      entry.metadata?.topics.some(t => t.toLowerCase().includes(keywordFilter.toLowerCase()));
    
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
      
      if (!initialSeekDone.current) {
        const urlParams = new URLSearchParams(window.location.search);
        const t = urlParams.get('t');
        if (t) {
          const time = parseInt(t, 10);
          if (!isNaN(time)) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
            
            // Clear the 't' parameter from the URL without reloading
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('t');
            window.history.replaceState({}, '', newUrl.toString());
          }
        }
        initialSeekDone.current = true;
      }
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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(0.5);
        audioRef.current.volume = 0.5;
      }
    }
  };

  const skipTime = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
    }
  };

  const handleFeedback = (isPositive: boolean) => {
    // In a real app, this would send an API request to log the feedback
    console.log(`Feedback received: ${isPositive ? 'Positive' : 'Negative'}`);
    setFeedbackGiven(true);
    setTimeout(() => setFeedbackGiven(false), 3000);
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

  const copyEmbedCode = async () => {
    const embedCode = `<iframe src="${window.location.origin}" width="100%" height="800" style="border:none; border-radius: 24px;" allow="microphone; camera; display-capture; autoplay"></iframe>`;
    try {
      await navigator.clipboard.writeText(embedCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy embed code:', err);
    }
  };

  const getShareUrl = () => {
    const url = new URL(window.location.href);
    if (shareWithTimestamp) {
      url.searchParams.set('t', Math.floor(currentTime).toString());
    } else {
      url.searchParams.delete('t');
    }
    return url.toString();
  };

  const copyDirectLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy direct link:', err);
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

  const playSample = async (e: React.MouseEvent, charId: PodcastSpeaker, samplePhrase: string) => {
    e.stopPropagation();
    
    if (playingSampleId === charId) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
      }
      setPlayingSampleId(null);
      return;
    }

    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      setPlayingSampleId(null);
    }

    setLoadingSampleId(charId);
    
    try {
      const audioBlob = await generateSampleAudio(charId, samplePhrase, selectedLanguage);
      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(url);
        sampleAudioRef.current = audio;
        
        audio.onended = () => {
          setPlayingSampleId(null);
          URL.revokeObjectURL(url);
        };
        
        audio.play();
        setPlayingSampleId(charId);
      }
    } catch (err) {
      console.error("Failed to play sample:", err);
    } finally {
      setLoadingSampleId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-serif selection:bg-[#5A5A40] selection:text-white">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isKeyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsKeyModalOpen(false)}
              className="absolute inset-0 bg-[#1a1a1a]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#5A5A40]"></div>
              <button 
                onClick={() => setIsKeyModalOpen(false)}
                className="absolute top-6 right-6 text-[#1a1a1a]/20 hover:text-[#1a1a1a] transition-colors"
              >
                <RotateCcw size={20} />
              </button>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40]">
                    <Key size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-sans">Gemini API Key</h3>
                    <p className="text-xs text-[#1a1a1a]/40">Connect your own key to bypass restrictions</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40 px-1">
                    Enter API Key String
                  </label>
                  <div className="relative">
                    <input 
                      type="password"
                      value={customKeyInput}
                      onChange={(e) => setCustomKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-4 py-3 bg-[#f5f5f0] border border-[#1a1a1a]/5 rounded-xl text-sm focus:outline-none focus:border-[#5A5A40] transition-all font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-[#1a1a1a]/40 leading-relaxed px-1">
                    This key will be stored locally in your browser and used directly for all AI operations.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={saveCustomKey}
                    className="flex-1 py-3 bg-[#5A5A40] text-white rounded-xl text-sm font-bold hover:bg-[#4a4a35] transition-all shadow-lg shadow-[#5A5A40]/20"
                  >
                    Save Key
                  </button>
                  {hasCustomKey && (
                    <button 
                      onClick={clearCustomKey}
                      className="px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] text-blue-700 leading-relaxed">
                    <strong>Why use this?</strong> If you see a "Paid Project" error from the platform, entering your key here bypasses that check by using your key directly.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-sans">Delete Podcast?</h3>
                  <p className="text-sm text-[#1a1a1a]/60 font-sans">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-[#1a1a1a]/5 text-[#1a1a1a] rounded-xl font-sans font-bold hover:bg-[#1a1a1a]/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-sans font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Share Modal */}
        <AnimatePresence>
          {isShareModalOpen && shareEntry && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeShareModal}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Share2 size={24} className="text-[#5A5A40]" />
                    Share Podcast
                  </h3>
                  <button onClick={closeShareModal} className="p-2 hover:bg-[#1a1a1a]/5 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-[#f5f5f0] rounded-2xl border border-[#1a1a1a]/5">
                    <h4 className="font-bold text-[#1a1a1a] mb-1">{shareEntry.title}</h4>
                    <p className="text-xs text-[#1a1a1a]/60 line-clamp-2">{shareEntry.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => uploadToDrive(shareEntry)}
                      disabled={isUploadingToDrive}
                      className="col-span-2 flex items-center justify-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition-all border border-blue-100 disabled:opacity-50"
                    >
                      {isUploadingToDrive ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <ImageIcon size={20} />
                      )}
                      <span className="text-sm font-bold">
                        {shareEntry.driveLink ? 'View on Google Drive' : 'Save to Google Drive'}
                      </span>
                    </button>
                    <a 
                      href={`https://twitter.com/intent/tweet?text=Check out this DeepDive: ${shareEntry.title}&url=${encodeURIComponent(getEntryShareUrl(shareEntry))}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-[#1a1a1a]/5 hover:bg-[#1a1a1a]/10 rounded-2xl transition-all group"
                    >
                      <Twitter size={20} className="text-[#1a1a1a]/60 group-hover:text-[#1DA1F2]" />
                      <span className="text-sm font-bold">Twitter</span>
                    </a>
                    <a 
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getEntryShareUrl(shareEntry))}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-[#1a1a1a]/5 hover:bg-[#1a1a1a]/10 rounded-2xl transition-all group"
                    >
                      <Facebook size={20} className="text-[#1a1a1a]/60 group-hover:text-[#4267B2]" />
                      <span className="text-sm font-bold">Facebook</span>
                    </a>
                    <a 
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getEntryShareUrl(shareEntry))}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-[#1a1a1a]/5 hover:bg-[#1a1a1a]/10 rounded-2xl transition-all group"
                    >
                      <Linkedin size={20} className="text-[#1a1a1a]/60 group-hover:text-[#0077b5]" />
                      <span className="text-sm font-bold">LinkedIn</span>
                    </a>
                    <a 
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this DeepDive: ' + shareEntry.title + ' ' + getEntryShareUrl(shareEntry))}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-[#1a1a1a]/5 hover:bg-[#1a1a1a]/10 rounded-2xl transition-all group"
                    >
                      <MessageCircle size={20} className="text-[#1a1a1a]/60 group-hover:text-[#25D366]" />
                      <span className="text-sm font-bold">WhatsApp</span>
                    </a>
                  </div>

                  <button 
                    onClick={() => copyEntryDirectLink(shareEntry)}
                    className="w-full flex items-center justify-between p-4 bg-[#5A5A40]/5 hover:bg-[#5A5A40]/10 border border-[#5A5A40]/20 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <LinkIcon size={20} className="text-[#5A5A40]" />
                      <span className="text-sm font-bold text-[#5A5A40]">Copy Direct Link</span>
                    </div>
                    {isLinkCopied ? <Check size={16} className="text-green-500" /> : <ChevronRight size={16} className="text-[#5A5A40]/40" />}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-white/10 bg-[#1a1a1a] text-white sticky top-0 z-20 shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 bg-[#5A5A40] rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(90,90,64,0.5)]">
              <Mic2 size={24} />
              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-[#1a1a1a]"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-sans">HARVEST SA UNPACKED <span className="font-light text-[#a3a380]">PODCASTS</span></h1>
              <p className="text-[10px] uppercase tracking-[0.3em] font-sans font-semibold text-white/50 flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Broadcasting Agricultural Insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-6 text-sm font-sans font-medium text-white/70">
              <span className="hover:text-white cursor-pointer transition-colors">Episodes</span>
              <span className="hover:text-white cursor-pointer transition-colors">Hosts</span>
              <button 
                onClick={openKeySelector}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border",
                  hasCustomKey 
                    ? "border-green-500/30 bg-green-500/10 text-green-400" 
                    : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                )}
              >
                <Key size={14} />
                {hasCustomKey ? 'API Key Active' : 'Setup API Key'}
              </button>
              <button 
                onClick={handleGoogleAuth}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border",
                  googleTokens 
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400" 
                    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                )}
              >
                <Cloud size={14} />
                {googleTokens ? 'Drive Connected' : 'Connect Drive'}
              </button>
              {googleTokens && (
                <a 
                  href="https://drive.google.com/drive/folders/1XonAi82cECXvVde8VGCugDkS-vLA5mjn" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                >
                  <ExternalLink size={14} />
                  View Folder
                </a>
              )}
            </div>
            <button 
              onClick={copyEmbedCode}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#5A5A40] text-white rounded-full text-xs font-sans font-bold hover:bg-[#4a4a35] transition-all shadow-lg hover:shadow-[#5A5A40]/20"
            >
              {isCopied ? <Check size={14} /> : <Code size={14} />}
              {isCopied ? 'Embed Copied' : 'Embed Podcasts'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[1fr,400px] gap-12">
          
          {/* Left Column: Upload & Content */}
          <div className="space-y-12">
            <section className="mb-4">
              <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-[32px] overflow-hidden shadow-lg border border-[#1a1a1a]/5 group bg-gradient-to-br from-[#5A5A40] to-[#2a2a1a]">
                <img 
                  src="/thabo-refilwe.jpg" 
                  alt="Harvest SA Magazine Team - Thabo and Refilwe" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    // Temporary placeholder that looks like a podcast studio
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1600&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-10">
                  <h2 className="text-white text-2xl sm:text-4xl font-bold mb-2">Meet the Harvest Unpacked AI team</h2>
                  <p className="text-white/90 text-sm sm:text-lg max-w-2xl">Thabo and Refilwe Unpacking the latest articles in Harvest SA Magazine</p>
                </div>
              </div>
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
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt" 
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
                        <p className="text-sm text-[#1a1a1a]/40 font-sans">PDF, Image, Word, or Text (Max 10MB)</p>
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
                      <div
                        key={char.id}
                        onClick={() => toggleCharacter(char.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleCharacter(char.id);
                          }
                        }}
                        className={cn(
                          "p-4 rounded-2xl text-left transition-all border flex items-start gap-3 cursor-pointer",
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
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={cn(
                              "text-sm font-bold",
                              selectedCharacters.includes(char.id) ? "text-[#5A5A40]" : "text-[#1a1a1a]"
                            )}>{char.name}</p>
                            {char.samplePhrase && (
                              <button
                                onClick={(e) => playSample(e, char.id, char.samplePhrase!)}
                                disabled={loadingSampleId !== null && loadingSampleId !== char.id}
                                className={cn(
                                  "p-1.5 rounded-full transition-colors",
                                  playingSampleId === char.id || loadingSampleId === char.id
                                    ? "bg-[#5A5A40] text-white"
                                    : "hover:bg-[#1a1a1a]/5 text-[#1a1a1a]/40 hover:text-[#5A5A40]"
                                )}
                                title="Play Sample"
                              >
                                {loadingSampleId === char.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : playingSampleId === char.id ? (
                                  <Volume2 size={14} className="animate-pulse" />
                                ) : (
                                  <Play size={14} className="ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-[#1a1a1a]/60 font-sans leading-tight mt-1">{char.description}</p>
                        </div>
                      </div>
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
                    {(['English', 'Afrikaans'] as PodcastLanguage[]).map((lang) => (
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

                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-purple-100 shadow-sm">
                    <Zap size={10} className="fill-purple-700" />
                    Powered by Gemini 3.1 Pro
                  </div>
                </div>

                {!hasCustomKey && (
                  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-yellow-800 font-bold text-sm">
                      <Key size={16} />
                      API Key Required
                    </div>
                    <p className="text-xs text-yellow-700 leading-relaxed">
                      To generate podcasts, you need to connect your own Google Gemini API key. 
                    </p>
                    <button 
                      onClick={openKeySelector}
                      className="w-full py-2.5 bg-yellow-600 text-white rounded-xl text-sm font-bold hover:bg-yellow-700 transition-all shadow-sm"
                    >
                      Connect Your API Key
                    </button>
                    <p className="text-[10px] text-yellow-600/70 text-center italic">
                      Tip: Select "Google Gemini" in the dialog that appears.
                    </p>
                  </div>
                )}

                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-6 border-t border-[#1a1a1a]/5"
                  >
                    <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-[#5A5A40]/10 text-[#5A5A40] rounded-lg w-fit text-[10px] font-bold uppercase tracking-widest">
                      <Clock size={12} />
                      DeepDive Generation (3-4 mins)
                    </div>
                    {[
                      { id: 1, label: 'Extracting text from content' },
                      { id: 2, label: 'Generating fun & informative deep dive script' },
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

                {(error || detailedError) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-col gap-3 text-red-600 bg-red-50 p-6 rounded-2xl border border-red-100"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle size={18} />
                      {detailedError ? detailedError.message : "Oops! Something went wrong"}
                    </div>
                    <p className="text-sm opacity-80 leading-relaxed">
                      {detailedError ? detailedError.reason : error}
                    </p>
                    {detailedError && (
                      <div className="mt-2 p-4 bg-white/50 rounded-xl border border-red-100/50">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-red-900/40 mb-1">Potential Solution</p>
                        <p className="text-xs text-red-800 font-sans font-medium">
                          {detailedError.solution}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4">
                      {((error && (error.includes("quota") || error.includes("429") || error.includes("key"))) || 
                        (detailedError && (detailedError.code === 'QUOTA_EXCEEDED_NO_FALLBACK' || detailedError.code === 'TTS_QUOTA_EXCEEDED'))) && (
                        <button 
                          onClick={openKeySelector}
                          className="text-xs font-sans font-bold uppercase tracking-wider text-red-700 hover:underline flex items-center gap-1"
                        >
                          Connect your own API Key <ExternalLink size={10} />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setError(null);
                          setDetailedError(null);
                        }}
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
                      {currentPodcast?.coverUrl ? (
                        <img 
                          src={currentPodcast.coverUrl} 
                          alt="Cover Art" 
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                      {isPlaying ? (
                        <div className="flex items-end gap-1 h-12 relative z-10">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-2 bg-white rounded-t-sm"
                              animate={{
                                height: ["20%", "100%", "40%", "80%", "30%"]
                              }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                repeatType: "mirror",
                                ease: "easeInOut",
                                delay: i * 0.1
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <Volume2 size={48} className="relative z-10" />
                      )}
                    </div>
                    <div className="flex-1 space-y-6 text-center sm:text-left w-full">
                      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                        <div>
                          <h3 className="text-2xl font-bold">Latest DeepDive</h3>
                          <p className="text-white/60 font-sans text-sm uppercase tracking-widest">Harvest SA Unpacked • Episode 01</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
                            <button 
                              onClick={toggleMute}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                            >
                              {isMuted || volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
                            </button>
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.01"
                              value={isMuted ? 0 : volume} 
                              onChange={handleVolumeChange}
                              className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#5A5A40]"
                            />
                          </div>
                          <button 
                            onClick={handleSpeedChange}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-sans font-bold transition-colors flex items-center gap-2 border border-white/10"
                          >
                            <Zap size={12} />
                            {playbackSpeed}x
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-4">
                          {/* Seek Bar */}
                          <div className="space-y-2">
                            <div className="relative group">
                              <input 
                                type="range" 
                                min="0" 
                                max={duration || 0} 
                                value={currentTime} 
                                onChange={handleSeek}
                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#5A5A40] group-hover:bg-white/20 transition-all"
                                style={{
                                  background: `linear-gradient(to right, #5A5A40 0%, #5A5A40 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) 100%)`
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-sans font-bold text-white/40 uppercase tracking-widest">
                              <span>{formatTime(currentTime)}</span>
                              <span>{formatTime(duration)}</span>
                            </div>
                          </div>

                          {/* Main Controls */}
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6">
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => skipTime(-15)}
                                className="p-2 text-white/40 hover:text-white transition-colors"
                                title="Rewind 15s"
                              >
                                <RotateCcw size={20} />
                              </button>
                              
                              <button 
                                onClick={togglePlayback}
                                className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl"
                              >
                                {isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" className="ml-1" />}
                              </button>

                              <button 
                                onClick={() => skipTime(15)}
                                className="p-2 text-white/40 hover:text-white transition-colors"
                                title="Forward 15s"
                              >
                                <RotateCw size={20} />
                              </button>
                            </div>
                            
                            <div className="h-8 w-px bg-white/10 hidden sm:block"></div>

                            <div className="flex items-center gap-2">
                              <a 
                                href={audioUrl} 
                                download={`HarvestUnpacked_DeepDive_${file?.name.replace('.pdf', '') || 'Podcast'}.wav`}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-sans font-bold transition-all border border-white/10"
                                title="Download Podcast"
                              >
                                <Download size={14} />
                                <span>Download</span>
                              </a>

                              <button 
                                onClick={copyEmbedCode}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-sans font-bold transition-all border border-white/10"
                                title="Embed Podcasts"
                              >
                                {isCopied ? <Check size={14} /> : <Code size={14} />}
                                <span>Embed</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
                               <a href={`https://twitter.com/intent/tweet?text=Check out this DeepDive: ${currentPodcast?.title || 'Podcast'}&url=${encodeURIComponent(getShareUrl())}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all" title="Share on Twitter">
                                 <Twitter size={16} />
                               </a>
                               <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all" title="Share on Facebook">
                                 <Facebook size={16} />
                               </a>
                               <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all" title="Share on LinkedIn">
                                 <Linkedin size={16} />
                               </a>
                               <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this DeepDive: ' + (currentPodcast?.title || 'Podcast') + ' ' + getShareUrl())}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all" title="Share on WhatsApp">
                                 <MessageCircle size={16} />
                               </a>
                               <button onClick={copyDirectLink} className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all" title="Copy Direct Link">
                                 {isLinkCopied ? <Check size={16} /> : <LinkIcon size={16} />}
                               </button>
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-white/40 cursor-pointer hover:text-white/60 transition-colors w-fit">
                            <input 
                              type="checkbox" 
                              checked={shareWithTimestamp} 
                              onChange={(e) => setShareWithTimestamp(e.target.checked)}
                              className="rounded bg-white/10 border-white/20 text-[#5A5A40] focus:ring-[#5A5A40] focus:ring-offset-0 focus:ring-offset-transparent"
                            />
                            Share at {formatTime(currentTime)}
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                        <span className="text-xs font-sans text-white/60">How was this episode?</span>
                        <div className="flex items-center gap-2">
                          {feedbackGiven ? (
                            <span className="text-xs font-sans text-emerald-400 flex items-center gap-1">
                              <Check size={12} /> Thanks for your feedback!
                            </span>
                          ) : (
                            <>
                              <button onClick={() => handleFeedback(true)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-sans transition-colors flex items-center gap-1">
                                👍 Good
                              </button>
                              <button onClick={() => handleFeedback(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-sans transition-colors flex items-center gap-1">
                                👎 Needs Work
                              </button>
                            </>
                          )}
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
              {glossary && glossary.length > 0 && !isProcessing && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] p-8 border border-[#1a1a1a]/5"
                >
                  <h3 className="text-2xl font-bold flex items-center gap-2 mb-6">
                    <Sprout size={24} className="text-[#5A5A40]" />
                    Agricultural Glossary
                  </h3>
                  <div className="grid gap-4">
                    {glossary.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-[#f5f5f0] border border-[#1a1a1a]/5">
                        <h4 className="font-bold text-[#1a1a1a] mb-1">{item.term}</h4>
                        <p className="text-sm text-[#1a1a1a]/80 leading-relaxed">{item.definition}</p>
                      </div>
                    ))}
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
                  desc="The high-energy tech enthusiast. Loves innovation, data, and naturally uses local slang like 'lekker' and 'howzit'."
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
                  desc="Practical and witty. Brings real-world farm stories to life using slang like 'yoh', 'shame', and 'now-now'."
                  icon={<Sprout size={16} />}
                  avatarUrl="https://picsum.photos/seed/lindiwe/100/100"
                  samplePhrase="Howzit! Let's get our hands dirty and see what's really happening on the ground."
                  selectedLanguage={selectedLanguage}
                  pronunciationGuide={[
                    { term: "Bovine", phonetic: "BOH-vahyn" },
                    { term: "Veterinary", phonetic: "VET-er-uh-ner-ee" }
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
                      {['English', 'Afrikaans'].map(l => <option key={l} value={l}>{l}</option>)}
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
                      <div className="flex gap-4">
                        {entry.coverUrl && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                            <img 
                              src={entry.coverUrl} 
                              alt={entry.title} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
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
                                onClick={() => openShareModal(entry)}
                                className="p-2 rounded-full hover:bg-white text-[#5A5A40] transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                title="Share Podcast"
                              >
                                <Share2 size={16} />
                              </button>
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
                        </div>
                      </div>
                      {entry.metadata && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {entry.metadata.keywords.slice(0, 3).map((keyword, idx) => (
                            <span key={idx} className="px-2 py-1 bg-[#5A5A40]/10 text-[#5A5A40] rounded-md text-[10px] font-sans font-bold uppercase tracking-wider">
                              {keyword}
                            </span>
                          ))}
                          {entry.metadata.keywords.length > 3 && (
                            <span className="px-2 py-1 bg-[#1a1a1a]/5 text-[#1a1a1a]/40 rounded-md text-[10px] font-sans font-bold uppercase tracking-wider">
                              +{entry.metadata.keywords.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => loadFromLibrary(entry)}
                          className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#5A5A40] hover:underline flex items-center gap-1"
                        >
                          Listen & View Details <Play size={10} />
                        </button>
                        <button 
                          onClick={() => openShareModal(entry)}
                          className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#5A5A40] hover:underline flex items-center gap-1"
                        >
                          Share <Share2 size={10} />
                        </button>
                        {!entry.driveLink && (
                          <button 
                            onClick={() => uploadToDrive(entry)}
                            className="text-[10px] font-sans font-bold uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Upload to Drive <ImageIcon size={10} />
                          </button>
                        )}
                        {entry.driveLink && (
                          <a 
                            href={entry.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-sans font-bold uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Drive <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
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
                  onClick={copyEmbedCode}
                  className="flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-full text-sm font-sans font-medium hover:bg-[#4a4a35] transition-colors shadow-sm"
                >
                  {isCopied ? <Check size={16} /> : <Code size={16} />}
                  {isCopied ? 'Embed Copied' : 'Embed Podcasts'}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {script.map((segment, i) => (
                <div key={i} className="flex gap-6 items-start group">
                  <span className={cn(
                    "w-24 shrink-0 font-sans font-bold text-xs uppercase tracking-widest mt-1.5",
                    segment.speaker === 'Thabo' ? 'text-blue-600' : 'text-emerald-600'
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
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </BrowserRouter>
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
      const audioBlob = await generateSampleAudio(name as any, samplePhrase, selectedLanguage);
      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
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
