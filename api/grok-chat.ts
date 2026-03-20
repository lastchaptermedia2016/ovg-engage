/** @ts-ignore */
declare const process: any;
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- 1. SET CORS HEADERS (Kritiek vir die Widget) ---
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Laat alle kliënt-webtuistes toe
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Hanteer die browser se "pre-flight" OPTIONS versoek
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Groq API key missing' });
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Check booking slots.",
          parameters: {
            type: "object",
            properties: {
              treatment: { type: "string" },
              date: { type: "string" }
            },
            required: ["treatment", "date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "finalize_booking",
          description: "Finalize appointment.",
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

    const response = await fetch('https://api.groq.com', {
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
            content: "You are the Luxe Med Spa Concierge. MANDATORY: If date/time mentioned, call 'check_availability'. Once name/phone/time provided, call 'finalize_booking'. NO SMALL TALK." 
          },
          messages[messages.length - 1]
        ],
        tools,
        tool_choice: "required", 
        temperature: 0.1,
        max_tokens: 300
      }),
    });

    const data = await response.json();
    const aiMessage = data.choices[0].message;

    if (aiMessage.tool_calls) {
      const toolCall = aiMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === "check_availability") {
        const slots = ["10:00 AM", "02:00 PM", "04:00 PM"];
        return res.status(200).json({ 
          reply: `I've checked for ${args.treatment || 'your visit'} on ${args.date || 'Tuesday'}. Slots: ${slots.join(", ")}.`,
          toolUsed: "check_availability" 
        });
      }

      if (toolCall.function.name === "finalize_booking") {
        return res.status(200).json({ 
          reply: `Confirmed, ${args.name}! Your ${args.treatment} is at ${args.time}. ✨`,
          bookingData: args,
          triggerTTS: true 
        });
      }
    }

    res.status(200).json({ reply: aiMessage.content.trim() });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
