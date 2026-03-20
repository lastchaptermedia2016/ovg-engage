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
          description: "Kyk vir oop tye in die Luxe Med Spa kalender vir 'n spesifieke behandeling.",
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

    // --- 2. DIE AI ROEP (MET DIE VOLLEDIGE KNOWLEDGE BASE) ---
    const response = await fetch('https://api.groq.com/openai/v1/completions', {
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
            content: `You are the Luxe Med Spa Concierge in New Haven. You have studied our clinic and know these facts:
            1. CLINIC: The Luxe Med Spa, New Haven. Owned by Jill Johnson, RN BSN.
            2. MEDICAL DIRECTOR: Dr. Marwan Mustaklem.
            3. SERVICES: We DO offer Botox, Fillers, Secret RF, TruSculpt, and HydraFacial. 
            4. RULES: 
               - Botox IS our top service. Never say we don't have it.
               - When a treatment and date are mentioned, you MUST CALL 'check_availability' IMMEDIATELY.
               - Use the results (10:00 AM, 2:00 PM, 4:00 PM) to confirm slots.
               - Tone: Elite, sophisticated, New Haven luxury.
               - After booking, confirm that a luxury voice note (TTS) is being sent via WhatsApp.`
          },
          ...messages
        ],
        tools,
        tool_choice: "auto", 
        temperature: 0.6,
        max_tokens: 600,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Groq error: ${errorText}` });
    }

    const data = await response.json();
    const message = data.choices[0].message;

    // --- 3. HANTERING VAN TOOLS ---
    if (message.tool_calls) {
      const toolCall = message.tool_calls[0];
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

    // JOU OORSPRONKLIKE ANTWOORD-LOGIKA
    const aiReply = message.content.trim();
    res.status(200).json({ reply: aiReply });

  } catch (err: any) {
    console.error('Groq proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
