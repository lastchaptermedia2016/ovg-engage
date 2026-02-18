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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateMockAIResponse, type ChatMessage } from "@/lib/mock-ai";

const STORAGE_KEY = "ovgweb_chat_messages";
const CONSENT_KEY = "ovgweb_consent";
const PROACTIVE_DELAY = 3000;
const AUTO_SEND_DELAY = 1000;
const LEAD_KEYWORDS = ["human", "call", "price", "pricing", "cost", "agent"];

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
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  </div>
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
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem(CONSENT_KEY) === "true");
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

  // TTS state
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── TTS init ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    synthRef.current = window.speechSynthesis;
    const loadVoices = () => {
      const available = synthRef.current?.getVoices() ?? [];
      if (available.length > 0) setVoices(available);
    };
    loadVoices();
    if (synthRef.current) synthRef.current.onvoiceschanged = loadVoices;
    return () => { if (synthRef.current) synthRef.current.cancel(); };
  }, []);

  // ── Speech Recognition init ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        // Auto-send after final result
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
      toast({ title: "Mic Error", description: `Speech recognition error: ${event.error}`, variant: "destructive" });
    };

    recognition.onend = () => {
      console.log("[Speech] Recognition ended");
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, []);

  // ── Speak function ──
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !synthRef.current || !text.trim()) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const preferred = voices.find(v =>
      v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("WaveNet") || v.name.includes("Female") || v.name.includes("Microsoft") || v.name.includes("Google"))
    ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferred) utterance.voice = preferred;
    console.log("Speaking with voice:", preferred?.name);
    utterance.rate = 1.02;
    utterance.pitch = 1.05;
    utterance.volume = 0.92;
    synthRef.current.speak(utterance);
  }, [voices, voiceEnabled]);

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
    }, PROACTIVE_DELAY);
    return () => clearTimeout(timer);
  }, [hasGreeted, messages.length, isOpen]);

  // ── Check for lead keywords ──
  const checkLeadKeywords = useCallback((text: string) => {
    const lower = text.toLowerCase();
    if (LEAD_KEYWORDS.some(kw => lower.includes(kw))) {
      setShowLeadForm(true);
    }
  }, []);

  // ── Send message (direct, no dependency on state `input`) ──
  const sendMessageDirect = useCallback((text: string) => {
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

    setMessages(prev => {
      const next = [...prev, userMsg];
      // Show typing indicator then reply
      setIsTyping(true);
      setTimeout(() => {

        const aiText = generateMockAIResponse(trimmed, next);
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "ai",
          text: aiText,
          timestamp: Date.now(),
        };
        setMessages(p => [...p, aiMsg]);
        setIsTyping(false);
        speak(aiText);
      }, 1500);
      return next;
    });

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  }, [speak, isListening, checkLeadKeywords]);

  // ── Send from input state ──
  const handleSend = useCallback(() => {
    sendMessageDirect(input);
  }, [input, sendMessageDirect]);

  // ── Toggle mic ──
  const toggleListening = useCallback(() => {
    console.log("[Mic] toggleListening, current isListening:", isListening);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Not Supported", description: "Voice input is not supported in this browser. Try Chrome or Edge.", variant: "destructive" });
      return;
    }
    try {
      recognitionRef.current?.start();
      setIsListening(true);
      console.log("[Mic] Started listening");
    } catch (err) {
      console.error("[Mic] Start failed:", err);
      toast({ title: "Mic Error", description: "Could not start microphone.", variant: "destructive" });
    }
  }, [isListening, toast]);

  // ── Open chat ──
  const handleOpen = useCallback(() => {
    setShowPeek(false);
    if (!hasConsent) {
      setShowConsent(true);
    } else {
      setIsOpen(true);
      if (messages.length === 0) {
        const greetText = greeting || "Hi! 👋 Looking for help today? I can offer 20% off your first consultation.";
        setMessages([{ id: crypto.randomUUID(), role: "ai", text: greetText, timestamp: Date.now() }]);
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [hasConsent, messages.length, greeting]);

  // ── Accept consent ──
  const handleAcceptConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "true");
    setHasConsent(true);
    setShowConsent(false);
    setIsOpen(true);
    if (messages.length === 0) {
      const greetText = greeting || "Hi! 👋 Looking for help today? I can offer 20% off your first consultation.";
      setMessages([{ id: crypto.randomUUID(), role: "ai", text: greetText, timestamp: Date.now() }]);
    }
    toast({ title: "Welcome!", description: "Chat is ready. Ask me anything." });
  }, [messages.length, greeting, toast]);

  // ── Submit lead form ──
  const handleLeadSubmit = useCallback(() => {
    if (!leadName.trim() || !leadEmail.trim()) {
      toast({ title: "Missing Info", description: "Please fill in both name and email.", variant: "destructive" });
      return;
    }
    console.log("Lead submitted:", { name: leadName, email: leadEmail });
    toast({ title: "Thank you!", description: `We'll reach out to ${leadName} at ${leadEmail} soon.` });
    setShowLeadForm(false);
    const name = leadName;
    setLeadName("");
    setLeadEmail("");
    // Add agent reply directly
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: "ai", text: `Thanks ${name}! We'll be in touch.`, timestamp: Date.now()
    }]);
  }, [leadName, leadEmail, toast, sendMessageDirect]);

  // ── Close chat ──
  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (isListening) recognitionRef.current?.stop();
    setIsListening(false);
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    if (synthRef.current) synthRef.current.cancel();
  }, [isListening]);

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
            <button onClick={() => setShowPeek(false)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
            <p className="pr-4 text-sm">
              Hi! 👋 Looking for help? I can offer <span className="font-semibold text-primary">20% off</span> your first consultation.
            </p>
            <button onClick={handleOpen} className="mt-2 text-sm font-medium text-primary hover:underline">
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
              className="w-full max-w-md rounded-2xl border border-white/20 bg-background/80 backdrop-blur-xl p-6 shadow-2xl"
            >
              <h3 className="font-display text-lg font-bold">AI Terms & Conditions</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                By using this AI assistant, you agree to our terms of service and privacy policy.
                Your conversation data may be collected to improve our services.
              </p>
              <div className="mt-4 flex items-start gap-3">
                <Checkbox
                  id="consent-check"
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked === true)}
                />
                <Label htmlFor="consent-check" className="text-sm cursor-pointer">
                  I accept the AI Terms & Conditions and consent to data collection.
                </Label>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConsent(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" disabled={!consentChecked} onClick={handleAcceptConsent}>
                  Start Chatting
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
            className="fixed bottom-[calc(7rem+600px)] right-6 z-[55] w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/20 bg-background/90 backdrop-blur-xl p-5 shadow-xl md:w-[400px]"
          >
            <h4 className="font-semibold text-sm">Let us reach out to you</h4>
            <p className="text-xs text-muted-foreground mt-1">We'll get back to you shortly.</p>
            <div className="mt-3 space-y-2">
              <Input placeholder="Your name" value={leadName} onChange={e => setLeadName(e.target.value)} />
              <Input placeholder="Your email" type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowLeadForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleLeadSubmit}>Submit</Button>
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
            className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/20 bg-background/60 backdrop-blur-xl shadow-2xl max-h-[min(600px,calc(100vh-8rem))] md:w-[400px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-primary px-5 py-4" style={primaryColor ? { backgroundColor: primaryColor } : {}}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">AI Assistant</p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-xs text-primary-foreground/70">Online now</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="rounded-lg p-1.5 text-primary-foreground/70 hover:bg-primary-foreground/10 transition-colors"
                  aria-label={voiceEnabled ? "Mute bot voice" : "Enable bot voice"}
                >
                  {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
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
                      msg.role === "ai" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
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
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-border/50 px-4 py-3 bg-background/40">
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center gap-2 rounded-full bg-muted/80 px-4 py-2.5 transition-all duration-300 ${
                    isListening ? "ring-2 ring-primary animate-pulse" : ""
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
                    placeholder={isListening ? "Listening... speak now" : "Type a message..."}
                    className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button
                    onClick={toggleListening}
                    className={`rounded-full p-1.5 transition-colors ${
                      isListening
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-label={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
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
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
};

export default ChatWidget;
