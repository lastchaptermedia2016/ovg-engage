/**
 * Text-to-Speech API Endpoint
 * Protects ElevenLabs API key by proxying TTS requests server-side
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper function to set CORS headers
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'TTS API key not configured' });
  }

  try {
    const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Limit text length to prevent abuse
    if (text.length > 500) {
      return res.status(400).json({ error: 'Text too long (max 500 characters)' });
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return res.status(response.status).json({ error: 'TTS generation failed' });
    }

    // Stream the audio back to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    setCorsHeaders(res);
    
    // Get the audio blob and send it
    const audioBuffer = await response.arrayBuffer();
    res.send(Buffer.from(audioBuffer));

  } catch (error: any) {
    console.error('TTS endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}