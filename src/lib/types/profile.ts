export type CompanionType =
  | 'mom'
  | 'dad'
  | 'sister'
  | 'brother'
  | 'wizard'
  | 'fairy'
  | 'dog'
  | 'cat'
  | 'horse'
  | 'unicorn'
  | 'owl'
  | 'dino';

export interface Companion {
  id: string;
  type: CompanionType;
  icon: string;
  defaultName: string;
  customName: string;
}

export type AudioEngineType = 'thorsten-pwa' | 'studio-audio' | 'system-tts';

export type PiperVoiceId =
  | 'de_DE-thorsten-medium'
  | 'de_DE-kerstin-low';

export type StudioVoiceId = 'conrad' | 'katja' | 'amala';

export interface ProfileState {
  childName: string;
  selectedCompanionId: string | null;
  companions: Companion[];
  isConfigured: boolean;
  preferredVoiceURI?: string;
  audioEngine?: AudioEngineType;
  selectedPiperVoice?: PiperVoiceId;
  selectedStudioVoice?: StudioVoiceId;
}

export interface ValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}
