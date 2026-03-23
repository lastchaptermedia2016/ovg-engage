import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import headerBg from "@/assets/header-model.jpg";
import {
  MessageCircle, X, Send, Mic, MicOff, RefreshCw, Volume2, VolumeX, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import { generateAIResponse } from "@/lib/mock-ai"; 
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

interface WidgetConfig {
  logo?: string;
  brandName?: string;
  primaryColor?: string;
  greeting?: string;
  peekText?: string;
  businessContext?: string;
  ownerName?: string;
  phone?: string;
}

const defaultConfig: WidgetConfig = {
  logo: "/images/luxemedspa.svg",
  brandName: "The Luxe Med Spa",
  primaryColor: "rgb(189, 124, 151)",
  greeting: "Hi there! I'm your Luxe Med Spa concierge ✨ How can I help you book the perfect treatment today?",
  peekText: "Hey Gorgeous! Welcome to Luxe Med Spa, how can I help?",
  phone: "27760330046",
};

const ChatWidget = () => {
  const { toast } = useToast();
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const [config, setConfig] = useState<WidgetConfig>(() => {
    const saved = (window as any).ovgConfig || {};
    return { ...defaultConfig, ...saved };
  });

  const [isOpen, setIsOpen] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem("ovgweb_ai_consent") === "true");
  const [showPeek, setShowPeek] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem("ovgweb_chat_messages") || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem("ovgweb_voice_mute") !== "true");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Flashing mic prompt (disappears after first voice use)
  const [showMicPrompt, setShowMicPrompt] = useState(true);
  

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-send after voice finishes + hide prompt
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      const spokenText = transcript.trim();
      setInput(spokenText);

      setTimeout(() => {
        sendMessageDirect(spokenText);
        resetTranscript();
        setInput("");
        setShowMicPrompt(false);
      }, 80);
    }
  }, [isListening, transcript]);

  const openWhatsApp = useCallback((phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem("ovgweb_chat_messages");
    setShowResetConfirm(false);
    toast({ title: "Chat Reset", description: "History cleared successfully." });
  }, [toast]);

  // === YOUR ORIGINAL FULL VOICE FALLBACK + FIX FOR CUTOFF ===
  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    const keys = {
      groq: import.meta.env.VITE_GROQ_API_KEY,
      eleven: import.meta.env.VITE_ELEVENLABS_API_KEY,
      xai: import.meta.env.VITE_XAI_API_KEY,
    };

    const fetchWithTimeout = async (url: string, options: any, timeout = 3000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (e) { clearTimeout(id); throw e; }
    };

    let played = false;

    // 1. GROQ
    if (keys.groq) {
      try {
        const res = await fetchWithTimeout("https://api.groq.com/openai/v1/audio/speech", {
          method: "POST",
          headers: { "Authorization": `Bearer ${keys.groq}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "canopylabs/orpheus-v1-english", voice: "autumn", input: text.slice(0, 200), response_format: "wav" }),
        }, 1500);
        if (res.ok) {
          audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
          await audioRef.current.play();
          played = true;
        }
      } catch (e) { console.log("Groq failed..."); }
    }

    // 2. ELEVENLABS
    if (!played && keys.eleven) {
      try {
        const res = await fetchWithTimeout("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream", {
          method: "POST",
          headers: { "xi-api-key": keys.eleven, "Content-Type": "application/json" },
          body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
        }, 2500);
        if (res.ok) {
          audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
          await audioRef.current.play();
          played = true;
        }
      } catch (e) { console.log("ElevenLabs failed..."); }
    }

    // 3. xAI
    if (!played && keys.xai) {
      try {
        const res = await fetchWithTimeout("https://api.x.ai/v1/audio/speech", {
          method: "POST",
          headers: { "Authorization": `Bearer ${keys.xai}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "grok-beta", input: text, voice: "eve" }),
        }, 2000);
        if (res.ok) {
          audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
          await audioRef.current.play();
          played = true;
        }
      } catch (e) { console.log("xAI failed..."); }
    }

    // 4. BROWSER FALLBACK (always runs if others failed or Groq was short)
    if (!played || text.length > 180) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => 
        (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Emma")) && v.lang.startsWith("en")
      );
      if (premiumVoice) utterance.voice = premiumVoice;

      utterance.rate = 0.93;
      utterance.pitch = 1.04;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
      console.log("✅ Browser fallback voice started (Groq was cut off or failed)");
    }
  }, [voiceEnabled]);

  const sendMessageDirect = async (userInputText: string) => {
    if (!userInputText.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: userInputText, timestamp: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    localStorage.setItem("ovgweb_chat_messages", JSON.stringify(newMsgs));
    setInput("");
    setIsTyping(true);

    try {
      const response = await generateAIResponse(userInputText, newMsgs);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: "ai", text: response, timestamp: Date.now() };
      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      localStorage.setItem("ovgweb_chat_messages", JSON.stringify(finalMsgs));
      speak(response);
    } catch (e) {
      console.error("AI Error:", e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAcceptConsent = () => {
    setHasConsent(true);
    setShowConsent(false);
    localStorage.setItem("ovgweb_ai_consent", "true");
    if (messages.length === 0) {
      const welcome: ChatMessage = { id: Date.now().toString(), role: "ai", text: config.greeting || "", timestamp: Date.now() };
      setMessages([welcome]);
      speak(config.greeting || "");
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0 && !hasGreeted && hasConsent) {
      setHasGreeted(true);
      handleAcceptConsent();
    }
  }, [isOpen, messages.length, hasGreeted, hasConsent]);

  const handleOpenChat = () => {
    setShowPeek(false);
    if (!hasConsent) setShowConsent(true);
    else setIsOpen(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && !hasGreeted && !showConsent) setShowPeek(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen, hasGreeted, showConsent]);

  return (
    <>
      {/* Peek Teaser */}
      <AnimatePresence>
        {!isOpen && !showConsent && showPeek && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed bottom-24 right-6 z-[9998] max-w-[280px] rounded-2xl border border-pink-300/40 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-5 shadow-2xl">
            <button onClick={() => setShowPeek(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-sm text-white/90 leading-relaxed">{config.peekText}</p>
            <button onClick={handleOpenChat} className="mt-3 text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: config.primaryColor }}>
              Chat with us →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flashing Mic Prompt */}
      {showMicPrompt && !isListening && messages.length === 0 && (
        <div className="fixed bottom-40 right-8 z-[9997] text-center">
          <p className="text-pink-600 text-sm font-medium animate-pulse">
            Please click on the mic icon to speak to our AI concierge ✨
          </p>
        </div>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[9999] w-[380px] md:w-[420px] rounded-3xl border-2 overflow-hidden shadow-2xl bg-transparent" style={{ borderColor: config.primaryColor }}>
          {/* Header */}
          <div className="relative p-5 flex justify-between items-center overflow-hidden">
            <img src={headerBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative flex items-center gap-3">
              <img src={config.logo} alt={config.brandName} className="h-10 w-auto" />
              <div>
                <h3 className="font-semibold text-white text-sm">{config.brandName}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[11px] text-white/70 font-medium">Online now</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="relative flex items-center gap-2">
              <Button size="icon" className="h-8 w-8 rounded-full text-white shrink-0" style={{ backgroundColor: config.primaryColor }} onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                localStorage.setItem("ovgweb_voice_mute", next ? "" : "true");
                if (!next && audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                if (!next) window.speechSynthesis.cancel();
                toast({ title: next ? "Voice On" : "Voice Off", description: next ? "AI responses will be spoken aloud." : "AI voice muted." });
              }}>
                {voiceEnabled ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white" />}
              </Button>
              <Button size="icon" className="h-8 w-8 rounded-full text-white shrink-0" style={{ backgroundColor: config.primaryColor }} onClick={() => setShowResetConfirm(true)}>
                <RefreshCw className="h-4 w-4 text-white" />
              </Button>
              <Button size="icon" className="h-8 w-8 rounded-full text-white shrink-0" style={{ backgroundColor: config.primaryColor }} onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
          {/* Confirmation Dialog */}
{showResetConfirm && (
  <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 z-[60] backdrop-blur-sm rounded-lg">
    <div className="bg-white p-5 rounded-xl shadow-2xl border flex flex-col items-center text-center max-w-[80%]">
      <h3 className="font-bold text-gray-900">Reset Chat?</h3>
      <p className="text-sm text-gray-500 mt-1">This will delete all messages.</p>
      
      <div className="flex gap-3 mt-4 w-full">
        <Button 
          variant="outline" 
          className="flex-1 text-xs" 
          onClick={() => setShowResetConfirm(false)}
        >
          Cancel
        </Button>
        <Button 
          className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white" 
          onClick={resetChat} // This "reads" the resetChat function
        >
          Confirm
        </Button>
      </div>
    </div>
  </div>
)}


          {/* Messages Area */}
          <div className="overflow-y-auto p-4 space-y-2 bg-transparent h-[320px]">
            {messages.map((msg) => {
              const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`relative max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed shadow-sm backdrop-blur-sm border-2 border-pink-400/70 ${isUser ? "bg-[#dcf8c6]/90 text-pink-900 rounded-tr-none" : "bg-white/85 text-pink-900 rounded-tl-none"}`}>
                    <span>{msg.text}</span>
                    <span className="ml-2 inline-flex items-end float-right text-[10px] text-gray-500 mt-1 pl-2 leading-none whitespace-nowrap">
                      {time}
                    </span>
                  </div>
                </div>
              );
            })}
            {isTyping && <div className="text-pink-500 text-sm animate-pulse px-2">Concierge is typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input / Footer Area */}
          <div className="relative p-4 border-t border-gray-300/50 overflow-hidden">
            <img src={headerBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/40" />
            
            <div className="relative flex gap-2 items-center">
              {isSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => isListening ? stopListening() : startListening()}
                  className={`shrink-0 ${isListening ? "text-blue-500 animate-pulse scale-110" : "text-pink-500 hover:text-pink-600"}`}
                >
                  {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
              )}

              <Input
                value={isListening ? transcript || input : input}
                onChange={e => { if (!isListening) setInput(e.target.value); }}
                placeholder={isListening ? "Listening… speak now" : "Type your message..."}
                className="flex-1 bg-white/90 border border-gray-300 text-black"
                onKeyDown={e => e.key === "Enter" && sendMessageDirect(input)}
              />

              <Button 
                onClick={() => sendMessageDirect(input)}
                style={{ backgroundColor: config.primaryColor }}
                className="text-white px-4 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bubble */}
      {!isOpen && !showConsent && (
        <button
          onClick={handleOpenChat}
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