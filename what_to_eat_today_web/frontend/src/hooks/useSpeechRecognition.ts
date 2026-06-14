import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    androidSpeech?: {
      startListening: () => void;
      stopListening: () => void;
    };
    SpeechRecognition?: new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((event: SpeechRecognitionEvent) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };
    webkitSpeechRecognition?: new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((event: SpeechRecognitionEvent) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };
  }
}

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
  } | null>(null);
  const finalRef = useRef('');
  const mountedRef = useRef(true);

  const isSupported = Boolean(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.androidSpeech
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cleanupCallbacks = useCallback(() => {
    const maybeWindow = window as Window & {
      __speechOnInterim?: (text: string) => void;
      __speechOnResult?: (text: string) => void;
      __speechOnError?: () => void;
      __speechOnEnd?: () => void;
    };
    delete maybeWindow.__speechOnInterim;
    delete maybeWindow.__speechOnResult;
    delete maybeWindow.__speechOnError;
    delete maybeWindow.__speechOnEnd;
  }, []);

  const startWebSpeech = useCallback(() => {
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcriptText = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalRef.current += transcriptText;
        } else {
          interim += transcriptText;
        }
      }
      if (mountedRef.current) {
        setTranscript(finalRef.current + interim);
      }
    };

    recognition.onerror = () => {
      if (mountedRef.current) {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (mountedRef.current) {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    finalRef.current = '';
    setTranscript('');
    recognition.start();
    setIsListening(true);
  }, []);

  const stopWebSpeech = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startAndroidSpeech = useCallback(() => {
    const maybeWindow = window as Window & {
      __speechOnInterim?: (text: string) => void;
      __speechOnResult?: (text: string) => void;
      __speechOnError?: () => void;
      __speechOnEnd?: () => void;
    };

    maybeWindow.__speechOnInterim = (text: string) => {
      if (mountedRef.current) {
        setTranscript(text);
      }
    };
    maybeWindow.__speechOnResult = (text: string) => {
      if (mountedRef.current) {
        setTranscript(text);
        finalRef.current = text;
      }
    };
    maybeWindow.__speechOnError = () => {
      if (mountedRef.current) {
        setIsListening(false);
      }
    };
    maybeWindow.__speechOnEnd = () => {
      if (mountedRef.current) {
        setIsListening(false);
      }
    };

    finalRef.current = '';
    setTranscript('');
    window.androidSpeech?.startListening();
    setIsListening(true);
  }, []);

  const stopAndroidSpeech = useCallback(() => {
    window.androidSpeech?.stopListening();
    cleanupCallbacks();
    setIsListening(false);
  }, [cleanupCallbacks]);

  const startListening = useCallback(() => {
    if (window.androidSpeech) {
      startAndroidSpeech();
      return;
    }
    startWebSpeech();
  }, [startAndroidSpeech, startWebSpeech]);

  const stopListening = useCallback(() => {
    if (window.androidSpeech) {
      stopAndroidSpeech();
      return;
    }
    stopWebSpeech();
  }, [stopAndroidSpeech, stopWebSpeech]);

  useEffect(() => {
    return () => {
      stopWebSpeech();
      cleanupCallbacks();
    };
  }, [cleanupCallbacks, stopWebSpeech]);

  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}
