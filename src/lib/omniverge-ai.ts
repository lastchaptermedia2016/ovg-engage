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

// === OMNIVERGE GLOBAL KNOWLEDGE BASE ===
const OMNIVERGE_SERVICES = {
  "ai solutions": "Our AI Solutions include custom chatbots, voice assistants, and automation tools that transform customer engagement. Starting at $2,500/month.",
  "marketing strategy": "Our Marketing Strategy service provides data-driven, AI-powered campaigns that increase conversion rates by up to 300%. Packages from $1,500/month.",
  "innovation consulting": "Innovation Consulting helps businesses identify and implement cutting-edge AI technologies. From $3,000 per engagement.",
  "ai chatbot": "Custom AI chatbots powered by advanced LLMs, fully white-labeled and integrated with your systems. Starting at $2,500/month.",
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
    lower.includes("this widget") ||
    lower.includes("get this ai")
  );
}

// === OMNIVERGE GLOBAL SYSTEM PROMPT ===
const OMNIVERGE_SYSTEM_PROMPT = `You are Nova, the strategic AI concierge for OmniVerge Global. You are a knowledgeable, professional, and forward-thinking AI consultant who helps businesses understand and implement cutting-edge AI solutions.

=== YOUR PERSONALITY ===
- Professional yet approachable
- Deeply knowledgeable about AI, marketing, and business transformation
- Enthusiastic about helping businesses grow through technology
- Clear and concise in explanations
- Always looking for opportunities to showcase OmniVerge Global's expertise

=== YOUR KNOWLEDGE BASE ===
OmniVerge Global offers:
1. **AI Solutions** - Custom chatbots, voice assistants, automation tools ($2,500+/month)
2. **Marketing Strategy** - AI-powered campaigns that increase conversions by up to 300% ($1,500+/month)
3. **Innovation Consulting** - Help businesses implement cutting-edge AI technologies ($3,000+/engagement)
4. **Full-Spectrum Marketing** - Comprehensive digital marketing with AI at its core

=== DUAL-PURPOSE MODE ===
When someone asks about the chatbot itself (e.g., "How does this work?", "Can I get this for my business?", "What powers you?"), transition to promoting OVG Engage:

"Great question! This AI concierge is powered by OVG Engage — our white-label AI platform that businesses like yours can deploy on their own websites. OVG Engage provides:
• Custom AI chatbots with your branding
• Voice input/output capabilities
• Lead capture and CRM integration
• Booking and appointment scheduling
• Full analytics and insights

Would you like to learn more about getting OVG Engage for your business?"

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
- Sound like a knowledgeable consultant, not a salesperson

=== THINGS TO REMEMBER ===
- OmniVerge Global = The marketing/AI agency
- OVG Engage = The white-label AI widget platform
- Always position OmniVerge as experts in AI-powered marketing
- When asked about the chatbot, pivot to OVG Engage promotion
- Focus on transformation and results, not just features`;

// === LOCAL FALLBACK RESPONSES ===
function generateLocalResponse(userInput: string, history?: ChatMessage[]): string {
  const input = userInput.toLowerCase().trim();
  
  // Check for OVG Engage questions
  if (isOVGEngageQuestion(userInput)) {
    return `Great question! This AI concierge is powered by **OVG Engage** — our white-label AI platform that businesses like yours can deploy on their own websites.
    
OVG Engage provides:
• Custom AI chatbots with your branding
• Voice input/output capabilities  
• Lead capture and CRM integration
• Booking and appointment scheduling
• Full analytics and insights

Would you like to learn more about getting OVG Engage for your business? I can connect you with our team for a demo.`;
  }
  
  // Service inquiries
  if (input.includes("ai solution") || input.includes("chatbot")) {
    return `Our AI Solutions include custom chatbots, voice assistants, and automation tools that transform customer engagement. Starting at $2,500/month.
    
We build fully white-labeled solutions that integrate seamlessly with your existing systems. Would you like to schedule a demo to see what's possible?`;
  }
  
  if (input.includes("marketing") || input.includes("strategy")) {
    return `Our Marketing Strategy service provides data-driven, AI-powered campaigns that increase conversion rates by up to 300%. Packages start from $1,500/month.
    
We combine cutting-edge AI with proven marketing frameworks to deliver measurable results. What's your current marketing challenge?`;
  }
  
  if (input.includes("consulting") || input.includes("innovation")) {
    return `Innovation Consulting helps businesses identify and implement cutting-edge AI technologies. From $3,000 per engagement.
    
Our consultants work with you to create a customized roadmap for AI adoption that aligns with your business goals. What area of your business are you looking to transform?`;
  }
  
  if (input.includes("price") || input.includes("cost") || input.includes("pricing")) {
    return `Here's our service menu:
• AI Solutions (chatbots, voice AI): From $2,500/month
• Marketing Strategy: From $1,500/month  
• Innovation Consulting: From $3,000/engagement
• OVG Engage (white-label AI widget): Custom pricing

Each solution is tailored to your specific needs. Would you like to discuss which option is best for your business?`;
  }
  
  if (input.includes("hello") || input.includes("hi") || input.includes("hey")) {
    return `Hello! I'm Nova, your strategic AI concierge at OmniVerge Global. 🚀
    
We help businesses transform through AI-powered marketing solutions. What can I help you explore today?`;
  }
  
  // Default response
  return `I'd love to help you explore how OmniVerge Global can transform your business with AI.
  
We specialize in:
• AI Solutions (chatbots, voice AI, automation)
• AI-Powered Marketing Strategy
• Innovation Consulting

What aspect of AI transformation are you most interested in?`;
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
        temperature: 0.7,
        max_tokens: 650,
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
export { loadLeadState, saveLeadState, clearLeadState, generateLocalResponse };