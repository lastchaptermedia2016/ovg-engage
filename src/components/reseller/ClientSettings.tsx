import React, { useState } from 'react';

interface ClientSettingsProps {
  tenantId?: string;
  onVoiceChange?: (voiceId: string, defaultTone: string) => void;
}

interface OrpheusPersona {
  id: string;
  name: string;
  defaultTone: string;
  description: string;
}

const orpheusPersonas: OrpheusPersona[] = [
  { id: 'autumn', name: 'Autumn', defaultTone: '[warm and friendly]', description: 'Warm, conversational tone' },
  { id: 'diana', name: 'Diana', defaultTone: '[professional and authoritative]', description: 'Professional, confident tone' },
  { id: 'hannah', name: 'Hannah', defaultTone: '[professionally]', description: 'Polished, business-like tone' },
  { id: 'austin', name: 'Austin', defaultTone: '[casual and approachable]', description: 'Relaxed, friendly tone' },
  { id: 'daniel', name: 'Daniel', defaultTone: '[clear and articulate]', description: 'Precise, articulate tone' },
  { id: 'troy', name: 'Troy', defaultTone: '[energetic and enthusiastic]', description: 'Dynamic, upbeat tone' },
];

const ClientSettings: React.FC<ClientSettingsProps> = ({ tenantId, onVoiceChange }) => {
  const [selectedVoice, setSelectedVoice] = useState('hannah');
  const [defaultTone, setDefaultTone] = useState('[professionally]');

  const handleVoiceChange = (voiceId: string) => {
    const persona = orpheusPersonas.find(p => p.id === voiceId);
    if (persona) {
      setSelectedVoice(voiceId);
      setDefaultTone(persona.defaultTone);
      if (onVoiceChange) {
        onVoiceChange(voiceId, persona.defaultTone);
      }
    }
  };

  const handleToneChange = (tone: string) => {
    setDefaultTone(tone);
    if (onVoiceChange) {
      onVoiceChange(selectedVoice, tone);
    }
  };

  const saveSettings = async () => {
    try {
      // Save to database via API
      const response = await fetch('/api/reseller/voice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          voice_id: selectedVoice,
          default_tone: defaultTone
        })
      });

      if (response.ok) {
        console.log('Voice settings saved:', { voiceId: selectedVoice, defaultTone });
      }
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
          Orpheus Voice Selection
        </label>
        <select
          value={selectedVoice}
          onChange={(e) => handleVoiceChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 rounded text-sm font-medium focus:outline-none shadow-[0_0_20px_rgba(0,0,0,0.3)]"
          style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          {orpheusPersonas.map(persona => (
            <option key={persona.id} value={persona.id} className="bg-gray-900">
              {persona.name} - {persona.description}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}>
          Default Tone
        </label>
        <input
          type="text"
          value={defaultTone}
          onChange={(e) => handleToneChange(e.target.value)}
          placeholder="[professionally]"
          className="w-full px-3 py-2 bg-white/5 rounded text-sm font-medium placeholder-white/40 focus:outline-none shadow-[0_0_20px_rgba(0,0,0,0.3)]"
          style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}
        />
        <p className="text-xs mt-1" style={{ color: 'rgba(224, 247, 250, 0.5)' }}>
          This tone will be prepended to every Groq response to match the selected voice personality.
        </p>
      </div>

      <button
        onClick={saveSettings}
        className="w-full px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#0097b2] rounded text-sm font-semibold hover:opacity-90 transition-opacity"
        style={{ color: '#E0F7FA', textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)' }}
      >
        Save Voice Settings
      </button>

      <div className="p-4 bg-white/5 rounded border border-[#D4AF37]/20">
        <h4 className="text-sm font-semibold mb-2" style={{ color: '#D4AF37' }}>Orpheus Personas</h4>
        <div className="space-y-2 text-xs" style={{ color: 'rgba(224, 247, 250, 0.7)' }}>
          {orpheusPersonas.map(persona => (
            <div key={persona.id} className="flex justify-between">
              <span>{persona.name}</span>
              <span>{persona.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientSettings;
