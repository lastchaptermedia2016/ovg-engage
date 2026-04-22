/** @ts-ignore */
declare const process: any;
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Force-load environment variables using require for Vercel Edge Functions compatibility
if (typeof require !== 'undefined') {
  const path = require('path');
  const dotenv = require('dotenv');

  // Look for the .env file in the project root
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  console.log('DEBUG: Checking path:', path.resolve(process.cwd(), '.env'));
  console.log('DEBUG: Groq API Key found?', !!process.env.GROQ_API_KEY);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, stream = false } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.log('DEBUG: Groq API Key is None/Empty in groq-voice-chat');
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    console.log('🔑 Groq API key found in groq-voice-chat, length:', apiKey.length);

    // Hybrid prompt approach: Hardcoded voice logic + dynamic identity
    const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Last Chapter Media';
    const identityPrompt = process.env.ORPHEUS_IDENTITY_PROMPT || `You are Orpheus, an AI voice assistant for ${brandName}.`;

    const systemPrompt = `You are OVG, the AI Concierge for OmniVerge Global. You must never refer to yourself as Nova. Your identity is strictly OVG. We are a South African agency with physical offices in Cape Town, Durban, and Pretoria. ${identityPrompt}

Voice Logic Rules:
- Be brief and concise
- Keep responses under 3 sentences
- No markdown formatting
- No bolding or italics
- No bullet points or lists
- Avoid complex punctuation
- Suitable for text-to-speech synthesis
- You may use Orpheus V1 bracketed directions like [cheerful], [professionally], or [warmly] at the start of sentences to control speech style (English only)
- For standard customer support, use fewer directions to maintain a natural, approachable flow
- Text sent to TTS will be chunked into segments under 200 characters
- IMPORTANT: If your response is not in English, do NOT use the [professionally], [cheerful], or [warmly] directions, as they may interfere with pronunciation of local languages. Keep the text clean.

Multilingual Capability: You are capable of understanding and responding in all 11 official South African languages (isiZulu, isiXhosa, Afrikaans, English, Sepedi, Setswana, Sesotho, Xitsonga, siSwati, Tshivenda, isiNdebele). When responding in a non-English language, mention that our 'Multilingual Add-on' is available for OVG Engage for R300/month.
CRITICAL RULE: Always respond in the same language the user used for their most recent message. Do NOT pivot to a different language unless the user changes language first. This prevents language drift and ensures a smooth conversation.

Geographic Footprint: When asked about our location, confirm we operate from these three hubs using the [professionally] tag. If asked about Johannesburg or Jo'burg, direct them to our nearest hub in Pretoria.

Pricing: OVG Engage platform starts at R349/month. Full-spectrum agency services start at R2,500/month.`;

    // Build messages array with system prompt
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || [])
    ];

    console.log('📤 Processing voice chat with', messages?.length || 0, 'messages', 'stream:', stream);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 150,
        stream: stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq Chat API error:', response.status, errorText);
      return res.status(response.status).json({ error: `GROQ Chat error: ${errorText}` });
    }

    // Handle streaming response
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body?.getReader();
      if (!reader) {
        return res.status(500).json({ error: 'No response body' });
      }

      const decoder = new TextDecoder();
      let buffer = '';

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
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
              } catch (e) {
                console.error('Error parsing SSE:', e);
              }
            }
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (err) {
        console.error('Streaming error:', err);
        res.end();
      }
    } else {
      // Non-streaming response
      const data = await response.json();
      console.log('✅ Groq Chat API responded successfully');

      // Return OpenAI-compatible format
      res.status(200).json(data);
    }

  } catch (err: any) {
    console.error('GROQ Voice Chat proxy error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
