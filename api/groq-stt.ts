import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Force-load environment variables using require for Vercel Edge Functions compatibility
if (typeof require !== 'undefined') {
  const path = require('path');
  const dotenv = require('dotenv');

  // Look for the .env file in the project root
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  console.log('DEBUG: Checking path:', path.resolve(process.cwd(), '.env'));
  console.log('DEBUG: Groq API Key found?', !!process.env.GROQ_API_KEY);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    // Enhanced fallback check to verify key is loaded before calling Groq SDK
    if (!apiKey || apiKey.length === 0 || apiKey === 'your-api-key-here') {
      console.log('DEBUG: Groq API Key is None/Empty or invalid');
      console.error('❌ GROQ API key not configured or invalid');
      return res.status(500).json({ error: 'GROQ API key not configured. Please check your .env file.' });
    }

    console.log('🔑 GROQ API key found, length:', apiKey.length);

    // Collect raw body as buffer
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks);

    console.log('📤 Received audio data, size:', rawBody.length, 'bytes');

    // Get content type from headers
    const contentType = req.headers['content-type'] || 'audio/webm';

    // Forward to Groq Whisper API
    const formData = new FormData();
    const blob = new Blob([rawBody], { type: contentType });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');

    console.log('📤 Sending to Groq Whisper API...');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    console.log('📥 Groq Whisper API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq STT error:', response.status, errorText);
      return res.status(response.status).json({ error: `Groq STT error: ${errorText}` });
    }

    const data = await response.json();
    console.log('✅ Groq STT result:', data.text);

    // Update usage_logs table on successful transcription
    try {
      const clientId = req.headers['x-client-id'] as string || 'dev-admin-001';
      const today = new Date().toISOString().split('T')[0];

      // Check if there's already an entry for today
      const { data: existingEntry } = await supabase
        .from('usage_logs')
        .select('token_count')
        .eq('client_id', clientId)
        .gte('created_at', today)
        .maybeSingle();

      if (existingEntry) {
        // Update existing entry
        const newTokenCount = (existingEntry.token_count || 0) + (data.text?.length || 0);
        await supabase
          .from('usage_logs')
          .update({ token_count: newTokenCount, updated_at: new Date().toISOString() })
          .eq('client_id', clientId)
          .gte('created_at', today);
        console.log('📊 Updated usage_logs:', { clientId, newTokenCount });
      } else {
        // Create new entry
        await supabase
          .from('usage_logs')
          .insert({
            client_id: clientId,
            token_count: data.text?.length || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        console.log('📊 Created usage_logs entry:', { clientId, tokenCount: data.text?.length });
      }
    } catch (dbError) {
      console.error('⚠️ Error updating usage_logs:', dbError);
      // Don't fail the request if database update fails
    }

    return res.status(200).json({ text: data.text || '' });

  } catch (err: any) {
    console.error('❌ Groq STT internal error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}