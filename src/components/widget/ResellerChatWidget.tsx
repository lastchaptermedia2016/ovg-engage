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
import "@/styles/animations.css"; // Import animations.css

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
  logo: "/images/omnivergeglobal.svg",
  brandName: "Omniverge Global",
  primaryColor: "#0097b2",
  aiName: "Assistant",
  greeting: `Welcome to The Luxe Med Spa ✨ My name is Kim, I'm your personal concierge. How can I help you book your perfect treatment today?`,
  peekText: `Ready to scale your revenue with AI-powered automation?`,
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
  aiName: "OVG",
  greeting: `Welcome to OmniVerge Global ✨ I'm OVG, your AI-powered growth strategist. How can we help you master both tradition and innovation to transform challenges into opportunities and bold ideas into lasting success?`,
  peekText: `Ready to see the future of AI-powered business?`,
  syncBadgeText: "BOOKING CONFIRMED • SYNCED TO OMNIVERGE GLOBAL",
  phone: "0636658016",
  whatsappMessageTemplate: `Hello {title} {lastName}, your consultation with OmniVerge Global is confirmed for {time}. We look forward to helping you achieve unprecedented growth.`,
  headerImage: "/images/omniverge-header.jpg",
};

// === OVG STATE MACHINE ===
type StateID =
  | "S_WAKE"
  | "S_GREETING"
  | "S_INFO_PRICING"
  | "S_INFO_FEATURES"
  | "S_LEAD_CAPTURE_NAME"
  | "S_LEAD_CAPTURE_EMAIL"
  | "S_LEAD_CAPTURE_PHONE"
  | "S_LEAD_CAPTURE_CONFIRM"
  | "S_SOFT_CLOSE"
  | "S_HUMAN_HANDOFF"
  | "S_HANDLE_OBJ_COMPARE"
  | "S_HANDLE_OBJ_BUDGET"
  | "S_HANDLE_OBJ_TIME"
  | "S_HANDLE_OBJ_TRUST";

// State transition mapping
const STATE_TRANSITIONS: Record<StateID, StateID[]> = {
  S_WAKE: ["S_GREETING"],
  S_GREETING: ["S_INFO_PRICING", "S_INFO_FEATURES", "S_LEAD_CAPTURE_NAME", "S_HUMAN_HANDOFF"],
  S_INFO_PRICING: ["S_SOFT_CLOSE", "S_LEAD_CAPTURE_NAME", "S_HUMAN_HANDOFF", "S_HANDLE_OBJ_COMPARE", "S_HANDLE_OBJ_BUDGET"],
  S_INFO_FEATURES: ["S_SOFT_CLOSE", "S_LEAD_CAPTURE_NAME", "S_HUMAN_HANDOFF"],
  S_LEAD_CAPTURE_NAME: ["S_LEAD_CAPTURE_EMAIL"],
  S_LEAD_CAPTURE_EMAIL: ["S_LEAD_CAPTURE_PHONE"],
  S_LEAD_CAPTURE_PHONE: ["S_LEAD_CAPTURE_CONFIRM"],
  S_LEAD_CAPTURE_CONFIRM: ["S_SOFT_CLOSE", "S_HUMAN_HANDOFF"],
  S_SOFT_CLOSE: ["S_LEAD_CAPTURE_NAME", "S_HUMAN_HANDOFF"],
  S_HUMAN_HANDOFF: ["S_WAKE"],
  S_HANDLE_OBJ_COMPARE: ["S_SOFT_CLOSE", "S_LEAD_CAPTURE_NAME"],
  S_HANDLE_OBJ_BUDGET: ["S_SOFT_CLOSE", "S_LEAD_CAPTURE_NAME"],
  S_HANDLE_OBJ_TIME: ["S_SOFT_CLOSE", "S_LEAD_CAPTURE_NAME"],
  S_HANDLE_OBJ_TRUST: ["S_SOFT_CLOSE", "S_LEAD_CAPTURE_NAME"],
};

// Prompt templates with dynamic variable support
const PROMPT_TEMPLATES: Record<StateID, string> = {
  S_WAKE: "",
  S_GREETING: "Hi there! I'm OVG, your AI concierge for OmniVerge Global. We help businesses like yours grow smarter using strategic marketing and AI. What brings you to our site today?",
  S_INFO_PRICING: `Here are our OVG Engage Widget Plans:
• Starter Plan: R349/month
• Professional Plan: R799/month
• Business Plan: R1,499/month
• Enterprise Plan: Custom pricing

The widget plans start at R349, but for full-spectrum agency work led by Dona and Jason, services start at R2,500.`,
  S_INFO_FEATURES: `OVG Engage provides:
• Custom AI chatbots with your branding
• Voice input/output capabilities
• Lead capture and CRM integration
• Booking and appointment scheduling
• Full analytics and insights
• Multilingual support for all 11 official South African languages`,
  S_LEAD_CAPTURE_NAME: "Great! To get started, what's your name?",
  S_LEAD_CAPTURE_EMAIL: "Thanks, {{first_name}}! What's your email address so I can send you more information?",
  S_LEAD_CAPTURE_PHONE: "Perfect! What's the best phone number to reach you?",
  S_LEAD_CAPTURE_CONFIRM: `Thanks, {{first_name}}! I've got:
• Email: {{email}}
• Phone: {{phone}}

Is this correct? I'll send you a proposal shortly.`,
  S_SOFT_CLOSE: "Shall I send you a proposal for that?",
  S_HUMAN_HANDOFF: "Dona Handcock, our founder, or one of our strategists can call you back within the hour. Just tell me your name and phone number, and I'll arrange the call immediately.",
  // Objection override states with exact scripts (no LLM improvisation)
  S_HANDLE_OBJ_COMPARE: "I understand you're comparing options. Our 50/50 profit split model ensures we're invested in your success. Unlike competitors who charge flat fees, we only win when you win.",
  S_HANDLE_OBJ_BUDGET: "Budget is important. Our plans start at R349/month, and we offer flexible terms. What budget range did you have in mind?",
  S_HANDLE_OBJ_TIME: "I hear you on timing. Our setup is quick—we can have you live in under 48 hours. When would be a good time to start?",
  S_HANDLE_OBJ_TRUST: "Trust is earned. We've helped over 100 businesses transform with AI. Would you like to speak with one of our founders directly?",
};

// Dynamic variable substitution
function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

// Apply soft close guardrail to INFO states
function applySoftCloseGuardrail(text: string, state: StateID): string {
  if (state === "S_INFO_PRICING" || state === "S_INFO_FEATURES") {
    return text + "\n\n" + PROMPT_TEMPLATES.S_SOFT_CLOSE;
  }
  return text;
}

// === TTS NORMALIZATION FOR TEMPLATES ===
const cleanTextForSpeech = (text: string) => {
  return text
    // 1. Remove commas from within numbers (e.g., 1,500 -> 1500)
    // This prevents the TTS from pausing and splitting the number.
    .replace(/(\d),(\d{3})/g, '$1$2')
    // 2. Handle R<number>/month -> "<number> rands per month"
    .replace(/R\s?(\d+)\s?\/\s?month/gi, '$1 rands per month')
    // 3. Handle standalone R<number> -> "<number> rands"
    .replace(/R\s?(\d+)/g, '$1 rands')
    // 4. Clean up slashes and formatting
    .replace(/\//g, ' per ')
    .replace(/\*/g, '')
    .trim();
};

// Apply TTS normalization to all templates
function applyTTSToTemplate(template: string): string {
  return cleanTextForSpeech(template);
}

// Strip vocal direction tags (e.g., [professionally], [cheerful]) for UI display only
// TTS receives full text with brackets for expressive voice control
const stripVocalDirections = (text: string): string => {
  return text.replace(/\[.*?\]/g, '').trim();
};

// === WEBHOOK: Send lead data to OVG endpoint ===
async function sendLeadToOVG(leadData: { first_name: string; email: string; phone: string; plan_interest: string }) {
  try {
    const response = await fetch("https://api.omniverge.global/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: leadData.first_name,
        email: leadData.email,
        phone: leadData.phone,
        plan_interest: leadData.plan_interest,
        source: "ovg-engage-widget",
        timestamp: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      console.log("✅ Lead data sent to OVG endpoint successfully");
      return true;
    } else {
      console.warn("⚠️ Failed to send lead data to OVG endpoint:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Error sending lead data to OVG endpoint:", error);
    return false;
  }
}

const ResellerChatWidget = () => {
  const { toast } = useToast();
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [config, setConfig] = useState<WidgetConfig>(() => {
    const saved = (window as any).ovgConfig || {};
    return { ...defaultConfig, ...saved };
  });

  // Watch for configuration changes with efficient cache invalidation
  useEffect(() => {
    const saved = (window as any).ovgConfig || {};
    setConfig(prevConfig => ({ ...defaultConfig, ...saved }));
    
    // Efficient configuration cache invalidation
    // Check for config updates every 30 seconds instead of 100ms
    // Server-side can update window.ovgConfig.version when changes occur
    let lastKnownVersion = saved.version || 0;
    
    const checkForChanges = () => {
      const currentConfig = (window as any).ovgConfig || {};
      
      // Only update config if version number has changed
      if (currentConfig.version && currentConfig.version !== lastKnownVersion) {
        setConfig(prevConfig => ({ ...defaultConfig, ...currentConfig }));
        lastKnownVersion = currentConfig.version;
        console.log('🔄 Widget configuration updated (version:', currentConfig.version, ')');
      }
    };
    
    // Check for configuration updates every 30 seconds
    const interval = setInterval(checkForChanges, 30000);
    
    // Also listen for explicit config refresh event
    const handleConfigRefresh = () => {
      const currentConfig = (window as any).ovgConfig || {};
      setConfig(prevConfig => ({ ...defaultConfig, ...currentConfig }));
      lastKnownVersion = currentConfig.version || lastKnownVersion;
      console.log('🔄 Widget configuration refreshed manually');
    };
    
    window.addEventListener('ovg_config_refresh', handleConfigRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('ovg_config_refresh', handleConfigRefresh);
    };
  }, []);

  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGroqListening, setIsGroqListening] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => localStorage.getItem("ovgweb_ai_consent") === "true");
  const [showPeek, setShowPeek] = useState(false);
  const [showSyncBadge, setShowSyncBadge] = useState(false);

  // === STATE MACHINE ===
  const [currentState, setCurrentState] = useState<StateID>("S_WAKE");
  const [leadData, setLeadData] = useState({
    first_name: "",
    email: "",
    phone: "",
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ovgweb_chat_messages") || "[]");
      if (saved.length === 0) {
        const initialGreeting: ChatMessage = {
          id: Date.now().toString(),
          role: "ai",
          text: "Hi there! I'm OVG, the AI concierge for Omniverge Global. We help businesses like yours grow smarter using strategic marketing and AI. What brings you to our site today?",
          timestamp: Date.now()
        };
        localStorage.setItem("ovgweb_chat_messages", JSON.stringify([initialGreeting]));
        return [initialGreeting];
      }
      return saved;
    } catch { 
      const initialGreeting: ChatMessage = {
        id: Date.now().toString(),
        role: "ai",
        text: "Hi there! I'm OVG, the AI concierge for Omniverge Global. We help businesses like yours grow smarter using strategic marketing and AI. What brings you to our site today?",
        timestamp: Date.now()
      };
      localStorage.setItem("ovgweb_chat_messages", JSON.stringify([initialGreeting]));
      return [initialGreeting];
    }
  });
  const [input, setInput] = useState("");

  // Hot keywords for priority lead detection
  const hot_keywords = ["buy", "price", "human", "now", "sign", "cost"];
  const [alertLevel, setAlertLevel] = useState<'NORMAL' | 'CRITICAL'>('NORMAL');

  // Check messages for hot keywords and update alert level
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.role === 'user') {
      const messageText = latestMessage.text.toLowerCase();
      const hasHotKeyword = hot_keywords.some(keyword => messageText.includes(keyword));
      if (hasHotKeyword) {
        setAlertLevel('CRITICAL');
      } else {
        setAlertLevel('NORMAL');
      }
    }
  }, [messages, hot_keywords]);

  const [hasGreeted, setHasGreeted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem("ovgweb_voice_mute") !== "true");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetNotification, setResetNotification] = useState<{show: boolean; title: string; description: string} | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // --- GROQ STT (Speech-to-Text) ---
  const stopGroqRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsGroqListening(false);
      console.log("🎤 Groq STT recording stopped.");
    }
  }, []);
  const startGroqRecording = useCallback(async () => {
    try {
      console.log("🎤 Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ Microphone stream initialized successfully");
      console.log("📊 Stream tracks:", stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, muted: t.muted })));
      
      // Set up AudioContext for silence detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log("📦 Audio chunk received, size:", event.data.size, "bytes");
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log("🎤 Recording stopped, processing audio...");
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("📦 Audio blob created, size:", audioBlob.size, "bytes, type:", audioBlob.type);
        
        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (silenceDetectionRef.current) {
          clearTimeout(silenceDetectionRef.current);
          silenceDetectionRef.current = null;
        }
        
        await sendAudioToGroqSTT(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        console.log("✅ Audio tracks stopped");
      };
      
      mediaRecorder.start();
      setIsGroqListening(true);
      console.log("🎤 Groq STT recording started with silence detection...");
      
      // Silence detection: stop recording after 1.5 seconds of silence
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 20;
      const SILENCE_DURATION = 1500; // 1.5 seconds
      
      const checkSilence = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (average < SILENCE_THRESHOLD) {
          // Silence detected
          if (!silenceDetectionRef.current) {
            console.log("🤫 Silence detected, starting timer...");
            silenceDetectionRef.current = setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                console.log("⏹️ Auto-stopping recording due to silence");
                stopGroqRecording();
              }
            }, SILENCE_DURATION);
          }
        } else {
          // Sound detected, reset silence timer
          if (silenceDetectionRef.current) {
            clearTimeout(silenceDetectionRef.current);
            silenceDetectionRef.current = null;
          }
        }
        
        requestAnimationFrame(checkSilence);
      };
      
      checkSilence();
    } catch (err) {
      console.error("❌ Microphone access denied:", err);
      console.error("❌ Error details:", err instanceof Error ? err.message : String(err));
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  }, [toast, stopGroqRecording]);

  const sendAudioToGroqSTT = async (audioBlob: Blob) => {
    try {
      console.log("📤 Sending audio to Groq STT directly...");
      
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      
      if (!apiKey) {
        console.error("❌ VITE_GROQ_API_KEY not configured");
        toast({ title: "Configuration Error", description: "API key not configured.", variant: "destructive" });
        return;
      }
      
      console.log("🔑 Groq API key found, length:", apiKey.length);
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-large-v3');
      formData.append('response_format', 'json');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      console.log("📥 Groq STT response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Groq STT error:", response.status, errorText);
        throw new Error(`Groq STT failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.text) {
        console.log("✅ Groq STT result:", data.text);
        sendMessageDirect(data.text);
      } else {
        console.warn("⚠️ No text in Groq STT response");
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
  }, [messages, isSpeaking]);

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
    const initialGreeting: ChatMessage = {
      id: Date.now().toString(),
      role: "ai",
      text: "Hi there! I'm OVG, the AI concierge for Omniverge Global. We help businesses like yours grow smarter using strategic marketing and AI. What brings you to our site today?",
      timestamp: Date.now()
    };
    setMessages([initialGreeting]);
    localStorage.setItem("ovgweb_chat_messages", JSON.stringify([initialGreeting]));
    setShowResetConfirm(false);
    setResetNotification({ show: true, title: "Chat Reset", description: "History cleared successfully." });
    setTimeout(() => setResetNotification(null), 3000);
  }, []);

  // === TTS WITH FULL FALLBACK CHAIN ===
  const cleanTextForSpeech = (text: string) => {
    return text
      // 1. Remove commas from within numbers (e.g., 1,500 -> 1500)
      // This prevents the TTS from pausing and splitting the number.
      .replace(/(\d),(\d{3})/g, '$1$2')
      // 2. Handle R<number>/month -> "<number> rands per month"
      .replace(/R\s?(\d+)\s?\/\s?month/gi, '$1 rands per month')
      // 3. Handle standalone R<number> -> "<number> rands"
      .replace(/R\s?(\d+)/g, '$1 rands')
      // 4. Clean up slashes and formatting
      .replace(/\//g, ' per ')
      .replace(/\*/g, '')
      .trim();
  };

  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(true);

    // Clean text for TTS (remove emojis, markdown, JSON blocks, and normalize pricing)
    let cleanText = text
      .replace(/\[JSON CODE BLOCK\][\s\S]*?\[\/JSON CODE BLOCK\]/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*#_`]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '');

    // Apply pricing and currency normalization for speech
    cleanText = cleanTextForSpeech(cleanText);

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

    // === 1. GROQ TTS WITH CHUNKED STREAMING ===
    if (keys.groq) {
      try {
        console.log("🔊 Trying Groq TTS with chunked streaming...");
        
        // Helper: Split text into chunks under 200 chars (Orpheus limit)
        const chunkText = (text: string, maxLen = 180): string[] => {
          const chunks: string[] = [];
          const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
          let current = '';
          for (const sentence of sentences) {
            if ((current + sentence).length > maxLen && current.length > 0) {
              chunks.push(current.trim());
              current = sentence;
            } else {
              current += sentence;
            }
          }
          if (current.trim()) chunks.push(current.trim());
          // If any single chunk still too long, word-split
          return chunks.flatMap(chunk => 
            chunk.length > maxLen 
              ? chunk.match(new RegExp(`.{1,${maxLen}}\\b`, 'g')) || [chunk]
              : [chunk]
          );
        };

        const chunks = chunkText(cleanText);
        console.log(`🎵 Split into ${chunks.length} chunks for streaming TTS`);

        // Audio queue for pre-buffering
        const audioQueue: { audio: HTMLAudioElement; url: string }[] = [];
        let currentChunk = 0;

        // Prefetch first 2 chunks immediately
        const prefetchChunk = async (index: number): Promise<{ audio: HTMLAudioElement; url: string } | null> => {
          if (index >= chunks.length) return null;
          try {
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
                  input: chunks[index].slice(0, 200), // Hard limit for Orpheus
                  response_format: "wav",
                }),
              },
              3000
            );
            if (!res.ok) return null;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.volume = 0.85;
            return { audio, url };
          } catch (e) {
            console.log(`⚠️ Chunk ${index} prefetch failed`);
            return null;
          }
        };

        // Start playing first chunk immediately while prefetching next
        const playNext = async () => {
          if (currentChunk >= chunks.length) {
            setIsSpeaking(false);
            return;
          }

          // Ensure current chunk is loaded
          if (audioQueue.length === 0) {
            const prefetched = await prefetchChunk(currentChunk);
            if (!prefetched) {
              setIsSpeaking(false);
              return;
            }
            audioQueue.push(prefetched);
          }

          const current = audioQueue.shift()!;
          audioRef.current = current.audio;

          // Prefetch next chunk while current plays
          const nextIndex = currentChunk + 1;
          if (nextIndex < chunks.length && audioQueue.length === 0) {
            prefetchChunk(nextIndex).then(next => {
              if (next) audioQueue.push(next);
            });
          }

          current.audio.onended = () => {
            URL.revokeObjectURL(current.url);
            currentChunk++;
            playNext();
          };
          current.audio.onerror = () => {
            URL.revokeObjectURL(current.url);
            currentChunk++;
            playNext();
          };

          await current.audio.play();
          console.log(`🎵 Playing chunk ${currentChunk + 1}/${chunks.length}`);
        };

        // Start the pipeline
        await playNext();
        console.log("✅ Groq TTS streaming started...");
        return;
      } catch (e) {
        console.log("⚠️ Groq chunked TTS failed, trying next...");
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
          audioRef.current.onended = () => { audioRef.current = null; setIsSpeaking(false); };
          await audioRef.current.play();
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
          audioRef.current.onended = () => { audioRef.current = null; setIsSpeaking(false); };
          await audioRef.current.play();
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
          audioRef.current.onended = () => { audioRef.current = null; setIsSpeaking(false); };
          await audioRef.current.play();
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
        audioRef.current.onended = () => { audioRef.current = null; setIsSpeaking(false); };
        await audioRef.current.play();
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
            audioRef.current.onended = () => { audioRef.current = null; setIsSpeaking(false); };
            await audioRef.current.play();
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
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (premiumVoice) utterance.voice = premiumVoice;
      utterance.rate = 0.82;
      utterance.pitch = 1.08;
      utterance.volume = 1.0;
      utterance.lang = "en-US";
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

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
    setIsSpeaking(true);

    try {
      // Always use OmniVerge AI for Reseller Demo
      let response = await generateOmniVergeAI(userInputText, newMsgs);
      
      const hasBookingJsonBacktick = /```json\s*[\s\S]*?"action"\s*:\s*"finalize_lead"[\s\S]*?```/.test(response);
      const hasBookingJsonBracket = /\[JSON CODE BLOCK\]\s*[\s\S]*?"action"\s*:\s*"finalize_lead"[\s\S]*?\[\/JSON CODE BLOCK\]/.test(response);
      const hasBookingJson = hasBookingJsonBacktick || hasBookingJsonBracket;
      
      // VIP synced text is now part of the AI response itself (in the system prompt)
      // No need to append it here anymore

      const displayResponse = stripJsonFromResponse(response);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: displayResponse.replace(/\$/g, 'R'),
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
      setIsSpeaking(false);
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
    if (isOpen && messages.length === 1 && !hasGreeted && hasConsent) {
      setHasGreeted(true);
      // Extract the initial greeting text and speak it
      const initialGreetingText = messages[0].text;
      speak(initialGreetingText);
    }
  }, [isOpen, messages.length, hasGreeted, hasConsent, speak]);

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
      <style>{`
        @keyframes float-pulse {
          0%, 100% { transform: translateY(0); box-shadow: 0 10px 25px rgba(0, 151, 178, 0.4); }
          50% { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(0, 151, 178, 0.6); }
        }
        .animate-float-pulse {
          animation: float-pulse 3s ease-in-out infinite;
        }
      `}</style>
      {/* ===== PEEK TEASER ===== */}
      <AnimatePresence>
        {!isOpen && !showConsent && showPeek && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="fixed bottom-[136px] right-6 z-[9998] max-w-[280px] rounded-2xl border border-[#FFD700]/30 p-5 shadow-2xl backdrop-blur-xl"
            style={{
              backgroundImage: "url('/images/ovg-header-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            <button
              onClick={() => setShowPeek(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-sm text-[#FFD700] leading-relaxed">{config.peekText}</p>
            <button
              onClick={handleOpenChat}
              className="mt-3 text-sm font-semibold text-white hover:opacity-80 transition-opacity animate-pulse"
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
            className="fixed bottom-[136px] right-6 z-[10002] max-w-[280px] rounded-2xl border border-[#FFD700]/30 p-5 shadow-2xl backdrop-blur-xl"
            style={{
              backgroundImage: "url('/images/ovg-header-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            <button
              onClick={() => setShowResetConfirm(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-sm text-[#FFD700] leading-relaxed">Are you sure you want to reset the chat? This will clear all messages.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-sm font-semibold text-[#9CA3AF] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={resetChat}
                className="text-sm font-semibold text-white hover:opacity-80 transition-opacity animate-pulse"
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
                     bottom-[max(4rem,env(safe-area-inset-bottom))]
                     right-[max(1rem,env(safe-area-inset-right))]
                     w-[94vw] max-w-[380px] sm:max-w-[420px]
                     rounded-3xl overflow-hidden overflow-x-hidden shadow-2xl bg-transparent max-w-full"
          style={{
            boxShadow: "0 0 0 2px #BF953F, 0 0 15px rgba(191, 149, 63, 0.5)"
          }}
        >
          {/* Header */}
          <div
            className="relative flex justify-between items-center overflow-hidden"
            style={{
              backgroundImage: "url('/images/ovg-header-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderBottom: "1px solid #FFD700",
              padding: "0 16px",
              height: "72px"
            }}
          >
            <div className="relative flex items-center gap-2">
              <img
                src={config.logo || config.logoUrl || "/images/luxemedspa.svg"}
                alt={config.brandName}
                className="h-[26px] w-auto object-contain shrink-0"
                style={{ filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.3))" }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="relative flex h-1 w-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-green-500"></span>
                </span>
                <span className="text-[8px] text-white/60 font-medium">Online</span>
              </div>

              {/* Controls */}
              <div className="relative flex items-center gap-1.5">
              <Button
                size="icon"
                className="h-6 w-6 rounded-full text-white shrink-0 shadow-md"
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
              <Button size="icon" className="h-6 w-6 rounded-full text-white shrink-0 shadow-md" style={{ backgroundColor: config.primaryColor }} onClick={() => setShowResetConfirm(true)}>
                <RefreshCw className="h-3 w-3 text-white" />
              </Button>
              <Button size="icon" className="h-6 w-6 rounded-full text-white shrink-0 shadow-md" style={{ backgroundColor: config.primaryColor }} onClick={() => setIsOpen(false)}>
                <X className="h-3 w-3 text-white" />
              </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            className="relative overflow-y-auto p-4 space-y-2 bg-transparent h-[40vh] sm:h-[320px] max-h-[450px]"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent',
              boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)'
            }}
          >
            <style>{`
              div::-webkit-scrollbar {
                width: 6px;
              }
              div::-webkit-scrollbar-track {
                background: transparent;
              }
              div::-webkit-scrollbar-thumb {
                background-color: rgba(156, 163, 175, 0.5);
                border-radius: 3px;
              }
              div::-webkit-scrollbar-thumb:hover {
                background-color: rgba(156, 163, 175, 0.7);
              }
            `}</style>
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

            {/* Reset Success Notification - Centered Overlay */}
            <AnimatePresence>
              {resetNotification?.show && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none"
                >
                  <div className="bg-black/80 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-[#FFD700]/40 text-center max-w-[80%]">
                    <p className="text-[#FFD700] font-bold text-base">{resetNotification.title}</p>
                    <p className="text-white/90 text-sm mt-1">{resetNotification.description}</p>
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
                        ? "bg-[#226683] text-white rounded-tr-sm border-b-[#1a5266] shadow-lg shadow-blue-900/20"
                        : "bg-gradient-to-br from-white/95 to-gray-50/95 text-amber-900 rounded-tl-sm border-b-pink-400 shadow-lg shadow-gray-100/30"
                    }`}
                  >
                    <span className="font-light">{stripVocalDirections(msg.text)}</span>
                    <span className="ml-2 inline-flex items-end float-right text-[9px] text-amber-700/70 mt-1.5 pl-2 leading-none whitespace-nowrap font-mono">
                      {time}
                    </span>
                  </div>
                </div>
              );
            })}

            {messages.length <= 1 && !isSpeaking && isSupported && (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-[#FFD700]/80 rounded-lg backdrop-blur-sm">
                <Mic className="h-3.5 w-3.5 text-[#FFD700]/80 animate-pulse" />
                <span>Click the mic icon in the message box to speak to me</span>
              </div>
            )}

            {messages.length <= 2 && !isSpeaking && (
              <div className="flex flex-wrap gap-2 px-1 pt-2 justify-center">
                {/* Button 1: Primary - Get a Custom Quote */}
                <button
                  onClick={() => sendMessageDirect("Get a Custom Quote")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0097b2] text-white hover:shadow-[0_0_10px_rgba(255,215,0,0.5)] transition-all shadow-sm"
                >
                  Get a Custom Quote
                </button>

                {/* Button 2: Secondary - Explore Platform Plans */}
                <button
                  onClick={() => sendMessageDirect("Explore Platform Plans")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#0097b2] bg-transparent text-[#0097b2] hover:bg-[#0097b2]/10 transition-colors shadow-sm"
                >
                  Explore Platform Plans
                </button>

                {/* Button 3: Expert - Speak with an AI Automation Specialist */}
                <button
                  onClick={() => openWhatsApp(config.phone || "27760330046", `Hi ${config.brandName || "there"}, I'd like to speak with an AI Automation Specialist.`)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FFD700] text-[#0f172a] hover:bg-[#FFD700]/90 transition-colors shadow-sm"
                >
                  Speak with an AI Automation Specialist
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Position OVG Speaking Indicator - Bottom of message window, above input */}
          {isSpeaking && (
            <div className="sticky bottom-0 left-0 w-full bg-transparent z-10 pointer-events-none">
              <div className="px-4 py-2">
                <div className="flex items-center gap-2 text-amber-900 text-sm font-light">
                  <Volume2 className="h-4 w-4 animate-pulse" />
                  <span className="animate-pulse">OVG is speaking</span>
                  <span className="animate-pulse delay-100">♪</span>
                  <span className="animate-pulse delay-200">♪</span>
                  <span className="animate-pulse delay-300">♪</span>
                </div>
                <div className="mt-2 h-[2px] rounded-full overflow-hidden bg-gray-200">
                  <div
                    className="h-full w-full"
                    style={{
                      background: "linear-gradient(90deg, #0097b2 0%, #FFD700 50%, #0097b2 100%)",
                      backgroundSize: "200% 100%",
                      animation: "geminiFlow 2s infinite linear"
                    }}
                  />
                  <style>{`
                    @keyframes geminiFlow {
                      0% { background-position: 200% 0; }
                      100% { background-position: -200% 0; }
                    }
                  `}</style>
                </div>
              </div>
            </div>
          )}

          {/* Input / Footer Area */}
          <div
            className="relative p-4 border-t border-[#c2aa6f]/30 overflow-hidden"
            style={{
              backgroundImage: "url('/images/bg.jpg')",
              backgroundSize: "cover",
              backgroundBlendMode: "multiply",
              backgroundColor: "#0f172a"
            }}
          >
            {/* Gold Shimmer Line */}
            <div
              className="absolute top-0 left-0 w-full h-[2px] opacity-70"
              style={{
                background: "linear-gradient(90deg, transparent, #FFD700, transparent)",
                backgroundSize: "200% 100%",
                animation: "shimmer 3s infinite"
              }}
            />
            <style>{`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>

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
                className={`shrink-0 ${isGroqListening ? "text-blue-500 animate-pulse scale-110" : "text-[#FFD700] hover:text-[#FFD700]/80 animate-pulse"}`}
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
                className={`text-white px-4 shrink-0 transition-all duration-200 ${input.trim() ? 'opacity-100 scale-105 shadow-lg' : 'opacity-70'}`}
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
          className="fixed bottom-16 right-6 z-[10000] h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center border-2 border-[#FFD700] animate-float-pulse"
          style={{ backgroundColor: "#0097b2" }}
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </button>
      )}
    </>
  );
};

export default ResellerChatWidget;
