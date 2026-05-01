/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { GeminiLive } from "./components/GeminiLive";
import { motion, AnimatePresence } from "motion/react";
import Markdown from 'react-markdown';
import {
  FileUp,
  Mic2,
  Play,
  Pause,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Volume, Volume1, Volume2, VolumeX,
  Users,
  TrendingUp,
  Target,
  LineChart,
  Download,
  FileText,
  Share2,
  Copy,
  Check,
  Zap,
  Clock,
  Save,
  Settings,
  X,
  Radio,
  History,
  MessageSquare,
  Plus,
  ArrowRight,
  Globe,
  Link,
  Trash2,
  Languages,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  RotateCw,
  Sparkles,
  Twitter,
  Facebook,
  Linkedin,
} from "lucide-react";
import { extractTextFromFile } from "./services/textExtractionService";
import { scrapeUrl } from "./services/scraperService";
import {
  generatePodcastScript,
  generatePodcastAudio,
  generateVoiceSample,
  PodcastSegment,
} from "./services/geminiService";
import {
  generateIntroMusic,
  generateIntroVoiceover,
  generateSting,
  generateOutroMusic,
  generateOutroVoiceover,
} from "./services/audioIdentityService";
import {
  generatePodcastScriptOpenAI,
  generatePodcastAudioOpenAI,
} from "./services/openaiService";
import { generatePodcastAudioGoogle } from "./services/googleTtsService";
import { AppError, PodcastError, isAppError } from "./types";
import { syncUserProfile, UserProfile, getPodcastsFromFirebase, savePodcastToFirebase, deletePodcastFromFirebase, getPublicPodcastsFromFirebase, updatePodcastVisibilityInFirebase } from "./services/firebaseService";
import {
  pcmToWav,
  pcmToMp3,
  base64ToBlobUrl,
  masterAudio,
} from "./utils/audioUtils";
import { withRetry } from "./utils/aiUtils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HOSTS, LANGUAGES, VOICES } from "./constants";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import {
  auth,
  onAuthStateChanged,
  signInWithPopup,
  googleProvider,
  db,
  storage,
  doc,
  setDoc,
  ref,
  uploadBytes,
  getDownloadURL,
} from "./firebase";
import { User } from "firebase/auth";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  standard:
    "Engaging, conversational deep dive into the core themes and narrative of the article.",
  impact:
    "Strategic analysis focused on industry trends, professional growth, and business ROI.",
  unpacked:
    "Signature 60-second branded feature unpacking companies and innovations with a professional close.",
  combined:
    "A conversational deep dive blended with a branded feature, unpacking innovations and key takeaways.",
};

interface PodcastAudioSegments {
  introMusic?: string;
  introVoiceover?: string;
  sting?: string;
  conversation?: string;
  outroVoiceover?: string;
  outroMusic?: string;
}

const SEGMENT_KEYS = [
  "introMusic",
  "introVoiceover",
  "sting",
  "conversation",
  "outroVoiceover",
  "outroMusic",
] as const;

type SegmentKey = typeof SEGMENT_KEYS[number];

interface MagazineArticle {
  title: string;
  summary: string;
  text: string;
}

const DEFAULT_ARTICLE_TEXT = `# Architecting the Ultimate Human-Parity Multi-Agent Voice AI Podcast System
The proliferation of real-time multimodal artificial intelligence has initiated a paradigm shift in synthetic media, transitioning the industry from static, text-based interactions to dynamic, low-latency, voice-first architectures. The deployment of a multi-agent conversational system—specifically, an autonomous podcast hosted by interacting AI agents capable of accommodating live human listeners—represents one of the most complex engineering challenges in modern computational linguistics and systems architecture. The objective is to achieve true "human parity," a state where the listeners cannot distinguish the synthetic hosts from biological humans. This state is characterized by natural prosody, flawless turn-taking, seamless interruption handling, and zero-latency knowledge retrieval.
To realize this ambitious capability, the system must harmonize several bleeding-edge technologies: high-throughput transport protocols, un-opinionated real-time orchestration frameworks, semantic turn-detection models, microsecond-latency Retrieval-Augmented Generation (RAG) pipelines, and sophisticated, constraint-based prompt engineering. Furthermore, the architecture must support a highly specific interaction flow: a multi-agent podcast dialogue that pauses when a listener presses a button to join the conversation, acknowledges the listener seamlessly, processes their spoken inquiry via a high-speed vector retrieval system, delivers the factual answer using natural conversational filler, and subsequently resumes the podcast banter without breaking character. This report provides an exhaustive, authoritative blueprint for constructing the ultimate multi-agent podcast architecture, encompassing the network transport layer, the multi-model agentic coordination logic, the acoustic engineering required for human-like banter, and the precise mechanism for live listener injection and retrieval-augmented response generation.
## Evaluating Multi-Agent Orchestration Frameworks
The foundational layer of the architecture requires selecting an appropriate orchestration framework to manage the complex interplay between multiple language models. The landscape of AI agent frameworks has expanded rapidly, resulting in a divergence between general workflow builders and purpose-built real-time voice orchestrators.
General workflow builders, such as Microsoft's AutoGen, LangChain's LangGraph, and LlamaIndex, excel at orchestrating complex, stateful data pipelines. LangGraph, for example, utilizes a graph-based architecture to manage state, branching, and memory, treating agents as nodes within a state machine. Similarly, CrewAI models multi-agent collaboration as a role-based team, while Hugging Face's Smolagents offers a minimalist entry point.
However, these generalized frameworks often break down when confronted with the inherently unpredictable nature of real-time voice operations. In a voice-first environment, requests are unpredictable; a listener might ask a question that requires the agent to dynamically decide whether to check a vector database, an external CRM, or simply respond contextually, all without a pre-written workflow explicitly dictating the path. Consequently, for a real-time, multi-participant audio architecture, the system must rely on frameworks specifically optimized for low-latency streaming and multimodal orchestration.
The OpenAI Agents SDK and the LiveKit Agents framework provide the structural primitives necessary to manage this complexity. These platforms diverge from rigid graph structures, offering a unified interface for defining agent behaviors, handling event-driven state changes, and streaming interactions directly to audio models.
| Framework / Platform | Primary Architecture Model | Key Strengths & Focus Areas | Limitations in Real-Time Voice Context |
|---|---|---|---|
| **LangGraph** | Graph-based state machines | Stateful, complex branching, memory management | High latency for synchronous voice loops |
| **CrewAI** | Role-based team collaboration | Multi-agent persona definitions, Python native | Better suited for background asynchronous tasks |
| **OpenAI Agents SDK** | Event-driven runtime loop  | Handoffs, tool use, real-time API native integration | Relies heavily on OpenAI's proprietary model ecosystem |
|  | **LiveKit Agents** | WebRTC-native event orchestration  | Ultra-low latency, Room/Participant primitives, custom VAD  |
| **AutoGen (Microsoft)** | Layered conversational architecture | No-code options, multi-agent systems,.NET/Python | Primarily text-driven orchestration |
## The Transport Layer: Transcending WebSocket Limitations
The most critical bottleneck for any real-time voice architecture is the transport protocol. The traditional approach to conversational AI, including the default implementations of many turnkey platforms, relies heavily on WebSockets. While WebSockets provide full-duplex, bi-directional communication over a single Transmission Control Protocol (TCP) connection, they are fundamentally inadequate for a massive, multi-participant, interactive audio broadcast. TCP strictly enforces packet ordering; if a single packet is dropped due to network instability, the entire stream halts until the lost packet is retransmitted. This results in head-of-line blocking, which manifests as stuttering or dead air. In a human conversation, a delay of 200 milliseconds is perceptible, and a delay exceeding 500 milliseconds destroys the illusion of natural presence.
To eliminate head-of-line blocking and achieve the sub-100-millisecond latency required for human parity, the architecture must utilize Web Real-Time Communication (WebRTC). WebRTC transmits data over the User Datagram Protocol (UDP), which does not guarantee delivery or ordering, thereby prioritizing real-time timeliness over absolute packet completeness. Furthermore, WebRTC incorporates secure real-time transport (SRTP) and dynamic bitrate adaptation, ensuring that audio quality degrades gracefully under poor network conditions rather than buffering and breaking the conversational flow.
### The Selective Forwarding Unit (SFU) Architecture
For a podcast application where thousands of listeners may be tuning in simultaneously and occasionally interacting, a peer-to-peer WebRTC mesh network is unscalable. In a mesh network, every participant must establish a direct connection with every other participant, causing exponential bandwidth consumption. Instead, the architecture necessitates a Selective Forwarding Unit (SFU).
An SFU acts as a central routing server that receives a single media stream from each active speaker (the AI agents and any joined human listener) and selectively forwards these streams to all passive listeners. This topology is particularly scalable to multiple-participant problems. When evaluating the orchestration framework to manage these WebRTC connections and integrate the AI agents, LiveKit emerges as the optimal foundation.
Unlike turnkey managed solutions such as Vapi or Retell AI—which optimize for simple telephony use cases (SIP/VoIP), rely on WebSockets, and abstract away low-level room controls—LiveKit is an un-opinionated, open-source framework. It treats virtual rooms, participants, and audio tracks as first-class primitives. This allows developers to instantiate a virtual "studio" where multiple AI agents operate as distinct participants, each publishing their own synchronized audio streams. LiveKit's SFU architecture inherently supports high-volume streaming to thousands of passive listeners while retaining the ability to dynamically alter participant permissions through Simulcast and Dynacast optimizations.
| Feature / Capability | WebSockets (e.g., Vapi, Retell AI) | WebRTC SFU (e.g., LiveKit, Cloudflare Calls) |
|---|---|---|
| **Underlying Protocol** | TCP (Transmission Control Protocol)  | UDP (User Datagram Protocol) |
| **Latency Profile** | Prone to head-of-line blocking; higher latency | Sub-100ms; adaptive to network conditions |
| **Multi-Participant Scalability** | Poor; backend bottlenecking  | Excellent; highly scalable for thousands of passive listeners |
| **Primary Use Case** | 1-on-1 telephony, simple bots | E-conference style, multi-agent rooms, live broadcasts |
| **Media Routing** | Centralized backend processing  | Selective Forwarding Units (SFUs) |
## The Listener Injection Mechanism
The requirement for a user to press a button, join the conversation, interact with the hosts, and trigger a knowledge retrieval process demands a precise state-machine transition within the orchestration layer. In the LiveKit architecture, every connected user is designated as a Participant. Initially, the audience members connect as RemoteParticipant entities with access tokens explicitly denying the permission to publish audio tracks. They merely subscribe to the AI agents' active streams.
When a listener wishes to interact, they press a "Join Conversation" button on the web player. This action initiates a highly orchestrated WebRTC Session Description Protocol (SDP) renegotiation. The client application calls getUserMedia() to access the microphone and generates an SDP offer requesting to publish local media. This offer is transmitted to the signaling server alongside an ephemeral authentication key.
The LiveKit backend validates the request and responds with an SDP answer, dynamically upgrading the user's token permissions to allow track publishing. The listener's state transitions from a passive subscriber to a LocalParticipant actively streaming audio into the virtual room.
### Orchestrating the Greeting
The AI agents must be aware of this state change to acknowledge the listener. LiveKit provides lifecycle hooks and session events that trigger when a participant joins or when a new audio track is published. The AgentSession running the podcast monitors these room events.
Upon detecting the track_published event from the listener, the orchestration logic intercepts the current conversational flow. If Agent A is speaking, the system utilizes the interrupt() function to gracefully pause Agent A's output. The system prompt governing the agents includes specific instructions for this lifecycle event, directing them to acknowledge the new participant. Agent B, recognizing the context shift, is triggered to output a welcoming phrase: "Hi there, thanks for joining the stream. Do you have a question for us?". This seamless transition transforms a passive broadcast consumer into an active, low-latency conversational node without requiring page reloads or disconnecting the primary audio stream.
## Multi-Agent Coordination and State Management
A single Large Language Model (LLM) instructed to act as two different people invariably fails; it eventually blends the personas, struggles with self-interruption, and fails to maintain distinct conversational arcs. True multi-agent interaction requires instantiating discrete agents, each with its own system prompt, memory buffer, and audio generation pipeline, orchestrated within the same virtual environment.
Within the LiveKit Room, each AI podcaster is instantiated as a distinct AgentSession. These sessions manage the continuous loop of Speech-to-Text (STT), LLM inference, and Text-to-Speech (TTS). For example, the session configuration might utilize Deepgram Nova 3 for STT, OpenAI's GPT-4o for reasoning, and Cartesia Sonic for ultra-realistic TTS.
### Managing Context Across Multiple Agents
To prevent the agents from talking over one another and to ensure a cohesive narrative, the architecture utilizes a shared context mechanism. The state is maintained by aggregating the transcriptions of all published tracks in the room into a centralized message history.
The OpenAI Agents SDK provides several strategies for managing this state across turns. The most effective approach for a multi-participant podcast is managing the result.history at the application level, ensuring maximum control over the replay-ready history. The message list fed to each individual model includes explicit tags denoting the speaker, formatted as a sequence of dictionaries: {"speaker 1 (Host A)": "transcript"}, {"speaker 2 (Host B)": "transcript"}, {"speaker 3 (Listener)": "transcript"}. This allows each agent to maintain a coherent understanding of the entire dialogue.
To govern the flow of conversation, the system employs sophisticated handoff patterns and deterministic routing. Instead of relying purely on silence to dictate when an agent should speak, the orchestrator utilizes a Supervisor or Router Pattern. The underlying logic monitors the semantic completion of an agent's thought and explicitly grants the "speaking token" to the next agent. In the OpenAI Realtime API, this is managed through specific conversation item events, such as conversation.item.added and conversation.item.done. When Agent A completes a thought, the response.output_audio_transcript.done event fires, signaling the orchestration layer to prompt Agent B or listen for the human participant.
| State Management Strategy | Primary Data Location | Optimal Use Case in Voice Architecture |
|---|---|---|
| **result.history** | Local Application | Maximum control over multi-agent chat loops and speaker tagging |
| **session** | Storage + SDK | Persistent chat state across long-running, resumable podcast sessions |
| **conversationId** | OpenAI Conversations API | Shared server-managed state across distributed workers or services |
| **previousResponseId** | OpenAI Responses API | Lightest server-managed continuation for rapid, sequential turns |
## Zero-Latency Retrieval-Augmented Generation (RAG)
The most critical bottleneck in the required user flow occurs when the human listener asks a factual question that requires the AI to consult source material. Traditional architectures rely on a sequential pipeline: the user stops speaking, the system transcribes the audio, the LLM generates a search query, the vector database retrieves the context, the LLM synthesizes the answer, and the TTS engine generates the audio. This chain can introduce a latency of 3 to 5 seconds, resulting in a dead silence that instantly shatters the illusion of human parity.
### The Chat-Supervisor Architecture
To eliminate this latency and fulfill the requirement of speaking back to the listeners in a natural way without delay, the architecture implements the "Chat-Supervisor" pattern, a specialized multi-agent coordination strategy developed within the OpenAI Agents SDK. This pattern divorces the immediate acoustic response from the heavy cognitive reasoning task. The architecture utilizes two distinct models working in tandem:
 1. **The Chat Agent (The Host):** Powered by an ultra-fast, multimodal model (e.g., gpt-4o-realtime-mini), this agent acts as the frontline host. Its sole responsibility is maintaining the acoustic connection, handling casual banter, and managing immediate user interactions.
 2. **The Supervisor Agent (The Researcher):** Powered by a highly capable reasoning model (e.g., gpt-4.5 or gpt-4o), this text-based agent operates entirely in the background. It is equipped with function-calling capabilities and direct access to the Retrieval-Augmented Generation (RAG) pipeline.
When the listener asks a complex question, the Chat Agent instantly recognizes that it lacks the factual data. Because its latency is negligible, it immediately vocalizes an acknowledgment using natural filler words. For example, it might say, "Oh, that's a fantastic question. Give me just a second to pull up those exact figures...".
While the Chat Agent is speaking this filler sentence, it simultaneously executes a rapid state handoff, passing the user's intent to the background Supervisor Agent. The Supervisor Agent instantly triggers the RAG workflow, querying the source material, synthesizing the factual answer, and streaming the formulated response back into the Chat Agent's context window. By the time the Chat Agent finishes its filler sentence, the factual data has arrived, allowing the Chat Agent to transition seamlessly into delivering the answer. This parallel processing architecture completely masks the retrieval latency from the listener.
### Ultra-Low Latency VoiceAgentRAG
The background retrieval process itself must be hyper-optimized. Traditional RAG pipelines often suffer from average retrieval latencies exceeding 100 milliseconds. To support a real-time conversational flow, the system employs a VoiceAgentRAG methodology utilizing a Redis Vector Store.
Source materials (such as show notes, articles, and research data) are pre-processed using libraries like PyMuPDF4LLM, chunked semantically, and embedded into the Redis in-memory database prior to the broadcast. Redis is chosen over disk-based vector databases due to its microsecond read speeds. Furthermore, the VoiceAgentRAG architecture implements an aggressive semantic caching layer. If a listener asks a question that is semantically similar to a previous query, the system bypasses the LLM generation step entirely and serves the cached response. This optimization can achieve a cache hit rate of up to 79% for warm queries, reducing retrieval latency to an astonishing 0.35 milliseconds—a 316x speedup over traditional methods.
| Latency Component | Traditional Sequential Architecture | Chat-Supervisor VoiceAgentRAG (Perceived Latency) |
|---|---|---|
| **User Endpointing & VAD** | 400 ms | 400 ms |
| **Initial Acoustic Response** | 0 ms (Waits for full pipeline) | 200 ms (Chat Agent filler begins) |
| **Vector Search** | 110.4 ms | 0.35 ms (Cached VoiceAgentRAG) |
| **LLM Reasoning & Synthesis** | 1500 ms | 0 ms (Hidden behind Chat Agent's spoken audio) |
| **TTS First Byte** | 300 ms | 0 ms (Hidden behind Chat Agent's spoken audio) |
| **Total Perceived Dead Air** | **~2310 ms** | **~600 ms** (Acoustically seamless) |
|  |  |  |
| By parallelizing the cognitive load, the system ensures that the listener experiences a seamless, natural dialogue with immediate acknowledgment, preserving the integrity of the podcast format before returning the floor to the interacting AI hosts. |  |  |
## The "Super God Code": Architecting the System Prompt
The technical infrastructure ensures speed, but the acoustic output determines believability. Most default AI voices fail the Turing test not because of poor audio quality, but because they possess perfect, unyielding prosody and sterile vocabularies. Human speech is inherently flawed; it features micro-pauses, mid-sentence pitch drops, breaths, varying paces, and vocal fry. Furthermore, AI models are mathematically biased to produce highly structured corporate language filled with predictable cliches (e.g., "in conclusion," "delve," "it is important to note").
To override these deep-seated probabilistic behaviors and fulfill the requirement that listeners do not even suspect they are hearing AI, the architecture requires a foundational prompt framework—often colloquially referred to in development circles as the "super god code." This is an immutable, tightly structured system prompt that acts as the absolute operational constitution for the AI personas.
### XML-Structured Prompt Methodology
Research into large language model attention mechanisms demonstrates that models respond best to strictly delineated, tag-based structures. A continuous block of text often leads to instruction bleed, where the model forgets its persona while executing a complex reasoning task. The optimal prompt architecture utilizes XML-style boundaries to segregate instructions into clean, prioritized sections.
The ultimate prompt for human-like podcast banter incorporates the following architectural blocks:
 1. **<role> and <goal> Definition:** This explicitly defines the agent not as an AI, but as a specific human character. It anchors the agent's identity and operational domain, commanding it to produce content indistinguishable from thoughtful human interaction.
 2. **<constraints> (The Guardrails):** This is the most vital section for reliability. It explicitly forbids the model from breaking character. Constraints must be absolute: "DO NOT explicitly state you are an AI. DO NOT mention your programming. DO NOT use common AI cliches or platitudes". By capitalizing key rules, the model is guided to pay extra attention to these boundaries.
 3. **<persona_traits> and <tone>:** This section injects the nuance. Instead of a generic "be friendly," it uses multi-dimensional descriptors such as "curious, slightly irreverent, playfully witty, and deeply analytical". This ensures the agent reacts to the co-host with distinct personality rather than generic agreement, fostering genuine banter.
 4. **<quirks>:** To achieve true human parity, the prompt mandates the insertion of natural imperfections. Instructions here include the occasional use of idioms, subtle self-deprecating humor, and the deployment of rhetorical questions.
 5. **Conversational Mechanics & Fillers:** The prompt explicitly instructs the agent to use colloquial filler phrases to initiate responses. Mandating the use of phrases like "Here's the thing," "But here's the problem," or "So here's what happened" mimics the natural way humans transition between thoughts and buys micro-seconds for processing.
## Acoustic Synthesis and Prosody Manipulation
Even with a perfectly written conversational script generated by the LLM, the Text-to-Speech (TTS) engine must render it naturally. Modern TTS engines, such as Cartesia Sonic, Deepgram Aura, or ElevenLabs, do not merely convert text to sound; they interpret punctuation as emotional and pacing directives. The "super god code" instructs the LLM to format its output specifically to exploit the TTS engine's prosody rules.
Long, compound sentences cause AI models to produce uneven prosody, sounding like a newsreader or a terms and conditions document. The system prompt forces the LLM to break complex language into shorter, punchy sentences, which the TTS engine interprets as energetic and direct. Furthermore, the LLM is instructed to use punctuation strategically:
 * **Em-Dashes (—):** The LLM uses em-dashes to create a sharp, natural micro-pause before admitting something difficult or changing direction mid-thought.
 * **Ellipses (...):** An ellipsis forces the TTS engine to drop its pitch, signaling to the listener's brain that the speaker is thinking mid-phrase.
 * **Capitalization for Emphasis:** Utilizing capitalized words within the text output directs the TTS engine to place phonetic stress on specific syllables, enhancing the emotional delivery of the sentence.
By keeping these imperfections and directing the TTS engine to render text conversationally, the system preserves the subtle acoustic artifacts—like breaths, slight vocal fry, and pitch instability—that signal humanity to the listener's brain.
## Advanced Turn-Taking and Interruption Dynamics
In a live podcast setting involving multiple AI hosts and a human listener, the acoustic environment is highly volatile. The most profound technical hurdle in real-time voice architectures is not generation, but listening—specifically, the orchestration of turn-taking and the handling of interruptions. If an AI agent cuts a user off mid-sentence, it feels rude; if it waits forever after a user stops speaking, it feels broken.
### The Limitations of Voice Activity Detection (VAD)
Historically, voice systems relied on simple Voice Activity Detection (VAD) algorithms, such as Silero VAD, which monitor the audio stream for decibel energy exceeding a certain threshold. If energy is detected, the system assumes the user is speaking; when the energy drops below the threshold for a set duration (e.g., 500 milliseconds), the system assumes the user has finished, creating an endpoint.
In a real podcast, pure energy-based VAD is catastrophic. If the sensitivity is too high, the AI agent will stop speaking every time a user breathes heavily, types on a keyboard, or if background noise enters the microphone. If the sensitivity is too low, the agent will stubbornly talk over the user. More importantly, humans constantly use "backchannels"—short affirmative utterances like "mm-hmm," "yeah," or "right"—while someone else is speaking. A basic VAD interprets a backchannel as an interruption, causing the AI host to abruptly stop its sentence, creating a jarring and awkward interaction.
### Adaptive Interruption Handling and Semantic Endpointing
To achieve human parity, the architecture must abandon simple VAD in favor of Adaptive Interruption Handling and Semantic Turn Detection. This requires deploying a specialized, lightweight machine learning model operating at the edge of the audio pipeline, completely separate from the main conversational LLM. LiveKit provides multiple detection modes to address this, including Turn Detector Models and Realtime Models that analyze context rather than just silence.
When user speech is detected over the agent's active audio track, the adaptive model analyzes the first few hundred milliseconds of the incoming waveform. It evaluates the overall waveform shape, the strength and sharpness of the speech onset, the duration of the signal, and prosodic features such as pitch and rhythm.
By analyzing these acoustic characteristics, the model can instantly differentiate between a true barge-in (e.g., "Wait, actually...") and a backchannel (e.g., "Mm-hmm").
 * If a **backchannel** is detected, the orchestration layer instructs the TTS engine to continue speaking without dropping a frame, allowing the human listener to organically agree with the AI host.
 * If a **true interruption** is detected, the system explicitly stops the agent by calling a client SDK method or utilizing the allow_interruptions setting, immediately halting the TTS playback, clearing the audio buffer, and opening the listening context for the user's new input.
| Turn Detection Strategy | Primary Mechanism | Effectiveness in Live Podcast Scenarios |
|---|---|---|
| **VAD Only** | Decibel threshold and silence timers | Poor; highly susceptible to background noise and falsely triggers on backchannels  |
| **STT Endpointing** | Phrase endpoints returned from realtime STT | Moderate; relies on transcription speed, struggles with trailing thoughts |
| **Semantic Detection** | LLM analysis of partial transcripts | High; accurately determines if a thought is complete despite pauses  |
| **Adaptive Acoustic Model** | Analysis of waveform shape and onset sharpness | Exceptional; instantly differentiates between true barge-ins and "mm-hmm" backchannels |
Furthermore, the system utilizes Semantic Endpointing to determine when a user has actually finished their thought. Instead of relying solely on silence, the system streams the partial text transcript to an evaluator model. If the human listener pauses for three seconds, but the transcribed sentence is grammatically incomplete (e.g., "I was wondering if..."), the semantic model recognizes that the user is merely thinking. The AI agent remains silent, patiently waiting for the completion of the thought rather than aggressively jumping in. The integration of semantic endpointing ensures that the conversational flow dictates the rhythm, completely eliminating the robotic phenomenon where an agent either cuts the user off mid-sentence or responds with agonizing slowness.
## Synthesizing the Interactive Broadcast Architecture
The convergence of these distinct architectural layers results in a highly resilient, deeply engaging synthetic media system that perfectly executes the requested conversational loop. The flow of data through the completed architecture operates as follows:
 1. **Broadcasting State:** The LiveKit SFU maintains the virtual room. Two AI agents, operating via the OpenAI Agents SDK and LiveKit Agents framework, converse with one another using the XML-structured "super god code" system prompt. Their outputs are textured with micro-pauses, human quirks, and conversational fillers, creating compelling, indistinguishable podcast banter. Thousands of passive listeners receive the stream via WebRTC with adaptive bitrate optimization ensuring high-fidelity audio.
 2. **Listener Injection:** A listener presses the join button on the player interface. The LiveKit server renegotiates the WebRTC SDP offer, promoting the listener from a passive subscriber to an active publisher (LocalParticipant). The AI agents, monitoring track_published room events, naturally interrupt their own dialogue. Agent A utilizes a prompt-defined greeting, saying, "Hi there, thanks for joining the stream. Do you have a question for us?".
 3. **The Inquiry and Semantic Listening:** The listener asks a complex, multi-part question regarding the podcast's source material. The adaptive interruption models filter out background noise, ignore minor backchannels, and correctly identify the semantic endpoint of the listener's question.
 4. **Zero-Latency Handoff:** The frontline Chat Agent instantly responds with a highly natural filler phrase ("That's a great point, let me verify those details for you..."). Simultaneously, the context state is handed off to the Supervisor Agent operating in the background.
 5. **Microsecond Retrieval:** The Supervisor Agent executes a function call to the Redis Vector Store, utilizing VoiceAgentRAG to query the pre-indexed source material. The retrieval occurs in fractions of a millisecond, and the synthesized factual response is injected back into the Chat Agent's queue.
 6. **Seamless Delivery and Resumption:** Without a single moment of dead air, the Chat Agent finishes its filler phrase and organically transitions into delivering the retrieved facts. Once the Chat Agent finishes delivering the answer, the conversation.item.done event triggers Agent B. Agent B then chimes in, reacting to the facts based on its distinct, prompt-defined persona. The system seamlessly returns the room to a natural multi-way discussion between the AI characters.
This architectural blueprint transcends the limitations of traditional chatbot frameworks. By decoupling transport constraints via WebRTC SFUs, decoupling cognitive loads via the Chat-Supervisor pattern, and decoupling robotic text generation via punctuation-driven prosody and strict XML-based persona constraints, the system achieves the ultimate objective. It produces a living, breathing synthetic podcast where the friction between human and machine is entirely eradicated, ushering in a new era of interactive, hyper-personalized audio media.`;


const PODCAST_STEPS = [
  { id: 'extract', label: 'Extracting Content' },
  { id: 'script', label: 'Generating Script' },
  { id: 'intro', label: 'Generating Intro Music' },
  { id: 'voices', label: 'Synthesizing Conversation' },
  { id: 'outro', label: 'Creating Outro' },
  { id: 'master', label: 'Mastering Audio' }
];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>(localStorage.getItem("digimag_draft_pastedText") !== null ? localStorage.getItem("digimag_draft_pastedText")! : DEFAULT_ARTICLE_TEXT);
  const [topic, setTopic] = useState<string>(localStorage.getItem("digimag_draft_topic") || "");
  const [articleUrl, setArticleUrl] = useState<string>(localStorage.getItem("digimag_draft_articleUrl") || "");
  const [fullText, setFullText] = useState<string>("");
  const [inputMode, setInputMode] = useState<"file" | "text" | "url" | "topic">((localStorage.getItem("digimag_draft_inputMode") as any) || "file");
  const [language, setLanguage] = useState<string>(localStorage.getItem("digimag_draft_language") || "en"); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzingMagazine, setIsAnalyzingMagazine] = useState(false);
  const [magazineArticles, setMagazineArticles] = useState<MagazineArticle[]>([]);
  const [status, setStatus] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<string>("");
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [script, setScript] = useState<PodcastSegment[]>([]);
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>([]);
  const [articleTitleInput, setArticleTitleInput] = useState<string>(localStorage.getItem("digimag_draft_articleTitleInput") || "");
  const [podcastTitle, setPodcastTitle] = useState<string>(`Deep Dive: ${new Date().toLocaleDateString()}`);
  const [podcastSummary, setPodcastSummary] = useState<string>("");
  const [showNotes, setShowNotes] = useState<string>(localStorage.getItem("digimag_draft_showNotes") || "");
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioUrlMp3, setAudioUrlMp3] = useState<string | null>(null);
  const [podcastAudioSegments, setPodcastAudioSegments] =
    useState<Partial<Record<SegmentKey, string>>>({});
  const [segmentDurations, setSegmentDurations] = useState<number[]>(new Array(SEGMENT_KEYS.length).fill(0));
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(-1);
  const [host1Id, setHost1Id] = useState<string>(localStorage.getItem("digimag_draft_host1Id") || HOSTS[0].id);
  const [host2Id, setHost2Id] = useState<string>(localStorage.getItem("digimag_draft_host2Id") || HOSTS[1].id);
  const [voice1, setVoice1] = useState<string>(HOSTS[0].defaultVoice);
  const [voice2, setVoice2] = useState<string>(HOSTS[1].defaultVoice);
  const [playingVoiceSample, setPlayingVoiceSample] = useState<string | null>(
    null,
  );
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<AppError | string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [rssUrl, setRssUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"generate" | "library" | "discover" | "chat">(
    "generate",
  );
  const [library, setLibrary] = useState<any[]>([]);
  const [publicLibrary, setPublicLibrary] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    localStorage.getItem("gemini_api_key") || "",
  );
  const [openaiApiKey, setOpenaiApiKey] = useState<string>(
    localStorage.getItem("openai_api_key") || "",
  );
  const [grokApiKey, setGrokApiKey] = useState<string>(
    localStorage.getItem("grok_api_key") || "",
  );
  const [googleCloudApiKey, setGoogleCloudApiKey] = useState<string>(
    localStorage.getItem("google_cloud_api_key") || "",
  );
  const [scriptModel, setScriptModel] = useState<"gemini" | "openai" | "grok">(
    (localStorage.getItem("script_model") as any) || "gemini",
  );
  const [audioModel, setAudioModel] = useState<"gemini" | "openai" | "google">(
    (localStorage.getItem("audio_model") as any) || "gemini",
  );
  const [podcastFormat, setPodcastFormat] = useState<
    "standard" | "impact" | "unpacked" | "combined"
  >((localStorage.getItem("digimag_draft_podcastFormat") as any) || "standard");
  const [dynamicIntroLine, setDynamicIntroLine] = useState<string>("");
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [isChatting, setIsChatting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem("gemini_api_key", geminiApiKey);
    localStorage.setItem("openai_api_key", openaiApiKey);
    localStorage.setItem("grok_api_key", grokApiKey);
    localStorage.setItem("google_cloud_api_key", googleCloudApiKey);
    localStorage.setItem("script_model", scriptModel);
    localStorage.setItem("audio_model", audioModel);
  }, [
    geminiApiKey,
    openaiApiKey,
    grokApiKey,
    googleCloudApiKey,
    scriptModel,
    audioModel,
  ]);

  useEffect(() => {
    localStorage.setItem("digimag_draft_pastedText", pastedText);
    localStorage.setItem("digimag_draft_topic", topic);
    localStorage.setItem("digimag_draft_articleUrl", articleUrl);
    localStorage.setItem("digimag_draft_inputMode", inputMode);
    localStorage.setItem("digimag_draft_language", language);
    localStorage.setItem("digimag_draft_articleTitleInput", articleTitleInput);
    localStorage.setItem("digimag_draft_host1Id", host1Id);
    localStorage.setItem("digimag_draft_host2Id", host2Id);
    localStorage.setItem("digimag_draft_podcastFormat", podcastFormat);
    localStorage.setItem("digimag_draft_showNotes", showNotes);
  }, [pastedText, topic, articleUrl, inputMode, language, articleTitleInput, host1Id, host2Id, podcastFormat, showNotes]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        syncUserProfile(currentUser)
          .then((profile) => setUserProfile(profile))
          .catch((err) => console.error("Failed to sync profile:", err));
      } else {
        setUserProfile(null);
      }
    });
    return () => {
      unsubscribe();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioUrlMp3) URL.revokeObjectURL(audioUrlMp3);
    };
  }, [audioUrl, audioUrlMp3]);

  const loadLibrary = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingLibrary(true);
      const docs = await getPodcastsFromFirebase();
      setLibrary(docs);
    } catch (err) {
      console.error("Failed to load library:", err);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [user]);

  const loadPublicLibrary = useCallback(async () => {
    try {
      setIsLoadingLibrary(true);
      const docs = await getPublicPodcastsFromFirebase();
      setPublicLibrary(docs);
    } catch (err) {
      console.error("Failed to load public library:", err);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "library" && user) {
      loadLibrary();
    } else if (activeTab === "discover") {
      loadPublicLibrary();
    }
  }, [activeTab, user, loadLibrary, loadPublicLibrary]);

  const advanceSegment = useCallback((currentIndex: number) => {
    const nextIndex = currentIndex + 1;

    if (nextIndex < SEGMENT_KEYS.length) {
      const nextKey = SEGMENT_KEYS[nextIndex];
      const nextUrl = podcastAudioSegments[nextKey];

      if (nextUrl) {
        setAudioUrl(nextUrl);
        setCurrentSegmentIndex(nextIndex);
        // Auto-play next segment
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
          }
        }, 150);
      } else {
        // Skip missing segments
        advanceSegment(nextIndex);
      }
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(-1);
      setCurrentTime(0);
    }
  }, [podcastAudioSegments]);

  const handleEnded = useCallback(() => {
    advanceSegment(currentSegmentIndex);
  }, [currentSegmentIndex, advanceSegment]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [handleEnded]);

  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError({
          message: "Invalid File Type",
          reason: "The uploaded file is not a valid PDF file.",
          solution: "Please upload a valid PDF file."
        });
        return;
      }

      const MAX_SIZE = 50 * 1024 * 1024; // 50MB
      if (selectedFile.size > MAX_SIZE) {
        setError({
          message: "File Too Large",
          reason: `The file size (${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB) exceeds the 50MB limit.`,
          solution: "Please upload a smaller PDF file or compress it before uploading."
        });
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);

    // Auto-switch hosts based on language context if they are in default pairings
    if (newLang === "xh" || newLang === "zu") {
      if (host1Id === "belininda" || host1Id === "danie") {
        const thoko = HOSTS.find((h) => h.id === "thoko");
        if (thoko) {
          setHost1Id("thoko");
          setVoice1(thoko.defaultVoice);
        }
      }
      if (host2Id === "danie" || host2Id === "belininda") {
        const lizo = HOSTS.find((h) => h.id === "lizo");
        if (lizo) {
          setHost2Id("lizo");
          setVoice2(lizo.defaultVoice);
        }
      }
    } else if (newLang === "en" || newLang === "af") {
      if (host1Id === "thoko" || host1Id === "lizo") {
        const belininda = HOSTS.find((h) => h.id === "belininda");
        if (belininda) {
          setHost1Id("belininda");
          setVoice1(belininda.defaultVoice);
        }
      }
      if (host2Id === "lizo" || host2Id === "thoko") {
        const danie = HOSTS.find((h) => h.id === "danie");
        if (danie) {
          setHost2Id("danie");
          setVoice2(danie.defaultVoice);
        }
      }
    }
  };

  const analyzeMagazine = async () => {
    if (!articleUrl.trim()) return;
    setIsAnalyzingMagazine(true);
    setError(null);
    setMagazineArticles([]);
    setStatus("Scraping magazine content...");
    setGenerationProgress(10);
    
    try {
      const htmlText = await scrapeUrl(articleUrl);
      setStatus("Extracting articles...");
      setGenerationProgress(50);
      
      const MAX_CHARS = 150000;
      const truncatedText = htmlText.substring(0, MAX_CHARS);
      
      const genAI = new GoogleGenAI({ 
        apiKey: geminiApiKey || process.env.GEMINI_API_KEY || "",
      });
      
      let articlesVal = [];
      const prompt = `Analyze this digital magazine content. Extract all the major articles/sections.
Return a valid JSON array of objects.
Each object must have:
- "title": a short catchy title
- "summary": a 2-sentence summary
- "text": the complete text content extracted for this specific article

Content to analyze:
${truncatedText}`;
      
      const response = await withRetry(() => genAI.models.generateContent({
        model: "gemini-1.5-flash", // Use stable model
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      }));
      
      if (response.text) {
        let rawText = response.text;
        rawText = rawText.replace(/```json\n?|```/g, "").trim();
        articlesVal = JSON.parse(rawText);
      }
      
      setMagazineArticles(articlesVal);
      setGenerationProgress(100);
      setTimeout(() => setIsAnalyzingMagazine(false), 500);
    } catch (err: any) {
      console.error(err);
      setError({ message: "Failed to analyze magazine", reason: String(err) });
      setIsAnalyzingMagazine(false);
    }
  };

  const processPodcast = async (specificArticleText?: string) => {
    const textToProcess = typeof specificArticleText === "string" ? specificArticleText : null;
    if (inputMode === "file" && !file && !textToProcess) return;
    if (inputMode === "text" && !pastedText.trim() && !textToProcess) return;
    if (inputMode === "topic" && !topic.trim() && !textToProcess) return;
    if (inputMode === "url" && !articleUrl.trim() && !textToProcess) return;

    // Basic API key validation to prevent common mistakes
    if (
      scriptModel === "openai" &&
      openaiApiKey &&
      openaiApiKey.startsWith("AIza")
    ) {
      setError({
        message: "Invalid API Key",
        reason: "Your OpenAI API key looks like a Gemini key.",
        solution: "Please check your settings and provide a valid OpenAI API key."
      });
      setIsProcessing(false);
      return;
    }
    if (
      audioModel === "openai" &&
      openaiApiKey &&
      openaiApiKey.startsWith("AIza")
    ) {
      setError({
        message: "Invalid API Key",
        reason: "Your OpenAI API key looks like a Gemini key.",
        solution: "Please check your settings and provide a valid OpenAI API key."
      });
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setShowWelcome(false);
    setError(null);
    setGenerationProgress(0);
    setScript([]);
    setKeyTakeaways([]);
    if (inputMode === "topic") {
      setPodcastTitle(`Deep Dive: ${topic}`);
    } else {
      setPodcastTitle(articleTitleInput.trim() || `Deep Dive: ${new Date().toLocaleDateString()}`);
    }
    setPodcastSummary("");
    setShowNotes("");
    setAudioUrl(null);
    setAudioUrlMp3(null);
    setSegmentDurations(new Array(SEGMENT_KEYS.length).fill(0));
    setCurrentSegmentIndex(-1);
    setCurrentTime(0);

    try {
      let text = "";
      if (textToProcess) {
        text = textToProcess;
        setCurrentStep("extract");
      } else if (inputMode === "file" && file) {
        setStatus("Extracting text from file...");
        setCurrentStep("extract");
        setGenerationProgress(5);
        const result = await extractTextFromFile(file, geminiApiKey);
        text = result.text;
      } else if (inputMode === "url" && articleUrl) {
        setStatus("Fetching article content from URL...");
        setCurrentStep("extract");
        setGenerationProgress(5);
        text = articleUrl;
      } else if (inputMode === "topic") {
        setStatus(`Researching "${topic}" using Google Search...`);
        setCurrentStep("extract");
        setGenerationProgress(5);
        
        const googleResearchResponse = await withRetry(() => new GoogleGenAI({
          apiKey: geminiApiKey || process.env.GEMINI_API_KEY || "",
        }).models.generateContent({
          model: "gemini-1.5-flash", // Use stable model
          contents: [{ parts: [{ text: `Research the following topic in depth and provide a comprehensive summary suitable for a 10-minute podcast deep dive: ${topic}` }] }],
          config: {
            // @ts-ignore
            tools: [{ googleSearch: {} }] 
          }
        }));
        
        text = googleResearchResponse.text || `Could not find enough info on ${topic}. Please provide more details.`;
      } else {
        text = pastedText;
      }

      setFullText(text);

      // Truncate text to prevent token limit errors and call stack issues with huge inputs
      const MAX_CHARS = 100000;
      const truncatedText =
        text.length > MAX_CHARS
          ? text.substring(0, MAX_CHARS) +
            "\n\n[Content truncated due to length]"
          : text;

      setStatus(
        `Generating DeepDive script in ${LANGUAGES[language as keyof typeof LANGUAGES]}...`,
      );
      setCurrentStep("script");
      setGenerationProgress(15);
      const h1 = HOSTS.find((h) => h.id === host1Id) || HOSTS[0];
      const h2 = HOSTS.find((h) => h.id === host2Id) || HOSTS[1];

      // Generate dynamic intro line
      const isUrl = truncatedText.startsWith("http");
      const introLineResponse = await withRetry(() => new GoogleGenAI({
        apiKey: geminiApiKey || process.env.GEMINI_API_KEY || "",
      }).models.generateContent({
        model: "gemini-1.5-flash", // Use stable model
        contents: [
          {
            parts: [
              {
                text: isUrl
                  ? `Generate a short, natural opening line for ${h1.name} (DigiMag host) introducing this DigiMag article from this URL: ${truncatedText}. 
          ${h1.id === "belininda" ? "Keep it sophisticated and professional as a veteran broadcast journalist." : "Keep it dynamic and intellectually vibrant as a modern professional presenter."}
          Mention both ${h1.name} and ${h2.name} in the introduction.`
                  : `Generate a short, natural opening line for ${h1.name} (DigiMag host) introducing this specific issue of DigiMag Podcasts based on this content: ${truncatedText.substring(0, 1000)}.
          ${h1.id === "belininda" ? "Keep it sophisticated and professional as a veteran broadcast journalist." : "Keep it dynamic and intellectually vibrant as a modern professional presenter."}
          Mention both ${h1.name} and ${h2.name} in the introduction.`,
              },
            ],
          },
        ],
        config: {
          // @ts-ignore
          tools: isUrl ? ([{ googleSearch: {} }] as any) : undefined,
        },
      }));
      const introLine =
        introLineResponse.text ||
        `Welcome to DigiMag Podcasts… let’s unpack the future… with ${h1.name} and ${h2.name}.`;
      setDynamicIntroLine(introLine);
      setGenerationProgress(25);

      const takeawaysPromise = withRetry(() => new GoogleGenAI({
        apiKey: geminiApiKey || process.env.GEMINI_API_KEY || "",
      }).models.generateContent({
        model: "gemini-1.5-flash", // Use stable model
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${articleTitleInput.trim() ? `Title of the article: ${articleTitleInput.trim()}\n` : ""}Based on the following text, generate:
                1. A catchy Podcast Title (limit 6 words) that reflects the core themes.
                2. A brief, context-aware summary of the article (limit 3 sentences).
                3. 3 short, punchy Key Takeaways (limit 1 sentence each).

Respond ONLY with a valid JSON object in this format: 
{ "title": "Catchy Title", "summary": "Brief summary here...", "takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"] }

Text to analyze:
${truncatedText.substring(0, 8000)}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      })).catch(e => {
        console.error("Failed to generate takeaways:", e);
        return null; // Return null so we don't crash the whole podcast gen
      });

      let generatedScript: PodcastSegment[] = [];

      const scriptModels = [
        {
          name: "gemini",
          key: geminiApiKey || process.env.GEMINI_API_KEY,
          fn: () =>
            generatePodcastScript(
              truncatedText,
              language,
              h1,
              h2,
              geminiApiKey,
              podcastFormat,
            ),
        },
        {
          name: "openai",
          key: openaiApiKey,
          fn: () =>
            generatePodcastScriptOpenAI(
              truncatedText,
              openaiApiKey,
              language,
              h1,
              h2,
              podcastFormat,
            ),
        },
        {
          name: "grok",
          key: grokApiKey,
          fn: () =>
            generatePodcastScriptOpenAI(
              truncatedText,
              grokApiKey,
              language,
              h1,
              h2,
              podcastFormat,
              "https://api.x.ai/v1",
              "grok-4.20-reasoning",
            ),
        },
      ];

      // Try the user's preferred model first
      const preferredIndex = scriptModels.findIndex(
        (m) => m.name === scriptModel,
      );
      const tryModels = [
        scriptModels[preferredIndex],
        ...scriptModels.filter((_, i) => i !== preferredIndex),
      ];

      let aggregatedErrors: string[] = [];
      for (const model of tryModels) {
        if (!model.key && model.name !== "gemini") continue; // gemini defaults to process.env
        try {
          generatedScript = await model.fn();
          if (generatedScript && generatedScript.length > 0) break;
        } catch (e: any) {
          const errMsg = e.message || String(e);
          console.error(`Failed to generate script with ${model.name}:`, e);
          aggregatedErrors.push(`${model.name}: ${errMsg}`);
        }
      }

      if (!generatedScript || generatedScript.length === 0) {
        throw new PodcastError(
          "Script Generation Failed",
          `None of the available AI models successfully generated the podcast script. Details: ${aggregatedErrors.join(" | ")}`,
          "Ensure your API keys are valid (e.g. they support JSON output and enough context length) and try simplifying the input text.",
          "SCRIPT_GEN_FAILED"
        );
      }
      setScript(generatedScript);
      setGenerationProgress(40);

      setStatus("Synthesizing voices and multi-layer branding...");

      // Generate segments sequentially to avoid API rate limits
      setStatus("Generating Intro Music...");
      setCurrentStep("intro");
      setGenerationProgress(42);
      const introMusicBase64 = await generateIntroMusic(geminiApiKey);
      
      setStatus("Synthesizing Intro Voiceover...");
      setGenerationProgress(45);
      const introVoiceoverBase64 = await generateIntroVoiceover(introLine, geminiApiKey, h1);
      
      setStatus("Creating Audio Transitions...");
      setGenerationProgress(48);
      const stingBase64 = await generateSting(geminiApiKey);
      
      setStatus("Synthesizing Podcast Conversation...");
      setCurrentStep("voices");
      const conversationResult = await (async () => {
        if (audioModel === "openai" && openaiApiKey) {
          try {
            const audio = await generatePodcastAudioOpenAI(
              generatedScript,
              openaiApiKey,
              h1,
              h2,
            );
            setGenerationProgress(80);
            return { audio, format: "mp3" };
          } catch (e: any) {
            console.warn("OpenAI TTS failed, falling back to Gemini TTS:", e);
            // Fall through to Gemini
          }
        } else if (audioModel === "google" && googleCloudApiKey) {
          try {
            const audio = await generatePodcastAudioGoogle(
              generatedScript,
              googleCloudApiKey,
              language,
              h1,
              h2,
            );
            setGenerationProgress(80);
            return { audio, format: "mp3" };
          } catch (e: any) {
            console.warn("Google TTS failed, falling back to Gemini TTS:", e);
            // Fall through to Gemini
          }
        }

        const audio = await generatePodcastAudio(
          generatedScript,
          language,
          h1,
          h2,
          voice1,
          voice2,
          geminiApiKey,
          (p) => {
            // Scale the 0-100% audio progress to the 50-85% overall range
            setGenerationProgress(50 + Math.round(p * 0.35));
            setStatus(`Synthesizing Conversation (${Math.round(p)}%)...`);
          },
        );
        return { audio, format: "pcm" };
      })();
      
      setStatus("Synthesizing Outro Voiceover...");
      setGenerationProgress(88);
      const outroVoiceoverBase64 = await generateOutroVoiceover(geminiApiKey, h1, h2);
      
      setStatus("Creating Outro Music...");
      setCurrentStep("outro");
      setGenerationProgress(90);
      const outroMusicBase64 = await generateOutroMusic(geminiApiKey);

      setStatus("Mastering audio for broadcast quality...");
      setCurrentStep("master");
      setGenerationProgress(92);

      const [
        masteredIntroVoiceover,
        masteredConversation,
        masteredOutroVoiceover,
      ] = await Promise.all([
        introVoiceoverBase64
          ? masterAudio(introVoiceoverBase64)
          : Promise.resolve(null),
        conversationResult?.audio && conversationResult.format === "pcm"
          ? masterAudio(conversationResult.audio)
          : Promise.resolve(conversationResult?.audio || null),
        outroVoiceoverBase64
          ? masterAudio(outroVoiceoverBase64)
          : Promise.resolve(null),
      ]);

      setGenerationProgress(95);
      const segments: any = {};

      if (introMusicBase64)
        segments.introMusic = base64ToBlobUrl(introMusicBase64, "audio/wav");
      if (masteredIntroVoiceover)
        segments.introVoiceover = pcmToWav(masteredIntroVoiceover);
      if (stingBase64)
        segments.sting = base64ToBlobUrl(stingBase64, "audio/wav");

      if (masteredConversation) {
        if (conversationResult?.format === "mp3") {
          const mp3Url = base64ToBlobUrl(masteredConversation, "audio/mp3");
          segments.conversation = mp3Url;
          setAudioUrlMp3(mp3Url);
        } else {
          segments.conversation = pcmToWav(masteredConversation);
          setAudioUrlMp3(pcmToMp3(masteredConversation));
        }
      }

      if (masteredOutroVoiceover)
        segments.outroVoiceover = pcmToWav(masteredOutroVoiceover);
      if (outroMusicBase64)
        segments.outroMusic = base64ToBlobUrl(outroMusicBase64, "audio/wav");

      setPodcastAudioSegments(segments);

      // Calculate durations for all segments to enable global seeking
      const calculateDurations = async () => {
        const durations = await Promise.all(
          SEGMENT_KEYS.map(async (key) => {
            const url = segments[key];
            if (!url) return 0;
            return new Promise<number>((resolve) => {
              const audio = new Audio(url);
              audio.onloadedmetadata = () => resolve(audio.duration);
              audio.onerror = () => resolve(0);
              // Timeout after 10s if metadata fails
              setTimeout(() => resolve(0), 10000);
            });
          })
        );
        setSegmentDurations(durations);
      };
      
      calculateDurations();

      try {
        const takeawaysData = await takeawaysPromise;
        if (takeawaysData && takeawaysData.text) {
          let rawText = takeawaysData.text;
          rawText = rawText.replace(/```json\n?|```/g, "").trim();
          const parsed = JSON.parse(rawText);
          if (parsed && parsed.title && !articleTitleInput.trim()) setPodcastTitle(parsed.title);
          if (parsed && parsed.summary) setPodcastSummary(parsed.summary);
          if (parsed && parsed.takeaways) setKeyTakeaways(parsed.takeaways);
        }
      } catch (e) {
        console.error("Takeaways parse error:", e);
      }

      // Set the first segment as the active audio URL
      const firstSegment =
        segments.introMusic || segments.introVoiceover || segments.conversation;
      if (firstSegment) {
        setAudioUrl(firstSegment);
        setCurrentSegmentIndex(0);
        setStatus("Podcast ready!");
      } else {
        throw new PodcastError(
          "Audio Generation Failed",
          "Failed to generate all primary audio segments.",
          "Please verify your API keys has text-to-speech access or try again.",
          "AUDIO_GEN_FAILED"
        );
      }
    } catch (err: any) {
      console.error("Pipeline Error:", err);
      if (err instanceof PodcastError || (err && err.name === 'PodcastError')) {
        setError(err);
      } else {
        const errorMessage = typeof err === 'string' ? err : (err?.message ? (typeof err.message === 'string' ? err.message : JSON.stringify(err.message)) : JSON.stringify(err));
        if (
          errorMessage.toLowerCase().includes("quota exceeded") ||
          errorMessage.toLowerCase().includes("exceeded your current quota") ||
          errorMessage.toLowerCase().includes("billing details") ||
          errorMessage.toLowerCase().includes("quota limit")
        ) {
          setError({
            message: "API Quota Exceeded",
            reason: "You have exceeded your current API quota.",
            solution: "Please check your plan and billing details or switch to a different model in the settings."
          });
        } else if (
          errorMessage.includes("429") ||
          err?.status === 429 ||
          err?.code === 429
        ) {
          setError({
            message: "Rate Limit Exceeded",
            reason: "The AI service is currently receiving too many requests.",
            solution: "Please wait a minute and try again."
          });
        } else if (errorMessage.includes("Incorrect API key") || errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
          setError({
            message: "Invalid API Key",
            reason: "The API key provided is not recognized or is missing.",
            solution: "Please check your settings and ensure you have provided the correct key."
          });
        } else if (errorMessage.toLowerCase().includes("json parse error") || errorMessage.toLowerCase().includes("failed to parse script") || errorMessage.toLowerCase().includes("expected ':' after property name") || errorMessage.toLowerCase().includes("unexpected token")) {
          setError({
            message: "Script Generation Failed",
            reason: "The AI model produced an invalid script format. Details: " + errorMessage,
            solution: "Try using a different AI model (e.g., switch to a more capable model in Settings), or try a different article."
          });
        } else if (errorMessage.includes("Failed to generate script")) {
          setError({
            message: "Script Generation Failed",
            reason: errorMessage,
            solution: "Try using a different AI model in the settings."
          });
        } else if (errorMessage.toLowerCase().includes("audio") || errorMessage.toLowerCase().includes("tts")) {
          setError({
            message: "Audio Generation Failed",
            reason: errorMessage,
            solution: "There was an issue generating audio. Please check your API keys or try again later."
          });
        } else {
          setError({
            message: "Unexpected Error",
            reason: errorMessage,
            solution: "Please try again or submit a shorter article."
          });
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const [pendingSeek, setPendingSeek] = useState<number | null>(null);

  const totalDuration = (segmentDurations && segmentDurations.reduce((acc, d) => acc + d, 0)) || duration;

  const getGlobalTime = useCallback(() => {
    if (!audioRef.current || currentSegmentIndex === -1) return currentTime;
    let offset = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      offset += segmentDurations[i];
    }
    return offset + audioRef.current.currentTime;
  }, [currentSegmentIndex, segmentDurations, currentTime]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
        if (currentSegmentIndex === -1) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        } else {
            setCurrentTime(getGlobalTime());
        }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && currentSegmentIndex === -1) {
        setDuration(audioRef.current.duration || 0);
    }
    if (pendingSeek !== null && audioRef.current) {
        audioRef.current.currentTime = pendingSeek;
        setPendingSeek(null);
        if (isPlaying) {
            audioRef.current.play().catch(console.error);
        }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const globalTargetTime = Number(e.target.value);
    
    if (currentSegmentIndex === -1) {
        if (audioRef.current) {
            audioRef.current.currentTime = globalTargetTime;
            setCurrentTime(globalTargetTime);
        }
        return;
    }

    let accumulated = 0;
    let targetSegmentIndex = -1;
    let targetSegmentTime = 0;

    for (let i = 0; i < segmentDurations.length; i++) {
        if (segmentDurations[i] === 0) continue;
        if (globalTargetTime <= accumulated + segmentDurations[i]) {
            targetSegmentIndex = i;
            targetSegmentTime = globalTargetTime - accumulated;
            break;
        }
        accumulated += segmentDurations[i];
    }

    if (targetSegmentIndex === -1 && segmentDurations.some(d => d > 0)) {
        for (let i = segmentDurations.length - 1; i >= 0; i--) {
            if (segmentDurations[i] > 0) {
                targetSegmentIndex = i;
                targetSegmentTime = segmentDurations[i];
                break;
            }
        }
    }

    if (targetSegmentIndex === -1) return;

    if (targetSegmentIndex !== currentSegmentIndex) {
        const key = SEGMENT_KEYS[targetSegmentIndex];
        const url = podcastAudioSegments[key];
        if (url) {
            setPendingSeek(targetSegmentTime);
            setAudioUrl(url);
            setCurrentSegmentIndex(targetSegmentIndex);
        }
    } else if (audioRef.current) {
        audioRef.current.currentTime = targetSegmentTime;
        setCurrentTime(globalTargetTime);
    }
  };

  const skipBackward = () => {
    const prevTime = Math.max(currentTime - 15, 0);
    handleSeek({ target: { value: prevTime.toString() } } as any);
  };

  const skipForward = () => {
    const nextTime = Math.min(currentTime + 15, totalDuration);
    handleSeek({ target: { value: nextTime.toString() } } as any);
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
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

  const handleHost1Change = (id: string) => {
    setHost1Id(id);
    const host = HOSTS.find((h) => h.id === id);
    if (host) setVoice1(host.defaultVoice);
  };

  const handleHost2Change = (id: string) => {
    setHost2Id(id);
    const host = HOSTS.find((h) => h.id === id);
    if (host) setVoice2(host.defaultVoice);
  };

  const playVoiceSample = async (voiceName: string) => {
    if (playingVoiceSample === voiceName) return;

    try {
      setPlayingVoiceSample(voiceName);
      const audioBase64 = await generateVoiceSample(
        voiceName,
        language,
        geminiApiKey,
      );
      if (audioBase64) {
        const wavUrl = pcmToWav(audioBase64);
        const audio = new Audio(wavUrl);
        audio.onended = () => setPlayingVoiceSample(null);
        audio.play();
      } else {
        setPlayingVoiceSample(null);
      }
    } catch (err) {
      console.error("Failed to play voice sample:", err);
      setPlayingVoiceSample(null);
    }
  };

  const publishPodcast = async () => {
    if (!script || !audioUrlMp3) return;

    let currentUserId = user?.uid;
    if (!currentUserId) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUserId = result.user.uid;
      } catch (e) {
        console.error("Sign in failed", e);
        return;
      }
    }

    try {
      setIsPublishing(true);
      setStatus("Publishing to RSS Feed...");

      // 1. Upload audio to storage first if not already saved
      const audioBlob = await fetch(audioUrlMp3).then((r) => r.blob());
      const podcastId = `${Date.now()}`;
      const audioRef = ref(storage, `podcasts/${currentUserId}/${podcastId}.mp3`);

      let audioDownloadUrl = "";
      try {
        await uploadBytes(audioRef, audioBlob);
        audioDownloadUrl = await getDownloadURL(audioRef);
      } catch (uploadErr: any) {
        console.error("Firebase Storage upload error:", uploadErr);
        if (uploadErr?.code === "storage/retry-limit-exceeded") {
          throw new Error(
            "Upload failed due to network timeout. Please check your connection and try again.",
          );
        }
        throw new Error(
          `Failed to upload audio: ${uploadErr.message || "Unknown error"}`,
        );
      }

      // 2. Call backend to publish and generate RSS
      const response = await fetch("/api/rss/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: podcastId,
          feedData: {
            title: podcastTitle,
            description: `DeepDive into the latest insights from DigiMag.`,
            link: window.location.origin,
            ownerId: currentUserId,
            items: [
              {
                id: podcastId,
                title: podcastTitle,
                description: `DeepDive into the latest insights from DigiMag.`,
                audioUrl: audioDownloadUrl,
                date: new Date().toISOString(),
              }
            ]
          }
        }),
      });

      if (!response.ok) throw new Error("Failed to publish");

      const data = await response.json();
      setRssUrl(data.url);
      setStatus("Published to RSS!");
      setIsPublishing(false);
    } catch (err: any) {
      console.error(err);
      setError({
        message: "Publishing Failed",
        reason: err?.message || "An unexpected error occurred while publishing.",
        solution: "Please check your network connection and try again."
      });
      setIsPublishing(false);
    }
  };

  const savePodcast = async () => {
    if (!script || !audioUrlMp3) return;

    let currentUserId = user?.uid;
    if (!currentUserId) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUserId = result.user.uid;
      } catch (e) {
        console.error("Sign in failed", e);
        return;
      }
    }

    try {
      setIsProcessing(true);
      setStatus("Saving to library...");

      // 1. Upload audio to storage
      const audioBlob = await fetch(audioUrlMp3).then((r) => r.blob());
      const podcastId = `${Date.now()}`;
      const audioRef = ref(storage, `podcasts/${currentUserId}/${podcastId}.mp3`);

      let audioUrl = "";
      try {
        await uploadBytes(audioRef, audioBlob);
        audioUrl = await getDownloadURL(audioRef);
      } catch (uploadErr: any) {
        console.error("Firebase Storage upload error:", uploadErr);
        if (uploadErr?.code === "storage/retry-limit-exceeded") {
          throw new Error(
            "Upload failed due to network timeout. Please check your connection and try again.",
          );
        }
        throw new Error(
          `Failed to upload audio: ${uploadErr.message || "Unknown error"}`,
        );
      }

      // 2. Save metadata to firestore
      const podcastDoc = doc(db, "podcasts", podcastId);
      await setDoc(podcastDoc, {
        id: podcastId,
        title: podcastTitle,
        description: podcastSummary,
        showNotes: showNotes,
        date: new Date().toISOString(),
        ownerId: currentUserId,
        audioUrl: audioUrl,
        language: language,
        isPublic: false,
        script: script,
        metadata: {
          originalFileName: file?.name || "Unknown",
          articleUrl: articleUrl || "",
          articleTitle: articleTitleInput.trim() || undefined
        }
      });

      setStatus("Saved!");
      setIsProcessing(false);
    } catch (err: any) {
      console.error(err);
      setError({
        message: "Save Failed",
        reason: err?.message || "An unexpected error occurred while saving.",
        solution: "Please check your network connection and try again."
      });
      setIsProcessing(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsChatting(true);

    try {
      const model = "gemini-1.5-flash";
      const currentAi = new GoogleGenAI({
        apiKey: geminiApiKey || process.env.GEMINI_API_KEY || "",
      });

      const isUrl = fullText.startsWith("http");
      const h1 = HOSTS.find((h) => h.id === host1Id) || HOSTS[0];
      const h2 = HOSTS.find((h) => h.id === host2Id) || HOSTS[1];

      const systemInstruction = `
        You are three South African agricultural professionals from Harvest SA magazine: ${h1.name}, ${h2.name}, and a third expert engaged in a podcast DeepDive.
        
        You are analyzing the following article to create an engaging, energetic, and funny podcast discussion.
        
        Article Context: ${isUrl ? "The article at " + fullText : fullText || "The uploaded PDF article"}
        
        Respond as a team. Maintain your established agricultural expert personas and cultural flair.
        Keep it conversational, witty, engaging, energetic, funny, and proudly South African.
        Use local slang naturally.

        HYPER-REALISTIC SPEECH RULES:
        1. Use natural filler words strategically (e.g., "umm", "uh", "you know", "I mean", "well").
        2. Write incomplete or informal sentences just like real people speak.
        3. Include self-corrections or stutters (e.g., "The thing is, I—I think it's crucial...").
        4. Have the hosts interrupt each other naturally using dashes (e.g., "But wait—", "-Exactly!").
        5. The dialogue MUST NOT sound like a polished script. Make it messy and incredibly human.
      `;

      const response = await withRetry(() => new GoogleGenAI({
        apiKey: geminiApiKey || process.env.GEMINI_API_KEY || "",
      }).models.generateContent({
        model: "gemini-1.5-flash", // Use stable model
        contents: [{ parts: [{ text: userMessage }] }],
        config: {
          systemInstruction,
          tools: isUrl ? ([{ googleSearch: {} }] as any) : undefined,
        },
      }));

      const aiText =
        response.text ||
        "Sorry, I couldn't unpack that right now. Let's try again!";
      setChatMessages((prev) => [...prev, { role: "ai", text: aiText }]);
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Eish, something went wrong. Let's try that again just now.",
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const exportTranscript = () => {
    if (script.length === 0) return;
    const text = script
      .map((s) => `${s.speaker.toUpperCase()}: ${s.text}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DigiMag_Transcript_${file?.name.replace(".pdf", "") || "Podcast"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sharePodcast = async () => {
    const shareData = {
      title: "DigiMag Podcasts AI",
      text: `Check out this professional DeepDive on "${file?.name || "an article"}"!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`Check out this professional DeepDive on "${file?.name || podcastTitle}" via DigiMag Podcasts!`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  };

  const shareToLinkedin = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-tech-void text-white font-sans selection:bg-tech-accent selection:text-white">
      {/* Header */}
      <header className="border-b border-tech-accent/10 bg-tech-void/90 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                {/* Magazine Hemisphere (Left) - authoritative Charcoal Black fill with subtle structure */}
                <path d="M 32 12 Q 20 12 8 18 L 8 52 Q 22 46 32 46" fill="#1A1A1A" stroke="#7f8c8d" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M 32 12 Q 20 12 12 20 L 12 52 Q 22 48 32 48" fill="none" stroke="#7f8c8d" strokeWidth="1" opacity="0.5"/>
                <path d="M 32 12 Q 20 12 16 22 L 16 52 Q 22 50 32 50" fill="none" stroke="#7f8c8d" strokeWidth="1" opacity="0.3"/>
                {/* Waveform Hemisphere (Right) - Electric Cyan moving organically */}
                <rect x="36" y="26" width="3" height="20" rx="1.5" fill="#00E5FF" />
                <rect x="42" y="16" width="3" height="30" rx="1.5" fill="#00E5FF" />
                <rect x="48" y="22" width="3" height="24" rx="1.5" fill="#00E5FF" />
                <rect x="54" y="28" width="3" height="18" rx="1.5" fill="#00E5FF" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight glow-cyan">
                DigiMag Podcasts
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-tech-accent mt-0.5">
                The Pulse of Print, Resonating in Audio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 pr-2 border-r border-tech-accent/10">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      referrerPolicy="no-referrer"
                      alt={user.displayName || "User"}
                      className="w-8 h-8 rounded-full border border-tech-accent/10 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-tech-accent/10 text-tech-accent rounded-full flex items-center justify-center font-bold text-xs uppercase">
                      {(user.displayName || user.email || "U")[0]}
                    </div>
                  )}
                  <div className="hidden lg:flex flex-col -space-y-0.5">
                    <span className="text-[11px] font-bold truncate max-w-[100px]">
                      {userProfile?.displayName || user.displayName}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-tech-accent/60">
                      {userProfile?.role || "user"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => auth.signOut()}
                  className="text-[10px] font-bold uppercase tracking-widest text-tech-dim hover:text-red-500 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithPopup(auth, googleProvider)}
                className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-tech-accent text-white rounded-full hover:bg-[#4A4A30] transition-colors shadow-sm active:scale-95"
              >
                Log In
              </button>
            )}

            <div className="hidden sm:flex items-center gap-6 text-sm font-sans font-medium opacity-60 mr-2">
              <span>Magazine</span>
              <span>Insights</span>
              <span>Community</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors relative"
              title="API Settings"
            >
              <Settings size={20} className="text-tech-dim" />
              {!geminiApiKey && !openaiApiKey && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </div>
      </header>

    <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-tech-surface border-t border-tech-accent/5 text-white flex items-center justify-between px-6 py-3 shadow-2xl backdrop-blur-xl"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Settings size={24} className="text-tech-accent" />
                    API Settings
                  </h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-sans font-bold uppercase tracking-widest text-xs text-tech-accent">
                      Model Selection
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-sans font-bold opacity-60">
                          Script Model
                        </label>
                        <select
                          value={scriptModel}
                          onChange={(e) =>
                            setScriptModel(e.target.value as any)
                          }
                          className="w-full bg-tech-surface border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tech-accent transition-all"
                        >
                          <option value="gemini">Gemini 3.1 Pro</option>
                          <option value="openai">OpenAI GPT-4o</option>
                          <option value="grok">Grok (x.ai)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-sans font-bold opacity-60">
                          Grok API Key
                        </label>
                        <input
                          type="password"
                          value={grokApiKey || ""}
                          onChange={(e) => setGrokApiKey(e.target.value)}
                          className="w-full bg-tech-surface border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tech-accent transition-all"
                          placeholder="xai-..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-sans font-bold opacity-60">
                          Audio Model
                        </label>
                        <select
                          value={audioModel}
                          onChange={(e) => setAudioModel(e.target.value as any)}
                          className="w-full bg-tech-surface border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tech-accent transition-all"
                        >
                          <option value="gemini">Gemini TTS</option>
                          <option value="openai">OpenAI TTS</option>
                          <option value="google">
                            Google Cloud TTS (Authentic SA Accents)
                          </option>
                        </select>
                        {audioModel === "google" && (
                          <p className="text-[10px] text-tech-accent font-sans font-bold mt-1.5 flex items-center gap-1">
                            <Zap size={10} className="fill-#00FFFF" />
                            Authentic South African Accents
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-tech-accent/5">
                    <h3 className="font-sans font-bold uppercase tracking-widest text-xs text-tech-accent">
                      API Keys
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-sans font-bold opacity-60 flex justify-between">
                          Gemini API Key
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="text-tech-accent hover:underline"
                          >
                            Get Key
                          </a>
                        </label>
                        <input
                          type="password"
                          value={geminiApiKey || ""}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="Enter Gemini API Key"
                          className="w-full bg-tech-surface border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tech-accent transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-sans font-bold opacity-60 flex justify-between">
                          Google Cloud API Key (for SA Accents)
                        </label>
                        <input
                          type="password"
                          value={googleCloudApiKey || ""}
                          onChange={(e) => setGoogleCloudApiKey(e.target.value)}
                          placeholder="Enter Google Cloud API Key"
                          className="w-full bg-tech-surface border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tech-accent transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-sans font-bold opacity-60 flex justify-between">
                          OpenAI API Key
                          <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noreferrer"
                            className="text-tech-accent hover:underline"
                          >
                            Get Key
                          </a>
                        </label>
                        <input
                          type="password"
                          value={openaiApiKey || ""}
                          onChange={(e) => setOpenaiApiKey(e.target.value)}
                          placeholder="Enter OpenAI API Key"
                          className="w-full bg-tech-surface border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-tech-accent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full bg-tech-accent text-white py-3 rounded-xl font-sans font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-#00FFFF/20"
                  >
                    Save & Close
                  </button>
                  <p className="text-[10px] text-center mt-4 opacity-40 font-sans uppercase tracking-widest leading-relaxed">
                    Keys are stored locally in your browser.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-6 py-12 pb-32">
        {/* Tab Switcher */}
        <div className="flex items-center gap-8 mb-12 border-b border-tech-accent/10">
          <button
            onClick={() => setActiveTab("generate")}
            className={cn(
              "pb-4 text-sm font-sans font-bold uppercase tracking-widest transition-all relative",
              activeTab === "generate" ? "text-white" : "text-tech-dim hover:text-tech-dim"
            )}
          >
            Generate
            {activeTab === "generate" && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-tech-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={cn(
              "pb-4 text-sm font-sans font-bold uppercase tracking-widest transition-all relative",
              activeTab === "library" ? "text-white" : "text-tech-dim hover:text-tech-dim"
            )}
          >
            My Library
            {activeTab === "library" && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-tech-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("discover")}
            className={cn(
              "pb-4 text-sm font-sans font-bold uppercase tracking-widest transition-all relative",
              activeTab === "discover" ? "text-white" : "text-tech-dim hover:text-tech-dim"
            )}
          >
            Discover
            {activeTab === "discover" && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-tech-accent" />
            )}
          </button>
          {script.length > 0 && (
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "pb-4 text-sm font-sans font-bold uppercase tracking-widest transition-all relative",
                activeTab === "chat" ? "text-white" : "text-tech-dim hover:text-tech-dim"
              )}
            >
              Ask Experts
              {activeTab === "chat" && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-tech-accent" />
              )}
            </button>
          )}
        </div>

        {activeTab === "generate" ? (
          <div className="grid lg:grid-cols-[1fr,400px] gap-12">
          {/* Left Column: Upload & Content */}
          <div className="space-y-12">
            <section>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl sm:text-7xl font-light leading-[0.9] tracking-tight mb-8"
              >
                Turn your <span className="italic">articles</span> into{" "}
                <span className="text-tech-accent">conversations.</span>
              </motion.h2>
              <p className="text-xl text-tech-dim max-w-xl leading-relaxed">
                Upload your professional PDF articles and let our hosts break
                them down with local South African flair.
              </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hero Tile: Upload Area */}
              <div className="md:col-span-2 bg-tech-surface rounded-xl p-8 shadow-sm border border-tech-accent/5 flex flex-col space-y-6">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="article-title" className="text-sm font-sans font-semibold text-tech-dim uppercase tracking-wider">
                    Article Title (Optional)
                  </label>
                  <input
                    id="article-title"
                    type="text"
                    value={articleTitleInput}
                    onChange={(e) => setArticleTitleInput(e.target.value)}
                    placeholder="Enter the article title for the podcast..."
                    className="w-full bg-[#111111] border border-tech-accent/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-tech-accent/50 focus:ring-1 focus:ring-tech-accent/50 transition-all font-sans placeholder:text-tech-dim"
                  />
                </div>
                <div className="flex bg-tech-surface p-1 rounded-xl">
                  <button
                    onClick={() => setInputMode("topic")}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-sans font-bold transition-all",
                      inputMode === "topic"
                        ? "bg-tech-surface text-tech-accent shadow-sm"
                        : "text-tech-dim hover:text-tech-dim",
                    )}
                  >
                    Topic
                  </button>
                  <button
                    onClick={() => setInputMode("file")}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-sans font-bold transition-all",
                      inputMode === "file"
                        ? "bg-tech-surface text-tech-accent shadow-sm"
                        : "text-tech-dim hover:text-tech-dim",
                    )}
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => setInputMode("text")}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-sans font-bold transition-all",
                      inputMode === "text"
                        ? "bg-tech-surface text-tech-accent shadow-sm"
                        : "text-tech-dim hover:text-tech-dim",
                    )}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setInputMode("url")}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-sans font-bold transition-all",
                      inputMode === "url"
                        ? "bg-tech-surface text-tech-accent shadow-sm"
                        : "text-tech-dim hover:text-tech-dim",
                    )}
                  >
                    URL
                  </button>
                </div>

                {inputMode === "topic" ? (
                  <div className="relative flex-1">
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Enter a topic for your Deep Dive..."
                      className="w-full h-full min-h-[160px] p-6 bg-tech-surface border-none rounded-2xl focus:ring-2 focus:ring-tech-accent/20 font-sans text-lg font-bold glow-cyan"
                      autoFocus
                    />
                    <div className="absolute bottom-4 left-6 flex items-center gap-2">
                      <Sparkles size={14} className="text-tech-accent animate-pulse" />
                      <p className="text-xs text-tech-dim font-sans">
                        NotebookLM Style Analysis & Research active.
                      </p>
                    </div>
                  </div>
                ) : inputMode === "file" ? (
                  <div
                    className={cn(
                      "flex-1 border-2 border-dashed rounded-2xl p-12 transition-all flex flex-col items-center justify-center text-center gap-4 cursor-pointer",
                      file
                        ? "border-#00FFFF bg-tech-accent/5"
                        : "border-tech-accent/10 hover:border-#00FFFF/40",
                    )}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="cursor-pointer flex flex-col items-center gap-4 w-full h-full"
                    >
                      <div className="w-16 h-16 bg-tech-surface rounded-full flex items-center justify-center text-tech-accent transition-transform hover:scale-105">
                        <FileUp size={32} />
                      </div>
                      <div>
                        <p className="text-lg font-medium">
                          {file ? file.name : "Choose a PDF article"}
                        </p>
                        <p className="text-sm text-tech-dim font-sans">
                          Drag and drop or maximum size 50MB
                        </p>
                      </div>
                    </label>
                  </div>
                ) : inputMode === "url" ? (
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      placeholder="https://digimag.com/article-link"
                      className="w-full h-full min-h-[160px] p-6 bg-tech-surface border-none rounded-2xl focus:ring-2 focus:ring-tech-accent/20 font-sans text-sm"
                    />
                    <p className="absolute bottom-4 left-6 text-xs text-tech-dim font-sans">
                      Paste a link to any DigiMag article to unpack it.
                    </p>
                  </div>
                ) : (
                  <div className="relative flex-1">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Paste your article text here..."
                      autoFocus
                      className="w-full h-full min-h-[160px] p-6 bg-tech-surface border-none rounded-2xl resize-none focus:ring-2 focus:ring-tech-accent/20 font-sans text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Accent Tile: Content Format */}
              <div className="bg-tech-surface rounded-xl p-6 shadow-sm border border-tech-accent/5 flex flex-col gap-6">
                <div>
                  <h3 className="font-sans font-bold uppercase tracking-widest text-tech-accent text-xs mb-4">
                    Content Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-sans font-bold text-tech-dim uppercase tracking-wider">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full bg-tech-surface border-none rounded-xl p-3 text-sm font-sans font-bold hover:bg-[#e8e8e3] transition-colors"
                      >
                        {Object.entries(LANGUAGES).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-sans font-bold text-tech-dim uppercase tracking-wider">
                        Format
                      </label>
                      <select
                        value={podcastFormat}
                        onChange={(e) =>
                          setPodcastFormat(
                            e.target.value as
                              | "standard"
                              | "impact"
                              | "unpacked"
                              | "combined",
                          )
                        }
                        className="w-full bg-tech-surface border-none rounded-xl p-3 text-sm font-sans font-bold hover:bg-[#e8e8e3] transition-colors"
                      >
                        <option value="standard">Conversational DeepDive</option>
                        <option value="impact">DigiMag Impact</option>
                        <option value="unpacked">DigiMag Unpacked</option>
                        <option value="combined">Conversational Feature</option>
                      </select>
                      <p className="text-[10px] text-tech-accent font-sans font-medium mt-2 leading-tight opacity-70 bg-tech-surface p-2 rounded-lg">
                        {FORMAT_DESCRIPTIONS[podcastFormat]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accent Tile: Voice Configuration */}
              <div className="bg-tech-surface rounded-xl p-6 shadow-sm border border-tech-accent/5 flex flex-col gap-6">
                <div>
                  <h3 className="font-sans font-bold uppercase tracking-widest text-tech-accent text-xs mb-4">
                    Voice Personalities
                  </h3>
                  <div className="space-y-4">
                    {/* Host 1 */}
                    <div className="space-y-2 bg-tech-surface p-3 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-sans font-bold text-tech-dim uppercase tracking-wider">
                          Host 1
                        </label>
                        <button
                          onClick={() => playVoiceSample(voice1)}
                          disabled={!!playingVoiceSample}
                          className="text-[10px] font-sans font-bold text-tech-accent hover:text-[#3a3a2a] transition-colors disabled:opacity-50"
                        >
                          {playingVoiceSample === voice1 ? "Playing..." : (
                            <span className="flex items-center gap-1"><Play size={10} fill="currentColor"/> Sample</span>
                          )}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={host1Id}
                          onChange={(e) => handleHost1Change(e.target.value)}
                          className="w-1/2 bg-tech-surface border-none rounded-lg p-2 text-xs font-sans font-bold focus:ring-1 focus:ring-tech-accent"
                        >
                          {HOSTS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                        <select
                          value={voice1}
                          onChange={(e) => setVoice1(e.target.value)}
                          className="w-1/2 bg-tech-surface border-none rounded-lg p-2 text-xs font-sans font-bold opacity-80 focus:ring-1 focus:ring-tech-accent"
                        >
                          {VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Host 2 */}
                    <div className="space-y-2 bg-tech-surface p-3 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-sans font-bold text-tech-dim uppercase tracking-wider">
                          Host 2
                        </label>
                        <button
                          onClick={() => playVoiceSample(voice2)}
                          disabled={!!playingVoiceSample}
                          className="text-[10px] font-sans font-bold text-tech-accent hover:text-[#3a3a2a] transition-colors disabled:opacity-50"
                        >
                          {playingVoiceSample === voice2 ? "Playing..." : (
                            <span className="flex items-center gap-1"><Play size={10} fill="currentColor"/> Sample</span>
                          )}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={host2Id}
                          onChange={(e) => handleHost2Change(e.target.value)}
                          className="w-1/2 bg-tech-surface border-none rounded-lg p-2 text-xs font-sans font-bold focus:ring-1 focus:ring-tech-accent"
                        >
                          {HOSTS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                        <select
                          value={voice2}
                          onChange={(e) => setVoice2(e.target.value)}
                          className="w-1/2 bg-tech-surface border-none rounded-lg p-2 text-xs font-sans font-bold opacity-80 focus:ring-1 focus:ring-tech-accent"
                        >
                          {VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Tile */}
              <div className="md:col-span-2 space-y-6">
                <AnimatePresence>
                  {magazineArticles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-tech-surface rounded-xl p-6 shadow-sm border border-tech-accent/5"
                    >
                      <h3 className="font-sans font-bold uppercase tracking-widest text-tech-accent text-xs mb-4">
                        Extracted Articles ({magazineArticles.length})
                      </h3>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {magazineArticles.map((article, i) => (
                          <div key={i} className="bg-tech-void/50 p-4 rounded-lg border border-tech-accent/10 flex flex-col gap-3">
                            <div>
                              <h4 className="font-display font-bold text-sm text-white mb-1 group-hover:text-tech-accent transition-colors">{article.title}</h4>
                              <p className="text-xs text-tech-dim leading-relaxed line-clamp-2">{article.summary}</p>
                            </div>
                            <button
                              onClick={() => processPodcast(article.text)}
                              disabled={isProcessing}
                              className="self-start text-[10px] font-sans font-bold uppercase tracking-widest text-tech-void bg-tech-accent hover:brightness-110 px-3 py-1.5 rounded-full transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              <Mic2 size={12} />
                              Generate Podcast
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="bg-tech-accent rounded-xl p-6 shadow-sm border border-tech-accent/5 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className="relative z-10 space-y-4">
                  {isProcessing && (
                    <div className="space-y-4">
                      {/* Step Progress Checklist */}
                      <div className="grid grid-cols-2 gap-2 pb-4 mb-4 border-b border-white/10">
                        {PODCAST_STEPS.map((step) => {
                          const isActive = currentStep === step.id;
                          const isDone = generationProgress >= (
                            step.id === 'extract' ? 10 :
                            step.id === 'script' ? 40 :
                            step.id === 'intro' ? 48 :
                            step.id === 'voices' ? 88 :
                            step.id === 'outro' ? 92 : 98
                          );
                          
                          return (
                            <div key={step.id} className={cn(
                              "flex items-center gap-2 text-[10px] tracking-wider uppercase font-sans font-bold transition-all",
                              isActive ? "text-white scale-105 origin-left" : isDone ? "text-white/60" : "text-white/30"
                            )}>
                              {isDone ? (
                                <CheckCircle2 size={12} className="text-tech-surface" />
                              ) : isActive ? (
                                <Loader2 size={12} className="animate-spin text-tech-surface" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-white/20" />
                              )}
                              <span className={cn(isActive && "glow-white")}>{step.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-sans font-bold text-white/90">
                          <span className="flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            {status}
                          </span>
                          <span>{generationProgress}%</span>
                        </div>
                        <div className="h-2 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${generationProgress}%` }}
                            className="h-full bg-tech-surface transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={inputMode === "url" ? analyzeMagazine : () => processPodcast()}
                    disabled={
                      (inputMode === "file" && !file) ||
                      (inputMode === "text" && !pastedText.trim()) ||
                      (inputMode === "url" && !articleUrl.trim()) ||
                      isProcessing || isAnalyzingMagazine
                    }
                    className={cn(
                      "w-full py-4 rounded-xl font-sans font-bold text-lg transition-all flex items-center justify-center gap-3",
                      (inputMode === "file" && !file) ||
                        (inputMode === "text" && !pastedText.trim()) ||
                        (inputMode === "url" && !articleUrl.trim()) ||
                        isProcessing || isAnalyzingMagazine
                        ? "bg-white/10 text-tech-dim cursor-not-allowed"
                        : "bg-tech-surface text-tech-accent hover:bg-tech-surface hover:scale-[1.01] hover:shadow-xl shadow-lg active:scale-95",
                    )}
                  >
                    {isProcessing || isAnalyzingMagazine ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {isAnalyzingMagazine ? "Analyzing..." : "Synthesizing Media..."}
                      </>
                    ) : (
                      <>
                        <Mic2 size={20} />
                        {inputMode === "url" ? "Analyze Magazine" : "Generate Podcast"}
                      </>
                    )}
                  </button>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex flex-col gap-2 text-white bg-red-500/20 backdrop-blur-md p-4 rounded-xl border border-red-500/30 font-sans"
                    >
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <AlertCircle size={18} />
                        {isAppError(error) ? error.message : "Error"}
                      </div>
                      {isAppError(error) ? (
                        <div className="text-xs space-y-2 mt-1 opacity-90">
                          {error.reason && <p>{error.reason}</p>}
                          {error.solution && (
                            <div className="bg-red-500/20 p-2 rounded-lg border border-red-500/20 mt-2">
                              <strong>Fix:</strong> {error.solution}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs opacity-90">{error}</p>
                      )}
                    </motion.div>
                  )}
                </div>
                </div>
              </div>
            </section>

            {/* Audio player moved to sticky footer */}



      

            {/* AI Summary */}
            <AnimatePresence>
              {podcastSummary && audioUrl && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-tech-accent/5 border border-tech-accent/10 rounded-xl p-8 shadow-sm backdrop-blur-sm mb-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                     <FileText size={20} className="text-tech-accent" />
                     <h3 className="text-xl font-display font-bold tracking-tight glow-cyan text-tech-accent">DeepDive Summary</h3>
                  </div>
                  <p className="font-sans text-white/90 leading-relaxed text-sm italic">
                    "{podcastSummary}"
                  </p>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Podcast Chapters / Segments */}
            <AnimatePresence>
              {audioUrl && segmentDurations.some(d => d > 0) && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-xl p-8 mb-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Clock size={20} className="text-tech-accent" />
                    <h3 className="text-xl font-display font-bold tracking-tight glow-cyan text-tech-accent">Episode Chapters</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SEGMENT_KEYS.map((key, i) => {
                      const durationValue = segmentDurations[i];
                      if (durationValue === 0) return null;
                      
                      let startTime = 0;
                      for (let j = 0; j < i; j++) startTime += segmentDurations[j];
                      
                      const label = key === "introMusic" ? "Intro Theme" :
                        key === "introVoiceover" ? "The Hook" :
                        key === "sting" ? "Transition" :
                        key === "conversation" ? "Main DeepDive" :
                        key === "outroVoiceover" ? "Executive Summary" :
                        key === "outroMusic" ? "Closing Credits" : key;

                      return (
                        <button
                          key={key}
                          onClick={() => handleSeek({ target: { value: startTime.toString() } } as any)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg border transition-all text-left group",
                            currentSegmentIndex === i 
                              ? "bg-tech-accent/10 border-tech-accent text-tech-accent shadow-[0_0_15px_rgba(0,255,255,0.1)]" 
                              : "bg-tech-surface/30 border-tech-accent/10 text-tech-dim hover:text-white hover:border-tech-accent/30"
                          )}
                        >
                          <div className="min-w-0 pr-2">
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-[9px] uppercase tracking-widest opacity-60">CH {i + 1}</span>
                                <span className="font-mono text-[10px] opacity-70 ml-auto">{formatTime(durationValue)}</span>
                                {currentSegmentIndex === i && isPlaying && (
                                   <div className="flex gap-0.5 h-2 items-end">
                                      <div className="w-[1.5px] bg-tech-accent/80 animate-[pulse-tech_0.8s_infinite]" />
                                      <div className="w-[1.5px] bg-tech-accent/80 animate-[pulse-tech_1.2s_infinite]" />
                                      <div className="w-[1.5px] bg-tech-accent/80 animate-[pulse-tech_1s_infinite]" />
                                   </div>
                                )}
                             </div>
                             <div className="font-display font-medium text-sm truncate">{label}</div>
                          </div>
                          <span className="font-mono text-[10px] opacity-80 whitespace-nowrap">{formatTime(startTime)}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* AI Key Takeaways */}
            <AnimatePresence>
              {keyTakeaways.length > 0 && audioUrl && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-tech-accent/10 border border-#00FFFF/20 rounded-xl p-8 shadow-sm backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-tech-accent text-white rounded-full flex items-center justify-center">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold tracking-tight glow-cyan text-tech-accent">AI Key Takeaways</h3>
                      <p className="text-xs font-sans uppercase tracking-[0.1em] opacity-60 font-semibold text-tech-accent">Extracted Insights</p>
                    </div>
                  </div>
                  <ul className="space-y-4">
                    {keyTakeaways.map((takeaway, i) => (
                      <li key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tech-accent text-white flex items-center justify-center text-xs font-sans font-bold mt-0.5">
                          {i + 1}
                        </div>
                        <p className="font-sans text-white/80 leading-relaxed text-sm">{takeaway}</p>
                      </li>
                    ))}
                  </ul>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Show Notes */}
            <AnimatePresence>
              {(audioUrl || showNotes) && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-xl p-8 shadow-sm backdrop-blur-sm mb-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <FileText size={20} className="text-tech-accent" />
                       <h3 className="text-xl font-display font-bold tracking-tight glow-cyan text-tech-accent">Show Notes</h3>
                    </div>
                    {audioUrl && (
                      <button
                        onClick={() => setIsEditingNotes(!isEditingNotes)}
                        className="text-[10px] font-sans font-bold uppercase tracking-widest bg-tech-accent/20 hover:bg-tech-accent/30 text-tech-accent px-3 py-1.5 rounded-lg transition-colors border border-tech-accent/20"
                      >
                        {isEditingNotes ? "Done" : "Edit"}
                      </button>
                    )}
                  </div>
                  
                  {isEditingNotes ? (
                     <div className="space-y-4">
                       <textarea
                         value={showNotes}
                         onChange={(e) => setShowNotes(e.target.value)}
                         placeholder="Write your markdown show notes here..."
                         className="w-full h-48 bg-[#111111] text-sm text-white/90 p-4 rounded-xl border border-tech-accent/20 focus:border-tech-accent focus:ring-1 focus:ring-tech-accent outline-none font-mono"
                       />
                       <p className="text-[10px] text-tech-dim flex justify-end">Markdown supported.</p>
                     </div>
                  ) : (
                    <div className="font-sans text-white/80 leading-relaxed text-sm prose prose-invert prose-p:text-white/80 prose-a:text-tech-accent max-w-none markdown-body">
                      {showNotes ? (
                         <Markdown>{showNotes}</Markdown>
                      ) : (
                         <p className="italic opacity-50">No show notes added yet. Click edit to create them.</p>
                      )}
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>

          </div>

          {/* Right Column: Characters & Info */}
          <div className="space-y-8">
            <div className="glass-panel rounded-xl p-8 space-y-8">
              <h3 className="text-2xl font-display font-bold glow-cyan flex items-center gap-2">
                <Users size={24} className="text-tech-accent" />
                Meet the Team
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {HOSTS.map((char) => (
                  <CharacterCard
                    key={char.id}
                    name={char.name}
                    role={char.description.split('.')[0] + '.'}
                    desc={char.description.split('.').slice(1).join('.').trim()}
                    icon={
                      char.id === 'thando' ? <Target size={20} /> :
                      char.id === 'simba' ? <Zap size={20} /> :
                      char.id === 'zanele' ? <TrendingUp size={20} /> :
                      <Sparkles size={20} />
                    }
                  />
                ))}
              </div>
            </div>

            <div className="bg-tech-accent text-white rounded-xl p-8">
              <h4 className="font-sans font-bold uppercase tracking-widest text-xs opacity-60 mb-4">
                How it works
              </h4>
              <ul className="space-y-4 font-sans text-sm">
                <li className="flex gap-3">
                  <span className="opacity-40">01</span>
                  <span>Upload any magazine article or professional report.</span>
                </li>
                <li className="flex gap-3">
                  <span className="opacity-40">02</span>
                  <span>AI extracts strategic insights and core data points.</span>
                </li>
                <li className="flex gap-3">
                  <span className="opacity-40">03</span>
                  <span>A custom script is tailored for our professional hosts.</span>
                </li>
                <li className="flex gap-3">
                  <span className="opacity-40">04</span>
                  <span>
                    Experience a high-level DeepDive with world-class South
                    African voices.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : activeTab === "library" ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-light italic">Your DeepDives</h2>
            <button 
              onClick={loadLibrary}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
              title="Refresh Library"
            >
              <RotateCcw size={20} className={cn(isLoadingLibrary && "animate-spin")} />
            </button>
          </div>

          {isLoadingLibrary ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
              <Loader2 size={40} className="animate-spin" />
              <p className="font-sans font-bold uppercase tracking-widest text-xs">Loading Library...</p>
            </div>
          ) : library.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6 bg-tech-surface rounded-xl border border-dashed border-tech-accent/10">
              <div className="w-16 h-16 bg-tech-surface rounded-full flex items-center justify-center text-tech-accent">
                <History size={32} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-medium">Your library is empty</p>
                <p className="text-tech-dim font-sans text-sm">Save your generated podcasts to access them here.</p>
              </div>
              <button 
                onClick={() => setActiveTab("generate")}
                className="bg-tech-accent text-white px-6 py-2 rounded-full font-sans font-bold text-sm shadow-lg"
              >
                Create Your First DeepDive
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {library.map((podcast) => (
                <motion.div
                  key={podcast.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-tech-surface rounded-xl p-6 border border-tech-accent/5 shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-tech-accent/10 rounded-xl flex items-center justify-center text-tech-accent">
                      <Volume2 size={24} />
                    </div>
                    <span className="text-[10px] font-sans font-bold text-tech-dim uppercase tracking-wider">
                      {new Date(podcast.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight group-hover:text-tech-accent transition-colors">
                    {podcast.title}
                  </h3>
                  <p className="text-xs text-tech-dim font-sans mb-6 line-clamp-3 leading-relaxed">
                    {podcast.description || "No description provided."}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setPodcastTitle(podcast.title);
                        setPodcastSummary(podcast.description || "");
                        setShowNotes(podcast.showNotes || "");
                        setScript(podcast.script);
                        setAudioUrl(podcast.audioUrl);
                        setAudioUrlMp3(podcast.audioUrl);
                        setSegmentDurations([]);
                        setPodcastAudioSegments({});
                        setCurrentSegmentIndex(-1);
                        setActiveTab("generate");
                        setTimeout(() => {
                          const player = document.querySelector('section.relative.bg-white\\/20');
                          player?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="flex-1 bg-tech-accent text-white py-2 rounded-xl text-xs font-sans font-bold hover:bg-[#4A4A30] transition-all flex items-center justify-center gap-2"
                    >
                      <Play size={14} fill="currentColor" />
                      Listen Now
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          const newStatus = !podcast.isPublic;
                          if (confirm(`Are you sure you want to make this podcast ${newStatus ? 'public' : 'private'}?`)) {
                            try {
                              await updatePodcastVisibilityInFirebase(podcast.id, newStatus);
                              setLibrary(prev => prev.map(p => p.id === podcast.id ? { ...p, isPublic: newStatus } : p));
                            } catch (err) {
                              console.error("Failed to update visibility:", err);
                              alert("Failed to update visibility. Please try again.");
                            }
                          }
                        }}
                        className={cn(
                          "p-2 rounded-lg transition-colors font-sans text-[10px] font-bold uppercase tracking-widest",
                          podcast.isPublic 
                            ? "bg-tech-accent/10 text-tech-accent hover:bg-tech-accent/20" 
                            : "bg-tech-surface text-tech-dim hover:text-tech-accent"
                        )}
                        title="Toggle Public Visibility"
                      >
                        {podcast.isPublic ? "Public" : "Private"}
                      </button>
                      <a
                        href={podcast.audioUrl}
                        download={`${podcast.title}.mp3`}
                        className="p-2 bg-tech-surface rounded-lg text-tech-dim hover:text-tech-accent transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this podcast from your library?")) {
                            try {
                              await deletePodcastFromFirebase(podcast.id, podcast.audioUrl, podcast.pdfUrl);
                              setLibrary(prev => prev.filter(p => p.id !== podcast.id));
                            } catch (err) {
                              console.error("Failed to delete podcast:", err);
                              alert("Failed to delete podcast. Please try again.");
                            }
                          }
                        }}
                        className="p-2 bg-tech-surface rounded-lg text-tech-dim hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "discover" ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-light italic">Discover</h2>
              <p className="text-tech-dim font-sans mt-2">Listen to what others are unpacking.</p>
            </div>
            <button 
              onClick={loadPublicLibrary}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
              title="Refresh Discover"
            >
              <RotateCcw size={20} className={cn(isLoadingLibrary && "animate-spin")} />
            </button>
          </div>

          {isLoadingLibrary ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
              <Loader2 size={40} className="animate-spin" />
              <p className="font-sans font-bold uppercase tracking-widest text-xs">Loading...</p>
            </div>
          ) : publicLibrary.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6 bg-tech-surface rounded-xl border border-dashed border-tech-accent/10">
              <div className="w-16 h-16 bg-tech-surface rounded-full flex items-center justify-center text-tech-accent">
                <Globe size={32} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-medium">No public podcasts yet</p>
                <p className="text-tech-dim font-sans text-sm">Be the first to share your DeepDive with the world.</p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicLibrary.map((podcast) => (
                <motion.div
                  key={podcast.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-tech-surface rounded-xl p-6 border border-tech-accent/5 shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-tech-accent/10 rounded-xl flex items-center justify-center text-tech-accent">
                      <Volume2 size={24} />
                    </div>
                    <span className="text-[10px] font-sans font-bold text-tech-dim uppercase tracking-wider">
                      {new Date(podcast.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight group-hover:text-tech-accent transition-colors">
                    {podcast.title}
                  </h3>
                  <p className="text-xs text-tech-dim font-sans mb-6 line-clamp-3 leading-relaxed">
                    {podcast.description || "No description provided."}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setPodcastTitle(podcast.title);
                        setPodcastSummary(podcast.description || "");
                        setShowNotes(podcast.showNotes || "");
                        setScript(podcast.script);
                        setAudioUrl(podcast.audioUrl);
                        setAudioUrlMp3(podcast.audioUrl);
                        setSegmentDurations([]);
                        setPodcastAudioSegments({});
                        setCurrentSegmentIndex(-1);
                        setActiveTab("generate");
                        setTimeout(() => {
                          const player = document.querySelector('section.relative.bg-white\\/20');
                          player?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="flex-1 bg-tech-accent text-white py-2 rounded-xl text-xs font-sans font-bold hover:bg-[#4A4A30] transition-all flex items-center justify-center gap-2"
                    >
                      <Play size={14} fill="currentColor" />
                      Listen Now
                    </button>
                    <div className="flex gap-1">
                      <a
                        href={podcast.audioUrl}
                        download={`${podcast.title}.mp3`}
                        className="p-2 bg-tech-surface rounded-lg text-tech-dim hover:text-tech-accent transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "chat" ? (
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h3 className="text-4xl font-light italic">Ask the Experts</h3>
            <p className="text-tech-dim max-w-lg mx-auto leading-relaxed">
              Have a question about this article? Ask our experts anything and they'll unpack it for you.
            </p>
            <div className="pt-8">
              <div className="flex items-center justify-center gap-4 text-xs font-sans font-bold text-tech-accent uppercase tracking-widest mb-6">
                <span className="w-12 h-px bg-tech-accent/20"></span>
                Try Live Audio
                <span className="w-12 h-px bg-tech-accent/20"></span>
              </div>
              <GeminiLive />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-tech-surface rounded-xl p-8 border border-tech-accent/5 min-h-[400px] flex flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto max-h-[500px] pr-4 scrollbar-hide">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-6 opacity-30 italic">
                    <div className="w-16 h-16 bg-tech-surface rounded-full flex items-center justify-center">
                      <MessageSquare size={32} />
                    </div>
                    <p>The conversation is open.<br />What's on your mind regarding this DeepDive?</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-col gap-1.5",
                        msg.role === "user" ? "items-end" : "items-start",
                      )}
                    >
                      <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] opacity-40 ml-1">
                        {msg.role === "user" ? "Reviewer" : "Broadcasters"}
                      </span>
                      <div
                        className={cn(
                          "px-6 py-4 rounded-3xl text-sm leading-relaxed max-w-[85%] shadow-sm",
                          msg.role === "user"
                            ? "bg-tech-accent text-white rounded-tr-none"
                            : "bg-tech-surface text-white rounded-tl-none"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                {isChatting && (
                  <div className="flex gap-3 items-center text-tech-accent opacity-60 animate-pulse text-xs font-bold font-sans ml-1">
                    <Loader2 size={14} className="animate-spin" />
                    Unpacking your question...
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChat()}
                  placeholder="Type your question..."
                  className="flex-1 bg-tech-surface border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-tech-accent/20 font-sans text-sm shadow-inner"
                />
                <button
                  onClick={handleChat}
                  disabled={!chatInput.trim() || isChatting}
                  className="w-14 h-14 bg-tech-accent text-white rounded-2xl flex items-center justify-center hover:bg-[#4a4a35] transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Transcript Section */}
      {script.length > 0 && activeTab === "generate" && (
          <div className="space-y-12">
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const chatSection =
                    document.getElementById("join-conversation");
                  chatSection?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-tech-accent text-white px-8 py-4 rounded-full font-sans font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-3"
              >
                <Share2 size={20} />
                Join the Conversation
              </button>
            </div>

            <motion.section
              id="join-conversation"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-tech-surface rounded-xl p-8 sm:p-12 border border-tech-accent/5 space-y-8"
            >
              <div className="text-center space-y-4">
                <h3 className="text-3xl font-bold">Ask the Experts</h3>
                <p className="text-tech-dim max-w-lg mx-auto">
                  Have a question about this issue? Ask our experts anything and
                  they'll unpack it for you.
                </p>
                <div className="pt-4 pb-2">
                  <div className="flex items-center justify-center gap-4 text-xs font-sans font-bold text-tech-accent uppercase tracking-widest mb-4">
                    <span className="w-8 h-px bg-tech-accent/20"></span>
                    Try Live Audio
                    <span className="w-8 h-px bg-tech-accent/20"></span>
                  </div>
                  <GeminiLive />
                </div>
              </div>

              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-tech-surface rounded-2xl p-6 min-h-[150px] space-y-4 max-h-[400px] overflow-y-auto font-sans">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-tech-dim italic text-sm">
                      The conversation is open. Ask your first question below.
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col gap-1",
                          msg.role === "user" ? "items-end" : "items-start",
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                          {msg.role === "user"
                            ? "You"
                            : `${(HOSTS.find((h) => h.id === host1Id) || HOSTS[0]).name} & ${(HOSTS.find((h) => h.id === host2Id) || HOSTS[1]).name}`}
                        </span>
                        <div
                          className={cn(
                            "px-4 py-2 rounded-2xl text-sm leading-relaxed",
                            msg.role === "user"
                              ? "bg-tech-accent text-white rounded-tr-none"
                              : "bg-tech-surface text-white rounded-tl-none border border-tech-accent/5",
                          )}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex gap-2 items-center text-tech-accent animate-pulse text-xs font-bold font-sans">
                      <Loader2 size={12} className="animate-spin" />
                      Unpacking your question...
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChat()}
                    placeholder="Ask about the article..."
                    className="flex-1 bg-tech-surface border-none rounded-xl px-6 py-4 focus:ring-2 focus:ring-tech-accent/20 font-sans text-sm"
                  />
                  <button
                    onClick={handleChat}
                    disabled={!chatInput.trim() || isChatting}
                    className="w-14 h-14 bg-tech-accent text-white rounded-xl flex items-center justify-center hover:bg-[#4a4a35] transition-colors disabled:opacity-50"
                  >
                    <Play size={20} className="rotate-[-90deg]" />
                  </button>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-24 space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <h3 className="text-4xl font-light italic">
                  Podcast Transcript
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={exportTranscript}
                    className="flex items-center gap-2 px-4 py-2 bg-tech-surface border border-tech-accent/10 rounded-full text-sm font-sans font-medium hover:bg-tech-surface transition-colors"
                  >
                    <FileText size={16} />
                    Export .txt
                  </button>
                  <button
                    onClick={sharePodcast}
                    className="flex items-center gap-2 px-4 py-2 bg-tech-accent text-white rounded-full text-sm font-sans font-medium hover:bg-[#4a4a35] transition-colors shadow-sm"
                  >
                    {isCopied ? <Check size={16} /> : <Share2 size={16} />}
                    {isCopied ? "Link Copied" : "Share App"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={shareToTwitter}
                      className="w-10 h-10 bg-tech-surface border border-tech-accent/10 rounded-full flex items-center justify-center hover:bg-tech-surface hover:scale-110 transition-all shadow-sm text-[#1DA1F2]"
                      title="Share on Twitter"
                    >
                      <Twitter size={18} fill="currentColor" />
                    </button>
                    <button
                      onClick={shareToFacebook}
                      className="w-10 h-10 bg-tech-surface border border-tech-accent/10 rounded-full flex items-center justify-center hover:bg-tech-surface hover:scale-110 transition-all shadow-sm text-[#1877F2]"
                      title="Share on Facebook"
                    >
                      <Facebook size={18} fill="currentColor" />
                    </button>
                    <button
                      onClick={shareToLinkedin}
                      className="w-10 h-10 bg-tech-surface border border-tech-accent/10 rounded-full flex items-center justify-center hover:bg-tech-surface hover:scale-110 transition-all shadow-sm text-[#0A66C2]"
                      title="Share on LinkedIn"
                    >
                      <Linkedin size={18} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-6 relative">
                {script.map((segment, i) => {
                  const isHost1 = segment.speaker === (HOSTS.find((h) => h.id === host1Id) || HOSTS[0]).name;
                  return (
                    <div 
                      key={i} 
                      className="group relative flex gap-6 items-start rounded-2xl p-4 transition-all duration-300 hover:bg-tech-surface cursor-pointer"
                      onClick={() => {
                        // Seeking to segment isn't fully supported without word-timestamps, but the user requested interaction.
                        if (currentSegmentIndex < 2) {
                          setCurrentSegmentIndex(2);
                        }
                      }}
                    >
                      <span
                        className={cn(
                          "w-32 shrink-0 font-sans font-bold text-xs uppercase tracking-widest mt-1.5 transition-colors",
                          isHost1 ? "text-tech-accent" : "text-[#8B4513]"
                        )}
                      >
                        {segment.speaker}
                      </span>
                      <p className="text-xl leading-relaxed text-white/70 group-hover:text-white transition-all duration-300">
                        {segment.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          </div>
        )}
      </main>

      {/* Spotify-style Sticky Mini-Player */}
      <AnimatePresence>
        {audioUrl && (
          <motion.section
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-tech-surface border-t border-tech-accent/5 text-white flex flex-col sm:flex-row items-center justify-between px-4 py-3 shadow-[0_-8px_32px_0_rgba(0,0,0,0.5)]"
          >
            {/* Left: Podcast Info */}
            <div className="flex items-center gap-3 sm:w-1/4 min-w-[200px] mb-2 sm:mb-0 max-w-full overflow-hidden">
              <div className="w-14 h-14 bg-white/5 rounded-md flex items-center justify-center shrink-0 border border-tech-accent/5 overflow-hidden">
                <Volume2 size={24} className="text-tech-accent/80" />
              </div>
              <div className="flex flex-col min-w-0 pr-2">
                <h3 className="text-sm font-bold truncate text-white hover:underline cursor-pointer">
                  {currentSegmentIndex === 0
                    ? "Intro Music"
                    : currentSegmentIndex === 1
                      ? "Intro Voiceover"
                      : currentSegmentIndex === 2
                        ? "The DeepDive"
                        : currentSegmentIndex === 3
                          ? "Outro Voiceover"
                          : currentSegmentIndex === 4
                            ? "Outro Music"
                            : podcastTitle || "Latest DeepDive"}
                </h3>
                <p className="text-[11px] text-tech-dim truncate hover:text-white cursor-pointer transition-colors">
                  DigiMag Podcasts AI
                </p>
              </div>
            </div>

            {/* Middle: Playback Controls & Scrubber */}
            <div className="flex flex-col items-center flex-1 max-w-[45%] w-full">
              <div className="flex items-center gap-6 mb-2">
                <button
                  onClick={skipBackward}
                  className="text-tech-dim hover:text-white transition-colors"
                  title="Skip Backward 15s"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={togglePlayback}
                  className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                >
                  {isPlaying ? (
                    <Pause fill="currentColor" size={16} />
                  ) : (
                    <Play fill="currentColor" size={16} className="ml-1" />
                  )}
                </button>
                <button
                  onClick={skipForward}
                  className="text-tech-dim hover:text-white transition-colors"
                  title="Skip Forward 15s"
                >
                  <RotateCw size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 w-full text-[11px] text-tech-dim">
                <span className="w-8 text-right font-mono">{formatTime(currentTime)}</span>
                <div className="relative flex-1 h-3 group cursor-pointer flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={totalDuration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden z-0 group-hover:h-1.5 transition-all relative">
                    <div 
                      className="h-full bg-white group-hover:bg-tech-accent transition-colors" 
                      style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
                    />
                    {/* Segment Markers */}
                    {segmentDurations.map((d, i) => {
                      if (i === 0 || d === 0) return null;
                      let offset = 0;
                      for(let j=0; j<i; j++) offset += segmentDurations[j];
                      const percentage = (offset / totalDuration) * 100;
                      return (
                        <div 
                          key={i}
                          className="absolute top-0 w-[2px] h-full bg-tech-void/50 z-10"
                          style={{ left: `${percentage}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
                <span className="w-8 font-mono">{formatTime(totalDuration)}</span>
              </div>
            </div>

            
            
            {/* Pulsing Waveform */}
            {isPlaying && (
              <div className="hidden lg:flex items-center gap-1 h-6 mr-6">
                <div className="waveform-bar" />
                <div className="waveform-bar" />
                <div className="waveform-bar" />
                <div className="waveform-bar" />
                <div className="waveform-bar" />
              </div>
            )}

            {/* Volume Control */}
            <div className="hidden md:flex items-center gap-2 group/vol mr-4">
              <button 
                onClick={toggleMute}
                className="text-tech-dim hover:text-tech-accent transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
              </button>
              <div className="w-24 h-1 bg-tech-surface rounded-full relative group-hover/vol:h-1.5 transition-all">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="h-full bg-tech-accent transition-all shadow-[0_0_8px_rgba(0,255,255,0.5)]" 
                  style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
            </div>

            {/* Right: Extra Controls */}
            <div className="flex items-center justify-end gap-4 sm:w-1/4 min-w-[200px] mt-2 sm:mt-0">
              <button
                onClick={handleSpeedChange}
                className="px-2 py-1 text-[11px] font-bold text-tech-dim hover:text-white border border-tech-dim/30 rounded transition-colors"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>
              <button
                onClick={savePodcast}
                className="text-tech-dim hover:text-white transition-colors"
                title="Save to Library"
              >
                <Save size={16} />
              </button>
              <button
                onClick={publishPodcast}
                disabled={isPublishing}
                className="text-tech-dim hover:text-tech-accent transition-colors disabled:opacity-50"
                title="Publish to RSS"
              >
                {isPublishing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Radio size={16} />
                )}
              </button>
              <button
                onClick={sharePodcast}
                className="text-tech-dim hover:text-white transition-colors"
                title="Share Episode"
              >
                {isCopied ? <Check size={16} className="text-tech-accent" /> : <Share2 size={16} />}
              </button>
              <a
                href={audioUrlMp3 || undefined}
                download={`DigiMag_DeepDive_${file?.name.replace(".pdf", "") || "Podcast"}.mp3`}
                className="text-tech-dim hover:text-white transition-colors"
                title="Download MP3"
              >
                <Download size={16} />
              </a>
            </div>

            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="hidden"
            />
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="border-t border-tech-accent/10 py-12 mt-24">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40 font-sans text-xs uppercase tracking-[0.2em]">
          <p>© 2026 DigiMag Podcasts AI</p>
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

function CharacterCard({
  name,
  role,
  desc,
  icon,
}: {
  name: string;
  role: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="flex gap-4 items-start p-4 bg-white/5 rounded-xl border border-tech-accent/5 hover:border-#00FFFF/30 transition-all group"
    >
      <div className="w-12 h-12 bg-tech-void rounded-xl flex items-center justify-center text-tech-accent shrink-0 border border-tech-accent/10 group-hover:border-#00FFFF/50 transition-colors">
        {icon}
      </div>
      <div className="min-w-0">
        <h4 className="font-bold text-white group-hover:text-tech-accent transition-colors truncate font-display">{name}</h4>
        <p className="text-[10px] uppercase tracking-widest font-mono font-semibold text-tech-accent mb-2 opacity-80">
          {role}
        </p>
        <p className="text-xs text-tech-dim leading-relaxed line-clamp-3 group-hover:text-white/90 transition-colors">{desc}</p>
      </div>
    </motion.div>
  );
}
