'use client';  // ← This is critical — fixes double elements, unresponsive clicks, and hydration issues on Vercel

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
  Volume2,
  VolumeX,
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

  // ── TTS (Voice Response) State ────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

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

  // Initialize SpeechSynthesis (TTS)
  useEffect(() => {
    if (typeof window === "undefined") return;

    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const available = synthRef.current?.getVoices() ?? [];
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  // Speak AI response
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !synthRef.current || !text.trim()) return;

    synthRef.current.cancel(); // Prevent overlapping speech

    const utterance = new SpeechSynthesisUtterance(text);

    // Prefer natural English voice
    const preferredVoice = voices.find(v =>
      v.lang.startsWith("en") &&
      (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Microsoft"))
    ) || voices.find(v => v.lang.startsWith("en")) || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.95;

    synthRef.current.speak(utterance);
  }, [voices, voiceEnabled]);

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
  }, [transcript, isListening, handleSend]);

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
          // Speak the AI response if voice enabled
          speak(aiText);
          return [...next, aiMsg];
        }
        return next;
      });
    },
    [speak]
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
      // Stop any ongoing TTS
      if (synthRef.current) synthRef.current.cancel();
    });
  }, [isListening, stopListening]);

  return (
    <>
      {/* Proactive peek */}
      <AnimatePresence>
        {showPeek && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 max-w-xs rounded-2xl border border-border bg-card p-4 shadow-xl"
          >
            <button
              onClick={() => setShowPeek(false)}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="pr-4 text-sm">
              Hi! 👋 Looking for help? I can offer{" "}
              <span className="font-semibold text-primary">20% off</span> your first consultation.
            </p>
            <button
              onClick={handleOpen}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              Chat now →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consent modal */}
      <AnimatePresence>
        {showConsent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              <h3 className="font-display text-lg font-bold">AI Terms & Conditions</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                By using this AI assistant, you agree to our terms of service and privacy policy.
                Your conversation data may be collected to improve our services. We respect your
                privacy and will never share your personal information without consent.
              </p>
              <label className="mt-4 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasConsent}
                  onChange={(e) => {
                    if (e.target.checked) handleAcceptConsent();
                  }}
                  className="mt-1 h-4 w-4 rounded border-border text-primary accent-primary"
                />
                <span className="text-sm">
                  I accept the AI Terms & Conditions and consent to data collection.
                </span>
              </label>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConsent(false)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 max-h-[min(600px,calc(100vh-8rem))] md:w-[400px]"
          >
            {/* Header with voice toggle */}
            <div className="flex items-center justify-between bg-primary px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">OVG Concierge</p>
                  <p className="text-xs text-primary-foreground/70">Online now</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* TTS Toggle */}
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="rounded-lg p-1 text-primary-foreground/70 hover:bg-primary-foreground/10"
                  aria-label={voiceEnabled ? "Mute bot voice" : "Enable bot voice"}
                  title={voiceEnabled ? "Mute bot voice" : "Enable bot voice"}
                >
                  {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "ai"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {msg.role === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-muted text-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
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

              {micError && (
                <p className="mt-2 text-xs text-destructive text-center">
                  {micError}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble */}
      <motion.button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg animate-pulse-glow"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
};

export default ChatWidget;
