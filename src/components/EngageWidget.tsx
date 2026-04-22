import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Volume2, VolumeX } from 'lucide-react';
import { generateSpeech } from '@/services/audioEngine';
import { supabase } from '@/integrations/supabase/client';

interface EngageWidgetProps {
  tenantId: string;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  systemInstructions?: string;
  initialGreeting?: string;
  resellerLogo?: string;
}

const EngageWidget: React.FC<EngageWidgetProps> = ({
  tenantId,
  brandColors = {
    primary: '#0097b2',
    secondary: '#226683',
    accent: '#D4AF37'
  },
  systemInstructions = 'You are a helpful AI assistant.',
  initialGreeting = 'Hello! How can I help you today?',
  resellerLogo = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string; id: string; isHotLead?: boolean }>>([
    { role: 'ai', text: initialGreeting, id: '1' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [hasPlayedGreeting, setHasPlayedGreeting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceId, setVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [activeEngine, setActiveEngine] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [hasCredits, setHasCredits] = useState(true);
  const [resellerLogoUrl, setResellerLogoUrl] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [humanJoined, setHumanJoined] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const HOT_LEAD_KEYWORDS = ['price', 'cost', 'quote', 'demo', 'buy', 'consultation', 'purchase', 'pricing', 'subscription', 'plan', 'package'];

  const checkCredits = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/credits?tenant=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        const credits = data.credits || 0;
        setHasCredits(credits > 0);
        return credits > 0;
      }
      return true; // If API fails, allow operation
    } catch (error) {
      console.error('Error checking credits:', error);
      return true; // If API fails, allow operation
    }
  };

  const detectHotLead = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return HOT_LEAD_KEYWORDS.some(keyword => lowerText.includes(keyword));
  };

  // Fetch voice settings on load
  useEffect(() => {
    const fetchVoiceSettings = async () => {
      try {
        const response = await fetch(`/api/widget-config?tenant=${tenantId}`);
        if (response.ok) {
          const config = await response.json();
          setVoiceEnabled(config.voice_enabled || false);
          setVoiceId(config.voice_id || '21m00Tcm4TlvDq8ikWAM');
          setVideoUrl(config.video_url || '');
          setResellerLogoUrl(config.reseller_logo || '');
          setIsPaused(config.is_paused || false);
          
          // Inherit brand colors from reseller if tenant doesn't have custom colors
          if (!config.brandColors || !config.brandColors.primary) {
            const resellerResponse = await fetch(`/api/reseller-brand?tenant=${tenantId}`);
            if (resellerResponse.ok) {
              const resellerConfig = await resellerResponse.json();
              config.brandColors = resellerConfig.brandColors || config.brandColors;
            }
          }
        }
        
        // Check credits on load
        await checkCredits();
      } catch (error) {
        console.error('Error fetching voice settings:', error);
      }
    };

    fetchVoiceSettings();
  }, [tenantId]);

  // Set up Supabase Realtime for takeover changes
  useEffect(() => {
    const channel = supabase
      .channel('takeover-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const newPausedState = (payload.new as any).is_paused;
          setIsPaused(newPausedState || false);
          
          if (newPausedState && !humanJoined) {
            setHumanJoined(true);
            setMessages(prev => [...prev, {
              role: 'ai',
              text: 'A team member has joined the chat.',
              id: Date.now().toString()
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, humanJoined]);

  // Track analytics when bubble opens and play greeting with voice
  useEffect(() => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
      trackAnalytics('conversation_open');

      // Play initial greeting with voice if enabled
      if (voiceEnabled && !hasPlayedGreeting) {
        setHasPlayedGreeting(true);
        playTTS(initialGreeting, '1');
      }
    }
  }, [isOpen, hasOpened, voiceEnabled, hasPlayedGreeting, initialGreeting]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const trackAnalytics = async (event: string) => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          event,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  };

  const playTTS = async (text: string, messageId: string) => {
    if (!voiceEnabled || isMuted || !hasCredits) return;

    setIsPlaying(messageId);
    setActiveEngine('Finding voice...');

    try {
      const result = await generateSpeech(text, { voiceId });
      setActiveEngine(result.engine);

      if (result.audioUrl.startsWith('native://')) {
        // Native browser synthesis - already handled by generateSpeech
        setIsPlaying(null);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(result.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(null);
        setActiveEngine('');
        URL.revokeObjectURL(result.audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying(null);
        setActiveEngine('');
        URL.revokeObjectURL(result.audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlaying(null);
      setActiveEngine('');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user' as const, text: inputValue, id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // If paused, don't send to Groq - wait for human response
    if (isPaused) {
      return;
    }

    // Check credits before proceeding
    const creditsValid = await checkCredits();
    if (!creditsValid) {
      const maintenanceMessage = { 
        role: 'ai' as const, 
        text: 'System Maintenance: This service is temporarily unavailable. Please contact your administrator.',
        id: (Date.now() + 1).toString() 
      };
      setMessages(prev => [...prev, maintenanceMessage]);
      return;
    }

    setIsLoading(true);

    // Detect hot lead
    const isHotLead = detectHotLead(inputValue);

    // Track message analytics
    trackAnalytics('message_sent');

    // Send lead score to Supabase if hot lead detected
    if (isHotLead) {
      try {
        await fetch('/api/lead-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            message: inputValue,
            leadScore: 'high',
            timestamp: new Date().toISOString()
          })
        });
        console.log('[HotLead] High score lead detected and logged');
      } catch (error) {
        console.error('Error logging hot lead:', error);
      }
    }

    try {
      const response = await fetch('/api/groq-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          tenantId,
          systemInstructions,
          history: messages
        })
      });

      const data = await response.json();
      const aiMessage = { 
        role: 'ai' as const, 
        text: data.reply || 'Sorry, I encountered an error.', 
        id: (Date.now() + 1).toString(),
        isHotLead 
      };
      setMessages(prev => [...prev, aiMessage]);

      // Play TTS if enabled and credits available
      if (voiceEnabled && data.reply && hasCredits) {
        playTTS(data.reply, aiMessage.id);
      }
    } catch (error) {
      const errorMessage = { role: 'ai' as const, text: 'Sorry, I encountered an error. Please try again.', id: (Date.now() + 1).toString() };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-[9999]"
        style={{
          background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`,
          boxShadow: isOpen ? 'none' : `0 4px 20px ${brandColors.primary}40`
        }}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <MessageCircle size={24} className="text-white" />
        )}
      </button>

          {/* Chat Window */}
          {isOpen && (
            <div
              className={`fixed bottom-24 right-6 w-80 h-96 rounded-2xl shadow-2xl flex flex-col z-[9999] overflow-hidden ${activeEngine ? 'animate-pulse' : ''}`}
              style={{
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 0 20px rgba(0,0,0,0.3)'
              }}
            >
              {/* Header */}
              <div
                className="p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-white font-semibold" style={{ color: brandColors.accent }}>
                      Engage AI
                    </h3>
                    <p className="text-xs text-white/60">Powered by Groq</p>
                  </div>
                  {activeEngine && (
                    <p className="text-xs text-[#0097b2]">Engine: {activeEngine}</p>
                  )}
                </div>
                {humanJoined && (
                  <div className="mt-2 p-2 rounded shadow-[0_0_20px_rgba(0,0,0,0.3)]" style={{ background: `${brandColors.primary}20` }}>
                    <div className="text-xs font-semibold" style={{ color: brandColors.primary }}>
                      Team Member Joined
                    </div>
                  </div>
                )}
                {videoUrl && (
                  <div className="mt-3 rounded overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                    <video
                      src={videoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-24 object-cover"
                      style={{ opacity: 0.8 }}
                    />
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[85%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'ml-auto'
                        : 'mr-auto'
                    }`}
                    style={{
                      background: msg.role === 'user'
                        ? `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                        : 'rgba(255, 255, 255, 0.1)',
                      color: msg.role === 'user' ? 'white' : 'white'
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <p className="text-sm flex-1">{msg.text}</p>
                      {msg.role === 'ai' && voiceEnabled && (
                        <button
                          onClick={() => {
                            if (isPlaying === msg.id && audioRef.current) {
                              audioRef.current.pause();
                              setIsPlaying(null);
                            } else {
                              playTTS(msg.text, msg.id);
                            }
                          }}
                          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          {isPlaying === msg.id ? (
                            <VolumeX size={14} className="text-white" />
                          ) : (
                            <Volume2 size={14} className="text-white" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="bg-white/10 rounded-lg p-3 w-fit">
                    <p className="text-sm text-white/60">Thinking...</p>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    className="px-3 py-2 rounded-lg transition-all disabled:opacity-50 hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                    }}
                  >
                    <Send size={16} className="text-white" />
                  </button>
                </div>
                {/* Powered by / Reseller Logo watermark */}
                <div className="mt-2 text-center">
                  {resellerLogoUrl ? (
                    <img 
                      src={resellerLogoUrl} 
                      alt="Reseller Logo" 
                      className="h-4 object-contain inline-block"
                      style={{ opacity: 0.8 }}
                    />
                  ) : (
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: brandColors.accent,
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Powered by Engage
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      );
    };

export default EngageWidget;
