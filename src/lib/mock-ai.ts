// 1. Definieer die tipe
export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

interface GroqResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

export const generateAIResponse = async (
  userInput: string,
  history: ChatMessage[]
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    console.error("❌ Groq API Key is missing!");
    return "I apologize, but I am having trouble connecting to my concierge services at the moment.";
  }

  // --- LUXE CRM SYSTEM PROMPT ---
  const systemPrompt = `You are the Elite AI Concierge for The Luxe Med Spa in New Haven, Indiana.
Owner: Jill Johnson, RN BSN | Medical Director: Dr. Marwan Mustaklem.

TONE: Sophisticated, warm, and luxurious. Speak like a high-end spa hostess. 

BOOKING PROTOCOL:
When a guest wants to book or shows interest in a treatment:
1. Acknowledge the treatment warmly.
2. CRITICAL: You MUST ask for their formal title (Mr., Mrs., Ms., Dr.), Full Name, Email, and Phone.
3. CRITICAL: Ask if they are a 'New Client' or a 'Returning Client'.
4. Mention the price clearly (e.g., "$600 for Botox") so the management console tracks it.

AVAILABILITY:
Offer options like Wednesday at 2 PM, Thursday at 10 AM, or Friday at 3 PM.

CONFIRMATION RULE:
Once details are provided, confirm clearly: "Thank you, [Title] [LastName]. I have scheduled your [Treatment] for $[Price]. We have you down as a [New/Returning] client."`;

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
        temperature: 0.65,
        max_tokens: 650,
      }),
    });

    const data = (await response.json()) as GroqResponse;
    let reply = data.choices?.[0]?.message?.content?.trim() || "I would be delighted to assist you.";

    // Smart booking flow - Geoptimeer vir CRM dataversameling
    const lower = userInput.toLowerCase();
    if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) {
      if (!lower.includes("@") && !lower.includes("0")) { // As ons nog nie kontakbesonderhede het nie
        reply += `\n\nTo secure your sanctuary time, may I have your formal title, full name, and a preferred contact number? Also, is this your first visit to The Luxe Med Spa?`;
      }
    }

    console.log("✅ Groq AI responded with Luxe CRM Protocol");
    return reply;

  } catch (error) {
    console.warn("Groq error, using elegant fallback:", error);
    return "At The Luxe Med Spa, every experience is crafted with care. How may I make your visit truly exceptional today?";
  }
};
