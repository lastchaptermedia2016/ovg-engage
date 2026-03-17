import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Mic, MicOff, RefreshCw, Volume2, VolumeX, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { generateMockAIResponse, type ChatMessage } from "@/lib/mock-ai";

interface WidgetConfig {
  logo?: string;
  brandName?: string;
  primaryColor?: string;
  greeting?: string;
  peekText?: string;
}

const defaultConfig: WidgetConfig = {
  logo: "/images/luxemedspa.svg",
  brandName: "The Luxe Med Spa",
  primaryColor: "#E91E63",
  greeting: "Hi there! I'm your Luxe Med Spa concierge ✨ How can I help you book the perfect treatment today?",
  peekText: "Hey Gorgeous! Welcome to Luxe Med Spa, how can I help?",
};

const ChatWidget = () => {
  const { toast } = useToast();

  const [config, setConfig] = useState<WidgetConfig>(() => {
    const saved = (window as any).ovgConfig || {};
    return { ...defaultConfig, ...saved };
  });

  const [isOpen, setIsOpen] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem("ovgweb_ai_consent") === "true");

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem("ovgweb_chat_messages") || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);        // ← Fixed: now declared
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem("ovgweb_voice_mute") !== "true");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ==================== YOUR FULL VOICE FALLBACK (EXACTLY AS YOU HAD IT) ====================
  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    const keys = {
      groq: import.meta.env.VITE_GROQ_API_KEY,
      eleven: import.meta.env.VITE_ELEVENLABS_API_KEY,
      xai: import.meta.env.VITE_XAI_API_KEY,
    };

    const fetchWithTimeout = async (url: string, options: any, timeout = 2000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (e) { clearTimeout(id); throw e; }
    };

    // 1. GROQ
    if (keys.groq) {
      try {
        const res = await fetchWithTimeout("https://api.groq.com/openai/v1/audio/speech", {
          method: "POST",
          headers: { "Authorization": `Bearer ${keys.groq}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "canopylabs/orpheus-v1-english", voice: "autumn", input: text.slice(0, 200), response_format: "wav" }),
        }, 1500);
        if (!res.ok) throw new Error("Groq Error");
        audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
        await audioRef.current.play();
        return;
      } catch (e) { console.log("Groq failed..."); }
    }

    // 2. ELEVENLABS
    if (keys.eleven) {
      try {
        const res = await fetchWithTimeout("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream", {
          method: "POST",
          headers: { "xi-api-key": keys.eleven, "Content-Type": "application/json" },
          body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
        }, 2500);
        if (!res.ok) throw new Error("ElevenLabs Error");
        audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
        await audioRef.current.play();
        return;
      } catch (e) { console.log("ElevenLabs failed..."); }
    }

    // 3. xAI
    if (keys.xai) {
      try {
        const res = await fetchWithTimeout("https://api.x.ai/v1/audio/speech", {
          method: "POST",
          headers: { "Authorization": `Bearer ${keys.xai}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "grok-beta", input: text, voice: "eve" }),
        }, 2000);
        if (!res.ok) throw new Error("xAI Error");
        audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
        await audioRef.current.play();
        return;
      } catch (e) { console.log("xAI failed..."); }
    }

    // 4. BROWSER FALLBACK
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => (v.name.includes("Natural") || v.name.includes("Google")) && v.lang.startsWith("en"));
    if (premiumVoice) utterance.voice = premiumVoice;
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // ==================== YOUR OTHER LOGIC ====================
  const saveMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    localStorage.setItem("ovgweb_chat_messages", JSON.stringify(msgs));
  };

  const resetChat = () => {
    setMessages([]);
    localStorage.removeItem("ovgweb_chat_messages");
    toast({ title: "Chat Reset", description: "History cleared successfully." });
  };

  const handleAcceptConsent = () => {
    setHasConsent(true);
    setShowConsent(false);
    localStorage.setItem("ovgweb_ai_consent", "true");
    if (messages.length === 0) {
      const welcome: ChatMessage = { id: Date.now().toString(), role: "ai", text: config.greeting, timestamp: Date.now() };
      saveMessages([welcome]);
      speak(config.greeting);
    }
  };

  const sendMessageDirect = async (userInputText: string) => {
    if (!hasConsent) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: userInputText, timestamp: Date.now() };
    const newMsgs = [...messages, userMsg];
    saveMessages(newMsgs);
    setInput("");
    setIsTyping(true);

    try {
      const response = await generateMockAIResponse(userInputText, messages);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: "ai", text: response, timestamp: Date.now() };
      saveMessages([...newMsgs, aiMsg]);
      speak(response);
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsTyping(false);
    }
  };

  // Auto greeting
  useEffect(() => {
    if (isOpen && messages.length === 0 && !hasGreeted && hasConsent) {
      setTimeout(() => {
        const welcome = { id: Date.now().toString(), role: "ai" as const, text: config.greeting, timestamp: Date.now() };
        saveMessages([welcome]);
        setHasGreeted(true);
        speak(config.greeting);
      }, 500);
    }
  }, [isOpen, messages.length, hasGreeted, speak, hasConsent, config.greeting]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const updatePrimaryColor = (color: string) => {
    setConfig(prev => ({ ...prev, primaryColor: color }));
    localStorage.setItem("ovg_primaryColor", color);
  };

  const colorPresets = ["#E91E63", "#C026D3", "#7C3AED", "#0EA5E9", "#14B8A6", "#F59E0B"];

  return (
    <>
      {/* Peek Teaser */}
      {!isOpen && (
        <div className="fixed bottom-24 right-6 z-50 max-w-xs rounded-2xl border border-white/30 bg-black/20 backdrop-blur-2xl p-5 text-white shadow-2xl">
          <p className="text-sm">{config.peekText}</p>
          <button onClick={() => setIsOpen(true)} className="mt-3 text-pink-400 hover:text-pink-300 font-medium">
            Chat with us →
          </button>
        </div>
      )}

      {/* MAIN CHAT WINDOW */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 z-[9999] w-[380px] md:w-[420px] rounded-3xl border-2 overflow-hidden shadow-2xl bg-black/10 backdrop-blur-2xl"
          style={{ borderColor: config.primaryColor }}
        >
          {/* Header */}
          <div 
            className="p-5 flex justify-between items-center"
            style={{ background: `linear-gradient(to right, ${config.primaryColor}, #1f2937)` }}
          >
            <div className="flex items-center gap-3">
              <img src={config.logo} alt={config.brandName} className="h-10 w-auto" />
              <h3 className="font-semibold text-white text-sm">{config.brandName}</h3>
            </div>

            {/* Color Picker */}
            <div 
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-8 h-8 rounded-full border-2 border-white/50 cursor-pointer shadow-inner"
              style={{ backgroundColor: config.primaryColor }}
            />

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setVoiceEnabled(!voiceEnabled)}>
                {voiceEnabled ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={resetChat}>
                <RefreshCw className="h-4 w-4 text-white" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-black/20 backdrop-blur-md min-h-[300px]">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-white text-black" : "bg-white/90 text-gray-900"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && <div className="text-pink-400 text-sm animate-pulse">Concierge is typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/20 bg-black/30 backdrop-blur-md">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-white/90 border border-white/30 text-black placeholder:text-gray-500 focus:border-pink-400"
                onKeyDown={e => e.key === "Enter" && sendMessageDirect(input)}
              />
              <Button 
                onClick={() => sendMessageDirect(input)}
                style={{ backgroundColor: config.primaryColor }}
                className="text-white px-6"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[10000] h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center"
          style={{ background: `linear-gradient(to bottom right, ${config.primaryColor}, #ff69b4)` }}
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </button>
      )}
    </>
  );
};

export default ChatWidget;