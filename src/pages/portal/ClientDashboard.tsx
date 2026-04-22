import React, { useEffect, useState, useRef } from 'react';
import { generateOmniVergeResponse } from '@/lib/omniverge-ai';
import type { ChatMessage } from '@/lib/omniverge-ai';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Send } from 'lucide-react';
import VoiceMode from '@/components/VoiceMode';
import { useRealtimeFeed } from '@/hooks/useRealtimeFeed';

const ClientDashboard = () => {
  const effectiveTenantId = (window.location.hostname === 'localhost') ? 'dev-admin-001' : null;

  // Hot keywords for priority lead detection
  const hot_keywords = ["buy", "price", "human", "now", "sign", "cost"];

  // Use realtime feed for optimistic UI
  const { messages: realtimeMessages, isConnected, addMessageOptimistic } = useRealtimeFeed({
    tenantId: effectiveTenantId || '',
    enabled: !!effectiveTenantId
  });

  const [activities, setActivities] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', text: 'Welcome to OVG Engage Dashboard. Ask me anything about your data.', timestamp: Date.now() }
  ]);
  const [alertLevel, setAlertLevel] = useState<'NORMAL' | 'CRITICAL'>('NORMAL');

  // Check messages for hot keywords and update alert level
  useEffect(() => {
    const latestMessage = activities[activities.length - 1];
    if (latestMessage && latestMessage.role === 'user') {
      const messageText = latestMessage.text.toLowerCase();
      const hasHotKeyword = hot_keywords.some(keyword => messageText.includes(keyword));
      if (hasHotKeyword) {
        setAlertLevel('CRITICAL');
      } else {
        setAlertLevel('NORMAL');
      }
    }
  }, [activities, hot_keywords]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [groqStatus, setGroqStatus] = useState<'connected' | 'standby' | 'error'>('standby');
  const [currentTier, setCurrentTier] = useState('Standard');
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    description: ''
  });
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [ticketMessage, setTicketMessage] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [testInput, setTestInput] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalConversations: 0,
    totalMessages: 0,
    hotLeads: 0,
    lastActiveAt: null as string | null,
    weeklyTrend: [
      { day: 'Mon', conversations: 12, hotLeads: 3 },
      { day: 'Tue', conversations: 18, hotLeads: 5 },
      { day: 'Wed', conversations: 15, hotLeads: 4 },
      { day: 'Thu', conversations: 22, hotLeads: 7 },
      { day: 'Fri', conversations: 19, hotLeads: 6 },
      { day: 'Sat', conversations: 8, hotLeads: 2 },
      { day: 'Sun', conversations: 10, hotLeads: 3 }
    ]
  });
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('autumn');
  const [audioEngineStatus, setAudioEngineStatus] = useState('Standby');
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [resellerLogo, setResellerLogo] = useState('');
  const [brandColor, setBrandColor] = useState('#0097b2');
  const [brandName, setBrandName] = useState('OmniVerge Global');
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);
  const [priorityLeads, setPriorityLeads] = useState<Array<{ id: string; message: string; timestamp: string }>>([]);
  const [safetyViolation, setSafetyViolation] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showSafetyToast, setShowSafetyToast] = useState(false);
  const [dailyTokenUsage, setDailyTokenUsage] = useState(12450);
  const [dailyTokenLimit, setDailyTokenLimit] = useState(500000);
  const [usagePercentage, setUsagePercentage] = useState(2.49);
  const [limitReached, setLimitReached] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Resume AudioContext on user gesture to ensure speakers are ready
  const resumeAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log('🔊 AudioContext resumed');
    }
  };

  // Resume audio on any user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      resumeAudioContext();
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Load branding configuration from widget_configs
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const tenantId = effectiveTenantId || 'dev-admin-001';
        const { data, error } = await supabase
          .from('tenants')
          .select('branding')
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching branding:', error);
          return;
        }

        if (data) {
          const branding = (data as any).branding;
          if (branding) {
            const brandColor = branding.brandColor || '#0097b2';
            setBrandColor(brandColor);
            setBrandName(branding.brandName || 'OVG Engage');
            setResellerLogo(branding.resellerLogo || '');
            console.log('🎨 Branding loaded:', { brandColor, brandName: branding.brandName || 'OVG Engage' });
          }
        }
      } catch (error) {
        console.error('Error loading branding:', error);
      }
    };

    loadBranding();
  }, [effectiveTenantId]);

  // Load daily usage data from Supabase
  useEffect(() => {
    const loadUsageData = async () => {
      try {
        const clientId = effectiveTenantId || 'dev-admin-001';
        const today = new Date().toISOString().split('T')[0];

        console.log('📊 Loading usage data for client:', clientId);

        // Fetch today's usage from usage_logs
        const { data, error } = await supabase
          .from('usage_logs')
          .select('token_count')
          .eq('client_id', clientId)
          .gte('created_at', today)
          .single();

        if (error) {
          console.log('⚠️ Usage logs not found, falling back to widget_configs');
          // Fallback to widget_configs if usage_logs fails
          const { data: configData } = await supabase
            .from('widget_configs')
            .select('daily_usage, daily_limit')
            .eq('tenant_id', clientId)
            .single();

          if (configData) {
            const config = configData as any;
            setDailyTokenUsage(config.daily_usage || 12450);
            setDailyTokenLimit(config.daily_limit || 500000);
            const percentage = Math.round(((config.daily_usage || 12450) / (config.daily_limit || 500000)) * 100 * 10) / 10;
            setUsagePercentage(percentage);
            setLimitReached(percentage >= 100);
            console.log('📊 Usage data from widget_configs:', { usage: config.daily_usage, limit: config.daily_limit, percentage });
          }
          return;
        }

        if (data) {
          const usage = (data as any).token_count || 12450;
          setDailyTokenUsage(usage);
          const percentage = Math.round((usage / dailyTokenLimit) * 100 * 10) / 10;
          setUsagePercentage(percentage);
          setLimitReached(percentage >= 100);
          console.log('📊 Usage data from usage_logs:', { usage, limit: dailyTokenLimit, percentage });
        }
      } catch (error) {
        console.error('Error loading usage data:', error);
      }
    };

    loadUsageData();
  }, [effectiveTenantId, dailyTokenLimit]);

  const validateSafety = (text: string): boolean => {
    const restrictedTerms = [
      // Extreme profanity patterns
      /\b(fuck|shit|damn|hell|bastard|bitch|asshole|dick|pussy|cock|whore|slut)\b/i,
      // Illegal activities
      /\b(drugs|cocaine|heroin|meth|illegal|smuggle|trafficking|money laundering|fraud|scam|hack|exploit)\b/i,
      // Guaranteed financial returns (fraudulent claims)
      /\b(guaranteed|guarantee|100%|sure thing|risk-free|certain|assured)\b.*\b(return|profit|money|cash|gain|income)\b/i,
    ];

    for (const pattern of restrictedTerms) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  };

  const playChime = async () => {
    try {
      // Generate a simple chime using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing chime:', error);
    }
  };

  const handlePriorityLead = (lead: { id: string; message: string; timestamp: string }) => {
    setPriorityLeads(prev => [...prev.slice(-2), lead]); // Keep only last 3 leads
    playChime();
  };

  const handleTakeoverToggle = async () => {
    const newPausedState = !isTakeoverActive;
    setIsTakeoverActive(newPausedState);
    
    try {
      await (supabase.from('conversations') as any)
        .upsert({
          tenant_id: effectiveTenantId,
          is_paused: newPausedState,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });
      console.log('Takeover state updated:', newPausedState);
    } catch (error) {
      console.error('Error updating takeover state:', error);
      // Revert on error
      setIsTakeoverActive(!newPausedState);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    // Check Groq API key status
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    setGroqStatus(apiKey ? 'connected' : 'standby');

    // Fetch analytics data
    fetchAnalytics();

    // Set up Supabase Realtime for lead detection
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `lead_score=eq.high`
        },
        (payload) => {
          const newLead = payload.new as any;
          handlePriorityLead({
            id: newLead.id,
            message: newLead.text,
            timestamp: newLead.created_at
          });
        }
      )
      .subscribe();

    // Set up Supabase Realtime for real-time messages from widget
    const messageChannel = supabase
      .channel('widget-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${effectiveTenantId}`
        },
        (payload) => {
          const newMessage = payload.new as any;
          setActivities(prev => [...prev, {
            id: newMessage.id,
            role: newMessage.role,
            text: newMessage.text,
            timestamp: new Date(newMessage.created_at).getTime()
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(messageChannel);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .eq('tenant_id', effectiveTenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching analytics:', error);
        return;
      }

      if (data) {
        setAnalytics({
          totalConversations: (data as any).total_conversations || 0,
          totalMessages: (data as any).total_messages || 0,
          hotLeads: (data as any).hot_leads || 0,
          lastActiveAt: (data as any).last_active_at || null,
          weeklyTrend: analytics.weeklyTrend
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Use mock data if Supabase fails
      setAnalytics({
        totalConversations: 24,
        totalMessages: 156,
        hotLeads: 8,
        lastActiveAt: new Date().toISOString(),
        weeklyTrend: analytics.weeklyTrend
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (isTakeoverActive) {
      // Optimistic UI: display message instantly, save to database in background
      const manualMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'ai',
        text: inputValue,
        timestamp: Date.now()
      };
      setActivities(prev => [...prev, manualMessage]);

      // Use optimistic message insertion via realtime hook
      if (addMessageOptimistic && effectiveTenantId) {
        addMessageOptimistic({
          tenant_id: effectiveTenantId,
          role: 'ai',
          text: inputValue,
          is_manual: true
        });
      } else {
        // Fallback to direct insert
        try {
          await (supabase.from('messages') as any).insert({
            tenant_id: effectiveTenantId,
            role: 'ai',
            text: inputValue,
            is_manual: true,
            created_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error saving manual message:', error);
        }
      }

      setInputValue('');
    } else {
      const userMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        text: inputValue,
        timestamp: Date.now()
      };
      setActivities(prev => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/groq-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputValue,
            tenantId: effectiveTenantId,
            systemInstructions,
            history: activities
          })
        });

        if (!response.ok) throw new Error('Groq API error');

        const data = await response.json();
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: data.reply || 'Sorry, I encountered an error.',
          timestamp: Date.now()
        };
        setActivities(prev => [...prev, aiMessage]);
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now()
        };
        setActivities(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTicketSubmit = async () => {
    if (!ticketForm.subject || !ticketForm.category || !ticketForm.description) {
      setTicketMessage('Please fill in all fields');
      setTicketStatus('error');
      return;
    }

    setTicketStatus('submitting');
    setTicketMessage('');

    try {
      // Mock ticket submission - logs to console
      const ticketId = Math.floor(Math.random() * 10000);
      console.log(`Ticket ${ticketId} successfully lodged:`, ticketForm);
      setTicketMessage(`Ticket #${ticketId} successfully lodged`);
      setTicketStatus('success');
      setTicketForm({ subject: '', category: '', description: '' });

      setTimeout(() => {
        setTicketStatus('idle');
        setTicketMessage('');
      }, 3000);
    } catch (error) {
      console.error('Ticket submission error:', error);
      setTicketMessage('Failed to submit ticket. Please try again.');
      setTicketStatus('error');
    }
  };

  const handleTestMessage = async () => {
    if (!testInput.trim()) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      text: testInput,
      timestamp: Date.now()
    };

    setTestMessages(prev => [...prev, userMessage]);
    // Also add to AI Activity Feed for MockSession
    setActivities(prev => [...prev, userMessage]);
    setTestInput('');
    setIsTestLoading(true);

    console.log(`Groq Request: [${systemInstructions || 'Default instructions'}] + [${testInput}]`);

    try {
      const response = await generateOmniVergeResponse(testInput, testMessages);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response,
        timestamp: Date.now()
      };
      setTestMessages(prev => [...prev, aiMessage]);
      // Also add AI response to AI Activity Feed
      setActivities(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Error processing your request. Please try again.',
        timestamp: Date.now()
      };
      setTestMessages(prev => [...prev, errorMessage]);
      // Also add error to AI Activity Feed
      setActivities(prev => [...prev, errorMessage]);
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!inputValue.trim()) return;

    const queryMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      text: inputValue,
      timestamp: Date.now()
    };

    setActivities(prev => [...prev, queryMessage]);
    setInputValue('');
    setIsLoading(true);

    console.log(`AI Query: [${inputValue}]`);

    try {
      const response = await generateOmniVergeResponse(inputValue, activities);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response,
        timestamp: Date.now()
      };
      setActivities(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Error processing your query. Please try again.',
        timestamp: Date.now()
      };
      setActivities(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceTranscript = async (audioBlob?: Blob) => {
    console.log('Voice input received in dashboard, audioBlob size:', audioBlob?.size);
    setIsLoading(true);

    try {
      // If audio blob is provided, use Groq Whisper for STT
      if (audioBlob && audioBlob.size > 0) {
        console.log('🎤 Sending audio to /api/groq-stt endpoint...');

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');

        const sttResponse = await fetch('/api/groq-stt', {
          method: 'POST',
          body: formData,
        });

        if (!sttResponse.ok) {
          const errorData = await sttResponse.json();
          console.error('❌ Groq STT API error:', sttResponse.status, errorData);
          throw new Error(`Groq STT API error: ${sttResponse.status} - ${errorData.error}`);
        }

        const sttData = await sttResponse.json();
        const transcribedText = sttData.text;

        console.log('✅ TTS Input Captured (Groq Whisper):', transcribedText);
        setInputValue(transcribedText);

        // Immediately send to Groq Chat without blocking
        const queryMessage: ChatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          text: transcribedText,
          timestamp: Date.now()
        };

        setActivities(prev => [...prev, queryMessage]);
        setInputValue('');

        // Non-blocking streaming response
        const response = await fetch('/api/groq-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: transcribedText,
            tenantId: effectiveTenantId,
            systemInstructions,
            history: activities,
            stream: true
          })
        });

        if (!response.ok) throw new Error('Groq Chat API error');

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices?.[0]?.delta?.content) {
                    fullResponse += parsed.choices[0].delta.content;
                    // Update UI in real-time
                    setActivities(prev => {
                      const newActivities = [...prev];
                      const lastMessage = newActivities[newActivities.length - 1];
                      if (lastMessage?.role === 'ai') {
                        lastMessage.text = fullResponse;
                      } else {
                        newActivities.push({
                          id: (Date.now() + 1).toString(),
                          role: 'ai',
                          text: fullResponse,
                          timestamp: Date.now()
                        });
                      }
                      return newActivities;
                    });
                  }
                } catch (e) {
                  console.error('Error parsing stream chunk:', e);
                }
              }
            }
          }
        }

        // Trigger TTS for the final response
        if (fullResponse) {
          await triggerTTS(fullResponse);
        }
      } else {
        console.error('❌ No audio blob provided or empty');
        setAudioEngineStatus('Standby');
      }
    } catch (error) {
      console.error('❌ Error processing voice input:', error);
      setAudioEngineStatus('Standby');
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Voice input failed. Please check your microphone and try again.',
        timestamp: Date.now()
      };
      setActivities(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerTTS = async (text: string) => {
    console.log('📢 TTS Attempting to speak:', text);

    try {
      // Ensure AudioContext is resumed
      await resumeAudioContext();

      // Use ElevenLabs streaming API for real-time TTS
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + selectedVoice + '/stream', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) throw new Error('ElevenLabs API error');

      // Stream the audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        console.log('✅ TTS audio playing');
      }
    } catch (error) {
      console.error('❌ Error in TTS:', error);
    }
  };

  const handleCopyToClipboard = () => {
    const embedCode = `<script src="https://cdn.omniverge.global/engage/widget.js" data-tenant="${effectiveTenantId}"></script>`;
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveVoiceSettings = async () => {
    try {
      const { error } = await (supabase.from('tenants') as any)
        .upsert({
          tenant_id: effectiveTenantId,
          voice_enabled: voiceEnabled,
          voice_id: selectedVoice,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (error) throw error;
      console.log('Voice settings saved:', { voiceEnabled, selectedVoice });
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  };

  if (!effectiveTenantId && window.location.hostname !== 'localhost') {
    return null;
  }

  return (
    <main className="relative w-full h-screen bg-transparent p-8 overflow-auto">
      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: #D4AF37;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #E5C158;
        }
      `}</style>
      <div className="max-w-6xl mx-auto">
        {/* Priority Leads Toast */}
        {priorityLeads.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-[#D4AF37] to-[#A67C00] rounded-lg p-4 border border-[#D4AF37]/50 shadow-lg animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#E0F7FA] animate-ping"></div>
              <span className="font-semibold font-medium" style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Priority Lead Detected!</span>
            </div>
            <div className="mt-2 text-sm font-medium" style={{ color: 'rgba(224, 247, 250, 0.9)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
              Latest: "{priorityLeads[priorityLeads.length - 1].message}"
            </div>
            <div className="mt-1 text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
              {new Date(priorityLeads[priorityLeads.length - 1].timestamp).toLocaleString()}
            </div>
          </div>
        )}
        <div className="flex flex-row items-center justify-start gap-3 md:gap-8 mb-8 px-4 md:px-0">
          <img 
            src="/images/omnivergeglobal.svg" 
            alt="OmniVerge Global" 
            className="h-8 md:h-10 w-auto"
          />
          <h1 
            className="text-xl md:text-3xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(90deg, #D4AF37, #F7EF8A, #D4AF37)',
              backgroundSize: '300% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              animation: 'shimmer 4s linear infinite',
              willChange: 'background-position'
            }}
          >
            OVG POD
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1 lg:col-span-3 bg-white/10 backdrop-blur-sm rounded-lg" style={{ boxShadow: '0 0 20px rgba(212,175,55,0.15), 0 0 40px rgba(212,175,55,0.1)' }}>
            <div className="bg-gradient-to-r from-[#D4AF37] px-4 py-2 rounded-t-lg" style={{ background: `linear-gradient(to right, #D4AF37, ${brandColor})` }}>
              <h2 className="text-xl font-bold text-[#0A2540]">
                Engagement Analytics (7-Day Trend)
              </h2>
            </div>
            <div className="p-6">
            <div className="flex justify-center items-center gap-x-12 md:gap-x-16 mb-6">
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)' }}>7</div>
                <div className="text-xs font-semibold text-white/80">Days</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-[#D4AF37]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)' }}>{analytics.totalConversations}</div>
                <div className="text-xs font-semibold text-white/80">Conversations</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-[#D4AF37]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)' }}>{analytics.hotLeads}</div>
                <div className="text-xs font-semibold text-white/80">Hot Leads</div>
              </div>
            </div>
            {analytics.lastActiveAt && (
              <div className="text-center text-xs font-medium mb-4" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
                Last active: {new Date(analytics.lastActiveAt).toLocaleString()}
              </div>
            )}
            <div className="h-40 bg-white/5 rounded p-4">
              <div className="flex items-end justify-between h-full gap-2">
                {analytics.weeklyTrend.map((day, index) => (
                  <div key={index} className="flex flex-col items-center gap-1 flex-1">
                    <div className="flex gap-1 w-full justify-center">
                      <div 
                        className="w-3 bg-gradient-to-t from-[#0097b2] to-[#0097b2]/50 rounded-t" 
                        style={{ height: `${(day.conversations / 25) * 100}%` }}
                      ></div>
                      <div 
                        className="w-3 bg-gradient-to-t from-[#D4AF37] to-[#D4AF37]/50 rounded-t" 
                        style={{ height: `${(day.hotLeads / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#0097b2' }}></div>
                  <span className="font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Conversations</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#D4AF37' }}></div>
                  <span className="font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Hot Leads</span>
                </div>
              </div>
            </div>
            {analytics.lastActiveAt && (
              <div className="mt-4 text-center text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
                Last active: {new Date(analytics.lastActiveAt).toLocaleString()}
              </div>
            )}
            </div>
          </div>
          <div className={`col-span-1 md:col-span-1 lg:col-span-6 bg-white/10 backdrop-blur-sm rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.3)] min-h-[300px] transition-all ${alertLevel === 'CRITICAL' ? 'animate-pulse' : ''}`} style={alertLevel === 'CRITICAL' ? { boxShadow: '0 0 30px rgba(255, 0, 0, 0.8), 0 0 60px rgba(255, 0, 0, 0.4)' } : {}}>
            <div className="bg-gradient-to-r from-[#D4AF37] px-4 py-2 rounded-t-lg flex justify-between items-center" style={{ background: `linear-gradient(to right, #D4AF37, ${brandColor})` }}>
              <h2 className="text-xl font-bold text-[#0A2540]">
                AI Activity Feed
              </h2>
              <button
                onClick={handleTakeoverToggle}
                className={`px-4 py-2 rounded text-sm font-semibold transition-all ${
                  isTakeoverActive
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#A67C00]'
                    : alertLevel === 'CRITICAL'
                      ? 'bg-gradient-to-r from-[#FF0000] to-[#CC0000] dynamic-pulse-red'
                      : 'bg-white/10 hover:bg-white/20 dynamic-pulse-gold'
                }`}
                style={isTakeoverActive ? { color: '#E0F7FA' } : { borderColor: alertLevel === 'CRITICAL' ? '#FF0000' : '#D4AF37', borderWidth: '1px', borderStyle: 'solid', color: '#E0F7FA' }}
              >
                {isTakeoverActive ? 'Release Control' : 'Take Over Live'}
              </button>
            </div>
            <div className="p-6">
            {isTakeoverActive && (
              <div className="mb-4 p-3 rounded" style={{ background: '#D4AF3720', border: '1px solid #D4AF37' }}>
                <div className="text-sm font-semibold font-medium" style={{ color: '#D4AF37' }}>
                  Manual Control Active
                </div>
                <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(224, 247, 250, 0.7)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
                  AI is paused. You are now responding directly to the user.
                </div>
              </div>
            )}
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className={`bg-white/5 rounded p-3 border-l-2 ${activity.role === 'user' ? 'border-[#0097b2]' : ''} ${(activity as any).isHotLead ? 'animate-pulse' : ''}`} 
                  style={{ 
                    borderColor: activity.role === 'ai' ? '#D4AF37' : '#0097b2',
                    boxShadow: (activity as any).isHotLead ? '0 0 15px #D4AF3760' : 'none',
                    borderWidth: (activity as any).isHotLead ? '2px' : '1px',
                    minHeight: '60px'
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-semibold" style={{ color: activity.role === 'user' ? '#0097b2' : '#D4AF37' }}>
                      {activity.role === 'user' ? 'User' : isTakeoverActive ? 'You (Manual)' : 'OVG Engage AI'}
                      {(activity as any).isHotLead && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: '#D4AF37', color: '#000' }}>
                          HOT LEAD
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(224, 247, 250, 0.8)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>{activity.text}</div>
                  <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(224, 247, 250, 0.4)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="bg-white/5 rounded p-3 border-l-2" style={{ borderColor: '#0097b2', minHeight: '60px' }}>
                  <div className="text-sm font-semibold" style={{ color: '#0097b2' }}>OVG Engage AI</div>
                  <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Thinking...</div>
                </div>
              )}
            </div>
            {isTakeoverActive && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: '#0097b230' }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a response to the user..."
                    className="flex-1 px-3 py-2 bg-white/5 border rounded text-sm placeholder-white/40 focus:outline-none"
                    style={{ borderColor: '#D4AF37', color: '#E0F7FA' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    className="px-3 py-2 rounded-lg transition-all disabled:opacity-50 hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, #D4AF37, #A67C00)`
                    }}
                  >
                    <Send size={16} style={{ color: '#E0F7FA', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
          <div className="col-span-1 md:col-span-1 lg:col-span-3 bg-white/10 backdrop-blur-sm rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.3)]">
            <div className="bg-gradient-to-r from-[#D4AF37] px-4 py-2 rounded-t-lg" style={{ background: `linear-gradient(to right, #D4AF37, ${brandColor})` }}>
              <h2 className="text-xl font-bold text-[#0A2540]">
                AI Console
              </h2>
            </div>
            <div className="p-6">
            {groqStatus === 'standby' && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4 text-center">
                <div className="text-sm font-semibold text-yellow-400 mb-2">System Standby</div>
                <div className="text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Groq API key not configured</div>
              </div>
            )}
            {groqStatus === 'connected' && (
              <div className="space-y-4">
                <div className="bg-white/5 rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-semibold" style={{ color: '#D4AF37' }}>
                      Plan Status
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>{currentTier}</div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: '75%', background: 'linear-gradient(90deg, #D4AF37, #A67C00)' }}></div>
                  </div>
                </div>
                <div className="bg-white/5 rounded p-4" style={{ boxShadow: '0 0 15px rgba(0, 151, 178, 0.2)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-semibold" style={{ color: '#D4AF37' }}>
                      Daily Credit Usage
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
                      {dailyTokenUsage.toLocaleString()} / {dailyTokenLimit.toLocaleString()} tokens used
                    </div>
                  </div>
                  <div className="w-full rounded-full h-3" style={{ backgroundColor: '#0a1f3d', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                    <div
                      className="h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${usagePercentage}%`,
                        background: usagePercentage >= 100 ? '#ef4444' : usagePercentage >= 80 ? '#f59e0b' : '#0097b2',
                        boxShadow: usagePercentage >= 80 ? '0 0 10px rgba(245, 158, 11, 0.5)' : '0 0 10px rgba(0, 151, 178, 0.5)'
                      }}
                    ></div>
                  </div>
                  {limitReached && (
                    <div className="mt-2 text-xs font-semibold text-red-400" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                      ⚠️ Daily limit reached. Contact your reseller to upgrade.
                    </div>
                  )}
                </div>
                <div className="bg-white/5 rounded p-4">
                  <div className="text-xs mb-2 font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Credits Used</div>
                  <div className="text-sm font-semibold" style={{ color: '#0097b2' }}>
                    {analytics.totalMessages} / 1000
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleQuery();
                      }
                    }}
                    placeholder="Ask about your OVG Engage data..."
                    className="w-full px-3 py-2 bg-white/5 border rounded text-sm placeholder-white/40 focus:outline-none focus:ring-2"
                    style={{ borderColor: '#0097b2', color: '#E0F7FA' }}
                  />
                  <button
                    onClick={handleQuery}
                    disabled={isLoading || !inputValue.trim() || limitReached}
                    className="w-full px-4 py-2 bg-gradient-to-r from-[#0097b2] to-[#226683] rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ color: '#E0F7FA' }}
                  >
                    {limitReached ? 'Daily limit reached' : (isLoading ? 'Processing...' : 'Send Query')}
                  </button>
                </div>
              </div>
            )}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: '#0097b230' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#D4AF37' }}>
                Lodge Support Ticket
              </h3>
              <div className="space-y-3 w-full">
                <input
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="Subject"
                  className="w-full px-3 py-2 bg-white/5 border rounded text-sm placeholder-white/40 focus:outline-none"
                  style={{ borderColor: '#0097b2', color: '#E0F7FA' }}
                />
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border rounded text-sm focus:outline-none"
                  style={{ borderColor: '#0097b2', color: '#E0F7FA' }}
                >
                  <option value="" className="bg-gray-900">Select Category</option>
                  <option value="technical" className="bg-gray-900">Technical Issue</option>
                  <option value="billing" className="bg-gray-900">Billing</option>
                  <option value="feature" className="bg-gray-900">Feature Request</option>
                </select>
                <textarea
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  placeholder="Describe your issue..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border rounded text-sm placeholder-white/40 focus:outline-none resize-none"
                  style={{ borderColor: '#0097b2', color: '#E0F7FA' }}
                />
                {ticketMessage && (
                  <div className="text-xs" style={{ color: ticketStatus === 'success' ? '#10b981' : ticketStatus === 'error' ? '#ef4444' : '#D4AF37' }}>
                    {ticketMessage}
                  </div>
                )}
                <button
                  onClick={handleTicketSubmit}
                  disabled={ticketStatus === 'submitting'}
                  className="w-full px-4 py-2 bg-gradient-to-r from-[#0097b2] to-[#226683] rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ color: '#E0F7FA' }}
                >
                  {ticketStatus === 'submitting' ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
        <details className="mb-6">
          <summary className="cursor-pointer bg-white/10 backdrop-blur-sm rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:bg-white/15 transition-colors">
            <div className="bg-gradient-to-r from-[#D4AF37] to-[#0097b2] px-4 py-2 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#0A2540]">
                Advanced Settings
              </h2>
              <span className="text-xs font-medium" style={{ color: '#0A2540' }}>▼</span>
            </div>
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <div className="bg-gradient-to-r from-[#D4AF37] to-[#0097b2] px-4 py-2 rounded-t-lg">
                <h2 className="text-xl font-bold text-[#0A2540]">
                  System Instructions
                </h2>
              </div>
            <div className="p-6">
            <textarea
              value={systemInstructions}
              onChange={(e) => {
                setSystemInstructions(e.target.value);
                const hasViolation = validateSafety(e.target.value);
                setSafetyViolation(hasViolation);
                if (hasViolation) {
                  setShowSafetyToast(true);
                  setTimeout(() => setShowSafetyToast(false), 5000);
                }
              }}
              placeholder="Define your bot's mission and personality..."
              rows={6}
              className="w-full px-3 py-2 bg-white/5 border rounded text-sm placeholder-white/40 focus:outline-none resize-none"
              style={{ borderColor: safetyViolation ? '#ef4444' : '#0097b2', color: '#E0F7FA' }}
            />
            {showSafetyToast && (
              <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs">
                Instruction contains restricted terms. Please align with OVG Safety Guidelines.
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setTestMessages([])}
                className="px-4 py-2 bg-gradient-to-r from-[#0097b2] to-[#226683] rounded text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ color: '#E0F7FA' }}
              >
                Reset Test Chat
              </button>
              <button
                onClick={saveVoiceSettings}
                disabled={safetyViolation || !legalAccepted}
                className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#A67C00] rounded text-sm font-bold hover:from-[#E5C158] hover:to-[#B89630] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: '#0A2540' }}
              >
                Save Settings
              </button>
            </div>
            <div className="mt-4 flex items-start gap-2">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded"
                style={{ accentColor: '#0097b2' }}
              />
              <label className="text-xs cursor-pointer font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
                I accept responsibility for these instructions
              </label>
            </div>
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#0097b230' }}>
              <p className="text-xs leading-relaxed font-medium" style={{ color: 'rgba(224, 247, 250, 0.5)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
                By saving these instructions, you acknowledge that you are responsible for the AI's output and that it complies with your local regulations and OVG's Terms of Service.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: '#0097b230' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#D4AF37' }}>
                Voice Mode
              </h3>
              <VoiceMode
                selectedVoice={selectedVoice}
                onVoiceChange={setSelectedVoice}
                audioEngineStatus={audioEngineStatus}
                onTranscript={handleVoiceTranscript}
              />
              <button
                onClick={saveVoiceSettings}
                className="w-full px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#A67C00] rounded text-sm font-bold hover:from-[#E5C158] hover:to-[#B89630] transition-all"
                style={{ color: '#0A2540' }}
              >
                Save Voice Settings
              </button>
            </div>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: '#0097b230' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#D4AF37' }}>
                Video Showcase
              </h3>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Enter VideoPad URL (Vercel/AWS)..."
                className="w-full px-3 py-2 bg-white/5 border rounded text-sm font-medium placeholder-white/40 focus:outline-none mb-3"
                style={{ borderColor: '#0097b2', color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}
              />
              <div className="flex gap-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVideoPreview}
                    onChange={(e) => setShowVideoPreview(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#0097b2' }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Preview in Widget Frame</span>
                </label>
              </div>
              {showVideoPreview && videoUrl && (
                <div className="mb-3 rounded overflow-hidden" style={{ borderColor: '#0097b2', borderWidth: '1px', borderStyle: 'solid' }}>
                  <div className="bg-white/5 p-3 border-b" style={{ borderColor: '#0097b230' }}>
                    <div className="text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Widget Preview</div>
                  </div>
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
              <button
                onClick={() => console.log('Video URL saved:', videoUrl)}
                className="w-full px-4 py-2 bg-gradient-to-r from-[#A67C00] via-[#F9E498] to-[#D4AF37] rounded text-sm font-bold hover:from-[#B89630] hover:via-[#FAF5D6] hover:to-[#E5C158] transition-all"
                style={{ color: '#0A2540' }}
              >
                Save Video URL
              </button>
            </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.3)]">
            <div className="bg-gradient-to-r from-[#D4AF37] to-[#0097b2] px-4 py-2 rounded-t-lg">
              <h2 className="text-xl font-bold text-[#0A2540]">
                Interaction Preview
              </h2>
            </div>
            <div className="p-6">
            <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
              {testMessages.length === 0 && (
                <div className="text-center text-sm font-medium py-8" style={{ color: 'rgba(224, 247, 250, 0.4)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
                  Start a conversation to test your bot's personality
                </div>
              )}
              {testMessages.map((msg) => (
                <div key={msg.id} className={`bg-white/5 rounded p-3 border-l-2 ${msg.role === 'user' ? 'border-[#0097b2]' : ''}`} style={{ borderColor: msg.role === 'ai' ? '#D4AF37' : '#0097b2' }}>
                  <div className="text-sm font-semibold" style={{ color: msg.role === 'user' ? '#0097b2' : '#D4AF37' }}>
                    {msg.role === 'user' ? 'You' : 'Test Bot'}
                  </div>
                  <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(224, 247, 250, 0.8)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>{msg.text}</div>
                </div>
              ))}
              {isTestLoading && (
                <div className="bg-white/5 rounded p-3 border-l-2" style={{ borderColor: '#0097b2' }}>
                  <div className="text-sm font-semibold" style={{ color: '#0097b2' }}>Test Bot</div>
                  <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Brain Processing...</div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 overflow-hidden">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTestMessage();
                  }
                }}
                placeholder="Test your bot..."
                className="w-full sm:flex-1 px-3 py-2 bg-white/5 border rounded text-sm font-medium placeholder-white/40 focus:outline-none"
                style={{ borderColor: '#0097b2', color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}
              />
              <button
                onClick={handleTestMessage}
                disabled={isTestLoading || !testInput.trim()}
                className="w-full sm:w-auto px-4 py-4 bg-gradient-to-r from-[#0097b2] to-[#226683] rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                Test
              </button>
            </div>
            </div>
          </div>
        </div>
        </details>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          <div className="bg-gradient-to-r from-[#D4AF37] to-[#0097b2] px-4 py-2 rounded-t-lg">
            <h2 className="text-xl font-bold text-[#0A2540]">
              Install OVG Engage on Your Site
            </h2>
          </div>
          <div className="p-6">
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#0097b2]/30">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-[#0097b2] font-mono">embed.js</span>
              <button
                onClick={handleCopyToClipboard}
                className="px-4 py-2 rounded text-xs font-semibold hover:scale-105 transition-transform"
                style={{
                  background: 'rgba(212, 175, 55, 0.8)',
                  backdropFilter: 'blur(10px)',
                  color: '#0A2540',
                  border: '1px solid #D4AF37'
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs text-gray-300 font-mono overflow-x-auto">
              <code>
                <span className="text-purple-400">&lt;script</span> <span className="text-blue-400">src</span>=<span className="text-green-400">"https://cdn.omniverge.global/engage/widget.js"</span> <span className="text-blue-400">data-tenant</span>=<span className="text-green-400">"{effectiveTenantId}"</span><span className="text-purple-400">&gt;&lt;/script&gt;</span>
              </code>
            </pre>
          </div>
          <div className="mt-4 text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.5)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
            Paste this code before the closing <code className="text-[#0097b2]">&lt;/body&gt;</code> tag on your website.
          </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ClientDashboard;
