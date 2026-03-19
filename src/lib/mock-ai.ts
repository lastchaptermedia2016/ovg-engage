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

export const generateAIResponse = async (
  userInput: string,
  history: ChatMessage[]
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    console.error("❌ Groq API Key is missing!");
    return "I apologize, but I am having trouble connecting to my concierge services at the moment.";
  }

  const systemPrompt = `You are the exclusive, elegant AI concierge for The Luxe Med Spa in New Haven, Indiana.
Owner: Jill Johnson, RN BSN | Medical Director: Dr. Marwan Mustaklem.
Offerings: TruSculpt, Secret RF, Cutera Xeo, HydraFacial, Limelight IPL, bespoke IV wellness therapy.
Tone: Sophisticated, warm, and luxurious. Always offer the next elegant step (booking, consultation, or pricing).`;

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
          ...history.slice(-8).map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.text
          })),
          { role: "user", content: userInput }
        ],
        temperature: 0.75,
        max_tokens: 380,
      }),
    });

    // Gebruik 'as GroqResponse' om die "Property choices does not exist" fout op te los
    const data = (await response.json()) as GroqResponse;
    const reply = data.choices?.[0]?.message?.content?.trim();

    console.log("✅ Groq AI responded successfully");
    return reply || "I would be delighted to assist you today.";
  } catch (error) {
    console.warn("Groq error, using elegant fallback:", error);
    return "At The Luxe Med Spa, every experience is crafted with care. How may I make your visit truly exceptional today?";
  }
};
