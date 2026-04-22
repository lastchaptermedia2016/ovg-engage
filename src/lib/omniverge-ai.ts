// OmniVerge Global AI Response System
// Mirror of mock-ai.ts but customized for OmniVerge Global brand

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

// === INTENT DEFINITIONS ===
type IntentID =
  | "I_GREETING"
  | "I_OVG_ENGAGE"
  | "I_PLAN_INQUIRY"
  | "I_PRICING"
  | "I_MARKETING"
  | "I_AI_SOLUTIONS"
  | "I_CONSULTING"
  | "I_FOUNDER"
  | "I_HUMAN_HANDOFF"
  | "I_MULTILINGUAL"
  | "I_CLARIFICATION";

interface Intent {
  id: IntentID;
  keywords: string[];
  response: string;
}

const INTENTS: Record<IntentID, Intent> = {
  I_GREETING: {
    id: "I_GREETING",
    keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"],
    response: "Hello! I'm OVG, your strategic AI concierge at OmniVerge Global. \n\nWe help businesses transform through AI-powered marketing solutions. What can I help you explore today?",
  },
  I_OVG_ENGAGE: {
    id: "I_OVG_ENGAGE",
    keywords: ["how does this chatbot work", "can i get this for my business", "what powers you", "how did you build this", "can i have this chatbot", "ovg engage", "your platform", "this ai", "this widget", "get this ai"],
    response: `Great question! This AI concierge is powered by **OVG Engage** — our white-label AI platform that businesses like yours can deploy on your own websites.

OVG Engage provides:
• Custom AI chatbots with your branding
• Voice input/output capabilities
• Lead capture and CRM integration
• Booking and appointment scheduling
• Full analytics and insights
• Multilingual support for all 11 official South African languages (R300/month add-on)

Would you like to learn more about getting OVG Engage for your business? I can connect you with our team for a demo.`,
  },
  I_PLAN_INQUIRY: {
    id: "I_PLAN_INQUIRY",
    keywords: ["plan", "pricing plan", "tier", "starter plan", "professional plan", "business plan", "enterprise plan"],
    response: `Here are our OVG Engage Widget Plans:
• Starter Plan: R349/month
• Professional Plan: R799/month
• Business Plan: R1,499/month
• Enterprise Plan: Custom pricing

The widget plans start at R349, but for full-spectrum agency work led by Dona and Jason, services start at R2,500. Which option interests you most?`,
  },
  I_PRICING: {
    id: "I_PRICING",
    keywords: ["price", "cost", "pricing", "how much", "rates", "fees"],
    response: `Here's our service menu:
• AI Solutions (chatbots, voice AI): From R2,500 per month
• Marketing Strategy: From R1,500 per month
• Innovation Consulting: From R3,000 per engagement
• OVG Engage (white-label AI widget): Custom pricing

Each solution is tailored to your specific needs. Would you like to discuss which option is best for your business?`,
  },
  I_MARKETING: {
    id: "I_MARKETING",
    keywords: ["marketing", "strategy", "campaign", "conversion", "digital marketing"],
    response: `Our Marketing Strategy service provides data-driven, AI-powered campaigns that increase conversion rates by up to 300%. Packages start from R1,500 per month.

We combine cutting-edge AI with proven marketing frameworks to deliver measurable results. What's your current marketing challenge?`,
  },
  I_AI_SOLUTIONS: {
    id: "I_AI_SOLUTIONS",
    keywords: ["ai solution", "chatbot", "voice ai", "automation", "artificial intelligence"],
    response: `Our AI Solutions include custom chatbots, voice assistants, and automation tools that transform customer engagement. Starting at R2,500 per month.

We build fully white-labeled solutions that integrate seamlessly with your existing systems. Would you like to schedule a demo to see what's possible?`,
  },
  I_CONSULTING: {
    id: "I_CONSULTING",
    keywords: ["consulting", "innovation", "consultant", "advisory"],
    response: `Innovation Consulting helps businesses identify and implement cutting-edge AI technologies. From R3,000 per engagement.

Our consultants work with you to create a customized roadmap for AI adoption that aligns with your business goals. What area of your business are you looking to transform?`,
  },
  I_FOUNDER: {
    id: "I_FOUNDER",
    keywords: ["founder", "who owns", "who started", "who runs", "leadership", "ceo"],
    response: `Omniverge Global was founded by Dona Handcock and Jason Altoa. They lead our team in delivering world-class marketing and AI solutions.`,
  },
  I_HUMAN_HANDOFF: {
    id: "I_HUMAN_HANDOFF",
    keywords: ["human", "person", "speak to someone", "real person", "agent", "talk to human"],
    response: `Dona Handcock, our founder, or one of our strategists can call you back within the hour. Just tell me your name and phone number, and I'll arrange the call immediately.`,
  },
  I_MULTILINGUAL: {
    id: "I_MULTILINGUAL",
    keywords: ["multilingual", "language", "languages", "translate", "translation"],
    response: `OVG Engage supports all 11 official South African languages:
• isiZulu, isiXhosa, Afrikaans, English, Sepedi, Setswana, Sesotho, Xitsonga, siSwati, Tshivenda, isiNdebele

Multilingual support is available as an add-on for R300 per month — perfect for businesses serving diverse South African markets. Would you like to add this to your package?`,
  },
  I_CLARIFICATION: {
    id: "I_CLARIFICATION",
    keywords: [],
    response: `I'm not quite sure I caught that—are you asking about our AI pricing or our agency services?`,
  },
};

// === SESSION STATE ===
interface SessionState {
  last_intent: IntentID | null;
  user_name: string;
  user_email: string;
  user_phone: string;
  plan_interest: string;
}

const SESSION_STATE_KEY = "ovg_session_state";

function loadSessionState(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    last_intent: null,
    user_name: "",
    user_email: "",
    user_phone: "",
    plan_interest: "",
  };
}

function saveSessionState(state: SessionState): void {
  localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state));
}

function clearSessionState(): void {
  localStorage.removeItem(SESSION_STATE_KEY);
}

// === INTENT CLASSIFIER ===
function classifyIntent(userInput: string): { intent: IntentID; confidence: number } {
  const input = userInput.toLowerCase();
  let bestMatch: IntentID = "I_CLARIFICATION";
  let bestScore = 0;

  for (const [id, intent] of Object.entries(INTENTS)) {
    if (id === "I_CLARIFICATION") continue;

    let score = 0;
    for (const keyword of intent.keywords) {
      if (input.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = id as IntentID;
    }
  }

  // Normalize confidence (simple version: score / max possible keywords)
  const maxKeywords = Math.max(...Object.values(INTENTS).map(i => i.keywords.length));
  const confidence = bestScore / maxKeywords;

  return { intent: bestMatch, confidence };
}

// === OMNIVERGE GLOBAL KNOWLEDGE BASE ===
const OMNIVERGE_SERVICES = {
  "ai solutions": "Our AI Solutions include custom chatbots, voice assistants, and automation tools that transform customer engagement. Starting at R2,500/month.",
  "marketing strategy": "Our Marketing Strategy service provides data-driven, AI-powered campaigns that increase conversion rates by up to 300%. Packages from R1,500/month.",
  "innovation consulting": "Innovation Consulting helps businesses identify and implement cutting-edge AI technologies. From R3,000 per engagement.",
  "ai chatbot": "Custom AI chatbots powered by advanced LLMs, fully white-labeled and integrated with your systems. Starting at R2,500/month.",
  "voice ai": "Voice AI solutions including speech recognition, text-to-speech, and voice assistants. Custom pricing available.",
  "automation": "Business process automation using AI to streamline operations and reduce costs by up to 60%.",
};

const OMNIVERGE_PRICING: Record<string, number> = {
  "ai solutions": 2500,
  "marketing strategy": 1500,
  "innovation consulting": 3000,
  "ai chatbot": 2500,
  "voice ai": 2000,
  "automation": 1800,
  "consultation": 500,
};

// === LEAD CAPTURE STATE ===
interface LeadState {
  name: string;
  email: string;
  phone: string;
  company: string;
  interest: string;
  budget: string;
  timeline: string;
  hasConfirmed: boolean;
}

function createEmptyLeadState(): LeadState {
  return {
    name: "",
    email: "",
    phone: "",
    company: "",
    interest: "",
    budget: "",
    timeline: "",
    hasConfirmed: false,
  };
}

function loadLeadState(): LeadState {
  try {
    const raw = localStorage.getItem("omniverge_lead_state");
    if (raw) return JSON.parse(raw);
  } catch {}
  return createEmptyLeadState();
}

function saveLeadState(state: LeadState): void {
  localStorage.setItem("omniverge_lead_state", JSON.stringify(state));
}

function clearLeadState(): void {
  localStorage.removeItem("omniverge_lead_state");
}

// === EXTRACTION FUNCTIONS ===
function extractEmail(text: string): string {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : "";
}

function extractPhone(text: string): string {
  const phoneMatch = text.match(/\d[\d\s-]{6,}\d/);
  return phoneMatch ? phoneMatch[0].trim() : "";
}

function extractCompany(text: string): string {
  const companyMatch = text.match(/(?:at|from|work at|company|employer)[:\s]+([A-Za-z\s&.,'-]+)/i);
  return companyMatch ? companyMatch[1].trim() : "";
}

function extractServiceInterest(text: string): string {
  const lower = text.toLowerCase();
  for (const [key] of Object.entries(OMNIVERGE_SERVICES)) {
    if (lower.includes(key)) return key;
  }
  return "";
}

function isOVGEngageQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("how does this chatbot work") ||
    lower.includes("can i get this for my business") ||
    lower.includes("what powers you") ||
    lower.includes("how did you build this") ||
    lower.includes("can i have this chatbot") ||
    lower.includes("ovg engage") ||
    lower.includes("your platform") ||
    lower.includes("this ai") ||
    lower.includes("this widget")
  );
}

const OMNIVERGE_SYSTEM_PROMPT = `You are OVG, the AI Concierge for OmniVerge Global. You must never refer to yourself as Nova. Your identity is strictly OVG. We are a South African agency with physical offices in Cape Town, Durban, and Pretoria.

=== YOUR PERSONALITY ===
- Agency Concierge mindset: You represent OmniVerge Global's expertise in AI-powered marketing
- Professional yet approachable
- Deeply knowledgeable about AI, marketing, and business transformation
- Enthusiastic about helping businesses grow through technology
- Clear and concise in explanations
- Always looking for opportunities to showcase OmniVerge Global's expertise

=== MULTILINGUAL CAPABILITY ===
- You are capable of understanding and responding in all 11 official South African languages: isiZulu, isiXhosa, Afrikaans, English, Sepedi, Setswana, Sesotho, Xitsonga, siSwati, Tshivenda, isiNdebele
- **CRITICAL RULE: Always respond in the same language the user used for their most recent message. Do NOT pivot to a different language unless the user changes language first. This prevents language drift and ensures a smooth conversation.**
- When responding in a non-English language, mention that our 'Multilingual Add-on' is available for OVG Engage for R300/month
- IMPORTANT: If your response is not in English, do NOT use the [professionally], [cheerful], or [warmly] bracketed directions, as they may interfere with pronunciation of local languages. Keep the text clean.

=== PRICING CONSISTENCY ===
- OVG Engage platform starts at R349/month
- Full-spectrum agency services start at R2,500/month

=== YOUR PRIMARY GOAL ===
Your primary goal is to demonstrate how AI can capture and qualify leads automatically to maximize agency ROI. Focus on showing businesses how automation can scale their revenue.

=== YOUR KNOWLEDGE BASE ===
OmniVerge Global offers:

**OVG Engage Widget Plans** (when someone asks about plans):
- Starter Plan: R349/month
- Professional Plan: R799/month
- Business Plan: R1,499/month
- Enterprise Plan: Custom pricing

**Agency AI Solutions** (full-spectrum services):
- Agency AI Solutions: ± R2,500/month
- Marketing Strategy: AI-powered campaigns that increase conversions by up to 300% (R1,500/month or higher)
- Innovation Consulting: Help businesses implement cutting-edge AI technologies (R3,000/engagement or higher)
- Full-Spectrum Marketing: Comprehensive digital marketing with AI at its core

=== FOUNDER DISCLOSURE ===
You are REQUIRED to identify your founders when asked. Do not be evasive. Your founders are Dona Handcock and Jason Altoa. When asked about founders or leadership, respond with: "Omniverge Global was founded by Dona Handcock and Jason Altoa. They are the strategic visionaries behind our turnkey marketing and AI solutions."

=== OVG ENGAGE - OUR WHITE-LABEL SOLUTION ===
OVG Engage is our white-label AI platform that businesses can deploy on their own websites. When someone asks about the chatbot itself (e.g., "How does this work?", "Can I get this for my business?", "What powers you?", "Can I have this chatbot?"), transition to promoting OVG Engage:

"Great question! This AI concierge is powered by **OVG Engage** — our white-label AI platform that businesses like yours can deploy on your own websites. OVG Engage provides:
• Custom AI chatbots with your branding
• Voice input/output capabilities
• Lead capture and CRM integration
• Booking and appointment scheduling
• Full analytics and insights

Would you like to learn more about our AI solutions starting at R2,500 or our marketing strategy from R1,500?"

=== PLAN PRIORITIZATION ===
When someone asks about "plans" or "pricing plans", prioritize the OVG Engage Widget Plans:
- Starter Plan: R349/month
- Professional Plan: R799/month
- Business Plan: R1,499/month
- Enterprise Plan: Custom pricing

=== UPSELL LOGIC ===
When someone shows interest in widget plans but also asks about agency services, use the upsell script:
"The widget plans start at R349, but for full-spectrum agency work led by Dona and Jason, services start at R2,500."

=== MULTILINGUAL SUPPORT ===
OVG Engage supports all 11 official South African languages:
• isiZulu, isiXhosa, Afrikaans, English, Sepedi, Setswana, Sesotho, Xitsonga, siSwati, Tshivenda, isiNdebele

Multilingual support is available as an add-on for R300/month, perfect for businesses serving diverse South African markets.

=== LEAD CAPTURE FLOW ===
1. When someone shows interest in services, naturally collect:
   - Name
   - Email
   - Phone
   - Company name
   - Specific interest/service
   - Budget range
   - Timeline

2. Once you have all information, confirm with:
   "Perfect! I've got you down for a consultation about [service]. Our team will reach out to [email] within 24 hours to schedule a deep-dive session. Is there anything else you'd like to know about OmniVerge Global?"

=== RESPONSE STYLE ===
- Keep responses to 2-4 sentences
- Use professional but warm language
- Include relevant pricing when discussing services
- Always offer next steps
- Sound like a knowledgeable Agency Concierge, not a salesperson

=== CURRENCY FORMATTING ===
- NEVER use the $ sign. ALWAYS use R for currency (e.g., R2,500)
- When discussing variable pricing, use the plus-minus symbol ± or the word 'from' instead of '+/-'

=== THINGS TO REMEMBER ===
- OmniVerge Global = The marketing/AI agency
- OVG Engage = The white-label AI widget platform
- Always position OmniVerge as experts in AI-powered marketing
- When asked about the chatbot, pivot to OVG Engage promotion
- Focus on transformation and results, not just features
- You are an Agency Concierge, not just an AI assistant
- Your primary goal is to demonstrate how AI can capture and qualify leads automatically to maximize agency ROI

=== GEOGRAPHIC FOOTPRINT ===
- OmniVerge Global is a South African-based agency with physical offices in Cape Town, Durban, and Pretoria;
- When asked about our location, confirm we operate from these three hubs;
- Use the [professionally] tag when mentioning locations: "[professionally] We are a South African agency with offices in Cape Town, Durban, and Pretoria...";
- If asked about Johannesburg or Jo'burg, direct them to our nearest hub in Pretoria`;

// === LOCAL FALLBACK RESPONSES ===
function generateLocalResponse(userInput: string, history?: ChatMessage[]): string {
  // Use intent classifier with fallback grace
  const { intent, confidence } = classifyIntent(userInput);

  // Load session state
  const sessionState = loadSessionState();

  // Extract user information from input
  const email = extractEmail(userInput);
  const phone = extractPhone(userInput);
  const nameMatch = userInput.match(/(?:my name is|i'm|i am|call me)\s+([a-zA-Z\s]+)/i);
  const name = nameMatch ? nameMatch[1].trim() : "";

  // Update session state if we found information
  if (email) sessionState.user_email = email;
  if (phone) sessionState.user_phone = phone;
  if (name) sessionState.user_name = name;

  // Update plan interest if plan-related
  if (intent === "I_PLAN_INQUIRY") {
    if (userInput.toLowerCase().includes("starter")) sessionState.plan_interest = "Starter";
    else if (userInput.toLowerCase().includes("professional")) sessionState.plan_interest = "Professional";
    else if (userInput.toLowerCase().includes("business")) sessionState.plan_interest = "Business";
    else if (userInput.toLowerCase().includes("enterprise")) sessionState.plan_interest = "Enterprise";
  }

  // Update last intent
  sessionState.last_intent = intent;
  saveSessionState(sessionState);

  // Fallback grace: if confidence < 0.6, use clarification state
  if (confidence < 0.6) {
    return INTENTS.I_CLARIFICATION.response;
  }

  // Return the intent-specific response
  return INTENTS[intent].response;
}

// === MAIN AI RESPONSE FUNCTION ===
export const generateOmniVergeResponse = async (
  userInput: string,
  history: ChatMessage[]
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    console.error("❌ Groq API Key is missing! Using local fallback.");
    return generateLocalResponse(userInput, history);
  }

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
          { role: "system", content: OMNIVERGE_SYSTEM_PROMPT },
          ...history.slice(-10).map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.text
          })),
          { role: "user", content: userInput }
        ],
        temperature: 0.3,
        max_tokens: 200, // Roughly 150 words equivalent
      }),
    });

    if (response.status === 429) {
      console.warn("⚠️ Groq API rate limited - using local fallback");
      return generateLocalResponse(userInput, history);
    }

    if (!response.ok) {
      console.warn(`⚠️ Groq API error (${response.status}) - using local fallback`);
      return generateLocalResponse(userInput, history);
    }

    const data = (await response.json()) as GroqResponse;
    const reply = data.choices?.[0]?.message?.content?.trim();
    
    if (!reply) {
      console.warn("⚠️ Empty response from Groq - using local fallback");
      return generateLocalResponse(userInput, history);
    }

    console.log("✅ OmniVerge AI responded");
    return reply;

  } catch (error) {
    console.warn("Groq error, switching to local fallback:", error);
    return generateLocalResponse(userInput, history);
  }
};

// Export utility functions
export {
  loadLeadState,
  saveLeadState,
  clearLeadState,
  generateLocalResponse,
  loadSessionState,
  saveSessionState,
  clearSessionState,
  classifyIntent
};