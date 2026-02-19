
## Upgrade Chat Widget TTS to ElevenLabs with Rachel Voice

### Problem
The ElevenLabs API returns 401 because the previous API key was on a free tier with "unusual activity" restrictions. The user has now connected ElevenLabs via workspace settings, so a valid `ELEVENLABS_API_KEY` secret exists. The widget currently falls back to robotic browser TTS.

### Changes

#### 1. Update Edge Function (`supabase/functions/elevenlabs-tts/index.ts`)
- Change default voice ID from `EXAVITQu4vr4xnSDxMaL` (Sarah) to `21m00Tcm4TlvDq8ikWAM` (Rachel)
- Add `style: 0.0` to voice settings (per user request)
- Move `output_format` from URL path to query parameter (per ElevenLabs docs best practice)

#### 2. Update ChatWidget (`src/components/widget/ChatWidget.tsx`)
- Change voice ID in the `speak` function from `EXAVITQu4vr4xnSDxMaL` to `21m00Tcm4TlvDq8ikWAM`
- Add `console.log("ElevenLabs success")` on successful playback
- Add `console.log("ElevenLabs failed: [status]")` on error with status code
- Improve browser TTS fallback voice selection: prefer Natural/Google/Neural/WaveNet voices with `rate: 1.02`, `pitch: 1.05`, `volume: 0.92`
- No other structural changes needed -- consent, input bar, mic, lead form, animations all remain as-is

### Technical Details

**Edge function voice settings:**
```
stability: 0.5
similarity_boost: 0.75
style: 0.0
use_speaker_boost: true
speed: 1.0
```

**Fallback voice selection logic:**
```typescript
const voices = window.speechSynthesis.getVoices();
const preferred = voices.find(v => 
  /natural|google|neural|wavenet|female/i.test(v.name)
) || voices[0];
```

### Testing
1. Open preview in a new tab, hard refresh (Ctrl+Shift+R)
2. Click the floating bubble, accept consent
3. Send any message and listen for a natural Rachel voice reply
4. Open browser console and look for "ElevenLabs success" log
5. If you see "ElevenLabs failed", check the status code in the log
