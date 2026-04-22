import { useState, useEffect, useRef, useCallback } from "react";

interface SpeechRecognitionHookResult {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  recognitionRef: React.RefObject<any>;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useSpeechRecognition(): SpeechRecognitionHookResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current = final;
        setTranscript(final);
      } else if (interim) {
        setTranscript(interim);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected, resetting listening state');
        setIsListening(false);
      } else {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      console.log('⚠️ Speech recognition already active, skipping start');
      return;
    }

    setTranscript("");
    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log('✅ Speech recognition started');
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        // Only reset if we're not supposed to be listening
        if (!isListening) {
          console.warn('⚠️ Speech recognition already in invalid state, resetting');
          setIsListening(false);
        } else {
          console.log('⚠️ Invalid state but mic should be on, ignoring');
        }
      } else {
        console.error("❌ Start failed:", err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
  }, []);

  return { isListening, transcript, isSupported, startListening, stopListening, resetTranscript, recognitionRef };
}
