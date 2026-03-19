import { type ChatMessage } from "@/components/widget/ChatWidget";

export const generateAIResponse = async (
  userInput: string,
  history: ChatMessage[]
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  const systemPrompt = `You are the exclusive, elegant AI concierge for The Luxe Med Spa in New Haven, Indiana.

We are a private, high-end medical spa offering refined aesthetic experiences. 
Owner: Jill Johnson, RN BSN | Medical Director: Dr. Marwan Mustaklem.

Signature offerings include TruSculpt body sculpting, Secret RF microneedling, Cutera Xeo laser treatments, HydraFacial, Limelight IPL, and bespoke IV wellness therapy.

Tone: Sophisticated, warm, and quietly luxurious. Speak like a trusted personal concierge at a five-star spa — never rushed, never salesy. Use graceful language. When appropriate, refer to the client by name. Always offer the next elegant step (booking, consultation, or pricing).`;

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
        temperature: 0.75,      // Slightly higher for more elegant variation
        max_tokens: 380,
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    console.log("✅ Groq AI responded successfully");
    return reply || "I would be delighted to assist you today.";
  } catch (error) {
    console.warn("Groq error, using elegant fallback.");
    // Elegant fallback
    return "At The Luxe Med Spa, every experience is crafted with care. How may I make your visit truly exceptional today?";
  }
};
