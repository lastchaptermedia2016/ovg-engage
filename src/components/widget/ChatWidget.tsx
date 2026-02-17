import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  User,
  Bot,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { generateMockAIResponse, type ChatMessage } from "@/lib/mock-ai";

const STORAGE_KEY = "ovgweb_chat_messages";
const CONSENT_KEY = "ovgweb_consent";
const PROACTIVE_DELAY = 3000;
const AUTO_SEND_DELAY = 1000; // 1 second after final voice result

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem(CONSENT_KEY) === "true");
  const [showConsent, setShowConsent] = useState(false);
  const [showPeek, setShowPeek] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [isPendingClose, startCloseTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isListening,
    transcript,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Persist messages
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle voice transcript → input + auto-send on final
  useEffect(() => {
    if (transcript) {
      setInput(transcript.trim());
      setMicError(null);

      // Auto-send after final result + short delay
      if (!isListening && transcript.trim()) {
        setIsAutoSending(true);
        autoSendTimerRef.current = setTimeout(() => {
          handleSend();
          setIsAutoSending(false);
        }, AUTO_SEND_DELAY);
      }
    }

    return () => {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    };
  }, [transcript, isListening]);

  // Clear auto-send timer if user types manually or closes
  useEffect(() => {
    if (input.trim() === "" || !isOpen) {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      setIsAutoSending(false);
    }
  }, [input, isOpen]);

  // Proactive greeting peek
  useEffect(() => {
    if (hasGreeted || messages.length > 0 || isOpen) return;
    const timer = setTimeout(() => {
      setShowPeek(true);
      setHasGreeted(true);
    }, PROACTIVE_DELAY);
    return () => clearTimeout(timer);
  }, [hasGreeted, messages.length, isOpen]);

  const addMessage = useCallback(
    (role: "user" | "ai", text: string) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role,
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, msg];
        if (role === "user") {
          const aiText = generateMockAIResponse(text, next);
          const aiMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "ai",
            text: aiText,
            timestamp: Date.now() + 1,
          };
          return [...next, aiMsg];
        }
        return next;
      });
    },
    []
  );

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    addMessage("user", trimmed);
    if (isListening) stopListening();
  }, [input, addMessage, isListening, stopListening]);

  const handleOpen = useCallback(() => {
    setShowPeek(false);
    if (!hasConsent) {
      setShowConsent(true);
    } else {
      setIsOpen(true);
      if (messages.length === 0) {
        addMessage(
          "ai",
          "Hi! 👋 Looking for help today? I can offer 20% off your first consultation."
        );
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [hasConsent, messages.length, addMessage]);

  const handleAcceptConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "true");
    setHasConsent(true);
    setShowConsent(false);
    setIsOpen(true);
    if (messages.length === 0) {
      addMessage(
        "ai",
        "Hi! 👋 Looking for help today? I can offer 20% off your first consultation."
      );
    }
  }, [messages.length, addMessage]);

  const toggleMic = useCallback(() => {
    setMicError(null);
    if (isListening) {
      stopListening();
    } else {
      if (!voiceSupported) {
        setMicError("Voice input is not supported in this browser. Try Chrome or Edge.");
        return;
      }
      startListening();
    }
  }, [isListening, voiceSupported, startListening, stopListening]);

  const handleClose = useCallback(() => {
    startCloseTransition(() => {
      setIsOpen(false);
      if (isListening) stopListening();
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      setIsAutoSending(false);
    });
  }, [isListening, stopListening]);

  return (
    <>
      {/* ... (Proactive peek and Consent modal unchanged - keep as is) ... */}

      {/* Chat overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            // ... (keep your existing motion props and classes)
          >
            {/* Header - unchanged */}

            {/* Messages - unchanged */}

            {/* Input bar with enhancements */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center gap-2 rounded-xl bg-muted px-3 py-2.5 transition-all duration-300 ${
                    isListening ? "border-2 border-primary animate-pulse-glow" : ""
                  } ${micError ? "border-destructive" : ""}`}
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setMicError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      isListening
                        ? "Listening... speak now"
                        : micError
                        ? "Mic issue - type instead"
                        : "Type a message..."
                    }
                    className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                    disabled={isAutoSending}
                  />

                  {voiceSupported || micError ? (
                    <button
                      onClick={toggleMic}
                      disabled={isAutoSending}
                      className={`rounded-lg p-1.5 transition-colors ${
                        isListening
                          ? "text-primary animate-pulse"
                          : micError
                          ? "text-destructive hover:text-destructive/80"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label={
                        isListening
                          ? "Stop listening"
                          : micError
                          ? "Mic error - click for details"
                          : "Start voice input"
                      }
                      title={micError || undefined}
                    >
                      {isListening ? (
                        <MicOff className="h-5 w-5" />
                      ) : micError ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </button>
                  ) : null}
                </div>

                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl relative"
                  onClick={handleSend}
                  disabled={!input.trim() || isAutoSending}
                >
                  <Send className="h-4 w-4" />
                  {isAutoSending && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full"
                      />
                    </span>
                  )}
                </Button>
              </div>

              {/* Error message display */}
              {micError && (
                <p className="mt-2 text-xs text-destructive text-center">
                  {micError}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble - unchanged */}
    </>
  );
};

export default ChatWidget;
