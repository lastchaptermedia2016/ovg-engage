import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ API key not configured' });
    }

    // Collect raw body as buffer
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks);

    // Get content type from headers
    const contentType = req.headers['content-type'] || 'audio/webm';

    // Forward to Groq Whisper API
    const formData = new FormData();
    const blob = new Blob([rawBody], { type: contentType });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-large-v3-turbo');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Groq STT error: ${errorText}` });
    }

    const data = await response.json();
    return res.status(200).json({ text: data.text || '' });

  } catch (err: any) {
    console.error('Groq STT error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}