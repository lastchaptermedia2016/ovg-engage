/** @ts-ignore */
declare const process: any;
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

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'groq API key not configured in Vercel' });
    }

    // --- 1. DEFINIEER DIE TOOLS VIR THE LUXE MED SPA ---
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
      },
      {
        type: "function",
        function: {
          name: "finalize_booking",
          description: "Skep 'n finale afspraak en trigger bevestigings.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              phone: { type: "string" },
              treatment: { type: "string" },
              time: { type: "string" }
            },
            required: ["name", "phone", "treatment", "time"]
          }
        }
      }
    ];

    // --- 2. DIE AI ROEP (MET DIE VOLLEDIGE OPENAI-COMPATIBLE URL) ---
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
            content: "You are the Luxe Med Spa Concierge in New Haven. Sophisticated and professional. CRITICAL: When a client mentions a treatment and a date, you MUST immediately call 'check_availability'. Once a time is chosen, use 'finalize_booking'. Mention that a luxury voice confirmation has been sent after booking." 
          },
          ...messages
        ],
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Groq error: ${errorText}` });
    }

    const data = await response.json();
    const message = data.choices[0].message; // Korreksie: [0] bygevoeg vir stabiliteit

    // --- 3. HANTERING VAN TOOLS ---
    if (message.tool_calls) {
      const toolCall = message.tool_calls[0]; // Hanteer die eerste tool call
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === "check_availability") {
        const dummySlots = ["10:00 AM", "02:00 PM", "04:00 PM"];
        return res.status(200).json({ 
          reply: `I've checked our New Haven calendar for ${args.treatment} on ${args.date}. We have openings at ${dummySlots.join(", ")}. Which one works best for you?`,
          toolUsed: "check_availability" 
        });
      }

      if (toolCall.function.name === "finalize_booking") {
        return res.status(200).json({ 
          reply: `Excellent, ${args.name}! Your ${args.treatment} is booked for ${args.time}. A luxury voice confirmation is on its way to your WhatsApp at ${args.phone}. ✨`,
          bookingData: args,
          triggerTTS: true 
        });
      }
    }

    // JOU OORSPRONKLIKE LOGIKA
    const aiReply = message.content.trim();
    res.status(200).json({ reply: aiReply });

  } catch (err: any) {
    console.error('Groq proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
