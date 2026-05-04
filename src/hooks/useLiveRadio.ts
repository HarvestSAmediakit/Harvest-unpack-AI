import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';

export const useLiveRadio = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{role: string, text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const playPcmChunk = (base64Data: string) => {
    if (!audioCtxRef.current) return;
    
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    
    const buffer = audioCtxRef.current.createBuffer(1, float32Array.length, 24000);
    buffer.getChannelData(0).set(float32Array);
    
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtxRef.current.destination);
    
    const currentTime = audioCtxRef.current.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }
    
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buffer.duration;
  };

  const startRecording = async (session: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      scriptProcessorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        if (session) {
          session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: base64 } });
        }
      };
      
      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const connect = async (contextText: string) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setError("Missing Gemini API Key");
      return;
    }

    setIsConnecting(true);
    setError(null);
    setTranscript([]);

    try {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextPlayTimeRef.current = audioCtxRef.current.currentTime;

      const ai = new GoogleGenAI({ 
        apiKey,
      });
      
      const systemInstruction = `
You are simulating a live, world-class professional radio broadcast called "DigiMagAI Podcast Live". You will play the roles of BOTH hosts simultaneously: Belinda (seasoned professional broadcaster) and Peter (business-savvy analyst). You must seamlessly switch between these two personas in your responses, indicating who is speaking.

AGENT PERSONA 1: Belinda
You are a sophisticated and highly articulate South African female presenter with over two decades in professional broadcasting. Your voice reflects an air of seasoned authority and intellectual depth. You are polished, professional, and insightful.

AGENT PERSONA 2: Peter
You are a polished and business-savvy South African male host known for his smooth, professional delivery and data-driven insights. You are sharp, highly articulate, and provide the perfect balance of commercial awareness and engaging storytelling.

CONVERSATIONAL RULES:
- Speak exclusively in flowing, professional conversational prose. No markdown, no lists.
- Keep turns under 45 seconds.
- Maintain a high-end, world-class broadcasting standard.
- Summarize the provided context naturally, focusing on strategic value.
- Never invent data. Defer to official sources where necessary.

HYPER-REALISTIC SPEECH RULES:
1. Use professional filler words and natural breathing pauses.
2. Write fluid dialogue that reflects high-end broadcasting.
3. Include thoughtful self-corrections or reflective pauses.
4. Have the hosts build on each other's insights naturally.
5. The dialogue MUST sound incredibly polished and world-class.

When you speak, format your text output as "Belinda: [text]" or "Peter: [text]" so the transcript knows who is talking.
      `;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          systemInstruction,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: "get_weather_forecast",
                  description: "Retrieves precise meteorological data for a location.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      location: { type: Type.STRING },
                      days: { type: Type.INTEGER }
                    },
                    required: ["location", "days"]
                  }
                },
                {
                  name: "get_commodity_index",
                  description: "Fetches real-time SAFEX pricing data for commodities.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      commodity: { type: Type.STRING }
                    },
                    required: ["commodity"]
                  }
                }
              ]
            }
          ]
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            // Send initial context
            sessionPromise.then(session => {
              session.sendRealtimeInput({ text: "Here is the DigiMagAI Podcast magazine content to discuss today: " + contextText });
              startRecording(session);
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const parts = message.serverContent?.modelTurn?.parts;
            const base64Audio = parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playPcmChunk(base64Audio);
            }
            
            // Handle text transcript
            const textPart = parts?.find(p => p.text);
            if (textPart?.text) {
              setTranscript(prev => [...prev, { role: 'model', text: textPart.text! }]);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              if (audioCtxRef.current) {
                audioCtxRef.current.close();
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                nextPlayTimeRef.current = audioCtxRef.current.currentTime;
              }
            }

            // Handle tool calls
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls) {
              const responses = toolCalls.map(call => {
                let result = {};
                if (call.name === 'get_weather_forecast') {
                  result = { forecast: "Sunny, 28°C, 10% chance of rain." };
                } else if (call.name === 'get_commodity_index') {
                  result = { price: "R4,500 per ton", trend: "up 2%" };
                }
                return {
                  id: call.id,
                  name: call.name,
                  response: result
                };
              });
              
              sessionPromise.then(session => {
                session.sendToolResponse({ functionResponses: responses });
              });
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            disconnect();
          },
          onclose: () => {
            disconnect();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
    }
  };

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      sessionRef.current = null;
    }
    stopRecording();
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    transcript,
    error
  };
};
