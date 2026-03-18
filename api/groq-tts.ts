import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure the request method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract text from the request body
    const { text } = req.body;

    // Validate the presence of text
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid input: text is required' });
    }

    // Retrieve the API key from environment variables
    const apiKey = process.env.GROQ_API_KEY;

    // Check if the API key is configured
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ API key not configured' });
    }

    // Make a request to the GROQ TTS API
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice_id: 'default',  // Default voice; adjust as necessary
      }),
    });

    // Handle non-OK responses from the API
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `GROQ error: ${errorText}` });
    }

    // Convert the response to an audio buffer
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    // Log the error and return a 500 status
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
