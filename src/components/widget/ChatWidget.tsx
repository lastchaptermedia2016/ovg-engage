import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Mic, MicOff, RefreshCw, Volume2, VolumeX, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { generateMockAIResponse, type ChatMessage } from "@/lib/mock-ai";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

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
  const [hasGreeted, setHasGreeted] = useState(false);        // ← Fixed: now declared
  // isListening now comes from useSpeechRecognition hook
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

  // Show peek teaser after 3s if chat not open
  useEffect(() => {
    if (!isOpen && !showPeek) {
      const timer = setTimeout(() => setShowPeek(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showPeek]);

  // Handle opening chat — show consent if not yet accepted
  const handleOpenChat = () => {
    setShowPeek(false);
    if (!hasConsent) {
      setShowConsent(true);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* ===== PEEK TEASER ===== */}
      <AnimatePresence>
        {!isOpen && !showConsent && showPeek && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="fixed bottom-24 right-6 z-[9998] max-w-[280px] rounded-2xl border border-pink-300/40 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-5 shadow-2xl"
          >
            <button
              onClick={() => setShowPeek(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-sm text-white/90 leading-relaxed">{config.peekText}</p>
            <button
              onClick={handleOpenChat}
              className="mt-3 text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ color: config.primaryColor }}
            >
              Chat with us →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CONSENT MODAL ===== */}
      <AnimatePresence>
        {showConsent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="mx-4 w-full max-w-sm rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Before we chat…</h3>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed mb-2">
                This AI concierge is powered by artificial intelligence. By continuing you agree to our:
              </p>
              <ul className="text-xs text-gray-400 space-y-1 mb-5 ml-4 list-disc">
                <li>Terms &amp; Conditions</li>
                <li>Privacy Policy</li>
                <li>AI-generated responses disclaimer</li>
              </ul>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => setShowConsent(false)}
                >
                  Decline
                </Button>
                <Button
                  className="flex-1 text-white font-semibold"
                  style={{ backgroundColor: config.primaryColor }}
                  onClick={() => {
                    handleAcceptConsent();
                    setIsOpen(true);
                  }}
                >
                  I Agree ✨
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MAIN CHAT WINDOW ===== */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 z-[9999] w-[380px] md:w-[420px] rounded-3xl border-2 overflow-hidden shadow-2xl bg-black/20 backdrop-blur-md"
          style={{ borderColor: config.primaryColor }}
        >
          {/* Header */}
          <div className="p-5 flex justify-between items-center bg-gradient-to-b from-gray-200 to-gray-400">
            <div className="flex items-center gap-3">
              <img src={config.logo} alt={config.brandName} className="h-10 w-auto" />
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">{config.brandName}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">Online now</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const next = !voiceEnabled;
                  setVoiceEnabled(next);
                  localStorage.setItem("ovgweb_voice_mute", next ? "" : "true");
                  if (!next && audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                  if (!next) window.speechSynthesis.cancel();
                  toast({ title: next ? "Voice On" : "Voice Off", description: next ? "AI responses will be spoken aloud." : "AI voice muted." });
                }}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4 text-gray-700" /> : <VolumeX className="h-4 w-4 text-gray-700" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={resetChat}>
                <RefreshCw className="h-4 w-4 text-gray-700" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4 text-gray-700" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="overflow-y-auto p-4 space-y-2 bg-transparent h-[320px]">
            {messages.map((msg) => {
              const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed shadow-sm backdrop-blur-sm ${
                      isUser
                        ? "bg-[#dcf8c6]/90 text-gray-900 rounded-tr-none"
                        : "bg-white/85 text-gray-900 rounded-tl-none"
                    }`}
                  >
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

          {/* Input / Footer */}
          <div className="p-4 border-t border-gray-300 bg-gradient-to-b from-gray-300 to-gray-500">
            <div className="flex gap-2 items-center">
              <Input
                value={isListening ? transcript || input : input}
                onChange={e => { if (!isListening) setInput(e.target.value); }}
                placeholder={isListening ? "Listening..." : "Type your message..."}
                className="flex-1 bg-white/90 border border-gray-300 text-black placeholder:text-gray-500 focus:border-pink-400"
                onKeyDown={e => e.key === "Enter" && !isListening && sendMessageDirect(input)}
              />
              {isSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                      const text = transcript.trim();
                      if (text) {
                        setInput(text);
                        resetTranscript();
                        sendMessageDirect(text);
                      }
                    } else {
                      startListening();
                    }
                  }}
                  className={`shrink-0 ${isListening ? "text-red-500 animate-pulse" : "text-gray-600"}`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
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

      {/* ===== FLOATING BUBBLE ===== */}
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