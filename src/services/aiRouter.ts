
export type AIProviderName = 'gemini' | 'openai' | 'grok' | 'anthropic';

export interface ModelCapability {
  maxTokens: number;
  strength: 'speed' | 'balanced' | 'power';
  isReasoning?: boolean;
}

export interface ModelDefinition {
  id: string;
  name: string;
  provider: AIProviderName;
  capability: ModelCapability;
}

export const MODELS: ModelDefinition[] = [
  // Gemini Models
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Recommended)',
    provider: 'gemini',
    capability: { maxTokens: 1048576, strength: 'speed' }
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Deep Analysis)',
    provider: 'gemini',
    capability: { maxTokens: 2097152, strength: 'power' }
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite (Ultra Fast)',
    provider: 'gemini',
    capability: { maxTokens: 1048576, strength: 'speed' }
  },
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Standard)',
    provider: 'openai',
    capability: { maxTokens: 128000, strength: 'balanced' }
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini (Fast & Cheap)',
    provider: 'openai',
    capability: { maxTokens: 128000, strength: 'speed' }
  },
  {
    id: 'o1-preview',
    name: 'OpenAI o1 (Reasoning)',
    provider: 'openai',
    capability: { maxTokens: 128000, strength: 'power', isReasoning: true }
  },
  // Grok Models
  {
    id: 'grok-4.20-reasoning',
    name: 'Grok 4.20 Reasoning',
    provider: 'grok',
    capability: { maxTokens: 128000, strength: 'power', isReasoning: true }
  },
  {
    id: 'grok-beta',
    name: 'Grok Beta',
    provider: 'grok',
    capability: { maxTokens: 128000, strength: 'balanced' }
  }
];

export interface RouterOptions {
  preferredStrength?: 'speed' | 'balanced' | 'power';
  textLength?: number;
  hasGeminiKey: boolean;
  hasOpenAIKey: boolean;
  hasGrokKey: boolean;
}

export interface ModelSelection {
  modelId: string;
  provider: AIProviderName;
  reasoning: string;
}

/**
 * Automatically selects the best model based on input and availability.
 */
export function autoSelectModel(options: RouterOptions): ModelSelection {
  const { textLength = 0, preferredStrength, hasGeminiKey, hasOpenAIKey, hasGrokKey } = options;

  const getAvailable = () => MODELS.filter(m => {
    if (m.provider === 'gemini') return hasGeminiKey || !!process.env.GEMINI_API_KEY;
    if (m.provider === 'openai') return hasOpenAIKey;
    if (m.provider === 'grok') return hasGrokKey;
    return false;
  });

  const available = getAvailable();
  
  if (available.length === 0) {
    return { 
      modelId: 'gemini-3-flash-preview', 
      provider: 'gemini', 
      reasoning: 'Default fallback (no keys detected)' 
    };
  }

  // Intelligence: If text is very long (>50k chars), prefer Gemini or Pro models
  if (textLength > 50000) {
    const proGemini = available.find(m => m.id === 'gemini-3.1-pro-preview');
    if (proGemini) return { modelId: proGemini.id, provider: 'gemini', reasoning: 'Large context detected, using Pro model' };
  }

  // If user wants power/analysis
  if (preferredStrength === 'power') {
    const powerful = available.find(m => m.capability.strength === 'power');
    if (powerful) return { modelId: powerful.id, provider: powerful.provider, reasoning: 'Deep analysis requested' };
  }

  // Standard fast path
  const bestFlash = available.find(m => m.id === 'gemini-3-flash-preview') || 
                    available.find(m => m.id === 'gemini-3.1-flash-lite-preview') ||
                    available.find(m => m.provider === 'openai' && m.capability.strength === 'speed');
  
  if (bestFlash) return { modelId: bestFlash.id, provider: bestFlash.provider, reasoning: 'Optimizing for speed and efficiency' };

  return { modelId: available[0].id, provider: available[0].provider, reasoning: 'Selected best available' };
}
