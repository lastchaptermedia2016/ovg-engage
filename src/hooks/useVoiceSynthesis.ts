import { useRef, useEffect, useState, useCallback } from 'react';

interface AudioAnalysis {
  frequencyData: Uint8Array;
  volume: number;
  dominantFrequency: number;
}

interface UseVoiceSynthesisProps {
  onAudioAnalysis?: (analysis: AudioAnalysis) => void;
  orpheusAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

export const useVoiceSynthesis = ({ onAudioAnalysis, orpheusAudioRef }: UseVoiceSynthesisProps = {}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRefRef = useRef<MediaElementAudioSourceNode | null>(null);
  const userSourceRefRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isOrpheusSpeaking, setIsOrpheusSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  // Initialize audio context for Orpheus audio
  useEffect(() => {
    if (!orpheusAudioRef?.current) return;

    const setupAudioAnalysis = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();

        // Configure for FFT analysis
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Connect Orpheus audio element
        const audioElement = orpheusAudioRef.current;
        if (audioElement) {
          const source = audioContext.createMediaElementSource(audioElement);
          source.connect(analyser);
          analyser.connect(audioContext.destination);
          sourceRefRef.current = source;
        }

        // Detect when Orpheus is speaking
        audioElement.addEventListener('play', async () => {
          // Resume AudioContext to bypass browser muting
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('🔊 AudioContext resumed');
          }
          setIsOrpheusSpeaking(true);
          console.log('🔊 Orpheus started speaking');
        });
        audioElement.addEventListener('pause', () => {
          setIsOrpheusSpeaking(false);
          console.log('🔊 Orpheus paused');
        });
        audioElement.addEventListener('ended', () => {
          setIsOrpheusSpeaking(false);
          console.log('🔊 Orpheus ended');
        });

        startAnalysis();
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [orpheusAudioRef]);

  // Setup user microphone input
  const setupUserMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (audioContextRef.current && analyserRef.current) {
        const userSource = audioContextRef.current.createMediaStreamSource(stream);
        userSource.connect(analyserRef.current);
        userSourceRefRef.current = userSource;
        setIsUserSpeaking(true);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }, []);

  const stopUserMicrophone = useCallback(() => {
    if (userSourceRefRef.current) {
      userSourceRefRef.current.disconnect();
      userSourceRefRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.enabled = false; // Stop the data flow immediately
        track.stop();          // Shut down the hardware
      });
      streamRef.current = null;
    }

    setIsUserSpeaking(false);
  }, []);

  const startAnalysis = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      animationRef.current = requestAnimationFrame(analyze);

      analyser.getByteFrequencyData(dataArray);

      // Calculate volume (average amplitude)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const volume = sum / bufferLength;

      // Find dominant frequency
      let maxAmplitude = 0;
      let dominantFreq = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxAmplitude) {
          maxAmplitude = dataArray[i];
          dominantFreq = i * (analyser.context.sampleRate / 2) / bufferLength;
        }
      }

      // Determine who is speaking based on frequency characteristics
      // Orpheus (AI voice) tends to have more mid-range frequencies
      // User voice tends to have more variation in high frequencies
      const midRangeEnergy = dataArray.slice(bufferLength / 4, bufferLength / 2).reduce((a, b) => a + b, 0);
      const highRangeEnergy = dataArray.slice(bufferLength / 2, bufferLength * 3 / 4).reduce((a, b) => a + b, 0);
      
      const isLikelyOrpheus = midRangeEnergy > highRangeEnergy * 1.5 && volume > 10;

      if (onAudioAnalysis) {
        onAudioAnalysis({
          frequencyData: dataArray,
          volume,
          dominantFrequency: dominantFreq
        });
      }
    };

    analyze();
  };

  // Get gradient based on who is speaking
  const getGradient = () => {
    if (isOrpheusSpeaking) {
      return {
        start: '#D4AF37', // Deep Gold
        end: '#FFBF00',   // Amber
        description: 'Orpheus Speaking: Deep Gold-to-Amber'
      };
    }
    if (isUserSpeaking) {
      return {
        start: '#E0F7FA', // Cyan
        end: '#C0C0C0',   // Silver
        description: 'User Speaking: Cyan-to-Silver'
      };
    }
    return {
      start: '#D4AF37',
      end: '#E0F7FA',
      description: 'Default: Gold-to-Cyan'
    };
  };

  // Get halo effect based on volume
  const getHaloEffect = (volume: number) => {
    const intensity = Math.min(volume / 100, 1);
    return {
      shadowBlur: 10 + intensity * 30,
      shadowColor: isOrpheusSpeaking ? '#D4AF37' : '#0097b2',
      shadowOffsetX: 0,
      shadowOffsetY: 0
    };
  };

  // Process FFT data for wave visualization
  const processWaveData = (frequencyData: Uint8Array) => {
    const processedData: number[] = [];
    const bassRange = frequencyData.slice(0, frequencyData.length / 8);
    const midRange = frequencyData.slice(frequencyData.length / 8, frequencyData.length / 2);
    const highRange = frequencyData.slice(frequencyData.length / 2);

    // Deep bass tones cause center expansion
    const bassEnergy = bassRange.reduce((a, b) => a + b, 0) / bassRange.length;
    const expansionFactor = 1 + (bassEnergy / 255) * 0.5;

    // "S" and "T" sounds create sharp spikes on edges (high frequency)
    const highEnergy = highRange.reduce((a, b) => a + b, 0) / highRange.length;
    const spikeIntensity = highEnergy / 255;

    // Process each point
    for (let i = 0; i < frequencyData.length; i++) {
      const value = frequencyData[i];
      const normalizedValue = value / 255;

      // Apply expansion to center (bass)
      const isCenter = i > frequencyData.length * 0.3 && i < frequencyData.length * 0.7;
      const expandedValue = isCenter ? normalizedValue * expansionFactor : normalizedValue;

      // Apply spikes to edges (high frequency)
      const isEdge = i < frequencyData.length * 0.2 || i > frequencyData.length * 0.8;
      const spikedValue = isEdge ? Math.min(expandedValue + spikeIntensity * 0.5, 1) : expandedValue;

      processedData.push(spikedValue);
    }

    return processedData;
  };

  return {
    isOrpheusSpeaking,
    isUserSpeaking,
    setupUserMicrophone,
    stopUserMicrophone,
    getGradient,
    getHaloEffect,
    processWaveData,
    audioContext: audioContextRef.current,
    analyser: analyserRef.current
  };
};

export default useVoiceSynthesis;
