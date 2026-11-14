import { stripEmojis } from '../utils/speech';
import { resolveAssetUrl } from './audioEngineService';

const UI_AUDIO_MAP: Record<string, string> = {
  'Hallo! Wie heißt du und wer soll mit dir lesen?': '/audio/ui/katja/welcome_intro.mp3',
  'Super! Dein Profil ist bereit zum Lesen!': '/audio/ui/katja/profile_success.mp3',
  'Bitte gib einen Namen ein.': '/audio/ui/katja/error_name_empty.mp3',
  'Der Name darf höchstens 20 Zeichen haben.': '/audio/ui/katja/error_name_length.mp3',
  'Bitte verwende nur Buchstaben.': '/audio/ui/katja/error_name_chars.mp3',
  'Bereit für dein nächstes Lese-Abenteuer?': '/audio/ui/katja/greeting_generic.mp3',
};

const COMPANION_SAMPLES: Record<string, string> = {
  otto: '/audio/ui/katja/sample_otto.mp3',
  luna: '/audio/ui/katja/sample_luna.mp3',
  ben: '/audio/ui/katja/sample_ben.mp3',
  fips: '/audio/ui/katja/sample_fips.mp3',
};

const CACHE_NAME_UI_AUDIO = 'lesecoach-ui-audio-v1';
let currentUiAudio: HTMLAudioElement | null = null;

export function stopUiSpeech(): void {
  if (currentUiAudio) {
    try {
      currentUiAudio.pause();
      currentUiAudio.currentTime = 0;
    } catch {}
    currentUiAudio = null;
  }
}

export async function playAudioUrl(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom');
  const resolved = resolveAssetUrl(url);

  return new Promise<boolean>((resolve) => {
    stopUiSpeech();
    const audio = new Audio(resolved);
    currentUiAudio = audio;

    if (isJsdom) {
      audio.play().catch(() => {});
      currentUiAudio = null;
      resolve(true);
      return;
    }

    audio.onended = () => {
      currentUiAudio = null;
      resolve(true);
    };
    audio.onerror = () => {
      currentUiAudio = null;
      resolve(false);
    };
    audio.play().catch(() => resolve(false));
  });
}


/**
 * Speaks UI text using high-fidelity Katja Studio-Audio when available,
 * with support for personalized child names (pre-rendered or dynamically cached),
 * falling back gracefully to device TTS.
 */
export async function speakUiText(
  text: string,
  options?: {
    childName?: string;
    companionId?: string;
  }
): Promise<void> {
  if (typeof window === 'undefined') return;

  const clean = stripEmojis(text).trim();
  if (!clean) return;

  // 1. Check exact UI static phrases (e.g. Profile error/welcome messages)
  if (UI_AUDIO_MAP[clean]) {
    const success = await playAudioUrl(UI_AUDIO_MAP[clean]);
    if (success) return;
  }

  // 2. Check companion introduction samples
  if (options?.companionId && COMPANION_SAMPLES[options.companionId.toLowerCase()]) {
    const success = await playAudioUrl(COMPANION_SAMPLES[options.companionId.toLowerCase()]);
    if (success) return;
  }

  // 3. Check personalized greetings by child name
  const rawName = (options?.childName || '').trim().toLowerCase();
  if (rawName) {
    // Check if pre-rendered greeting exists in /audio/ui/katja/names/
    const preRenderedUrl = `/audio/ui/katja/names/greeting_${rawName}.mp3`;
    try {
      const head = await fetch(preRenderedUrl, { method: 'HEAD' });
      if (head.ok) {
        const success = await playAudioUrl(preRenderedUrl);
        if (success) return;
      }
    } catch {}

    // Check CacheStorage for dynamically generated greeting
    if ('caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME_UI_AUDIO);
        const match = await cache.match(`/dynamic-greeting-${rawName}.mp3`);
        if (match) {
          const blob = await match.blob();
          const blobUrl = URL.createObjectURL(blob);
          const success = await playAudioUrl(blobUrl);
          URL.revokeObjectURL(blobUrl);
          if (success) return;
        }
      } catch {}
    }
  }

  // 4. Fallback to generic Studio greeting if it's a greeting phrase
  if (clean.includes('Bereit') || clean.includes('Hallo') || clean.includes('Lese-Begleiter')) {
    await playAudioUrl('/audio/ui/katja/greeting_generic.mp3');
  }
}
