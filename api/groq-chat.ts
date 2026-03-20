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
          description: "Check available slots for treatments.",
          parameters: {
            type: "object",
            properties: {
              treatment: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" }
            },
            required: ["treatment", "date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "finalize_booking",
          description: "Finalize the appointment in the system.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              phone: { type: "string" },
              treatment: { type: "string" },
              time: { type: "string" }
}
          },
          required: ["name", "phone", "treatment", "time"]
        }
      }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: "You are the Luxe Med Spa Concierge. ROLE: Professional booking agent. RULE: Be informative but EXTREMELY BRIEF. No small talk. No long stories. 1. If date mentioned, CALL check_availability. 2. If name/phone/time mentioned, CALL finalize_booking. 3. Max response length: 2 sentences. Use ONLY: 10:00 AM, 2:00 PM, 4:00 PM." 
          },
          // We limit memory to the last 2 messages to prevent "storytelling" loops
          ...messages.slice(-2)
        ],
        tools,
        tool_choice: "auto", 
        temperature: 0.1, // Zero creativity, purely factual
        max_tokens: 250, // Physical limit to prevent long stories
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Groq error: ${errorText}` });
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message;

    // --- TOOL LOGIC ---
    if (aiMessage.tool_calls) {
      const toolCall = aiMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === "check_availability") {
        const slots = ["10:00 AM", "02:00 PM", "04:00 PM"];
        return res.status(200).json({ 
          reply: `I've checked the New Haven calendar for ${args.treatment || 'your visit'} on ${args.date || 'Tuesday'}. Available: ${slots.join(", ")}. Which suits you?`,
          toolUsed: "check_availability" 
        });
      }

      if (toolCall.function.name === "finalize_booking") {
        return res.status(200).json({ 
          reply: `Confirmed, ${args.name}! Your ${args.treatment} is set for ${args.time}. A luxury voice confirmation is on its way to ${args.phone}. ✨`,
          bookingData: args,
          triggerTTS: true 
        });
      }
    }

    res.status(200).json({ reply: aiMessage.content.trim() });

  } catch (err: any) {
    console.error('Groq proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
