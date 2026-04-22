export interface AudioEngineConfig {
  voiceId: string;
  apiKey?: string;
}

export interface AudioEngineResponse {
  audioUrl: string;
  engine: string;
  latency: number;
}

export const generateSpeech = async (
  text: string,
  config: AudioEngineConfig
): Promise<AudioEngineResponse> => {
  const startTime = Date.now();

  // Try CanopyLabs API
  try {
    console.log('[VoiceStack] Attempting CanopyLabs API...');
    const result = await tryCanopyLabs(text, config);
    const latency = Date.now() - startTime;
    console.log(`[VoiceStack] CanopyLabs succeeded in ${latency}ms`);
    return { audioUrl: result, engine: 'CanopyLabs', latency };
  } catch (error) {
    console.log('[VoiceStack] CanopyLabs failed, falling back to ElevenLabs...');
  }

  // Try ElevenLabs API
  try {
    console.log('[VoiceStack] Attempting ElevenLabs API...');
    const result = await tryElevenLabs(text, config);
    const latency = Date.now() - startTime;
    console.log(`[VoiceStack] ElevenLabs succeeded in ${latency}ms`);
    return { audioUrl: result, engine: 'ElevenLabs', latency };
  } catch (error) {
    console.log('[VoiceStack] ElevenLabs failed, falling back to xAI...');
  }

  // Try xAI API
  try {
    console.log('[VoiceStack] Attempting xAI API...');
    const result = await tryXAI(text, config);
    const latency = Date.now() - startTime;
    console.log(`[VoiceStack] xAI succeeded in ${latency}ms`);
    return { audioUrl: result, engine: 'xAI', latency };
  } catch (error) {
    console.log('[VoiceStack] xAI failed, falling back to native browser synthesis...');
  }

  // Final fallback: Native window.speechSynthesis
  try {
    console.log('[VoiceStack] Attempting native browser synthesis...');
    const result = await tryNativeBrowser(text);
    const latency = Date.now() - startTime;
    console.log(`[VoiceStack] Native browser synthesis succeeded in ${latency}ms`);
    return { audioUrl: result, engine: 'Browser', latency };
  } catch (error) {
    console.error('[VoiceStack] All audio engines failed');
    throw new Error('All audio engines failed');
  }
};

const tryCanopyLabs = async (text: string, config: AudioEngineConfig): Promise<string> => {
  const response = await fetch('/api/tts/canopy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId: config.voiceId, apiKey: config.apiKey })
  });

  if (!response.ok) throw new Error('CanopyLabs API failed');
  
  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
};

const tryElevenLabs = async (text: string, config: AudioEngineConfig): Promise<string> => {
  const response = await fetch('/api/tts/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId: config.voiceId, apiKey: config.apiKey })
  });

  if (!response.ok) throw new Error('ElevenLabs API failed');
  
  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
};

const tryXAI = async (text: string, config: AudioEngineConfig): Promise<string> => {
  const response = await fetch('/api/tts/xai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId: config.voiceId, apiKey: config.apiKey })
  });

  if (!response.ok) throw new Error('xAI API failed');
  
  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
};

const tryNativeBrowser = async (text: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Browser does not support speech synthesis'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve('native://speech');
    utterance.onerror = () => reject(new Error('Native synthesis failed'));
    
    window.speechSynthesis.speak(utterance);
  });
};
