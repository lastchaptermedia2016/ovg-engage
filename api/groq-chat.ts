/** @ts-ignore */
declare const process: any;
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Check slots.",
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
          description: "Book appointment.",
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
            content: "You are a booking machine. RULES: 1. NO SMALL TALK. 2. If date mentioned, CALL check_availability. 3. If name/phone/time mentioned, CALL finalize_booking. 4. ONLY use slots: 10:00 AM, 2:00 PM, 4:00 PM. 5. Maximum 10 words if not calling a tool." 
          },
          messages[messages.length - 1]
        ],
        tools,
        tool_choice: "required", // Dwing die tool call
        temperature: 0.0,
        max_tokens: 150
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
          reply: `I found these slots for ${args.treatment || 'Botox'} on Tuesday: ${slots.join(", ")}. Which suits you?`,
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

    res.status(200).json({ reply: aiMessage.content || "Please provide a date or treatment to continue." });

  } catch (err: any) {
    res.status(500).json({ error: 'Server error' });
  }
}
