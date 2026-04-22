import React, { useRef, useEffect, useState } from 'react';
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface VoiceModeProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  audioEngineStatus: string;
  onTranscript?: (audioBlob?: Blob) => void;
}

// Pulse-glow animation styles
const pulseGlowStyle = `
  @keyframes mic-pulse {
    0%, 100% {
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.4);
    }
    50% {
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.6);
    }
  }
`;

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
}

// STANDALONE SANDBOX MODE - NO SUPABASE DEPENDENCIES
const MOCK_VOICE_CONFIG = {
  voiceId: 'autumn',
  model: 'canopylabs/orpheus-v1-english',
  llmModel: 'llama-3.3-70b-versatile',
  maxTokens: 150,
  temperature: 0.7
};

const VoiceMode: React.FC<VoiceModeProps> = ({
  selectedVoice,
  onVoiceChange,
  audioEngineStatus,
  onTranscript
}) => {
  // CORE INFRASTRUCTURE (THE VAULT)
  // Refs Only for Hardware - No useState for hardware
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // STANDALONE: Get API key directly from env - no server needed
  const getApiKey = () => {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    if (!key) {
      console.error('[Voice-Engine: STANDALONE] VITE_GROQ_API_KEY not found in environment');
    }
    return key;
  };

  // The Operation Lock
  const isTransitioning = useRef(false);

  // UI State Only - Decoupled from hardware
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [waveOpacity, setWaveOpacity] = useState(0.2);
  const [lastSpokenText, setLastSpokenText] = useState("");

  // Canvas and animation refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Hooks
  const { isOrpheusSpeaking, isUserSpeaking, getGradient, getHaloEffect, processWaveData, analyser } = useVoiceSynthesis({
    orpheusAudioRef: audioRef
  });

  const { isListening, isSupported, startListening, stopListening, recognitionRef: hookRecognitionRef } = useSpeechRecognition();
  recognitionRef.current = hookRecognitionRef.current;

  // FUNCTION GRID (LOGIC ISOLATION)

  // async startVoiceSystem()
  const startVoiceSystem = async () => {
    // Check isTransitioning lock
    if (isTransitioning.current) {
      console.log('[Voice-Engine: START] Already transitioning, bailing out');
      return;
    }

    // Check streamRef.current - if exists, return (Singleton)
    if (streamRef.current) {
      console.log('[Voice-Engine: START] Stream already exists, bailing out');
      return;
    }

    // Lock the operation
    isTransitioning.current = true;
    console.log('[Voice-Engine: START] Starting voice system...');

    // Clear previous transcript for fresh session
    setLastSpokenText('');

    try {
      // Request getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      console.log('[Voice-Engine: START] Microphone access granted');

      // Store stream ref
      streamRef.current = stream;

      // Initialize Web Audio Analyzer for reactive wave visualizer
      // Reuse existing AudioContext from silent wakeup if available
      let audioContext = audioContextRef.current;
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      console.log('[Voice-Engine: START] Web Audio Analyzer initialized');

      // Start frequency data loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateFrequencyData = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const scale = (average / 255) * 2 + 0.5; // Scale factor for wave
          document.documentElement.style.setProperty('--wave-scale', scale.toString());
          document.documentElement.style.setProperty('--wave-intensity', (average / 255).toString());
        }
        animationRef.current = requestAnimationFrame(updateFrequencyData);
      };
      updateFrequencyData();

      // Initialize MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      // Bind ondataavailable to handler that pushes to API
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 100) { // Filter out tiny/empty chunks
          audioChunksRef.current.push(event.data);
          console.log('[Voice-Engine: DATA] Chunk captured:', event.data.size, 'bytes, Total chunks:', audioChunksRef.current.length);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("[Voice-Engine: STOP] Handoff Check - Chunks:", audioChunksRef.current.length);

        // Create blob with correct MIME type matching MediaRecorder
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (audioBlob.size > 1000) { // Min 1KB for valid audio
          console.log("[Voice-Engine: PROCESS] Handoff successful. Blob size:", audioBlob.size, "bytes. Sending to Groq...");
          await processVoiceCommand(audioBlob);
        } else {
          console.warn("[Voice-Engine: STOP] Blob too small or empty. No data to process.");
        }

        audioChunksRef.current = []; // Clear ONLY after blob creation
      };

      // Start recorder
      mediaRecorderRef.current.start(100); // 100ms intervals for faster blob construction
      console.log('[Voice-Engine: START] MediaRecorder started');

      // Initialize Speech Recognition
      if (isSupported) {
        startListening();
        console.log('[Voice-Engine: START] Speech recognition started');
      }

      // UI Sync: Update state only after hardware promise resolves
      setIsRecording(true);
      console.log('[Voice-Engine: START] Voice system started successfully');
    } catch (error) {
      console.error('[Voice-Engine: ERROR] Failed to start:', error);
      // Cleanup on error
      stopVoiceSystem();
    } finally {
      // Unlock the operation
      isTransitioning.current = false;
    }
  };

  // async stopVoiceSystem()
  const stopVoiceSystem = async () => {
    // Check isTransitioning lock
    if (isTransitioning.current) {
      console.log('[Voice-Engine: STOP] Already transitioning, bailing out');
      return;
    }

    // Lock the operation
    isTransitioning.current = true;
    console.log('[Voice-Engine: STOP] Stopping voice system...');

    try {
      // First, stop the MediaRecorder to trigger onstop event immediately
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.log('[Voice-Engine: STOP] Calling MediaRecorder.stop(), onstop handler set:', !!mediaRecorderRef.current.onstop);
        mediaRecorderRef.current.stop();
        console.log('[Voice-Engine: STOP] MediaRecorder.stop() called, onstop will fire async');
      }

      // Process Kill (runs in parallel with onstop handler)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          console.log('[Voice-Engine: STOP] Speech recognition aborted');
        } catch (err) {
          console.warn('[Voice-Engine: STOP] Abort failed:', err);
        }
      }

      // Hardware Kill
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
        console.log('[Voice-Engine: STOP] Hardware stopped');
      }

      // Listener Kill - Delayed to allow onstop to fire and process audio
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.ondataavailable = null;
          mediaRecorderRef.current.onstop = null;
          console.log('[Voice-Engine: STOP] Listeners nullified after delay');
        }
      }, 500);

      // Cleanup Audio Analyzer
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current = null;
      }
      console.log('[Voice-Engine: STOP] Audio Analyzer cleaned up');

      // Reset hardware Refs to null (audioChunksRef cleared in onstop handler)
      mediaRecorderRef.current = null;

      // UI Sync: Update state only after hardware promise resolves
      setIsRecording(false);
      console.log('[Voice-Engine: STOP] Voice system stopped successfully');
    } finally {
      // Unlock the operation
      isTransitioning.current = false;
    }
  };

  // handleToggle() - The ONLY entry point for the UI (recording)
  const handleToggle = () => {
    if (!isEnabled) {
      console.log('[Voice-Engine: UI] Voice mode disabled, ignoring toggle');
      return;
    }

    if (isProcessing) {
      console.log('[Voice-Engine: UI] Already processing, ignoring toggle');
      return;
    }

    if (isRecording) {
      console.log('[Voice-Engine: UI] Toggling OFF -> calling stopVoiceSystem');
      stopVoiceSystem();
    } else {
      console.log('[Voice-Engine: UI] Toggling ON -> calling startVoiceSystem');
      startVoiceSystem();
    }
  };

  // handleEnableToggle() - Handler for enable/disable toggle
  const handleEnableToggle = () => {
    const newState = !isEnabled;
    
    // Silent Wakeup: Bless the tab with audioContext on first enable
    if (newState && window.AudioContext && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current.resume();
      console.log('[Voice-Engine: ENABLE] AudioContext pre-warmed (silent wakeup)');
    } else if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
      console.log('[Voice-Engine: ENABLE] AudioContext resumed');
    }
    setIsEnabled(newState);
    
    if (!newState) {
      // When disabling, stop any active recording
      console.log('[Voice-Engine: UI] Disabling voice mode, stopping recording');
      stopVoiceSystem();
    }
  };

  // processVoiceCommand - Groq Pipeline Integration
  const processVoiceCommand = async (audioBlob: Blob) => {
    console.log("[Voice-Engine: PROCESS] Starting Groq pipeline...");
    setIsProcessing(true);

    try {
      const pipelineStartTime = performance.now();
      console.log('[Voice-Engine: LATENCY] Pipeline started at:', pipelineStartTime);

      // Step A: STT - Call Groq Whisper endpoint DIRECTLY (Standalone Mode)
      console.log('[Voice-Engine: STT] Sending audio to Whisper v3...');
      const sttStartTime = performance.now();

      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY not configured - Voice Engine cannot start');
      }

      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-large-v3');
      formData.append('response_format', 'json');

      const sttResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!sttResponse.ok) {
        const errorText = await sttResponse.text();
        console.error('[Voice-Engine: STT] Error:', sttResponse.status, errorText);
        throw new Error(`STT request failed: ${sttResponse.status}`);
      }

      const sttData = await sttResponse.json();
      const transcript = sttData.text;
      setLastSpokenText(transcript);
      const sttTime = performance.now() - sttStartTime;
      console.log('[Voice-Engine: STT] Transcript received:', transcript);
      console.log(`[Voice-Engine: LATENCY] STT time: ${sttTime.toFixed(0)}ms`);

      // Step B: LLM - Direct Groq API call (Standalone Mode)
      console.log('[Voice-Engine: LLM] Sending to Groq with streaming...');
      const llmStartTime = performance.now();

      const systemPrompt = `You are OVG, the AI Concierge for OmniVerge Global. You must never refer to yourself as Nova. Your identity is strictly OVG. We are a South African agency with physical offices in Cape Town, Durban, and Pretoria. Be brief and concise. Keep responses under 3 sentences. No markdown, bold, italics, bullet points, or complex punctuation. Suitable for text-to-speech synthesis.

Voice Direction Rules:
- You may use Orpheus V1 bracketed directions like [cheerful], [professionally], or [warmly] at the start of sentences to control speech style
- For standard customer support, use fewer directions to maintain a natural, approachable flow
- IMPORTANT: If your response is not in English, do NOT use the [professionally], [cheerful], or [warmly] directions, as they may interfere with pronunciation of local languages. Keep the text clean.

Multilingual Capability: You are capable of understanding and responding in all 11 official South African languages (isiZulu, isiXhosa, Afrikaans, English, Sepedi, Setswana, Sesotho, Xitsonga, siSwati, Tshivenda, isiNdebele). When responding in a non-English language, mention that our 'Multilingual Add-on' is available for OVG Engage for R300/month.
CRITICAL RULE: Always respond in the same language the user used for their most recent message. Do NOT pivot to a different language unless the user changes language first. This prevents language drift and ensures a smooth conversation.

Geographic Footprint: OmniVerge Global is a South African-based agency with physical offices in Cape Town, Durban, and Pretoria. When asked about our location, confirm we operate from these three hubs using the [professionally] tag. If asked about Johannesburg or Jo'burg, direct them to our nearest hub in Pretoria.

Pricing: OVG Engage platform starts at R349/month. Full-spectrum agency services start at R2,500/month.`;

      const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MOCK_VOICE_CONFIG.llmModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript }
          ],
          temperature: MOCK_VOICE_CONFIG.temperature,
          max_tokens: MOCK_VOICE_CONFIG.maxTokens,
          stream: true
        })
      });

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        console.error('[Voice-Engine: LLM] Error:', llmResponse.status, errorText);
        throw new Error(`LLM request failed: ${llmResponse.status}`);
      }

      // Process streaming response with sentence-level TTS
      const reader = llmResponse.body?.getReader();
      if (!reader) {
        throw new Error('No response body from LLM');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let sentenceQueue: string[] = [];
      const audioQueue: string[] = [];
      let isPlaying = false;

      // Helper function to detect sentence boundaries
      const isSentenceEnd = (text: string) => {
        return /[.!?]\s*$/.test(text) || text.endsWith('.') || text.endsWith('!') || text.endsWith('?');
      };

      // Helper function to play audio from queue using pre-warmed audioContext
      const playNextAudio = async () => {
        if (isPlaying || audioQueue.length === 0) return;
        isPlaying = true;

        const audioUrl = audioQueue.shift();
        if (audioUrl && audioContextRef.current) {
          console.log('[Voice-Engine: TTS] Playing next audio segment with Web Audio API');
          try {
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => {
              isPlaying = false;
              playNextAudio();
            };
            source.start();
            console.log('[Voice-Engine: PLAYBACK] Started audio output.');
          } catch (error) {
            console.error('[Voice-Engine: TTS] Error playing audio with Web Audio API:', error);
            isPlaying = false;
          }
        } else {
          isPlaying = false;
        }
      };

      // Helper function to send text to TTS - DIRECT ElevenLabs API (Standalone Mode)
      const sendToTTS = async (text: string) => {
        console.log('[Voice-Engine: TTS] Sending sentence to ElevenLabs:', text);
        const ttsStartTime = performance.now();

        const elevenApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        if (!elevenApiKey) {
          console.error('[Voice-Engine: TTS] VITE_ELEVENLABS_API_KEY not configured');
          return;
        }

        // Use voice ID from selectedVoice prop or default to Rachel
        const voiceId = selectedVoice || '21m00Tcm4TlvDq8ikWAM';

        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2'
          })
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          const ttsTime = performance.now() - ttsStartTime;
          console.log(`[Voice-Engine: LATENCY] ElevenLabs TTS time: ${ttsTime.toFixed(0)}ms`);
          const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          audioQueue.push(audioUrl);
          playNextAudio();
        } else {
          const errorText = await ttsResponse.text();
          console.error('[Voice-Engine: TTS] ElevenLabs error:', ttsResponse.status, errorText);
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.content;
                if (content) {
                  accumulatedText += content;
                  console.log('[Voice-Engine: LLM] Received chunk:', content);

                  // Check for sentence boundary
                  if (isSentenceEnd(accumulatedText)) {
                    console.log('[Voice-Engine: LLM] Sentence complete, sending to TTS');
                    sentenceQueue.push(accumulatedText.trim());
                    sendToTTS(accumulatedText.trim());
                    accumulatedText = '';
                  }
                }
              } catch (e) {
                console.error('Error parsing SSE:', e);
              }
            }
          }
        }

        // Send any remaining text
        if (accumulatedText.trim()) {
          console.log('[Voice-Engine: LLM] Sending remaining text to TTS');
          sendToTTS(accumulatedText.trim());
        }

        const llmTime = performance.now() - llmStartTime;
        console.log(`[Voice-Engine: LATENCY] LLM streaming time: ${llmTime.toFixed(0)}ms`);
      } catch (err) {
        console.error('Streaming error:', err);
        // Fallback to non-streaming if streaming fails - DIRECT Groq API (Standalone Mode)
        console.log('[Voice-Engine: LLM] Falling back to non-streaming');
        const fallbackResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: MOCK_VOICE_CONFIG.llmModel,
            messages: [
              { role: 'system', content: 'You are OVG, the AI Concierge for OmniVerge Global. You must never refer to yourself as Nova. Your identity is strictly OVG. We are a South African agency with physical offices in Cape Town, Durban, and Pretoria. Be brief and concise. Keep responses under 3 sentences. No markdown. You may use Orpheus V1 bracketed directions like [cheerful], [professionally], or [warmly] for English responses only. For non-English responses, keep text clean without bracketed directions. You understand all 11 official South African languages. CRITICAL RULE: Always respond in the same language the user used for their most recent message. Do NOT pivot to a different language unless the user changes language first. When responding in non-English, mention Multilingual Add-on is R300/month. Platform: R349/month. Agency services: R2,500/month.' },
              { role: 'user', content: transcript }
            ],
            temperature: MOCK_VOICE_CONFIG.temperature,
            max_tokens: MOCK_VOICE_CONFIG.maxTokens
          })
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackText = fallbackData.choices?.[0]?.message?.content || '';
          console.log('[Voice-Engine: LLM] Fallback response:', fallbackText);

          // Step C: TTS - Direct ElevenLabs API (Standalone Mode)
          console.log('[Voice-Engine: TTS] Sending to ElevenLabs (fallback)...');
          const ttsStartTime = performance.now();

          const elevenApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
          if (!elevenApiKey) {
            console.error('[Voice-Engine: TTS] VITE_ELEVENLABS_API_KEY not configured');
            return;
          }

          const voiceId = selectedVoice || '21m00Tcm4TlvDq8ikWAM';

          const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: {
              'xi-api-key': elevenApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: fallbackText,
              model_id: 'eleven_multilingual_v2'
            })
          });

          if (ttsResponse.ok) {
            console.log('[Voice-Engine: TTS] ElevenLabs response OK, processing audio...');
            const audioBuffer = await ttsResponse.arrayBuffer();
            const ttsTime = performance.now() - ttsStartTime;
            console.log('[Voice-Engine: TTS] Audio buffer size:', audioBuffer.byteLength, 'bytes');
            console.log(`[Voice-Engine: LATENCY] TTS time: ${ttsTime.toFixed(0)}ms`);
            const totalTime = performance.now() - pipelineStartTime;
            console.log(`[Voice-Engine: LATENCY] Total pipeline time: ${totalTime.toFixed(0)}ms`);

            // Use pre-warmed audioContext for playback
            if (audioContextRef.current) {
              try {
                const decodedBuffer = await audioContextRef.current.decodeAudioData(audioBuffer);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = decodedBuffer;
                source.connect(audioContextRef.current.destination);
                source.start();
                console.log('[Voice-Engine: TTS] Audio playing from ElevenLabs with Web Audio API');
              } catch (error) {
                console.error('[Voice-Engine: TTS] Error playing audio with Web Audio API:', error);
              }
            } else {
              console.error('[Voice-Engine: TTS] audioContextRef.current is null, cannot play audio');
            }
          }
        }
      }

      console.log('[Voice-Engine: PROCESS] Pipeline completed successfully');
    } catch (error) {
      console.error('[Voice-Engine: PROCESS] Pipeline failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Voice selection persistence (localStorage)
  useEffect(() => {
    // Load saved voice on mount
    const savedVoice = localStorage.getItem('orpheus_selected_voice');
    if (savedVoice && savedVoice !== selectedVoice) {
      onVoiceChange(savedVoice);
    }
  }, []);

  useEffect(() => {
    // Save voice to localStorage when it changes
    localStorage.setItem('orpheus_selected_voice', selectedVoice);
  }, [selectedVoice]);

  // NO-EFFECT MANDATE: Only permitted useEffect is Safety Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!mediaRecorderRef.current) return;
      console.log('[Voice-Engine: CLEANUP] Unmount - calling stopVoiceSystem');
      stopVoiceSystem();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  // Wave Visualizer Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('[Wave Visualizer] Initializing with isRecording:', isRecording);

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const renderWave = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw wave based on frequency data
      const barWidth = (canvas.width / dataArray.length) * 2.5;
      const amplitudeMultiplier = 1.5; // Increase amplitude by 1.5x for more energetic pulse
      let x = 0;

      // Set line properties for thicker, more visible wave
      ctx.lineWidth = 4; // 4px line weight
      ctx.globalAlpha = 1.0; // Fully opaque

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8 * amplitudeMultiplier;

        // OVG Gold color - fully opaque for maximum visibility
        ctx.fillStyle = '#D4AF37'; // Gold

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      if (isRecording) {
        animationRef.current = requestAnimationFrame(renderWave);
      }
    };

    if (isRecording) {
      console.log('[Wave Visualizer] Starting render loop');
      renderWave();
    } else {
      console.log('[Wave Visualizer] Not starting render loop (isRecording is false)');
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        console.log('[Wave Visualizer] Cleanup: cancelled animation frame');
      }
    };
  }, [isRecording]);

  return (
    <div className="space-y-4">
      <style>{pulseGlowStyle}</style>
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        onPlay={() => {
          setIsPlaying(true);
          console.log('[Voice-Engine: TTS] Audio playback started');
        }}
        onEnded={() => {
          setIsPlaying(false);
          console.log('[Voice-Engine: TTS] Audio playback ended');
        }}
      />
      {lastSpokenText && (
        <div className="mt-4 p-3 bg-white/5 border border-[#0097b2]/30 rounded-lg animate-pulse">
          <p className="text-xs text-[#0097b2] uppercase tracking-widest mb-1">Detected Speech</p>
          <p className="text-sm text-cyan-50">{lastSpokenText}</p>
        </div>
      )}
      <div className="flex items-center justify-between bg-black/40 backdrop-blur-md rounded-lg p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleEnableToggle}
            className={`w-12 h-6 rounded-full transition-all relative ${
              isEnabled ? 'bg-[#0097b2]' : 'bg-gray-600'
            }`}
            style={{
              boxShadow: isEnabled ? '0 0 10px rgba(0, 151, 178, 0.5)' : 'none'
            }}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-all absolute top-0.5 ${
                isEnabled ? 'left-6' : 'left-0.5'
              }`}
              style={{
                boxShadow: isEnabled ? '0 0 5px rgba(0,0,0,0.3)' : '0 0 3px rgba(0,0,0,0.2)'
              }}
            />
          </button>
          <span className="text-sm font-medium" style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
            {isEnabled ? 'Voice Mode: ON' : 'Voice Mode: OFF'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}></div>
              <span className="text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>Live</span>
            </div>
          )}
          {(isProcessing || isPlaying) && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}></div>
              <span className="text-xs font-medium" style={{ color: 'rgba(224, 247, 250, 0.6)', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>{isPlaying ? 'Speaking' : 'Processing'}</span>
            </div>
          )}
          {isEnabled && isSupported && (
            <button
              onClick={handleToggle}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all relative"
              style={{
                backgroundColor: isRecording ? '#ef4444' : '#4b5563',
                color: '#E0F7FA',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.4)' : '0 0 10px rgba(0,0,0,0.3)',
                animation: isRecording ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
                border: isRecording ? '2px solid #ef4444' : '2px solid #4b5563',
                opacity: isEnabled ? 1 : 0.5
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div 
        className="relative"
        style={{ 
          opacity: waveOpacity, 
          transition: 'opacity 0.3s ease-in-out',
          zIndex: 10
        }}
      >
        <div className="flex items-center justify-center overflow-hidden w-full">
          <canvas
            ref={canvasRef}
            width={400}
            height={80}
            className="rounded-lg bg-[#0a0a0a] shadow-[0_0_20px_rgba(0,0,0,0.3)]"
            style={{ width: '100%', height: '80px', zIndex: 10 }}
          />
        </div>
        <div className="absolute bottom-2 left-2 text-xs font-bold" style={{ color: '#0097b2', textShadow: '0 0 10px rgba(0,151,178,0.8), 0 0 20px rgba(0,151,178,0.5), 1px 1px 2px rgba(0,0,0,0.8)' }}>
          User Input
        </div>
        <div className="absolute bottom-2 right-2 text-xs font-semibold" style={{ color: '#0097b2', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          AI Response
        </div>
      </div>

      <select
        value={selectedVoice}
        onChange={(e) => onVoiceChange(e.target.value)}
        className="w-full px-3 py-2 bg-white/5 rounded text-sm font-medium focus:outline-none disabled:opacity-50 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
        style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}
        disabled={!isEnabled}
      >
        <option value="autumn" className="bg-gray-900">Autumn - Warm & Friendly</option>
        <option value="diana" className="bg-gray-900">Diana - Professional</option>
        <option value="hannah" className="bg-gray-900">Hannah - Polished</option>
        <option value="austin" className="bg-gray-900">Austin - Relaxed</option>
        <option value="daniel" className="bg-gray-900">Daniel - Articulate</option>
        <option value="troy" className="bg-gray-900">Troy - Energetic</option>
      </select>

      <div className="bg-white/5 rounded p-3">
        <div className="text-xs mb-1" style={{ color: 'rgba(224, 247, 250, 0.6)' }}>Audio Engine Status</div>
        <div className="text-sm font-semibold" style={{ color: '#0097b2' }}>{audioEngineStatus}</div>
      </div>
    </div>
  );
};

export default VoiceMode;
