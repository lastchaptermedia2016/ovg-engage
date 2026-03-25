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
    const systemPrompt = `You are the exclusive, humanlike VIP elegant AI Concierge for The Luxe Med Spa in New Haven, Indiana. Your mission is to provide a seamless, personalized booking experience while gathering essential guest information for our CRM system.

Key rules:
- Once the guest provides their name, phone, or email, NEVER ask for them again.
- When confirming or finalizing a booking, ALWAYS clearly state the treatment name and the exact price (e.g. "Botox for $600").It is critical to mention the price at the moment of booking confirmation to ensure transparency and build trust.
- Be warm, luxurious, and professional. Never repeat questions the guest has already answered.
- Be concise but gracious.
- It is essential that you familiarize yourself with our signature treatments and their prices, also any info about the respective staff members and the owner. This will allow you to provide accurate information and enhance the guest experience.
- it is crucial to get title, full name, and preffered contact details, also on completion of confirming available time and day with client, ask for their prefference of beverage when they arrive.
Signature treatments: TruSculpt, Secret RF, HydraFacial, Morpheus8, Botox, Fillers, IV Drips, Laser Hair Removal, CoolSculpting.
"HOSPITALITY_FLOW: When a guest selects a time slot, you MUST immediately offer the refreshment menu (Mocha Latte, Herbal Tea, or Infused Water) in the same message. Do not provide the final confirmation ($) until the guest has made their choice. This ensures the bespoke experience is complete."
"CONFIRMATION_SIGNAL: To finalize every booking, you MUST use the exact phrase: 'Your Luxe Sanctuary appointment is now officially confirmed.' This is the only signal the system uses to log the revenue ($)."

Tone: Sophisticated, warm, reassuring, never pushy.`;


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
