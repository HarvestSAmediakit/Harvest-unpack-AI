export const LANGUAGES = {
  en: "English (South Africa)",
  af: "Afrikaans",
  xh: "isiXhosa",
  zu: "isiZulu"
};

export interface Host {
  id: string;
  name: string;
  description: string;
  defaultVoice: string;
  openaiVoice: string;
  googleVoices: {
    [key: string]: string;
  };
}

export const HOSTS: Host[] = [
  { 
    id: 'thando', 
    name: 'Thando Gumede', 
    description: 'The Strategic Lead. Specialized in deep industry analysis with a focus on South African innovation and economic paradigms. Thando brings a seasoned authority and intellectual depth to every DeepDive, distilling complex trends into compelling strategic narratives.', 
    defaultVoice: 'Kore',
    openaiVoice: 'shimmer',
    googleVoices: {
      en: 'en-ZA-Standard-A',
      af: 'af-ZA-Standard-A'
    }
  },
  { 
    id: 'simba', 
    name: 'Simba Moyo', 
    description: 'The Tech Vanguard. A forward-thinking, visionary host focused on digital transformation and emerging tech. Simba possess a clear, confident South African accent and excels at highlighting technical breakthroughs with commercial awareness and engaging storytelling.', 
    defaultVoice: 'Puck',
    openaiVoice: 'onyx',
    googleVoices: {
      en: 'en-ZA-Standard-B',
      af: 'af-ZA-Standard-A'
    }
  },
  {
    id: 'zanele',
    name: 'Zanele Mkhize',
    description: 'The Innovation Specialist. Expert in bridging the gap between cutting-edge technology and real-world business applications. Zanele brings a dynamic, modern South African voice that focuses on market agility and future-proofing corporate strategies.',
    defaultVoice: 'Kore', 
    openaiVoice: 'nova',
    googleVoices: {
      en: 'en-ZA-Standard-A',
      xh: 'xh-ZA-Wavenet-A',
      zu: 'zu-ZA-Wavenet-A'
    }
  },
  {
    id: 'lindiwe',
    name: 'Lindiwe Sisulu',
    description: 'The Voice of Reason. A distinguished analytical moderator specializing in socio-economic transformation and sustainable development. Her delivery is steady, respectful, and profoundly knowledgeable, providing a world-class perspective on local development.',
    defaultVoice: 'Puck',
    openaiVoice: 'fable',
    googleVoices: {
      en: 'en-ZA-Standard-B',
      xh: 'xh-ZA-Wavenet-A',
      zu: 'zu-ZA-Wavenet-A'
    }
  }
];

export const VOICES = [
  { id: 'Kore', name: 'Thando / Zanele (Female)', description: 'Professional South African female voice, from sophisticated/authoritative to dynamic/vibrant.' },
  { id: 'Puck', name: 'Simba / Lindiwe (Male)', description: 'Professional South African male voice, from polished/business-savvy to distinguished/authoritative.' }
];
