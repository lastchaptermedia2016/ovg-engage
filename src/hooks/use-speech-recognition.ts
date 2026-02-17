import { useState, useEffect, useRef, useCallback } from "react";

interface SpeechRecognitionHookResult {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useSpeechRecognition(): SpeechRecognitionHookResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;          // Keep listening across pauses (better for chat)
    recognition.interimResults = true;      // Enable live partial results
    recognition.lang = "en-US";

    let interimTranscript = ""; // Local var to build current phrase

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      interimTranscript = ""; // Reset interim each time

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const currentTranscript = result[0].transcript;

        if (result.isFinal) {
          // Final result → append to main transcript
          setTranscript((prev) => prev + currentTranscript + " ");
          interimTranscript = ""; // Clear interim after final
        } else {
          // Interim (partial) → show live in state
          interimTranscript += currentTranscript;
        }
      }

      // Always show the current interim if present (live preview)
      if (interimTranscript) {
        setTranscript((prev) => {
          // Replace the last unfinished part with current interim
          const lastSpaceIndex = prev.lastIndexOf(" ");
          const base = lastSpaceIndex >= 0 ? prev.slice(0, lastSpaceIndex + 1) : "";
          return base + interimTranscript;
        });
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Optional: Auto-restart if you want continuous listening
      // if (isListening) recognition.start();
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setTranscript(""); // Clear previous
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error("Start failed:", err);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return { isListening, transcript, isSupported, startListening, stopListening, resetTranscript };
}
