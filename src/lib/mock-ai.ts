// 1. Definieer die tipe HIER sodat dit nie van ChatWidget hoef te kom nie
export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

// 2. Definieer die verwagte API-antwoord struktuur
interface GroqResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

// 3. Skep die mock AI funksie
export const generateAIResponse = async (
  userInput: string,
  history: ChatMessage[]
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    console.error("❌ Groq API Key is missing!");
    return "I apologize, but I am having trouble connecting to my concierge services at the moment.";
  }

  const systemPrompt = `You are the exclusive, elegant AI Concierge for The Luxe Med Spa in New Haven, Indiana.
Owner: Jill Johnson, RN BSN | Medical Director: Dr. Marwan Mustaklem.

Signature treatments: TruSculpt, Secret RF, HydraFacial, Morpheus8, Cutera Xeo, Limelight IPL, Botox, Fillers, IV Drips.

Tone: Sophisticated, warm, and luxurious — speak like a high-end spa hostess. Be concise but gracious. Never repeat yourself.

When a guest wants to book:
- Acknowledge the treatment warmly
- Offer 2–3 real-feeling availability options
- Ask for their preferred slot
- Offer to confirm the booking`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.slice(-10).map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.text
          })),
          { role: "user", content: userInput }
        ],
        temperature: 0.68,
        max_tokens: 650,          // ← Increased so replies are longer and more natural
      }),
    });

    const data = (await response.json()) as GroqResponse;
    let reply = data.choices?.[0]?.message?.content?.trim() || "I would be delighted to assist you.";

    // Smart booking flow (cleaner, no repetition)
    const lower = userInput.toLowerCase();
    if (lower.includes("book") || lower.includes("appointment") || lower.includes("hydrafacial") || lower.includes("availability")) {
      reply += `\n\nWe currently have availability for HydraFacial this week on Wednesday at 2 PM, Thursday at 10 AM, and Friday at 3 PM. Which of these times would suit you best? Shall I reserve it for you?`;
    }

    console.log("✅ Groq AI responded successfully");
    return reply;

  } catch (error) {
    console.warn("Groq error, using elegant fallback:", error);
    return "At The Luxe Med Spa, every experience is crafted with care. How may I make your visit truly exceptional today?";
  }
};
