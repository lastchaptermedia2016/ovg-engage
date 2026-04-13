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
// OmniVerge Global AI
import { generateOmniVergeResponse as generateOmniVergeAI } from "@/lib/omniverge-ai";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

// 🎨 Whitelabel Widget Configuration Interface
interface WidgetConfig {
  // Branding
  logo?: string;
  logoUrl?: string; // External URL alternative
  brandName?: string;
  primaryColor?: string;
  aiName?: string; // AI assistant name
  
  // Messaging
  greeting?: string;
  peekText?: string;
  syncBadgeText?: string; // Custom sync badge text
  
  // Business Info
  businessContext?: string;
  ownerName?: string;
  phone?: string;
  whatsappMessageTemplate?: string; // Custom WhatsApp message template
  
  // Advanced
  allowedDomains?: string[];
  headerImage?: string; // Custom header background image URL
}

// 💎 Zillion Engine Integration - Luxe High-End Spa Theme (DEFAULTS)
// These defaults create the Luxe Med Spa look & feel, but are fully overridable
const defaultConfig: WidgetConfig = {
  logo: "/images/luxemedspa.svg",
  brandName: "The Luxe Med Spa - New Haven",
  primaryColor: "#be185d",
  aiName: "Kim",
  greeting: `Welcome to The Luxe Med Spa ✨ My name is Kim, I'm your personal concierge. How can I help you book your perfect treatment today?`,
  peekText: `Your sanctuary awaits... How may we pamper you today?`,
  syncBadgeText: "VIP BOOKING SECURED • SYNCED TO SANCTUARY",
  phone: "27760330046",
  whatsappMessageTemplate: `Hello {title} {lastName}, your bespoke {treatment} ($` + `{price}) at {brandName} is confirmed for {time}. We have your {refreshment} ready for your arrival. See you in the sanctuary!`,
  headerImage: headerBg,
};

// 🌐 OmniVerge Global Theme Defaults
const omnivergeDefaultConfig: WidgetConfig = {
  logo: "/images/omniverge-global.svg",
  brandName: "OmniVerge Global",
  primaryColor: "#c2aa6f",
  aiName: "Nova",
  greeting: `Welcome to OmniVerge Global ✨ I'm Nova, your AI-powered growth strategist. How can we help you master both tradition and innovation to transform challenges into opportunities and bold ideas into lasting success?`,
  peekText: `Welcome to the future... How may we assist you today?`,
  syncBadgeText: "BOOKING CONFIRMED • SYNCED TO OMNIVERGE GLOBAL",
  phone: "0636658016",
  whatsappMessageTemplate: `Hello {title} {lastName}, your consultation with OmniVerge Global is confirmed for {time}. We look forward to helping you achieve unprecedented growth.`,
  headerImage: "/images/omniverge-header.jpg",
};

const ResellerChatWidget = () => {
  const { toast } = useToast();
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [config, setConfig] = useState<WidgetConfig>(() => {
    const saved = (window as any).ovgConfig || {};
    return { ...defaultConfig, ...saved };
  });

  // Watch for changes to window.ovgConfig (for test pages)
  useEffect(() => {
    const saved = (window as any).ovgConfig || {};
    setConfig(prevConfig => ({ ...defaultConfig, ...saved }));
    
    // Also watch for any future changes to window.ovgConfig
    const originalConfig = (window as any).ovgConfig;
    const checkForChanges = () => {
      const currentConfig = (window as any).ovgConfig;
      if (currentConfig !== originalConfig) {
        setConfig(prevConfig => ({ ...defaultConfig, ...currentConfig }));
      }
    };
    
    const interval = setInterval(checkForChanges, 100);
    return () => clearInterval(interval);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem("ovgweb_ai_consent") === "true");
  const [showPeek, setShowPeek] = useState(false);
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isGroqListening, setIsGroqListening] = useState(false);

  // --- GROQ STT (Speech-to-Text) ---
  const startGroqRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToGroqSTT(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsGroqListening(true);
      console.log("🎤 Groq STT recording started...");
    } catch (err) {
      console.error("❌ Microphone access denied:", err);
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  }, [toast]);

  const stopGroqRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsGroqListening(false);
      console.log("🎤 Groq STT recording stopped.");
    }
  }, []);

  const sendAudioToGroqSTT = async (audioBlob: Blob) => {
    try {
      console.log("📤 Sending audio to Groq STT...");
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const response = await fetch('/api/groq-stt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Groq STT failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.text) {
        console.log("✅ Groq STT result:", data.text);
        sendMessageDirect(data.text);
      }
    } catch (err) {
      console.error("❌ Groq STT error:", err);
      toast({ title: "Speech Recognition Error", description: "Could not process speech. Try again.", variant: "destructive" });
    }
  };

  // --- WHATSAPP CONFIRMATION ENGINE (Whitelabel) ---
  const sendWhatsAppConfirmation = (booking: any) => {
    const template = config.whatsappMessageTemplate || defaultConfig.whatsappMessageTemplate!;
    const message = template
      .replace(/{title}/g, booking.title)
      .replace(/{lastName}/g, booking.lastName)
      .replace(/{treatment}/g, booking.treatment)
      .replace(/{price}/g, booking.price)
      .replace(/{brandName}/g, config.brandName || "our business")
      .replace(/{time}/g, booking.time)
      .replace(/{refreshment}/g, booking.refreshment);
    const cleanPhone = booking.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    console.log("📱 WhatsApp Link Generated:", whatsappUrl);
  };

  // --- JILL'S REVENUE LOGGING ---
  const logBookingForJill = (aiResponse: string, userInputText: string) => {
    console.log("🔍 [Jill Capture] Analyzing AI response for booking data...");
    
    // Load the local booking state that tracks all extracted info
    let localState: any = {};
    try {
      const storedState = localStorage.getItem("luxe_booking_state");
      if (storedState) localState = JSON.parse(storedState);
    } catch {}
    
    console.log("📋 [Jill Capture] Local booking state:", localState);
    
    // Try multiple JSON extraction patterns
    const jsonMatchBacktick = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonMatchBracket = aiResponse.match(/\[JSON CODE BLOCK\]\s*([\s\S]*?)\s*\[\/JSON CODE BLOCK\]/);
    const jsonMatchBrace = aiResponse.match(/\{\s*"action"\s*:\s*"finalize_lead"[\s\S]*?\}/);
    const jsonMatch = jsonMatchBacktick || jsonMatchBracket || jsonMatchBrace;

    // Check if this is a confirmed booking
    const isBookingConfirmed = (
      jsonMatch || 
      (aiResponse.includes("officially confirmed") && aiResponse.includes("VIP booking")) ||
      (aiResponse.includes("confirmed for") && aiResponse.includes("Your VIP booking is now synced")) ||
      (aiResponse.includes("Your VIP booking is now synced to our Sanctuary stream"))
    );

    console.log("🔍 [Jill Capture] isBookingConfirmed:", isBookingConfirmed);
    console.log("🔍 [Jill Capture] JSON match found:", !!jsonMatch);

    if (isBookingConfirmed) {
      let bookingData: any = {};

      // Try to extract from JSON first
      if (jsonMatch) {
        try {
          let jsonContent = jsonMatch[0].trim();
          
          // For bracket format, try to find the content between the tags
          if (!jsonContent.startsWith('{')) {
            const jsonInTags = jsonContent.match(/\{[\s\S]*\}/);
            if (jsonInTags) jsonContent = jsonInTags[0];
          }
          
          bookingData = JSON.parse(jsonContent);
          console.log("✅ [Jill Capture] Parsed JSON data:", bookingData);
        } catch (error) {
          console.error("❌ [Jill Capture] Failed to parse JSON, using fallbacks:", error);
        }
      }

      // If JSON didn't give us data or didn't exist, extract from response text + local state
      if (!bookingData.firstName && localState.firstName) {
        bookingData.firstName = localState.firstName;
      }
      if (!bookingData.title && localState.title) {
        bookingData.title = localState.title;
      }
      if (!bookingData.surname && localState.lastName) {
        bookingData.surname = localState.lastName;
      }
      if (!bookingData.phone && localState.phone) {
        bookingData.phone = localState.phone;
      }
      if (!bookingData.email && localState.email) {
        bookingData.email = localState.email;
      }
      if (!bookingData.treatment && localState.treatment) {
        bookingData.treatment = localState.treatment;
      }
      if (!bookingData.price && localState.treatmentPrice) {
        bookingData.price = localState.treatmentPrice;
      }
      if (!bookingData.preferredDrink && localState.refreshment) {
        bookingData.preferredDrink = localState.refreshment;
      }
      if (!bookingData.clientType && localState.isReturningCustomer !== null) {
        bookingData.clientType = localState.isReturningCustomer ? "Return" : "New";
      }

      // Also try to extract from the response text
      if (!bookingData.firstName) {
        const nameMatch = aiResponse.match(/Perfect,\s+((?:Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+)(\w+)/i);
        if (nameMatch) {
          bookingData.title = nameMatch[1].trim().replace(/\.$/, '');
          bookingData.firstName = nameMatch[2];
        }
      }
      if (!bookingData.treatment) {
        const treatmentMatch = aiResponse.match(/Your\s+(\w+)\s+for\s+\$?(\d+)/i);
        if (treatmentMatch) {
          bookingData.treatment = treatmentMatch[1];
          bookingData.price = parseInt(treatmentMatch[2]);
        }
      }
      if (!bookingData.preferredDrink) {
        const drinkMatch = aiResponse.match(/Your\s+(\w+\s+\w+|\w+)\s+will\s+be\s+ready/i);
        if (drinkMatch) {
          bookingData.preferredDrink = drinkMatch[1];
        }
      }
      
      // Extract time from confirmation text
      let timeStr = "";
      const timeMatch = aiResponse.match(/at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
      if (timeMatch) {
        timeStr = timeMatch[1];
      } else {
        timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      // Only capture if we have at least the minimum required data
      if (bookingData.firstName || localState.firstName) {
        const newEntry = {
          id: Date.now().toString(),
          title: bookingData.title || localState.title || "Miss",
          firstName: bookingData.firstName || localState.firstName || "Guest",
          lastName: bookingData.surname || localState.lastName || "Client",
          refreshment: bookingData.preferredDrink || localState.refreshment || "Water",
          phone: bookingData.phone || localState.phone || "No Number",
          email: bookingData.email || localState.email || "No Email",
          isNew: (bookingData.clientType || (localState.isReturningCustomer !== null ? (localState.isReturningCustomer ? "Return" : "New") : "New")) !== "Return",
          time: timeStr,
          timestamp: new Date().toISOString(),
          treatment: bookingData.treatment || localState.treatment || "Consultation",
          price: Number(bookingData.price) || Number(localState.treatmentPrice) || 0,
          source: "ovg-engage"
        };

        console.log("📦 [Jill Capture] Booking data to save:", newEntry);

        const rawStats = localStorage.getItem("luxe_live_stats");
        const prev = rawStats ? JSON.parse(rawStats) : { totalRevenue: 0, totalBookings: 0, bookings: [] };
        
        // Avoid duplicate bookings with same phone + treatment + timestamp (within 1 min)
        const isDuplicate = prev.bookings?.some((b: any) => 
          b.phone === newEntry.phone && 
          b.treatment === newEntry.treatment && 
          Math.abs(new Date(b.timestamp || Date.now()).getTime() - Date.now()) < 60000
        );
        
        if (isDuplicate) {
          console.log("⏭️ [Jill Capture] Skipping duplicate booking");
          return;
        }
        
        const updatedBookings = [newEntry, ...(prev.bookings || [])].slice(0, 25);

        const newStats = {
          ...prev,
          totalRevenue: (Number(prev.totalRevenue) || 0) + newEntry.price,
          totalBookings: (Number(prev.totalBookings) || 0) + 1,
          bookings: updatedBookings,
          lastBooking: newEntry
        };

        localStorage.setItem("luxe_live_stats", JSON.stringify(newStats));
        console.log("✅ SUCCESS: Lead captured by Jill's console", newEntry);
        
        setShowSyncBadge(true);
        setTimeout(() => setShowSyncBadge(false), 4500);
        
        // Dispatch the update event
        setTimeout(() => {
          window.dispatchEvent(new Event('luxe_update'));
        }, 100);

        // Send WhatsApp confirmation
        sendWhatsAppConfirmation(newEntry);

        return;
      } else {
        console.warn("⚠️ [Jill Capture] Could not extract minimum required data (firstName) for booking");
      }
    } else {
      console.log("ℹ️ [Jill Capture] Not a confirmed booking response");
    }
  };

  // --- AUTO-SCROLL ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-send after browser voice input finishes
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

  // === DISABLE BODY SCROLL WHEN CHAT IS OPEN ===
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

  // === TTS WITH FULL FALLBACK CHAIN ===
  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    // Clean text for TTS (remove emojis, markdown, JSON blocks)
    let cleanText = text
      .replace(/\[JSON CODE BLOCK\][\s\S]*?\[\/JSON CODE BLOCK\]/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*#_`]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '');

    // Fix time pronunciation: convert "10am" to "ten A M", "2pm" to "two P M", "9:30am" to "nine thirty A M"
    const numberWords: Record<string, string> = {
      '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
      '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
      '11': 'eleven', '12': 'twelve'
    };
    
    cleanText = cleanText.replace(/(\d{1,2}):(\d{2})\s*(am|pm)/gi, (_match, hours, minutes, period) => {
      const hourNum = parseInt(hours);
      const hourWord = numberWords[hourNum.toString()] || hours;
      const minNum = parseInt(minutes);
      const minWord = minNum === 0 ? '' : ` ${numberWords[minutes] || minutes}`;
      return `${hourWord}${minWord} ${period.toUpperCase().split('').join(' ')}`;
    });
    
    cleanText = cleanText.replace(/(\d{1,2})\s*(am|pm)/gi, (_match, hours, period) => {
      const hourNum = parseInt(hours);
      const hourWord = numberWords[hourNum.toString()] || hours;
      return `${hourWord} ${period.toUpperCase().split('').join(' ')}`;
    });

    cleanText = cleanText.trim();

    if (!cleanText) return;

    // API Keys
    const keys = {
      groq: import.meta.env.VITE_GROQ_API_KEY || '',
      eleven: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
      xai: import.meta.env.VITE_XAI_API_KEY || '',
      openai: import.meta.env.VITE_OPENAI_API_KEY || '',
      azure: import.meta.env.VITE_AZURE_SPEECH_KEY || '',
      google: import.meta.env.VITE_GOOGLE_TTS_API_KEY || '',
    };

    // Helper: fetch with timeout
    const fetchWithTimeout = async (url: string, options: any, timeout = 3000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (e) { clearTimeout(id); throw e; }
    };

    // === 1. GROQ TTS ===
    if (keys.groq) {
      try {
        console.log("🔊 Trying Groq TTS...");
        const res = await fetchWithTimeout(
          "https://api.groq.com/openai/v1/audio/speech",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${keys.groq}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "canopylabs/orpheus-v1-english",
              voice: "autumn",
              input: cleanText.slice(0, 8000),
              response_format: "wav",
            }),
          },
          1500
        );
        if (res.ok) {
          audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
          audioRef.current.volume = 0.85;
          await audioRef.current.play();
          audioRef.current.onended = () => { audioRef.current = null; };
          console.log("✅ Groq TTS playing audio...");
          return;
        }
      } catch (e) {
        console.log("⚠️ Groq failed, trying next...");
      }
    }

    // === 2. ELEVENLABS TTS ===
    if (keys.eleven) {
      try {
        console.log("🔊 Trying ElevenLabs TTS...");
        const res = await fetchWithTimeout(
          "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream",
          {
            method: "POST",
            headers: {
              "xi-api-key": keys.eleven,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: cleanText,
              model_id: "eleven_multilingual_v2",
            }),
          },
          2500
        );
        if (res.ok) {
          audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
          audioRef.current.volume = 0.85;
          await audioRef.current.play();
          audioRef.current.onended = () => { audioRef.current = null; };
          console.log("✅ ElevenLabs TTS playing audio...");
          return;
        }
      } catch (e) {
        console.log("⚠️ ElevenLabs failed, trying next...");
      }
    }

    // === 3. xAI TTS ===
    if (keys.xai) {
      try {
        console.log("🔊 Trying xAI TTS...");
        const res = await fetchWithTimeout(
          "https://api.x.ai/v1/audio/speech",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${keys.xai}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "grok-beta",
              input: cleanText,
              voice: "eve",
            }),
          },
          2000
        );
        if (res.ok) {
          audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
          audioRef.current.volume = 0.85;
          await audioRef.current.play();
          audioRef.current.onended = () => { audioRef.current = null; };
          console.log("✅ xAI TTS playing audio...");
          return;
        }
      } catch (e) {
        console.log("⚠️ xAI failed, trying next...");
      }
    }

    // === 4. OpenAI TTS ===
    if (keys.openai) {
      try {
        console.log("🔊 Trying OpenAI TTS...");
        const res = await fetchWithTimeout(
          "https://api.openai.com/v1/audio/speech",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${keys.openai}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "tts-1",
              input: cleanText.slice(0, 4000),
              voice: "nova",
              response_format: "mp3",
            }),
          },
          2000
        );
        if (res.ok) {
          audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
          audioRef.current.volume = 0.85;
          await audioRef.current.play();
          audioRef.current.onended = () => { audioRef.current = null; };
          console.log("✅ OpenAI TTS playing audio...");
          return;
        }
      } catch (e) {
        console.log("⚠️ OpenAI failed, trying next...");
      }
    }

    // === 5. GOOGLE TTS (Free API) ===
    if (keys.google) {
      try {
        console.log("🔊 Trying Google TTS...");
        // Google's free undocumented TTS API
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-US&client=tw-ob&q=${encodeURIComponent(cleanText.slice(0, 200))}`;
        audioRef.current = new Audio(url);
        audioRef.current.volume = 0.85;
        await audioRef.current.play();
        audioRef.current.onended = () => { audioRef.current = null; };
        console.log("✅ Google TTS playing audio...");
        return;
      } catch (e) {
        console.log("⚠️ Google TTS failed, trying next...");
      }
    }

    // === 6. AZURE SPEECH SERVICE ===
    if (keys.azure) {
      try {
        console.log("🔊 Trying Azure Speech TTS...");
        // Get access token
        const tokenRes = await fetchWithTimeout(
          "https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken",
          {
            method: "POST",
            headers: {
              "Ocp-Apim-Subscription-Key": keys.azure,
            },
          },
          1500
        );
        
        if (tokenRes.ok) {
          const token = await tokenRes.text();
          const ssml = `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Female' name='en-US-AriaNeural'>${cleanText}</voice></speak>`;
          
          const res = await fetchWithTimeout(
            "https://eastus.tts.speech.microsoft.com/cognitiveservices/v1",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
              },
              body: ssml,
            },
            2000
          );
          
          if (res.ok) {
            audioRef.current = new Audio(URL.createObjectURL(await res.blob()));
            audioRef.current.volume = 0.85;
            await audioRef.current.play();
            audioRef.current.onended = () => { audioRef.current = null; };
            console.log("✅ Azure Speech TTS playing audio...");
            return;
          }
        }
      } catch (e) {
        console.log("⚠️ Azure Speech failed, trying next...");
      }
    }

    // === 7. BROWSER FALLBACK - Female Voice Selection ===
    window.speechSynthesis.cancel();

    let voices = window.speechSynthesis.getVoices();

    const getBestMidwesternVoice = (v: SpeechSynthesisVoice[]) => {
      // Prioritize smooth Midwestern-sounding American English voices
      const midwesternPriority = [
        "Google US English",    // Clean, neutral American
        "Microsoft Zira",       // Standard American Midwestern
        "Microsoft David",      // American male alternative
        "Microsoft Aria",       // Warm American
        "Samantha",             // iOS American voice
        "Natural",              // Natural-sounding American
        "Female",               // Any female American voice
        "en-US",               // Any US English voice
      ];
      
      // First pass: look for prioritized voices
      for (const keyword of midwesternPriority) {
        const match = v.find(s =>
          s.lang.startsWith("en-US") &&
          s.name.includes(keyword)
        );
        if (match) return match;
      }
      
      // Fallback: any US English voice
      return v.find(s => s.lang.startsWith("en-US")) || v.find(s => s.lang.startsWith("en")) || v[0];
    };

    const premiumVoice = getBestMidwesternVoice(voices);

    if (cleanText.length > 180) {
      const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        const u = new SpeechSynthesisUtterance(trimmedSentence);
        if (premiumVoice) u.voice = premiumVoice;
        u.rate = 0.82;
        u.pitch = 1.08;
        u.volume = 1.0;
        u.lang = "en-US";

        await new Promise<void>((resolve) => {
          u.onend = () => resolve();
          u.onerror = () => resolve();
          window.speechSynthesis.speak(u);
        });
      }
    } else {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (premiumVoice) utterance.voice = premiumVoice;
      utterance.rate = 0.82;
      utterance.pitch = 1.08;
      utterance.volume = 1.0;
      utterance.lang = "en-US";

      window.speechSynthesis.speak(utterance);
    }

    console.log("✅ Browser fallback voice started");
  }, [voiceEnabled]);

  // --- STRIP JSON FROM AI RESPONSE ---
  const stripJsonFromResponse = (text: string): string => {
    let cleaned = text.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
    cleaned = cleaned.replace(/```\s*[\s\S]*?\s*```/g, '').trim();
    cleaned = cleaned.replace(/\[START JSON BLOCK\]\s*[\s\S]*?\s*\[END JSON BLOCK\]/g, '').trim();
    cleaned = cleaned.replace(/\[JSON CODE BLOCK\]\s*[\s\S]*?\s*\[\/JSON CODE BLOCK\]/g, '').trim();
    cleaned = cleaned.replace(/\{\s*"action"\s*:\s*"finalize_lead"[\s\S]*?\}/g, '').trim();
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  };

  // --- SEND MESSAGE ---
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
      // Check if we should use OmniVerge AI (for OmniVerge Global branding)
      const useOmniVergeAI = config.brandName?.toLowerCase().includes("omniverge");
      let response = useOmniVergeAI 
        ? await generateOmniVergeAI(userInputText, newMsgs)
        : await generateAIResponse(userInputText, newMsgs);
      
      const hasBookingJsonBacktick = /```json\s*[\s\S]*?"action"\s*:\s*"finalize_lead"[\s\S]*?```/.test(response);
      const hasBookingJsonBracket = /\[JSON CODE BLOCK\]\s*[\s\S]*?"action"\s*:\s*"finalize_lead"[\s\S]*?\[\/JSON CODE BLOCK\]/.test(response);
      const hasBookingJson = hasBookingJsonBacktick || hasBookingJsonBracket;
      
      // VIP synced text is now part of the AI response itself (in the system prompt)
      // No need to append it here anymore

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
      
      if (hasBookingJson) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log(`\n🎯 BOOKING CONFIRMED -- ${timestamp}`);
        console.log('═'.repeat(60));
        console.log('📋 FULL CONVERSATION CAPTURE:');
        console.log('═'.repeat(60));
        
        finalMsgs.forEach((msg, index) => {
          const msgTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (msg.role === 'user') {
            console.log(`👤 [${msgTime}] User: ${msg.text}`);
          } else {
            console.log(`🤖 [${msgTime}] ${config.aiName || "AI"}: ${msg.text}`);
          }
        });
        
        console.log('═'.repeat(60));
        console.log('✅ Full conversation logged for Jill');
        console.log('═'.repeat(60) + '\n');
      }
      
      speak(displayResponse);
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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const unlock = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(unlock);
    }
    setShowPeek(false);
    if (!hasConsent) {
      setShowConsent(true);
    } else {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && !hasGreeted && !showConsent) {
        setShowPeek(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen, hasGreeted, showConsent]);

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
                <li>Terms & Conditions</li>
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
          className="fixed z-[9999] 
                     bottom-[max(1.5rem,env(safe-area-inset-bottom))] 
                     right-[max(1rem,env(safe-area-inset-right))]
                     w-[94vw] max-w-[380px] sm:max-w-[420px] 
                     rounded-3xl border-2 overflow-hidden shadow-2xl bg-transparent"
          style={{ borderColor: config.primaryColor }}
        >
          {/* Header */}
          <div className="relative p-4 flex justify-between items-center overflow-hidden bg-gradient-to-r from-[#0f0f23] via-[#1a1a2e] to-[#16213e]">
            <div className="relative flex items-center justify-between w-full min-w-0">
              <img 
                src={config.logo || config.logoUrl || "/images/luxemedspa.svg"} 
                alt={config.brandName} 
                className="h-32 w-32 object-contain shrink-0"
              />
              <div className="flex items-center gap-1">
                <span className="relative flex h-1 w-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-green-500"></span>
                </span>
                <span className="text-[8px] text-white/60 font-medium">Online</span>
              </div>
            </div>

            {/* Controls */}
            <div className="relative flex items-center gap-1.5">
              <Button
                size="icon"
                className="h-6 w-6 rounded-full text-white shrink-0"
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
                {voiceEnabled ? <Volume2 className="h-3 w-3 text-white" /> : <VolumeX className="h-3 w-3 text-white" />}
              </Button>
              <Button size="icon" className="h-6 w-6 rounded-full text-white shrink-0" style={{ backgroundColor: config.primaryColor }} onClick={() => setShowResetConfirm(true)}>
                <RefreshCw className="h-3 w-3 text-white" />
              </Button>
              <Button size="icon" className="h-6 w-6 rounded-full text-white shrink-0" style={{ backgroundColor: config.primaryColor }} onClick={() => setIsOpen(false)}>
                <X className="h-3 w-3 text-white" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="relative overflow-y-auto p-4 space-y-2 bg-transparent h-[40vh] sm:h-[320px] max-h-[450px]">
            <AnimatePresence>
              {showSyncBadge && (
                <motion.div 
                  initial={{ y: -50, opacity: 0 }} 
                  animate={{ y: 10, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }} 
                  className="absolute left-1/2 -translate-x-1/2 z-[9999] w-[90%] pointer-events-none"
                >
                  <div className="bg-emerald-600 text-white text-[10px] font-bold py-2 px-4 rounded-full shadow-2xl flex items-center justify-center gap-2 border border-white/30 backdrop-blur-md">
                    <ShieldCheck className="h-3.5 w-3.5 animate-pulse" /> 
                    {config.syncBadgeText || "BOOKING SECURED"}
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
                <div className="mt-2 h-1 rounded-full overflow-hidden">
                  <div className="h-full w-full animate-pulse bg-gradient-to-r from-pink-400 via-amber-400 to-pink-400 bg-[length:200%_100%]"></div>
                </div>
              </div>
            )}
            
            {messages.length <= 1 && !isTyping && isSupported && (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-pink-600 bg-pink-50/80 rounded-lg backdrop-blur-sm border border-pink-200/50">
                <Mic className="h-3.5 w-3.5" />
                <span>Click the mic icon to speak to us</span>
              </div>
            )}

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
                  onClick={() => openWhatsApp(config.phone || "27760330046", `Hi ${config.brandName || "there"}, I'd like to speak to a consultant.`)}
                  className="px-3 py-1.5 text-xs font-bold rounded-full border border-green-400/50 bg-green-50 text-green-700 hover:bg-green-100 transition-colors shadow-sm flex items-center gap-1"
                >
                  💬 Speak to a consultant
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input / Footer Area */}
          <div className="relative p-4 border-t border-[#c2aa6f]/30 overflow-hidden bg-gradient-to-t from-[#0f0f23] via-[#1a1a2e] to-[#16213e]">
            
            <div className="relative flex gap-2 items-center">
              {/* Microphone Button - Use Groq STT */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isGroqListening) {
                    stopGroqRecording();
                  } else {
                    startGroqRecording();
                  }
                }}
                className={`shrink-0 ${isGroqListening ? "text-blue-500 animate-pulse scale-110" : "text-pink-500 hover:text-pink-600"}`}
              >
                {isGroqListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              
              {/* Text Input */}
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isGroqListening ? "🎤 Listening... Speak now" : "Type your message..."}
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

export default ResellerChatWidget;
