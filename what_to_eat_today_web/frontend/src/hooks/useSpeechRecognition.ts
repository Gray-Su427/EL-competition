import { useState, useRef, useEffect, useCallback } from 'react';

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
  const [isSupported, setSupported] = useState(false);
  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
  } | null>(null);
  const finalRef = useRef('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (window.SpeechRecognition || window.webkitSpeechRecognition || window.androidSpeech) {
      setSupported(true);
    }
    return () => { mountedRef.current = false; };
  }, []);

  const cleanupCallbacks = useCallback(() => {
    const w = window as any;
    delete w.__speechOnInterim;
    delete w.__speechOnResult;
    delete w.__speechOnError;
    delete w.__speechOnEnd;
  }, []);

  const startWebSpeech = useCallback(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalRef.current += t;
        } else {
          interim += t;
        }
      }
      if (mountedRef.current) {
        setTranscript(finalRef.current + interim);
      }
    };

    recognition.onerror = () => {
      if (mountedRef.current) setIsListening(false);
    };

    recognition.onend = () => {
      if (mountedRef.current) setIsListening(false);
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
    const w = window as any;
    w.__speechOnInterim = (text: string) => {
      if (mountedRef.current) setTranscript(text);
    };
    w.__speechOnResult = (text: string) => {
      if (mountedRef.current) {
        setTranscript(text);
        finalRef.current = text;
      }
    };
    w.__speechOnError = () => {
      if (mountedRef.current) setIsListening(false);
    };
    w.__speechOnEnd = () => {
      if (mountedRef.current) setIsListening(false);
    };

    finalRef.current = '';
    setTranscript('');
    window.androidSpeech!.startListening();
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
    } else {
      startWebSpeech();
    }
  }, [startWebSpeech, startAndroidSpeech]);

  const stopListening = useCallback(() => {
    if (window.androidSpeech) {
      stopAndroidSpeech();
    } else {
      stopWebSpeech();
    }
  }, [stopWebSpeech, stopAndroidSpeech]);

  useEffect(() => {
    return () => {
      stopWebSpeech();
      cleanupCallbacks();
    };
  }, [stopWebSpeech, cleanupCallbacks]);

  return { transcript, isListening, isSupported, startListening, stopListening };
}
