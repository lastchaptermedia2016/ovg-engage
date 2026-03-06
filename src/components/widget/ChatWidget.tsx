import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  User,
  Bot,
  Volume2,
  VolumeX,
  Calendar,
  DollarSign,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateMockAIResponse, type ChatMessage } from "@/lib/mock-ai";

const STORAGE_KEY = "ovgweb_chat_messages";
const CONSENT_KEY = "ovgweb_consent";
const VOICE_MUTE_KEY = "ovgweb_voice_mute";
const PROACTIVE_DELAY = 3000;
const AUTO_SEND_DELAY = 1000;
const LEAD_KEYWORDS = [
  "human",
  "call",
  "price",
  "pricing",
  "cost",
  "agent",
  "speak",
  "person",
];

const OVG_GREETING =
  "Welcome to OVG Concierge! ✨ I'm your personal beauty & wellness assistant. Whether you're looking to book a treatment, explore our services, or claim your exclusive 20% off first consultation — I'm here to help!";

const QUICK_REPLIES = [
  { label: "📅 Book now", message: "I'd like to book an appointment" },
  { label: "💎 See prices", message: "What are your prices?" },
  { label: "📞 Speak to human", message: "I'd like to speak to a human" },
];

interface ChatWidgetProps {
  primaryColor?: string;
  greeting?: string;
}

const TypingIndicator = () => (
  <div className="flex items-end gap-2">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Bot className="h-4 w-4" />
    </div>
    <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
        <span className="ml-1.5 text-xs text-muted-foreground/60">typing</span>
      </div>
    </div>
  </div>
);

const QuickReplies = ({ onSelect }: { onSelect: (msg: string) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="flex flex-wrap gap-2 px-1 pt-2"
  >
    {QUICK_REPLIES.map((qr) => (
      <button
        key={qr.label}
        onClick={() => onSelect(qr.message)}
        className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/15 hover:border-primary/50 active:scale-95"
      >
        {qr.label}
      </button>
    ))}
  </motion.div>
);

const ChatWidget = ({ primaryColor, greeting }: ChatWidgetProps = {}) => {
  const { toast } = useToast();
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
  const [hasConsent, setHasConsent] = useState(
    () => localStorage.getItem(CONSENT_KEY) === "true",
  );
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showPeek, setShowPeek] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TTS state — persist mute preference
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try {
      return localStorage.getItem(VOICE_MUTE_KEY) !== "true";
    } catch {
      return true;
    }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist voice mute preference
  useEffect(() => {
    localStorage.setItem(VOICE_MUTE_KEY, voiceEnabled ? "false" : "true");
  }, [voiceEnabled]);

  // ── Speech Recognition init ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t;
        } else {
          interimText += t;
        }
      }
      if (finalText) {
        setInput(finalText.trim());
        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = setTimeout(() => {
          sendMessageDirect(finalText.trim());
        }, AUTO_SEND_DELAY);
      } else if (interimText) {
        setInput(interimText.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      const errorMessages: Record<string, string> = {
        "not-allowed":
          "Microphone access denied. Please enable it in your browser settings.",
        "no-speech": "No speech detected. Please try again.",
        network: "Network error. Please check your connection.",
      };
      toast({
        title: "Voice Input Error",
        description:
          errorMessages[event.error] ||
          `Could not process voice: ${event.error}`,
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
    };
  }, []);

  // ── Speak function (ElevenLabs TTS direct) ──
  const speak = useCallback(
    async (text: string) => {
      if (!voiceEnabled || !text.trim()) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      try {
        const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        if (!apiKey) {
          console.warn(
            "[TTS] VITE_ELEVENLABS_API_KEY not set, falling back to browser TTS",
          );
          throw new Error("Missing API key");
        }

        const response = await fetch(
          "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream",
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          },
        );

        if (!response.ok) {
          const errBody = await response.text();
          console.warn("ElevenLabs failed:", response.status, errBody);
          throw new Error(`TTS request failed: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        await audio.play();
        console.log("ElevenLabs success");
      } catch (err) {
        console.warn(
          "[TTS] ElevenLabs failed, falling back to browser TTS:",
          err,
        );
        if (typeof window !== "undefined" && window.speechSynthesis) {
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice =
            voices.find((v) =>
              /natural|google|neural|wavenet|female/i.test(v.name),
            ) || voices[0];
          const utterance = new SpeechSynthesisUtterance(text);
          if (preferredVoice) utterance.voice = preferredVoice;
          utterance.rate = 1.02;
          utterance.pitch = 1.05;
          utterance.volume = 0.92;
          window.speechSynthesis.speak(utterance);
        } else {
          toast({
            title: "Voice Unavailable",
            description:
              "Voice responses are temporarily unavailable. You can still chat normally.",
            variant: "destructive",
          });
        }
      }
    },
    [voiceEnabled, toast],
  );

  // ── Persist messages ──
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Proactive greeting peek ──
  useEffect(() => {
    if (hasGreeted || messages.length > 0 || isOpen) return;
    const timer = setTimeout(() => {
      setShowPeek(true);
      setHasGreeted(true);
      // Optional: Add a subtle sound or toast here if desired
    }, 2000); // Reduced delay for faster engagement
    return () => clearTimeout(timer);
  }, [hasGreeted, messages.length, isOpen]);

  // ── Check for lead keywords ──
  const checkLeadKeywords = useCallback((text: string) => {
    const lower = text.toLowerCase();
    if (LEAD_KEYWORDS.some((kw) => lower.includes(kw))) {
      setShowLeadForm(true);
    }
  }, []);

  // ── Send message (direct) ──
  const sendMessageDirect = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setInput("");

      checkLeadKeywords(trimmed);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const next = [...prev, userMsg];
        setIsTyping(true);
        // Realistic delay based on response length
        const delay = 1200 + Math.random() * 800;
        setTimeout(() => {
          const aiText = generateMockAIResponse(trimmed, next);
          const aiMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "ai",
            text: aiText,
            timestamp: Date.now(),
          };
          setMessages((p) => [...p, aiMsg]);
          setIsTyping(false);
          speak(aiText);
        }, delay);
        return next;
      });

      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    },
    [speak, isListening, checkLeadKeywords],
  );

  // ── Send from input state ──
  const handleSend = useCallback(() => {
    sendMessageDirect(input);
  }, [input, sendMessageDirect]);

  // ── Toggle mic ──
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({
        title: "Not Supported",
        description: "Voice input requires Chrome or Edge browser.",
        variant: "destructive",
      });
      return;
    }
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch (err) {
      console.error("[Mic] Start failed:", err);
      toast({
        title: "Microphone Error",
        description:
          "Could not access your microphone. Please check browser permissions.",
        variant: "destructive",
      });
    }
  }, [isListening, toast]);

  // ── Greeting text ──
  const greetText = greeting || OVG_GREETING;

  // ── Open chat ──
  const handleOpen = useCallback(() => {
    setShowPeek(false);
    if (!hasConsent) {
      setShowConsent(true);
    } else {
      setIsOpen(true);
      if (messages.length === 0) {
        setIsTyping(true);
        setTimeout(() => {
          const initialMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "ai",
            text: greetText,
            timestamp: Date.now(),
          };
          setMessages([initialMsg]);
          setIsTyping(false);
          // Small additional delay to ensure state update is processed before speaking
          setTimeout(() => speak(greetText), 100);
        }, 800);
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [hasConsent, messages.length, greetText, speak]);

  // ── Accept consent ──
  const handleAcceptConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "true");
    setHasConsent(true);
    setShowConsent(false);
    setIsOpen(true);
    if (messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        const initialMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "ai",
          text: greetText,
          timestamp: Date.now(),
        };
        setMessages([initialMsg]);
        setIsTyping(false);
        // Small additional delay to ensure state update is processed before speaking
        setTimeout(() => speak(greetText), 100);
      }, 800);
    }
    toast({
      title: "Welcome to OVG! ✨",
      description: "Your personal beauty concierge is ready.",
    });
  }, [messages.length, greetText, toast, speak]);

  // ── Submit lead form ──
  const handleLeadSubmit = useCallback(() => {
    if (!leadName.trim() || !leadEmail.trim()) {
      toast({
        title: "Missing Info",
        description: "Please fill in both name and email.",
        variant: "destructive",
      });
      return;
    }
    console.log("Lead submitted:", { name: leadName, email: leadEmail });
    toast({
      title: "Thank you! 💜",
      description: `Our team will reach out to ${leadName} shortly.`,
    });
    setShowLeadForm(false);
    const name = leadName;
    setLeadName("");
    setLeadEmail("");
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "ai",
        text: `Thanks ${name}! ✨ One of our beauty consultants will be in touch soon to help you find the perfect treatment. We can't wait to welcome you!`,
        timestamp: Date.now(),
      },
    ]);
  }, [leadName, leadEmail, toast]);

  // ── Close chat ──
  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (isListening) recognitionRef.current?.stop();
    setIsListening(false);
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [isListening]);

  // Show quick replies only after the initial greeting (1 AI message, 0 user messages)
  const showQuickReplies = messages.length === 1 && messages[0]?.role === "ai";

  const bubbleStyle = primaryColor ? { backgroundColor: primaryColor } : {};

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
              Hey gorgeous! ✨ Curious about our treatments? Claim{" "}
              <span className="font-semibold text-primary">20% off</span> your
              first consultation today.
            </p>
            <button
              onClick={handleOpen}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              Chat with us →
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
              className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold">OVG Concierge — Terms</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                By using the OVG Concierge, you agree to our terms of service
                and privacy policy. Your conversation may be used to personalise
                your experience and improve our services.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Checkbox
                  id="consent-check"
                  checked={consentChecked}
                  onCheckedChange={(checked) =>
                    setConsentChecked(checked === true)
                  }
                  className="h-5 w-5 shrink-0 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor="consent-check"
                  className="text-sm cursor-pointer leading-snug"
                >
                  I accept the Terms & Conditions and consent to data
                  collection.
                </Label>
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConsent(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!consentChecked}
                  onClick={handleAcceptConsent}
                >
                  Start Chatting ✨
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead form modal */}
      <AnimatePresence>
        {showLeadForm && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-[calc(7rem+600px)] right-6 z-[55] w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background/95 backdrop-blur-xl p-5 shadow-xl md:w-[400px]"
          >
            <h4 className="font-semibold text-sm">
              Let us connect you with a consultant 💜
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              We'll reach out to arrange your personalised consultation.
            </p>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Your name"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
              />
              <Input
                placeholder="Your email"
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLeadForm(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleLeadSubmit}>
                Submit
              </Button>
            </div>
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
            className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background/60 backdrop-blur-xl shadow-2xl max-h-[min(600px,calc(100dvh-8rem))] md:w-[400px]"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between bg-primary px-5 py-4"
              style={primaryColor ? { backgroundColor: primaryColor } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">
                    OVG Concierge
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-xs text-primary-foreground/70">
                      Online now
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="rounded-lg p-1.5 text-primary-foreground/70 hover:bg-primary-foreground/10 transition-colors"
                  aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
                >
                  {voiceEnabled ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
                    {msg.role === "ai" ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-muted text-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {showQuickReplies && !isTyping && (
                <QuickReplies onSelect={sendMessageDirect} />
              )}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar — always visible, mobile-safe with dvh */}
            <div className="border-t border-border/50 px-4 py-3 bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center gap-2 rounded-full bg-muted/80 px-4 py-2.5 transition-all duration-300 ${
                    isListening ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      isListening
                        ? "Listening… speak now"
                        : "Ask about treatments, pricing…"
                    }
                    className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                  <button
                    onClick={toggleListening}
                    className={`rounded-full p-1.5 transition-colors ${
                      isListening
                        ? "text-primary bg-primary/10 animate-pulse"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-label={
                      isListening ? "Stop listening" : "Start voice input"
                    }
                  >
                    {isListening ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  style={primaryColor ? { backgroundColor: primaryColor } : {}}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble */}
      <motion.button
        onClick={isOpen ? handleClose : handleOpen}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg animate-pulse-glow"
        style={bubbleStyle}
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
