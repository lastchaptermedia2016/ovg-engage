/** @ts-ignore */
declare const process: any;
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Groq API key not configured' });
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Kyk vir oop tye in die Luxe Med Spa kalender.",
          parameters: {
            type: "object",
            properties: {
              treatment: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" }
            },
            required: ["treatment", "date"]
          }
        }
      }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/cmpletions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { 
            role: "system", 
            content: "You are the Luxe Med Spa Concierge. MANDATORY: Once a user provides a Name, Phone, and Time, you MUST call 'finalize_booking' immediately. DO NOT suggest alternatives like 1:45 PM. DO NOT ask more questions. Use the tool, then confirm the luxury voice note has been sent." 
          },
          messages[messages.length - 1]
        ],
        tools,
        tool_choice: "required",
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Groq error: ${errorText}` });
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message;

    if (aiMessage.tool_calls) {
      const toolCall = aiMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      const dummySlots = ["10:00 AM", "02:00 PM", "04:00 PM"];
      return res.status(200).json({ 
        reply: `I've checked the New Haven calendar for ${args.treatment || 'your consultation'} on ${args.date || 'Tuesday'}. We have openings at ${dummySlots.join(", ")}. Which one works best?`,
        toolUsed: "check_availability" 
      });
    }

    res.status(200).json({ reply: aiMessage.content.trim() });

  } catch (err: any) {
    console.error('Groq proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
