import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import headerBg from "@/assets/header-model.jpg";
import {
  MessageCircle, X, Send, Mic, MicOff, RefreshCw, Volume2, VolumeX, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
  const [hasGreeted, setHasGreeted] = useState(false);        // ← Fixed: now declared
  // isListening now comes from useSpeechRecognition hook
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
  const message = `Hello ${booking.title} ${booking.lastName}, your bespoke ${booking.treatment} ($${booking.price}) at The Luxe Med Spa is confirmed for ${booking.timestamp}. We have your ${booking.refreshment} ready for your arrival. See you in the sanctuary!`;
  
  // Skep die skakel (verwyder alle spasies uit die foonnommer)
  const cleanPhone = booking.phone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me{cleanPhone}?text=${encodeURIComponent(message)}`;
  
  // Vir nou log ons dit net in die console sodat Jill dit kan sien
  console.log("📱 Luxe WhatsApp Link Generated:", whatsappUrl);
  
  // AS JY DIT OUTOMATIES WIL OOPMAAK:
  // window.open(whatsappUrl, '_blank');
};

  // --- JILL'S REVENUE LOGGING - LUXE PERSISTENT ENGINE (v2.2 FINAL) ---
const logBookingForJill = (aiResponse: string, userInputText: string) => {
  const sourceText = (userInputText || "") + " " + (aiResponse || "");
  
  const forbiddenNames = ["Hydra", "Facial", "Luxe", "The", "Med", "Spa", "Service", "Clinic", "Booking", "Wednesday", "Thursday", "Friday", "I'm", "sure", "you'll", "fresh", "cup", "note", "confirmed", "booked", "reserved", "treatment", "session", "Botox", "Filler"];

  // 1. NAME EXTRACTION (Hanteer kleinletters en titels)
  const nameMatch = sourceText.match(/(my name is|I am|I'm|Mr|Mrs|Ms|Miss|Dr)[.,\s]*([a-zA-Z]+)(?:\s+([a-zA-Z]+))?/i);
  
  if (nameMatch) {
    const rawFirst = nameMatch[2];
    const rawLast = nameMatch[3] || "Client";

    if (!forbiddenNames.some(f => f.toLowerCase() === rawFirst.toLowerCase())) {
      let finalTitle = "Client";
      const possibleTitles = ["Mr", "Mrs", "Ms", "Miss", "Dr"];
      if (possibleTitles.some(t => nameMatch[1].toLowerCase().includes(t.toLowerCase()))) {
        const tMatch = nameMatch[1].match(/(Mr|Mrs|Ms|Miss|Dr)/i);
        finalTitle = tMatch ? (tMatch[0].charAt(0).toUpperCase() + tMatch[0].slice(1).toLowerCase() + ".") : "Client";
      }

      const extracted = {
        title: finalTitle,
        first: rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase(),
        last: rawLast !== "Client" ? rawLast.charAt(0).toUpperCase() + rawLast.slice(1).toLowerCase() : "Client"
      };
      localStorage.setItem("luxe_temp_name", JSON.stringify(extracted));
    }
  }

  // 2. DRINK MEMORY (Bêre in Vault)
  const drinkRegex = /(mocha latte|orange juice|black coffee|herbal tea|mocha|latte|coffee|tea|water|juice|champagne|citrus|chamomile)/i;
  const clientChoice = (userInputText || "").match(drinkRegex);
  const generalMatch = sourceText.match(drinkRegex);

  if (clientChoice) {
    localStorage.setItem("luxe_temp_drink", clientChoice[0]);
  } else if (generalMatch && !localStorage.getItem("luxe_temp_drink")) {
    localStorage.setItem("luxe_temp_drink", generalMatch[0]);
  }

    // 3. KRITIEKE VEILIGHEID (Die "Luxe" Meester-Trigger)
  const priceMatch = sourceText.match(/\$(\d{1,3}(?:,\d{3})*|\d+)/);
  const detectedPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;

  // Ons soek nou vir die amptelike sein OF die algemene bevestiging as fallback
  const isFinal = /officially confirmed|confirmed|reserved|booked|scheduled|to confirm/i.test(sourceText);

  // AS DAAR GEEN PRYS OF SEIN IS NIE, STOP (Wag vir die AI se finale sin)
  if (!detectedPrice || !isFinal) {
    console.log("⏳ Luxe Shield: Waiting for final confirmation signal...");
    return;
  }


  // 4. HAAL DATA UIT VAULT (Slegs een keer gedeclareer)
  const savedName = JSON.parse(localStorage.getItem("luxe_temp_name") || '{"title":"Client","first":"Guest","last":"Client"}');
  const finalRefreshment = localStorage.getItem("luxe_temp_drink") || "Standard Water";

  // 5. SHIELD (Duplikaat-beskerming)
  const txId = `${savedName.last}-${detectedPrice}`.toLowerCase();
  if (localStorage.getItem("luxe_last_tx") === txId) return;
  localStorage.setItem("luxe_last_tx", txId);

   // 6. KONTAK & STATUS (Luxe Assumption & Alignment Fix)
const rawStats = localStorage.getItem("luxe_live_stats");
const prev = rawStats ? JSON.parse(rawStats) : { totalRevenue: 0, totalBookings: 0, bookings: [] };

// 1. Telefoonnommer-isolasie (Regex versterk)
const phoneMatch = sourceText.match(/(\d{10})|(\+?\d{1,4}[-.\s]?\d{2,4}[-.\s]?\d{3}[-.\s]?\d{3,4})/);
const extractedPhone = phoneMatch ? (phoneMatch[0] || "No Number").trim() : "No Number";

// 2. Luxe Assumption Logic: Almal is VIP/Returning tensy hulle sê dis hul 1ste keer
const isExplicitlyNew = /first|new|never been|first visit|going there for the first time|it will be the 1st/i.test(sourceText);
const finalStatus = isExplicitlyNew ? "New" : "Returning";

const newEntry = {
  id: Date.now(),
  title: savedName.title || "Miss.",
  firstName: savedName.first || "Guest",
  lastName: savedName.last || "Client",
  refreshment: String(finalRefreshment || "Water").trim(),
  phone: extractedPhone, // Hou dit in sy eie veld
  status: finalStatus,   // Gebruik nou ons slim aanname
  treatment: sourceText.match(/(HydraFacial|Botox|Filler|Laser|Peel|Hydra facial)/i)?.[0] || "Consultation",
  price: Number(detectedPrice) || 0,
  // Maak seker die timestamp is altyd 'n string sodat die kolom nie leeg lyk nie
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
  email: sourceText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)?.[0] || "No Email"
};
 

// 7. STOOR & UPDATE (Skoon Data)
const updatedBookings = [newEntry, ...(prev.bookings || [])].slice(0, 25);

localStorage.setItem("luxe_live_stats", JSON.stringify({
  ...prev,
  totalRevenue: (Number(prev.totalRevenue) || 0) + newEntry.price,
  totalBookings: (Number(prev.totalBookings) || 0) + 1,
  bookings: updatedBookings,
  lastBooking: newEntry
}));

// Belangrik: Maak seker jou UI-render funksie lees 'newEntry.phone' en 'newEntry.timestamp' apart!
window.dispatchEvent(new Event('luxe_update'));

if (typeof sendLuxeConfirmation === 'function') {
  sendLuxeConfirmation(newEntry);
}

localStorage.removeItem("luxe_temp_drink");
console.log("💎 Luxe Entry Fixed:", newEntry);
};













// --- AUTO-SCROLL (Jou bestaande kode volg hier onder) ---
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

    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = "visible";
      document.body.style.touchAction = "auto";
    };
  }, [isOpen]);

  // --- WHATSAPP HELPER ---
const openWhatsApp = useCallback((phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, ""); 
  // Voeg die $ voor {cleanPhone} by:
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

    // --- TOP-TIER INSERT START: EMERGENCY BYPASS ---
    // Change this to 'true' only when your API credits/tokens are restored.
    const useExternalAPIs = false; 

        if (!useExternalAPIs) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
      const v = window.speechSynthesis.getVoices();
      u.voice = v.find(s => s.name.includes("Google") || s.name.includes("Samantha")) || v[0];
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
      
      console.log("✅ Emergency Bypass: Speaking via Browser Fallback");

      return; // Exit here so it doesn't wait for failing APIs
    }

    // --- TOP-TIER INSERT END ---

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




  // --- SEND MESSAGE (Fixes Error 402, 426, 446) ---
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
    const response = await generateAIResponse(userInputText, newMsgs);
    
    const aiMsg: ChatMessage = { 
      id: (Date.now() + 1).toString(), 
      role: "ai", 
      text: response, 
      timestamp: Date.now() 
    };
    
    const finalMsgs = [...newMsgs, aiMsg];
    setMessages(finalMsgs);
    localStorage.setItem("ovgweb_chat_messages", JSON.stringify(finalMsgs));
    
    speak(response);

    // ✅ FIXED CALL - now passes both AI response AND user input
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
    className="fixed bottom-6 right-4 sm:right-6 z-[9999] 
               w-[92vw] max-w-[380px] sm:max-w-[420px] 
               rounded-3xl border-2 overflow-hidden shadow-2xl bg-transparent"
    style={{ borderColor: config.primaryColor }}
  >
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

          {/* Messages */}
          <div className="overflow-y-auto p-4 space-y-2 bg-transparent h-[320px]">
            {messages.map((msg) => {
              const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed shadow-sm backdrop-blur-sm border-2 border-pink-400/70 ${
                      isUser
                        ? "bg-[#dcf8c6]/90 text-pink-900 rounded-tr-none"
                        : "bg-white/85 text-pink-900 rounded-tl-none"
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
                        {/* Quick-reply buttons & WhatsApp */}
            {messages.length <= 1 && !isTyping && (
              <div className="flex flex-wrap gap-2 px-1 pt-2">
                {["Book a treatment", "I need prices"].map((label) => (
                  <button
                    key={label}
                    onClick={() => sendMessageDirect(label)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-pink-300/60 bg-white/70 backdrop-blur-sm text-gray-800 hover:bg-pink-200/80 transition-colors shadow-sm"
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
};


export default ChatWidget;