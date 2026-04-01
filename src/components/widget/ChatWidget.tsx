import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import headerBg from "@/assets/header-model.jpg";
import {
  MessageCircle, X, Send, Mic, MicOff, RefreshCw, Volume2, VolumeX, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ZillionConfig } from '../../ZillionConfig';

// Fixed: Importing type from mock-ai to break circular dependency
import { generateAIResponse, type ChatMessage } from "@/lib/mock-ai"; 
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

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

// 💎 Zillion Engine Integration - Luxe High-End Spa Theme
const defaultConfig: WidgetConfig = {
  logo: headerBg, // Gebruik jou ingevoerde headerBg image
  brandName: "The Luxe Med Spa - New Haven", // Updated with location
  // Luxe Rose Gold gradient for high-end spa feel
  primaryColor: "#be185d", // Deep rose pink - more luxurious
  
  // Maak die groetboodskap ook industrie-onafhanklik
  greeting: `Welcome to The Luxe Med Spa ✨ My name is Kim, I'm your personal concierge. How can I help you book your perfect treatment today?`,
  peekText: `Your sanctuary awaits... How may we pamper you today?`,
  
  // Gebruik die foonnommer uit die config as jy dit daar bygevoeg het
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
  
  // 💎 ADDED: VIP Status Indicator State
  const [showSyncBadge, setShowSyncBadge] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem("ovgweb_chat_messages") || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem("ovgweb_voice_mute") !== "true");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 1. LUXE MESSAGE NOTIFICATION ENGINE ---
  const sendLuxeConfirmation = (booking: any) => {
    // Ons bou 'n VIP-geformateerde boodskap vir WhatsApp/SMS
    const message = `Hello ${booking.title} ${booking.lastName}, your bespoke ${booking.treatment} ($${booking.price}) at The Luxe Med Spa is confirmed for ${booking.time}. We have your ${booking.refreshment} ready for your arrival. See you in the sanctuary!`;
    
    // Skep die skakel (verwyder alle spasies uit die foonnommer)
    const cleanPhone = booking.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // Vir nou log ons dit net in die console sodat Jill dit kan sien
    console.log("📱 Luxe WhatsApp Link Generated:", whatsappUrl);
  };

  // --- JILL'S REVENUE LOGGING - LUXE PERSISTENT ENGINE (v2.3 - JSON SUPPORT) ---
const logBookingForJill = (aiResponse: string, userInputText: string) => {
  
  // === NEW: CHECK FOR STRUCTURED JSON FROM AI (supports both formats) ===
  // Format 1: ```json ... ```
  // Format 2: [JSON CODE BLOCK] ... [/JSON CODE BLOCK]
  const jsonMatchBacktick = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonMatchBracket = aiResponse.match(/\[JSON CODE BLOCK\]\s*([\s\S]*?)\s*\[\/JSON CODE BLOCK\]/);
  
  const jsonMatch = jsonMatchBacktick || jsonMatchBracket;

  if (jsonMatch) {
    try {
      const leadData = JSON.parse(jsonMatch[1]);

      // If it's our finalize_lead action → save it properly
      if (leadData.action === "finalize_lead") {
        
        const newEntry = {
          id: Date.now().toString(),
          title: leadData.title || "Miss.",
          firstName: leadData.firstName || "Guest",
          lastName: leadData.surname || "Client",
          refreshment: leadData.preferredDrink || "Water",
          phone: leadData.phone || "No Number",
          email: leadData.email || "No Email",
          // AdminDashboard expects 'isNew' boolean, not 'status' string
          isNew: leadData.clientType !== "Return",
          // AdminDashboard expects 'time' not 'timestamp'
          time: new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          }),
          treatment: leadData.treatment || "Consultation",
          price: Number(leadData.price) || 0,
          source: "ovg-engage"
        };

        // Save to localStorage (Jill's console)
        const rawStats = localStorage.getItem("luxe_live_stats");
        const prev = rawStats ? JSON.parse(rawStats) : { 
          totalRevenue: 0, 
          totalBookings: 0, 
          bookings: [] 
        };

        const updatedBookings = [newEntry, ...(prev.bookings || [])].slice(0, 25);

        localStorage.setItem("luxe_live_stats", JSON.stringify({
          ...prev,
          totalRevenue: (Number(prev.totalRevenue) || 0) + newEntry.price,
          totalBookings: (Number(prev.totalBookings) || 0) + 1,
          bookings: updatedBookings,
          lastBooking: newEntry
        }));

        console.log("✅ SUCCESS: Lead captured via JSON from ovg-engage", newEntry);
        
        setShowSyncBadge(true);
        setTimeout(() => setShowSyncBadge(false), 4500);
        
        window.dispatchEvent(new Event('luxe_update'));

        if (typeof sendLuxeConfirmation === 'function') {
          sendLuxeConfirmation(newEntry);
        }

        // Clear temp storage
        localStorage.removeItem("luxe_temp_name");
        localStorage.removeItem("luxe_temp_drink");
        return;   // ← Important: Exit early, no need to run old logic
      }
    } catch (error) {
      console.error("❌ Failed to parse JSON from AI:", error);
    }
  }

  // === FALLBACK: Keep your old logic for safety (in case JSON fails) ===
  console.log("⏳ No JSON found - falling back to legacy detection...");
  
  // (Your original code can stay here if you want a safety net)
  // ... paste your original logBookingForJill code here if desired ...
};

  // --- AUTO-SCROLL ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-send after voice input finishes
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      const spokenText = transcript.trim();
      setInput(spokenText);
      
      setTimeout(() => {
        sendMessageDirect(spokenText);
        resetTranscript();
        setInput("");
      }, 50);
    }
  }, [isListening, transcript]);

  // === DISABLE BODY SCROLL WHEN CHAT IS OPEN (Mobile Fix) ===
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "visible";
      document.body.style.touchAction = "auto";
    }

    return () => {
      document.body.style.overflow = "visible";
      document.body.style.touchAction = "auto";
    };
  }, [isOpen]);

  // --- WHATSAPP HELPER ---
  const openWhatsApp = useCallback((phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, ""); 
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }, []);

  // --- RESET CHAT ---
  const resetChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem("ovgweb_chat_messages");
    setShowResetConfirm(false);
    toast({ title: "Chat Reset", description: "History cleared successfully." });
  }, [toast]);

  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    const useExternalAPIs = false; 

    if (!useExternalAPIs) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
      const v = window.speechSynthesis.getVoices();
      u.voice = v.find(s => s.name.includes("Google") || s.name.includes("Samantha")) || v[0];
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
      console.log("✅ Emergency Bypass: Speaking via Browser Fallback");
      return;
    }

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

                    // 4. BROWSER FALLBACK - Forced Luxe Selection
    window.speechSynthesis.cancel(); 

    let voices = window.speechSynthesis.getVoices();
    
    const getBestFemaleVoice = (v: SpeechSynthesisVoice[]) => {
      return v.find(s => 
        s.lang.startsWith("en") && 
        (s.name.includes("Google US English") || 
         s.name.includes("Samantha") || 
         s.name.includes("Natural") || 
         s.name.includes("Aria") || 
         s.name.includes("Zira") || 
         s.name.includes("Female"))
      ) || v.find(s => s.lang.startsWith("en")) || v[0];
    };

    const premiumVoice = getBestFemaleVoice(voices);
    
    // --- ONS ROEP NIE HIER 'SPEAK' NIE, ONS STEL NET DIE PARAMETERS OP ---
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
    if (premiumVoice) {
      utterance.voice = premiumVoice;
      console.log("🔊 Geselekteerde Stem: " + premiumVoice.name);
    }
    utterance.rate = 0.82;   
    utterance.pitch = 1.08;  
    utterance.volume = 1.0;
    utterance.lang = "en-US"; 

    // --- LOGIKA VIR LANK VS KORT BOODSKAPPE ---
    if (text.length > 180) {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        const u = new SpeechSynthesisUtterance(trimmedSentence);
        if (premiumVoice) u.voice = premiumVoice;
        u.rate = 0.82; 
        u.pitch = 1.08;
        u.volume = 1.0;
        u.lang = "en-US";

        const r = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(r);
          } else {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);

        await new Promise<void>((resolve) => {
          u.onend = () => {
            if (r) clearInterval(r);
            resolve(); 
          };
          u.onerror = (error) => {
            if (r) clearInterval(r);
            console.error("TTS Fout:", error);
            resolve(); 
          };
          window.speechSynthesis.speak(u); // PRAAT HIER VIR LANG TEKS
        });
      }
    } else {
      window.speechSynthesis.speak(utterance); // PRAAT HIER VIR KORT TEKS
    }

    console.log("✅ Browser fallback voice started with single female voice");
  }, [voiceEnabled]);




  // --- STRIP JSON FROM AI RESPONSE (Hide technical data from user) ---
  const stripJsonFromResponse = (text: string): string => {
    // Remove code blocks with json marker
    let cleaned = text.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
    // Remove code blocks without marker (just ``` ... ```)
    cleaned = cleaned.replace(/```\s*[\s\S]*?\s*```/g, '').trim();
    // Remove [START JSON BLOCK] ... [END JSON BLOCK] format
    cleaned = cleaned.replace(/\[START JSON BLOCK\]\s*[\s\S]*?\s*\[END JSON BLOCK\]/g, '').trim();
    // Remove [JSON CODE BLOCK] ... [/JSON CODE BLOCK] format
    cleaned = cleaned.replace(/\[JSON CODE BLOCK\]\s*[\s\S]*?\s*\[\/JSON CODE BLOCK\]/g, '').trim();
    // Remove standalone JSON objects that might not be in code blocks
    cleaned = cleaned.replace(/\{\s*"action"\s*:\s*"finalize_lead"[\s\S]*?\}/g, '').trim();
    // Clean up any extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  };

  // --- SEND MESSAGE (With VIP Verbal Confirmation & Sync) ---
  const sendMessageDirect = async (userInputText: string) => {
    if (!userInputText.trim()) return;

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: "user", 
      text: userInputText, 
      timestamp: Date.now() 
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    localStorage.setItem("ovgweb_chat_messages", JSON.stringify(newMsgs));
    setInput("");
    setIsTyping(true);

    try {
      let response = await generateAIResponse(userInputText, newMsgs);
      
      // 💎 AI VERBAL OVERRIDE: Add the "Synced" phrase ONLY if a booking is confirmed via JSON
      // Check if response contains the finalize_lead JSON (actual booking confirmation) - supports both formats
      const hasBookingJsonBacktick = /```json\s*[\s\S]*?"action"\s*:\s*"finalize_lead"[\s\S]*?```/.test(response);
      const hasBookingJsonBracket = /\[JSON CODE BLOCK\]\s*[\s\S]*?"action"\s*:\s*"finalize_lead"[\s\S]*?\[\/JSON CODE BLOCK\]/.test(response);
      const hasBookingJson = hasBookingJsonBacktick || hasBookingJsonBracket;
      
      if (hasBookingJson && !response.includes("VIP booking is synced")) {
        response += " Your VIP booking is now synced to our Sanctuary stream.";
      }

      // Strip JSON from display (but keep it for logBookingForJill to process)
      const displayResponse = stripJsonFromResponse(response);

      const aiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: "ai", 
        text: displayResponse, 
        timestamp: Date.now() 
      };
      
      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      localStorage.setItem("ovgweb_chat_messages", JSON.stringify(finalMsgs));
      
      // ✅ This now speaks the sync confirmation aloud (with JSON stripped)
      speak(displayResponse);

      // ✅ Logs to Jill's dashboard & triggers the emerald badge (with full response including JSON)
      logBookingForJill(response, userInputText);

    } catch (e) {
      console.error("AI Error:", e);
      toast({ 
        title: "Concierge Error", 
        description: "I'm having trouble connecting. Please try again.", 
        variant: "destructive" 
      });
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
    // 1. Skud die blaaier wakker vir klank (The "Unlocker")
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const unlock = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(unlock);
    }

    // 2. Maak die chat oop
    setShowPeek(false);
    if (!hasConsent) {
      setShowConsent(true);
    } else {
      setIsOpen(true);
    }
  };

    // --- AUTO-SHOW PEEK TIMER ---
  useEffect(() => {
    // Wys die "Peek" borrel na 3 sekondes as die chat nog toe is
    const timer = setTimeout(() => {
      if (!isOpen && !hasGreeted && !showConsent) {
        setShowPeek(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen, hasGreeted, showConsent]);


  // --- YOUR GOOD UI STARTS BELOW ---

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

      {/* ===== RESET CONFIRM POPUP ===== */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="fixed bottom-24 right-6 z-[10002] max-w-[280px] rounded-2xl border border-pink-300/40 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-5 shadow-2xl"
          >
            <button
              onClick={() => setShowResetConfirm(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-sm text-white/90 leading-relaxed">Are you sure you want to reset the chat? This will clear all messages.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={resetChat}
                className="text-sm font-semibold hover:opacity-80 transition-opacity"
                style={{ color: config.primaryColor }}
              >
                Reset Chat →
              </button>
            </div>
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
          // Mobile-first responsive design - optimized for all devices
          // Uses safe-area-inset for notched phones (iPhone X+, Samsung with notches)
          className="fixed z-[9999] 
                     bottom-[max(1.5rem,env(safe-area-inset-bottom))] 
                     right-[max(1rem,env(safe-area-inset-right))]
                     w-[94vw] max-w-[380px] sm:max-w-[420px] 
                     rounded-3xl border-2 overflow-hidden shadow-2xl bg-transparent"
          style={{ borderColor: config.primaryColor }}
        >
          {/* Header */}
          <div className="relative p-5 flex justify-between items-center overflow-hidden">
            <img src={headerBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative flex items-center gap-3">
              {/* Logo - Use luxemedspa.svg from public/images */}
              <img 
                src="/images/luxemedspa.svg" 
                alt={config.brandName} 
                className="h-10 w-auto object-contain"
              />
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
              <Button
                size="icon"
                className="h-8 w-8 rounded-full text-white shrink-0"
                style={{ backgroundColor: config.primaryColor }}
                onClick={() => {
                  const next = !voiceEnabled;
                  setVoiceEnabled(next);
                  localStorage.setItem("ovgweb_voice_mute", next ? "" : "true");
                  if (!next && audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                  if (!next) window.speechSynthesis.cancel();
                  toast({ title: next ? "Voice On" : "Voice Off", description: next ? "AI responses will be spoken aloud." : "AI voice muted." });
                }}
              >
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

          {/* Messages - Responsive height for all screen sizes */}
          {/* Uses viewport height units for better mobile experience */}
          <div className="relative overflow-y-auto p-4 space-y-2 bg-transparent h-[40vh] sm:h-[320px] max-h-[450px]">
            
            {/* 💎 UPDATED BADGE PLACEMENT */}
<AnimatePresence>
  {showSyncBadge && (
    <motion.div 
      initial={{ y: -50, opacity: 0 }} 
      animate={{ y: 10, opacity: 1 }} // Moved down slightly to y: 10
      exit={{ y: -20, opacity: 0 }} 
      className="absolute left-1/2 -translate-x-1/2 z-[9999] w-[90%] pointer-events-none"
    >
      <div className="bg-emerald-600 text-white text-[10px] font-bold py-2 px-4 rounded-full shadow-2xl flex items-center justify-center gap-2 border border-white/30 backdrop-blur-md">
        <ShieldCheck className="h-3.5 w-3.5 animate-pulse" /> 
        VIP BOOKING SECURED • SYNCED TO SANCTUARY
      </div>
    </motion.div>
  )}
</AnimatePresence>

            {messages.map((msg) => {
              const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed backdrop-blur-md border-b-2 ${
                      isUser
                        ? "bg-gradient-to-br from-pink-100/95 to-pink-50/95 text-amber-800 rounded-tr-sm border-b-pink-400 shadow-lg shadow-pink-100/30"
                        : "bg-gradient-to-br from-white/95 to-gray-50/95 text-amber-800 rounded-tl-sm border-b-pink-400 shadow-lg shadow-gray-100/30"
                    }`}
                  >
                    <span className="font-light">{msg.text}</span>
                    <span className="ml-2 inline-flex items-end float-right text-[9px] text-amber-600/70 mt-1.5 pl-2 leading-none whitespace-nowrap font-mono">
                      {time}
                    </span>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="px-2 py-3">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-light">
                  <span className="animate-pulse">Concierge is typing</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                  <span className="animate-bounce delay-300">.</span>
                </div>
                {/* Google Gemini-style rainbow line (pink and gold) */}
                <div className="mt-2 h-1 rounded-full overflow-hidden">
                  <div className="h-full w-full animate-pulse bg-gradient-to-r from-pink-400 via-amber-400 to-pink-400 bg-[length:200%_100%]"></div>
                </div>
              </div>
            )}
            
            {/* Microphone Hint Message */}
            {messages.length <= 1 && !isTyping && isSupported && (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-pink-600 bg-pink-50/80 rounded-lg backdrop-blur-sm border border-pink-200/50">
                <Mic className="h-3.5 w-3.5" />
                <span>Click the mic icon to speak to us</span>
              </div>
            )}

            {/* Quick-reply buttons & WhatsApp */}
            {messages.length <= 2 && !isTyping && (
              <div className="flex flex-wrap gap-2 px-1 pt-2">
                {["Book a treatment", "I need prices"].map((label) => (
                  <button
                    key={label}
                    onClick={() => sendMessageDirect(label)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-pink-400/60 bg-pink-50/70 backdrop-blur-sm text-pink-700 hover:bg-pink-100/80 transition-colors shadow-sm"
                  >
                    {label}
                  </button>
                ))}
                
                <button
                  onClick={() => openWhatsApp(config.phone || "27760330046", "Hi Luxe Med Spa, I'd like to speak to a consultant.")}
                  className="px-3 py-1.5 text-xs font-bold rounded-full border border-green-400/50 bg-green-50 text-green-700 hover:bg-green-100 transition-colors shadow-sm flex items-center gap-1"
                >
                  💬 Speak to a consultant
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

                    {/* Input / Footer Area */}
          <div className="relative p-4 border-t border-gray-300/50 overflow-hidden">
            <img src={headerBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/40" />
            
            <div className="relative flex gap-2 items-center">
              {/* Microphone Button */}

              {/* Microphone Button */}
{isSupported && (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    }}
    className={`shrink-0 ${isListening ? "text-blue-500 animate-pulse scale-110" : "text-pink-500 hover:text-pink-600"}`}
  >
    {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
  </Button>
)}
          
              
 
              {/* Text Input */}
              <Input
                value={isListening ? transcript || input : input}
                onChange={e => { if (!isListening) setInput(e.target.value); }}
                placeholder={isListening ? "Listening… speak now" : "Type your message..."}
                className="flex-1 bg-white/90 border border-gray-300 text-black"
                onKeyDown={e => e.key === "Enter" && sendMessageDirect(input)}
              />

              {/* Send Button */}
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
}; // <--- This closes the 'const ChatWidget = ...' function

export default ChatWidget;