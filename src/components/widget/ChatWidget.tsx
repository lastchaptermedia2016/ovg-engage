import { useState, useEffect, useRef, useCallback } from "react";
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
const VOICE_MUTE_KEY = "ovgweb_voice_mute";
const PROACTIVE_DELAY = 3000;
const AUTO_SEND_DELAY = 1000;
const LEAD_KEYWORDS = ["human", "call", "price", "pricing", "cost", "agent", "speak", "person"];

const OVG_GREETING = "Hello Donut, you gorgeous, how can we help you glam up even more today?";

const QUICK_REPLIES = [
  { label: "📅 Book now", message: "I'd like to book an appointment" },
  { label: "💎 See prices", message: "What are your prices?" },
  { label: "📞 Speak to human", message: "I'd like to speak to a human" },
];

const ChatWidget = () => {
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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    localStorage.setItem(VOICE_MUTE_KEY, voiceEnabled ? "false" : "true");
  }, [voiceEnabled]);

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
      toast({
        title: "Voice Input Error",
        description: "Could not process voice input.",
        variant: "destructive",
      });
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, []);

const speak = useCallback(async (text: string) => {
  if (!voiceEnabled || !text.trim()) return;
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current = null;
  }
  try {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      await new Promise(resolve => {
        window.speechSynthesis.onvoiceschanged = resolve;
        setTimeout(resolve, 800);
      });
      voices = window.speechSynthesis.getVoices();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;     // slightly faster, more conversational
    utterance.pitch = 1.1;     // slightly higher for female warmth
    utterance.volume = 1.0;

    // Prefer female American voices: Aria → Zira → any en-US female → any en-US
    const preferredVoice = voices.find(v => 
      (v.name.includes("Aria") || v.name.includes("Zira")) && v.lang === "en-US"
    ) || voices.find(v => v.lang === "en-US" && v.gender === "female") || voices.find(v => v.lang === "en-US") || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log("TTS using voice:", preferredVoice.name);
    } else {
      console.log("No preferred voice found, using default");
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("TTS failed:", err);
    toast({
      title: "Voice Issue",
      description: "Could not play the response.",
      variant: "destructive",
    });
  }
}, [voiceEnabled, toast]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (hasGreeted || messages.length > 0 || isOpen) return;
    const timer = setTimeout(() => {
      setShowPeek(true);
      setHasGreeted(true);
    }, PROACTIVE_DELAY);
    return () => clearTimeout(timer);
  }, [hasGreeted, messages.length, isOpen]);

  const checkLeadKeywords = useCallback((text: string) => {
    const lower = text.toLowerCase();
    if (LEAD_KEYWORDS.some(kw => lower.includes(kw))) {
      setShowLeadForm(true);
    }
  }, []);

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
      setIsTyping(true);
      const delay = 1200 + Math.random() * 800;
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
      }, delay);
      return next;
    });
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  }, [speak, isListening, checkLeadKeywords]);

  const handleSend = () => sendMessageDirect(input);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Not Supported", description: "Voice input requires Chrome/Edge.", variant: "destructive" });
      return;
    }
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch (err) {
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  };

  const greetText = OVG_GREETING;

  const handleOpen = () => {
    setShowPeek(false);
    if (!hasConsent) {
      setShowConsent(true);
      return;
    }

    setIsOpen(true);

    console.log("handleOpen called – messages length:", messages.length);
    if (messages.length === 0) {
      console.log("Adding auto greeting");
      const greetingMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: greetText,
        timestamp: Date.now(),
      };
      setMessages([greetingMsg]);
      setTimeout(() => {
        console.log("Speaking auto greeting");
        speak(greetText);
      }, 800);
    } else {
      console.log("Chat has messages – no auto greeting");
    }

    setTimeout(() => inputRef.current?.focus(), 800);
  };

  const handleAcceptConsent = () => {
    localStorage.setItem(CONSENT_KEY, "true");
    setHasConsent(true);
    setShowConsent(false);
    setIsOpen(true);

    console.log("Consent accepted – adding greeting");
    if (messages.length === 0) {
      const greetingMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: greetText,
        timestamp: Date.now(),
      };
      setMessages([greetingMsg]);
      setTimeout(() => {
        console.log("Speaking greeting after consent");
        speak(greetText);
      }, 800);
    }

    toast({ title: "Welcome to OVG! ✨", description: "Your personal beauty concierge is ready." });
  };

  const handleLeadSubmit = () => {
    if (!leadName.trim() || !leadEmail.trim()) {
      toast({ title: "Missing Info", description: "Please fill name and email.", variant: "destructive" });
      return;
    }
    toast({ title: "Thank you! 💜", description: `Our team will reach out to ${leadName} shortly.` });
    setShowLeadForm(false);
    const name = leadName;
    setLeadName("");
    setLeadEmail("");
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: "ai",
      text: `Thanks ${name}! ✨ One of our beauty consultants will be in touch soon.`,
      timestamp: Date.now()
    }]);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (isListening) recognitionRef.current?.stop();
    setIsListening(false);
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
  };

  const showQuickReplies = messages.length === 1 && messages[0]?.role === "ai";

  return (
    <>
      {/* Peek teaser */}
      {showPeek && !isOpen && (
        <div className="fixed bottom-24 right-6 z-50 max-w-xs rounded-2xl border bg-card p-4 shadow-xl">
          <button onClick={() => setShowPeek(false)} className="absolute right-2 top-2 text-muted-foreground">
            <X className="h-3 w-3" />
          </button>
          <p className="text-sm">
            Hey gorgeous! ✨ Claim <span className="font-semibold text-primary">20% off</span> your first consultation.
          </p>
          <button onClick={handleOpen} className="mt-2 text-sm font-medium text-primary hover:underline">
            Chat with us →
          </button>
        </div>
      )}

      {/* Consent modal */}
      {showConsent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
            <h3 className="text-lg font-bold">OVG Concierge — Terms</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              By using OVG Concierge, you agree to our terms and privacy policy.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Checkbox
                id="consent-check"
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
              />
              <Label htmlFor="consent-check" className="text-sm cursor-pointer">
                I accept the Terms & consent to data collection.
              </Label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConsent(false)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={!consentChecked} onClick={handleAcceptConsent}>
                Start Chatting ✨
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead form */}
      {showLeadForm && isOpen && (
        <div className="fixed bottom-[calc(7rem+600px)] right-6 z-[55] w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-background/95 backdrop-blur-xl p-5 shadow-xl">
          <h4 className="font-semibold text-sm">Connect with a consultant 💜</h4>
          <p className="text-xs text-muted-foreground mt-1">We'll reach out soon.</p>
          <div className="mt-3 space-y-2">
            <Input placeholder="Your name" value={leadName} onChange={e => setLeadName(e.target.value)} />
            <Input placeholder="Your email" type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowLeadForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleLeadSubmit}>Submit</Button>
          </div>
        </div>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          key="ovg-chat-window-final"
          className="fixed bottom-24 right-6 z-[9999] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-background/60 backdrop-blur-xl shadow-2xl max-h-[min(600px,calc(100dvh-8rem))] md:w-[400px] pointer-events-auto isolate"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-foreground">OVG Concierge</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-xs text-primary-foreground/70">Online now</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="rounded-lg p-1.5 text-primary-foreground/70 hover:bg-primary-foreground/10"
                aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-primary-foreground/70 hover:bg-primary-foreground/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
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
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted text-foreground"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {showQuickReplies && !isTyping && (
              <div className="flex flex-wrap gap-2 px-1 pt-2">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr.label}
                    onClick={() => sendMessageDirect(qr.message)}
                    className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
            {isTyping && (
              <div className="flex items-end gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.4s" }} />
                    <span className="ml-1.5 text-xs text-muted-foreground/60">typing</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
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
                  placeholder={isListening ? "Listening… speak now" : "Ask about treatments, pricing…"}
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none"
                />
                <button
                  onClick={toggleListening}
                  className={`rounded-full p-1.5 transition-colors ${
                    isListening ? "text-primary bg-primary/10 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              </div>
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating bubble - only shown when chat is closed */}
      {!isOpen && (
        <button
          key="ovg-chat-bubble-final-single"
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-[10000] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-110 transition-transform duration-200 animate-pulse-glow"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default ChatWidget;