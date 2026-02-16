export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

/**
 * Mock AI response engine.
 * TODO: Replace with real LLM integration (e.g., OpenAI, Grok, or Lovable AI gateway).
 */
export function generateMockAIResponse(userMessage: string, conversationHistory: ChatMessage[]): string {
  const msg = userMessage.toLowerCase();

  // Lead capture: if we haven't asked for name yet
  const hasAskedName = conversationHistory.some(
    (m) => m.role === "ai" && m.text.includes("What's your name")
  );
  const hasAskedEmail = conversationHistory.some(
    (m) => m.role === "ai" && m.text.includes("email")
  );

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return "Hey there! 👋 Welcome! I can help you learn about our services or get you connected with the right person. What brings you here today?";
  }

  if (msg.includes("pricing") || msg.includes("cost") || msg.includes("price")) {
    return "Great question! Our plans start with a free tier. I'd love to connect you with our team for a personalized quote. What's your name so I can set that up?";
  }

  if (msg.includes("help") || msg.includes("support")) {
    return "I'm here to help! I can answer questions about our product, connect you with support, or schedule a consultation. What do you need?";
  }

  if (msg.includes("demo") || msg.includes("trial")) {
    return "Absolutely! We'd love to show you a demo. Could I get your name and email to schedule one?";
  }

  // Conversational lead capture flow
  if (!hasAskedName && conversationHistory.length >= 3) {
    return "I'm enjoying our chat! What's your name, by the way? 😊";
  }

  if (hasAskedName && !hasAskedEmail) {
    return "Nice to meet you! Would you mind sharing your email so I can send you some helpful resources?";
  }

  // Default responses
  const defaults = [
    "That's interesting! Tell me more about what you're looking for.",
    "I'd be happy to help with that. Could you give me a bit more detail?",
    "Great question! Let me help you with that. Is there anything specific you'd like to know?",
  ];

  return defaults[Math.floor(Math.random() * defaults.length)];
}
