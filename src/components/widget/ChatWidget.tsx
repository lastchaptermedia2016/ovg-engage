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

const greeting = "Hi there! I'm your The Luxe Med Spa in New Haven concierge, How can I help you book the perfect treatment today?";

const QUICK_REPLIES = [
  { label: "📅 Book an appointment now!", message: "I'd like to book an appointment" },
  { label: "💎 See our prices?", message: "What are your prices?" },
  { label: "📞 Speak to a consultant", message: "I'd like to speak to a consultant" },
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

  // NEW: Speaking indicator state
const [isSpeaking, setIsSpeaking] = useState(false);

const [selectedVoice, setSelectedVoice] = useState<string>(() => {
  const saved = localStorage.getItem("selectedVoice");
  return saved || "rachel"; // Default to Rachel (ElevenLabs primary)
});

// Save mute preference
useEffect(() => {
  localStorage.setItem(VOICE_MUTE_KEY, voiceEnabled ? "false" : "true");
}, [voiceEnabled]);

// NEW: Save selected voice preference whenever it changes
useEffect(() => {
  localStorage.setItem("selectedVoice", selectedVoice);
}, [selectedVoice]);

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

    // Stop any playing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true); // Start indicator for all attempts

    // Level 1: ElevenLabs direct (Rachel primary)
    try {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!apiKey) throw new Error("ElevenLabs key missing");

      const response = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream",
        {
          method: "POST",
          headers: {
            "Accept": "audio/mpeg",
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
              speed: 1.0,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs HTTP ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch(e => console.warn("ElevenLabs play error:", e));

      // Stop indicator when audio ends
      audioRef.current.onended = () => setIsSpeaking(false);

      console.log("ElevenLabs success (Rachel)");
      return;
    } catch (err) {
      console.error("ElevenLabs failed:", err);
    }

    // Level 2: xAI fallback via Vercel proxy (no CORS)
    try {
      const response = await fetch("/api/xai-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`xAI proxy ${response.status}: ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch(e => console.warn("xAI play error:", e));

      // Stop indicator when audio ends
      audioRef.current.onended = () => setIsSpeaking(false);

      console.log("xAI Grok TTS success (Eve voice)");
      return;
    } catch (err) {
      console.error("xAI fallback failed:", err);
    }

    // Level 3: Browser mock fallback (with UX polish)
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
      ) || voices.find(v => v.lang === "en-US") || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log("Browser TTS using voice:", preferredVoice.name);
      } else {
        console.log("No preferred voice found, using default");
      }

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        setIsSpeaking(false);
        console.error("Browser TTS error:", e);
      };

      window.speechSynthesis.speak(utterance);
      console.log("Browser mock fallback used");

      toast({
        title: "Voice Mode",
        description: "Real AI voice is temporarily unavailable. Using browser fallback for now.",
        variant: "default",
        duration: 6000,
      });
    } catch (err) {
      setIsSpeaking(false);
      console.error("Browser TTS failed:", err);
      toast({
        title: "Voice Issue",
        description: "Could not play the response.",
        variant: "destructive",
      });
    }
  }, [voiceEnabled, toast]);

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
  setTimeout(async () => {  // ← make this async
    try {
      const aiText = await generateMockAIResponse(trimmed, next);  // ← await here
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: aiText,
        timestamp: Date.now(),
      };
      setMessages(p => [...p, aiMsg]);
      setIsTyping(false);
      speak(aiText);
    } catch (err) {
      console.error("AI response failed:", err);
      setIsTyping(false);
      toast({
        title: "Response Error",
        description: "Could not generate a reply. Try again.",
        variant: "destructive",
      });
    }
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

  const handleOpen = () => {
    setShowPeek(false);
    if (!hasConsent) {
      setShowConsent(true);
      return;
    }

    setIsOpen(true);

    if (messages.length === 0) {
      const greetingMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: greeting,
        timestamp: Date.now(),
      };
      setMessages([greetingMsg]);
      setTimeout(() => {
        speak(greeting);
      }, 800);
    }

    setTimeout(() => inputRef.current?.focus(), 800);
  };

  const handleAcceptConsent = () => {
    localStorage.setItem(CONSENT_KEY, "true");
    setHasConsent(true);
    setShowConsent(false);
    setIsOpen(true);

    if (messages.length === 0) {
      const greetingMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: greeting,
        timestamp: Date.now(),
      };
      setMessages([greetingMsg]);
      setTimeout(() => {
        speak(greeting);
      }, 800);
    }

    toast({ title: "Welcome to The Luxe Med Spa in New Haven! ✨", description: "Your personal concierge is ready." });
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
        <div className="fixed bottom-24 right-6 z-50 max-w-xs rounded-2xl border-2 border-pink-400/70 bg-transparent p-5 shadow-2xl">
          <button 
            onClick={() => setShowPeek(false)} 
            className="absolute right-3 top-3 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          {/* Subtle dark scrim behind text for readability */}
          <div className="relative rounded-xl bg-black/30 backdrop-blur-sm p-4">
            <p className="text-sm text-pink-300 leading-relaxed">
              Hey Gorgeous! Welcome to Luxe Med Spa in New Haven, how can I assist you?
            </p>
            <button 
              onClick={handleOpen} 
              className="mt-3 text-sm font-medium text-white hover:text-pink-200 transition-colors"
            >
              Chat with us →
            </button>
          </div>
        </div>
      )}

      {/* Consent modal */}
      {showConsent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg-transparent p-5 shadow-2xl">
          <div className="w-full max-w-md rounded-2xl border bg-background/95 backdrop-blur-xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold">The Luxe Med Spa in New Haven — Terms</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              By using The Luxe Med Spa in New Haven concierge, you agree to our terms and privacy policy. Your information will solely be used to provide personalized beauty recommendations and may be stored for quality and training purposes. You can opt out at any time. For more details, please visit our website.
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
  className="fixed bottom-24 right-6 z-[9999] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border-2 border-pink-500 bg-pink-300/50 backdrop-blur-sm max-h-[min(680px,calc(100dvh-8rem))] md:w-[440px] pointer-events-auto isolate transition-all duration-300 hover:shadow-[0_25px_70px_-15px_rgba(255,105,180,0.15)] font-candara">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-b from-gray-200 to-gray-400 px-5 py-5 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <img
                src="/images/luxemedspa.svg"
                alt="Luxe Med Spa Concierge"
                className="h-12 w-auto object-contain"
              />
              <div>
                <p className="text-sm font-semibold text-grey-500">
                  Luxe Med Spa Concierge
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                  <p className="text-xs text- dark grey-200/80">Online now</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="rounded-lg p-1.5 text-teal-200/70 hover:bg-transparent"
                aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
              <button
                onClick={resetChat}
                className="rounded-lg p-1.5 text-teal-200/70 hover:bg-transparent"
                title="Reset chat history"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-teal-200/70 hover:bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-pink-300/30 text-pink-400 text-2xs">
            {messages.map((msg) => (
<div
  key={msg.id}
  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-fade-in-up`}
>
  <div className={`flex items-end gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
    {/* Avatar – softer, larger, glass-like glow */}
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-lg ring-1 ring-white/20 backdrop-blur-sm transition-all duration-300 hover:ring-white/40 hover:scale-105 ${
        msg.role === "ai"
          ? "bg-transparent text-pink-400"
          : "bg-transparent text-pink-400"
      }`}
    >
      {msg.role === "ai" ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
    </div>

    {/* Message bubble – softer, glassmorphic, elegant */}
    <div
      className={`max-w-[80%] rounded-3xl px-6 py-4 text-base leading-relaxed shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:scale-[1.015] ${
        msg.role === "user"
          ? "rounded-br-2xl bg-white/92 text-pink-400 border border-pink/60"
          : "rounded-bl-2xl bg-white/88 text-pink-400 border border-pink/30"
      }`}
    >
      {msg.text}
    </div>
  </div>

  {/* Timestamp – subtle and classy */}
  <div className="text-xs text-pink-200/70 mt-2 opacity-85 px-3 font-light">
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
                    className="rounded-full border border-pink-300 bg-transparent-100 px-3 py-1.5 text-xs font-medium text-pink-800 hover:bg-pink-200"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
            {isTyping && (
              <div className="flex items-end gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-transparent-200 text-pink-800">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-transparent-100 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-transparent-600 animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-transparent-600 animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-transparent-600 animate-bounce" style={{ animationDelay: "0.4s" }} />
                    <span className="ml-1.5 text-xs text-pink-700/60">typing</span>
                  </div>
                </div>
              </div>
            )}

            {/* NEW: Speaking indicator */}
            {isSpeaking && (
              <div className="flex items-center justify-center gap-2.5 text-sm text-pink-400 mt-4 animate-pulse font-medium">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Speaking...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-pink-200 px-4 py-3 bg-transparent">
            <div className="flex items-center gap-2">
              <div
                className={`flex flex-1 items-center gap-2 rounded-full bg-transparent/80 px-4 py-2.5 transition-all duration-300 border border-pink-200 ${
                  isListening ? "ring-2 ring-pink-400 animate-pulse" : ""
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
                  className="flex-1 bg-transparent text-sm placeholder:text-pink-600 focus:outline-none text-black"
                />
                <button
                  onClick={toggleListening}
                  className={`rounded-full p-1.5 transition-colors ${
                    isListening ? "text-pink-500 bg-transparent animate-pulse" : "text-pink-500 hover:text-pink-600 hover:bg-pink-100"
                  }`}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              </div>
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full bg-transparent hover:bg-transparent text-white"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      {!isOpen && (
        <button
          key="ovg-chat-bubble-final-single"
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-[10000] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#D46A8C] to-[#FFB6C1] text-black shadow-2xl hover:scale-110 transition-transform duration-200 animate-pulse-glow"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default ChatWidget;