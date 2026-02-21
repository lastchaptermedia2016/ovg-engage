export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

/**
 * OVG Concierge AI response engine — beauty/wellness focused.
 * Professional, warm, sales-oriented tone with 20% off first consultation offer.
 */
export function generateMockAIResponse(userMessage: string, conversationHistory: ChatMessage[]): string {
  const msg = userMessage.toLowerCase();

  const hasAskedName = conversationHistory.some(
    (m) => m.role === "ai" && m.text.includes("your name")
  );
  const hasAskedEmail = conversationHistory.some(
    (m) => m.role === "ai" && m.text.includes("email")
  );

  // Greetings
  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return "Welcome to OVG! ✨ I'm here to help you discover the perfect beauty & wellness treatments. Whether it's skincare, body contouring, or a rejuvenating consultation — I've got you covered. What are you looking for today?";
  }

  // Booking
  if (msg.includes("book") || msg.includes("appointment") || msg.includes("schedule")) {
    return "I'd love to help you book! 📅 We have availability this week for consultations, facials, and body treatments. Plus, first-time clients get 20% off their first session. Would you like me to check times for you?";
  }

  // Pricing
  if (msg.includes("pricing") || msg.includes("cost") || msg.includes("price") || msg.includes("prices")) {
    return "Great question! 💎 Our treatments range from affordable express facials to premium rejuvenation packages. I can share a personalised quote — and remember, new clients enjoy 20% off their first consultation. Shall I connect you with our team for details?";
  }

  // Services
  if (msg.includes("service") || msg.includes("treatment") || msg.includes("offer") || msg.includes("menu")) {
    return "We offer a wide range of beauty & wellness services — from advanced facials and skin rejuvenation to body contouring and holistic wellness treatments. ✨ Each is tailored to your unique needs. What area are you most interested in?";
  }

  // Human agent
  if (msg.includes("human") || msg.includes("agent") || msg.includes("speak") || msg.includes("person") || msg.includes("call")) {
    return "Of course! I'll connect you with one of our beauty consultants. They'll be able to give you personalised recommendations and book you in. Could you share your name and preferred contact method so they can reach out? 📞";
  }

  // Help / support
  if (msg.includes("help") || msg.includes("support")) {
    return "I'm here for you! Whether you have questions about our treatments, need to reschedule, or want expert skincare advice — just ask. How can I help today? 💜";
  }

  // Demo / trial
  if (msg.includes("demo") || msg.includes("trial") || msg.includes("try")) {
    return "We'd love for you to experience OVG! Why not start with a complimentary skin consultation? It's the perfect way to see what treatments suit you best — plus 20% off your first booking. Shall I arrange one?";
  }

  // Location
  if (msg.includes("location") || msg.includes("where") || msg.includes("address") || msg.includes("directions")) {
    return "You can find all our clinic locations and opening hours on our website. Would you like me to help you find the nearest one, or would you prefer a virtual consultation? 📍";
  }

  // Conversational lead capture
  if (!hasAskedName && conversationHistory.length >= 4) {
    return "I'm really enjoying chatting with you! By the way, what's your name? I'd love to make this more personal. 😊";
  }

  if (hasAskedName && !hasAskedEmail) {
    return "Lovely to meet you! Would you mind sharing your email? I can send you our exclusive treatment guide and your 20% discount code. 💌";
  }

  // Default branded responses
  const defaults = [
    "That sounds wonderful! I can help you find the perfect treatment. Could you tell me a bit more about what you're looking for? ✨",
    "I'd love to assist with that! At OVG, we tailor every experience to you. What matters most — relaxation, results, or a bit of both? 💎",
    "Great question! Let me find the best option for you. Is there a particular treatment or concern you'd like to focus on? 💜",
    "I appreciate you sharing that! Our beauty experts can create a personalised plan just for you. Would you like me to set up a consultation?",
  ];

  return defaults[Math.floor(Math.random() * defaults.length)];
}
