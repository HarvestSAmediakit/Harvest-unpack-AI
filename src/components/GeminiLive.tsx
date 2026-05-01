import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { Mic, MicOff, Loader2 } from 'lucide-react';

export const GeminiLive: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const sessionRef = useRef<any>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const playbackContextRef = useRef<AudioContext | null>(null);
  let nextPlayTimeRef = useRef<number>(0);

  const startRealtimAudioAndSession = async () => {
    setIsProcessing(true);
    const apiKey = process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey as string });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new window.AudioContext({ sampleRate: 16000 });
      await audioContextRef.current.resume();

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      playbackContextRef.current = new window.AudioContext({ sampleRate: 24000 });
      await playbackContextRef.current.resume();
      nextPlayTimeRef.current = playbackContextRef.current.currentTime;

      processorRef.current.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true);
        }
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = window.btoa(binary);

        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      const session = await ai.live.connect({
        model: "models/gemini-2.0-flash-exp",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsProcessing(false);
            console.log("Live session connected");
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryString = window.atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const pcm16Data = new Int16Array(bytes.buffer);
              const float32Data = new Float32Array(pcm16Data.length);
              for (let i = 0; i < pcm16Data.length; i++) {
                float32Data[i] = pcm16Data[i] / 32768.0;
              }
              
              if (playbackContextRef.current) {
                const audioBuffer = playbackContextRef.current.createBuffer(1, float32Data.length, 24000);
                audioBuffer.copyToChannel(float32Data, 0);
                const source = playbackContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(playbackContextRef.current.destination);
                
                const currentTime = playbackContextRef.current.currentTime;
                if (nextPlayTimeRef.current < currentTime) {
                  nextPlayTimeRef.current = currentTime;
                }
                source.start(nextPlayTimeRef.current);
                nextPlayTimeRef.current += audioBuffer.duration;
              }
            }
            if (message.serverContent?.interrupted) {
               nextPlayTimeRef.current = playbackContextRef.current?.currentTime || 0;
            }
          },
          onerror: (error) => {
            console.error("Live session error", error);
            stopLiveSession();
          },
          onclose: () => {
            console.log("Live session closed");
            stopLiveSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the host of DigiMag Podcasts AI. You are a fast, engaging, and witty conversationalist.",
        },
      });
      sessionRef.current = session;

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

    } catch (error) {
      console.error("Failed to connect to live session", error);
      stopLiveSession();
    }
  };

  const stopLiveSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    setIsConnected(false);
    setIsProcessing(false);
  };

  useEffect(() => {
    return () => stopLiveSession();
  }, []);

  return (
    <div className="flex justify-center mt-4 mb-4">
      <button
        onClick={isConnected ? stopLiveSession : startRealtimAudioAndSession}
        className={`px-8 py-4 rounded-full font-sans font-bold shadow-xl flex items-center gap-3 transition-transform hover:scale-105 ${isConnected ? 'bg-red-500 text-white' : 'bg-[#5A5A40] text-white'}`}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 size={24} className="animate-spin" />
            Connecting Live Voice...
          </>
        ) : isConnected ? (
          <>
            <MicOff size={24} />
            End Live Conversation
          </>
        ) : (
          <>
            <Mic size={24} />
            Start Live Conversation
          </>
        )}
      </button>
    </div>
  );
};
