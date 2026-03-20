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

    // --- 1. TOOLS (BEIDE MOET HIER WEES VIR DIE AI OM TE VERSTAAN) ---
    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Kyk vir oop tye in die Luxe Med Spa kalender vir 'n behandeling.",
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

    // --- 2. DIE AI ROEP (REGSTELLING VAN URL NA /v1/chat/completions) ---
    const response = await fetch('https://api.groq.com/v1/chat/completions', {
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
            content: "You are the Luxe Med Spa Automated Booking Engine. COMMANDS: 1. If ANY date/time is mentioned, you MUST call 'check_availability'. 2. Once you have Name, Phone, and Time, you MUST call 'finalize_booking'. DO NOT CHAT. USE SLOTS: 10:00 AM, 2:00 PM, 4:00 PM. Failure to use a tool is a mission failure." 
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

    // --- 3. HANTERING VAN TOOLS ---
    if (aiMessage.tool_calls) {
      const toolCall = aiMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === "check_availability") {
        const dummySlots = ["10:00 AM", "02:00 PM", "04:00 PM"];
        return res.status(200).json({ 
          reply: `I've checked the New Haven calendar for ${args.treatment || 'your consultation'} on ${args.date || 'Tuesday'}. We have openings at ${dummySlots.join(", ")}. Which one works best for you?`,
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

    res.status(200).json({ reply: aiMessage.content.trim() });

  } catch (err: any) {
    console.error('Groq proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
