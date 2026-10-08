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

export interface ProfileState {
  childName: string;
  selectedCompanionId: string | null;
  companions: Companion[];
  isConfigured: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}
