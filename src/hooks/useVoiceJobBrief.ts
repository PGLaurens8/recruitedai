'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { VoiceJobBriefOutput } from '@/ai/flows/voiceJobBriefFlow';

export type VoiceJobBriefFields = {
  title?: string;
  location?: string;
  salaryMin?: string;
  salaryMax?: string;
  description?: string;
  company?: string;
};

export type VoiceJobBriefErrorType = 'permission' | 'api' | 'unsupported';
export type VoiceJobBriefError = {
  type: VoiceJobBriefErrorType;
  message?: string;
} | null;

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript?: string;
}

interface SpeechRecognitionResultLike {
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

interface SpeechRecognitionResultEventLike {
  results?: {
    [index: number]: SpeechRecognitionResultLike | undefined;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

const getRecognitionConstructor = (): SpeechRecognitionConstructorLike | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };

  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
};

const normalizeFields = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeResponse = (result: VoiceJobBriefOutput): VoiceJobBriefFields => ({
  title: normalizeFields(result.title),
  location: normalizeFields(result.location),
  salaryMin: normalizeFields(result.salary_min),
  salaryMax: normalizeFields(result.salary_max),
  description: normalizeFields(result.description),
  company: normalizeFields(result.company),
});

export function useVoiceJobBrief(onResult: (fields: VoiceJobBriefFields) => void) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<VoiceJobBriefError>(null);

  const sendTranscript = useCallback(
    async (transcript: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/voice-job-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript }),
        });

        const payload = (await response.json()) as {
          ok: boolean;
          error?: { message?: string };
          data?: VoiceJobBriefOutput;
        };

        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error?.message || 'Voice parsing failed.');
        }

        onResult(normalizeResponse(payload.data));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Voice parsing failed.';
        setError({ type: 'api', message });
      } finally {
        setIsProcessing(false);
      }
    },
    [onResult]
  );

  const startListening = useCallback(() => {
    if (isListening || isProcessing) {
      return;
    }

    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setError({ type: 'unsupported' });
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onerror = (event) => {
      const type = event.error;
      recognition.stop();
      recognitionRef.current = null;
      setIsListening(false);
      const isPermissionError = type === 'not-allowed' || type === 'permission-denied';
      setError({ type: isPermissionError ? 'permission' : 'api' });
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      recognition.stop();
      recognitionRef.current = null;
      setIsListening(false);
      if (transcript) {
        void sendTranscript(transcript);
      } else {
        setError({ type: 'api' });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (startError) {
      setError({ type: 'permission' });
    }
  }, [isListening, isProcessing, sendTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  return {
    isListening,
    isProcessing,
    error,
    startListening,
    stopListening,
  };
}
