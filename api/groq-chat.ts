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

    // --- NUWE BYVOEGING: DEFINIEER DIE TOOLS VIR BESPREKINGS ---
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
            content: "You are the Luxe Med Spa Concierge. When a client mentions a treatment (like Botox) and a date (like next Tuesday), you MUST immediately call 'check_availability' to provide real options. Do not guess availability. After the tool returns slots, then ask your follow-up questions about specific areas or consultations."
 
          },
          ...messages
        ],
        tools, // NUUT
        tool_choice: 'auto', // NUUT
        temperature: 0.7,
        max_tokens: 500, // Effens meer vir tool calls
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Groq error: ${errorText}` });
    }

    const data = await response.json();
    const message = data.choices[0].message;

    // --- NUWE BYVOEGING: HANTERING VAN TOOLS ---
    if (message.tool_calls) {
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === "finalize_booking") {
        return res.status(200).json({ 
          reply: `Excellent, ${args.name}! Your ${args.treatment} is booked for ${args.time}. I've sent a luxury voice confirmation to your WhatsApp. ✨`,
          bookingData: args,
          triggerTTS: true 
        });
      }
      
      if (toolCall.function.name === "check_availability") {
        // Simuleer beskikbaarheid vir nou
        return res.status(200).json({ 
          reply: `I've checked our New Haven calendar for ${args.treatment} on ${args.date}. We have openings at 10:00 AM and 2:00 PM. Which works best?`
        });
      }
    }

    // JOU OORSPRONKLIKE LOGIKA (As geen tool gebruik word nie)
    const aiReply = message.content.trim();
    res.status(200).json({ reply: aiReply });

  } catch (err: any) {
    console.error('Groq proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
