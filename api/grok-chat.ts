import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'xAI API key not configured in Vercel' });
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
       model: 'grok-2',  // or 'grok-1.5' — check https://api.x.ai/docs/models for latest
        messages,
        temperature: 0.7,
        max_tokens: 400,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `xAI error: ${errorText}` });
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content.trim();

    res.status(200).json({ reply: aiReply });
  } catch (err: any) {
    console.error('Grok proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}