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
  RefreshCw,
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

const OVG_GREETING = "Welcome to OVG Concierge! ✨ I'm your personal beauty & wellness assistant. Whether you're looking to book a treatment, explore our services, or claim your exclusive 20% off first consultation — I'm here to help!";

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
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const preferredVoice = voices.find(v => 
        (v.name.includes("Aria") || v.name.includes("Zira") || v.name.includes("Jenny")) && v.lang === "en-US"
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

  const resetChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: "Chat Reset", description: "Conversation history cleared." });
  };

  const showQuickReplies = messages.length === 1 && messages[0]?.role === "ai";

  return (
    <>
      {/* Peek teaser */}
      {showPeek && !isOpen && (
        <div className="fixed bottom-24 right-6 z-50 max-w-xs rounded-2xl border bg-background/80 backdrop-blur-md p-4 shadow-xl">
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
          <div className="w-full max-w-md rounded-2xl border bg-background/95 backdrop-blur-xl p-6 shadow-2xl">
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
          className="fixed bottom-24 right-6 z-[9999] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-300 bg-gray-100 backdrop-blur-xl shadow-2xl text-black max-h-[min(600px,calc(100dvh-8rem))] md:w-[400px] pointer-events-auto isolate"
        >
          {/* Header – logo + text + buttons */}
          <div className="flex items-center justify-between bg-gradient-to-r from-gold-dark to-gold-primary px-6 py-5 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <img
                src="/images/luxemedspa.svg"
                alt="Luxe Med Spa Concierge"
                className="h-14 w-14 rounded-full object-cover border-2 border-black/30 shadow-md"
              />
              <div>
                <p className="text-xl font-bold text-black">
                  Luxe Med Spa Concierge
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-sm text-black/80">Online now</p>
                </div>
              </div>
            </div>

            {/* Right buttons – volume/mute, reset, close */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="rounded-full p-2.5 text-black/80 hover:bg-black/15 transition-colors"
                aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
              </button>
              <button
                onClick={resetChat}
                className="rounded-full p-2.5 text-black/80 hover:bg-black/15 transition-colors"
                title="Reset chat history"
              >
                <RefreshCw className="h-7 w-7" />
              </button>
              <button
                onClick={handleClose}
                className="rounded-full p-2.5 text-black/80 hover:bg-black/15 transition-colors"
              >
                <X className="h-7 w-7" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "ai" ? "bg-gold-primary/20 text-gold-primary" : "bg-gray-300 text-black"
                    }`}
                  >
                    {msg.role === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-br-md bg-gold-primary text-black"
                        : "rounded-bl-md bg-gray-200 text-black"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 opacity-80">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {showQuickReplies && !isTyping && (
              <div className="flex flex-wrap gap-2 px-1 pt-2">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr.label}
                    onClick={() => sendMessageDirect(qr.message)}
                    className="rounded-full border border-gold-primary/30 bg-gold-primary/10 px-3 py-1.5 text-xs font-medium text-gold-primary hover:bg-gold-primary/20"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
            {isTyping && (
              <div className="flex items-end gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-primary/20 text-gold-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-gray-200 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-gold-primary animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-gold-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-gold-primary animate-bounce" style={{ animationDelay: "0.4s" }} />
                    <span className="ml-1.5 text-xs text-gold-primary/60">typing</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar – light grey with gold send button */}
          <div className="border-t border-gray-300 px-4 py-3 bg-gray-100">
            <div className="flex items-center gap-2">
              <div
                className={`flex flex-1 items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 transition-all duration-300 border border-gray-300 ${
                  isListening ? "ring-2 ring-gold-primary animate-pulse" : ""
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
                  className="flex-1 bg-transparent text-sm placeholder:text-gray-500 focus:outline-none text-black"
                />
                <button
                  onClick={toggleListening}
                  className={`rounded-full p-1.5 transition-colors ${
                    isListening ? "text-gold-primary bg-gold-primary/20 animate-pulse" : "text-gray-500 hover:text-gold-primary hover:bg-gray-200"
                  }`}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              </div>
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full bg-gold-primary hover:bg-gold-dark text-black"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating bubble – pink gradient + black icon */}
      {!isOpen && (
        <button
          key="ovg-chat-bubble-final-single"
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-[10000] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#C71585] to-[#FF69B4] text-black shadow-2xl hover:scale-110 transition-transform duration-200 animate-pulse-glow"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default ChatWidget;