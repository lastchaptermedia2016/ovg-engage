# OVG Engage – Beauty & Wellness Concierge Chat Widget

A modern, floating chat widget designed for beauty and wellness businesses. Helps users book treatments, check prices, claim offers, and connect with consultants — with a natural, welcoming voice experience.

## Live Demo
🌟 **[Try it live → https://ovg-engage.vercel.app/](https://ovg-engage.vercel.app/)**

## Features
- Always-visible floating bubble (no hiding when chat opens)
- Consent modal on first visit (privacy-first)
- Auto-greeting message + voice TTS when chat opens
- Quick reply buttons
- Voice input (speech-to-text)
- Voice replies (browser TTS – natural-sounding where possible)
- Lead capture form (name/email for consultant follow-up)
- AI-powered responses via Groq/Grok with function calling
- LocalStorage persistence (chat history saved across refreshes)
- Admin dashboard (press Shift+J to access)

### Reseller Console Features
- **Multi-client management** - Manage unlimited client configurations from one dashboard
- **Per-client customization** - Unique branding, AI settings, and offerings per client
- **Analytics dashboard** - Track leads, revenue, and conversions across all clients
- **Secure authentication** - Supabase-based auth with Row Level Security
- **White-label widget** - Fully customizable colors, logo, fonts, and AI personality
- **Embed code generator** - One-click copy embed code for each client
- **AI mood selector** - Choose from luxurious, professional, friendly, minimal, or playful
- **Feature toggles** - Enable/disable voice, analytics, WhatsApp, email notifications
- **Pricing Management** - Set custom prices for clients and track profit margins in real-time
- **Custom Services** - Bill clients for additional development work with time tracking
- **Monthly Invoicing** - Generate comprehensive invoices with subscription, add-ons, and services
- **VIP Customer Console** - Premium add-on for customer loyalty programs (SHIFT+V access)

## Tech Stack
- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Icons:** Lucide React
- **Routing:** React Router v6
- **State Management:** React Query (@tanstack/react-query)
- **Forms:** React Hook Form + Zod validation
- **Voice:** Browser SpeechSynthesis (TTS) & SpeechRecognition (STT) + ElevenLabs API
- **AI Backend:** Groq API (Llama 3.3 70B) + Grok/XAI API
- **Database:** Supabase (optional, for analytics)
- **Deployment:** Vercel (serverless API functions)
- **Testing:** Vitest + React Testing Library

## Local Development

### Prerequisites
- Node.js 18+ or Bun 1.0+
- npm or bun package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lastchaptermedia2016/ovg-engage.git
   cd ovg-engage
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install

   # Or using bun (faster)
   bun install
   ```

3. **Set up environment variables**
   
   Copy the example environment file and configure your API keys:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys (see [Environment Variables](#environment-variables) below).

4. **Start the development server**
   ```bash
   # Using npm
   npm run dev

   # Or using bun
   bun run dev
   ```
   
   The app will be available at `http://localhost:5173`

5. **Run tests**
   ```bash
   # Run tests once
   npm run test

   # Run tests in watch mode
   npm run test:watch
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Vite) |
| `npm run build` | Build for production |
| `npm run build:dev` | Build with development mode |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preview` | Preview production build |

## Environment Variables

The project requires the following environment variables. Copy `.env.example` to `.env` and configure:

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GROQ_API_KEY` | API key for Groq AI (chat completions) | [Groq Console](https://console.groq.com/keys) |
| `GROK_API_KEY` | API key for Grok/XAI (alternative AI) | [X.AI Console](https://console.x.ai/) |
| `VITE_ELEVENLABS_API_KEY` | API key for ElevenLabs (premium TTS voices) | [ElevenLabs](https://elevenlabs.io/app/settings/api-keys) |

### Optional Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `BOOKING_API_URL` | URL of your booking system API | Your internal system |
| `BOOKING_API_KEY` | API key for booking system | Your internal system |
| `BOOKING_API_PROVIDER` | Provider type (custom, calendly, etc.) | Your internal system |
| `SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://app.supabase.com/) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | [Supabase Dashboard](https://app.supabase.com/) |

### Variable Prefixes Explained

- **`VITE_` prefix:** Variables prefixed with `VITE_` are exposed to the client-side (browser) code
- **No prefix:** Variables without the prefix are only available in server-side code (Vercel API functions)

> ⚠️ **Security Note:** Never commit your `.env` file. The project's `.gitignore` is configured to exclude it. Always use `.env.example` as a template.

## Project Structure

```
ovg-engage/
├── api/                        # Vercel serverless API functions
│   ├── analytics.ts            # Analytics tracking endpoint
│   ├── grok-chat.ts            # Grok AI chat handler
│   ├── groq-chat.ts            # Groq AI chat handler (primary)
│   ├── groq-tts.ts             # Groq text-to-speech
│   └── xai-tts.ts              # XAI text-to-speech
│
├── public/                     # Static assets
│   ├── images/                 # Image assets
│   ├── videos/                 # Video assets
│   ├── favicon.ico
│   └── robots.txt
│
├── src/
│   ├── app/                    # App configuration
│   ├── assets/                 # Imported assets (images, etc.)
│   ├── components/
│   │   ├── landing/            # Landing page components
│   │   ├── ui/                 # shadcn/ui components
│   │   └── widget/             # Chat widget components
│   │       └── ChatWidget.tsx  # Main chat widget component
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-speech-recognition.ts  # Speech-to-text hook
│   │   ├── use-toast.ts        # Toast notification hook
│   │   └── use-mobile.tsx      # Mobile detection hook
│   ├── integrations/           # Third-party integrations
│   │   └── supabase/           # Supabase client setup
│   ├── lib/
│   │   ├── mock-ai.ts          # Mock AI for testing (no API needed)
│   │   └── utils.ts            # Utility functions (cn for classNames)
│   ├── pages/
│   │   ├── Index.tsx           # Main landing page
│   │   ├── AdminDashboard.tsx  # Admin console (Shift+J to access)
│   │   └── NotFound.tsx        # 404 page
│   ├── test/                   # Test files and setup
│   ├── AppNew.tsx              # Main app component
│   ├── ZillionOVG Engage | AI Concierge        # Business config (branding, offerings, lead schema)
│   ├── loader.js               # Widget embed script
│   └── main.tsx                # Entry point
│
├── supabase/                   # Supabase local configuration
├── .env.example                # Environment variables template
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── tailwind.OVG Engage | AI Concierge          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel deployment config
├── vite.OVG Engage | AI Concierge              # Vite build configuration
└── vitest.OVG Engage | AI Concierge            # Vitest testing configuration
```

### Key Files & Components

| File/Directory | Purpose |
|----------------|---------|
| `src/components/widget/ChatWidget.tsx` | Main floating chat widget - handles UI, chat state, voice input/output |
| `src/ZillionOVG Engage | AI Concierge` | Business configuration - branding, treatment offerings, lead capture schema |
| `src/lib/mock-ai.ts` | Mock AI responses for testing without API calls |
| `api/groq-chat.ts` | Serverless function for AI chat with function calling (booking) |
| `src/loader.js` | Embed script for integrating widget into external websites |
| `src/pages/AdminDashboard.tsx` | Admin console for viewing leads and analytics |
| `src/pages/reseller/Dashboard.tsx` | Reseller dashboard for managing multiple clients |
| `src/pages/reseller/ClientOVG Engage | AI Conciergex` | Client configuration page with branding, AI, and VIP settings |
| `src/pages/reseller/CustomServices.tsx` | Custom services management with time tracking and invoicing |
| `src/components/widget/ResellerChatWidget.tsx` | Database-driven chat widget for reseller clients |
| `src/components/widget/VIPCustomerConsole.tsx` | VIP customer loyalty console (SHIFT+V access) |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ChatWidget.tsx                                             ││
│  │  - Floating bubble UI                                       ││
│  │  - Speech Recognition (STT)                                 ││
│  │  - Browser TTS + ElevenLabs TTS                             ││
│  │  - LocalStorage persistence                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Vercel Serverless API Functions (/api/*)                   ││
│  │  - groq-chat.ts → Groq API (Llama 3.3 70B)                  ││
│  │  - grok-chat.ts → Grok/XAI API                              ││
│  │  - groq-tts.ts → Text-to-Speech                             ││
│  │  - analytics.ts → Data tracking                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  External AI Services                                       ││
│  │  - Groq API (primary chat)                                  ││
│  │  - Grok/XAI API (alternative)                               ││
│  │  - ElevenLabs (premium voices)                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Embedding the Widget

### Basic Embed (Default Configuration)
To embed the chat widget on an external website, include the loader script:

```html
<script src="https://ovg-engage.vercel.app/src/loader.js"></script>
```

The widget will automatically appear as a floating bubble in the bottom-right corner.

### White-Label Configuration
The widget supports full white-label customization. Set your configuration **before** loading the widget:

```html
<script>
  window.ovgConfig = {
    // Business Information
    tenant: {
      name: "Your Business Name",
      location: "Your Location",
      industry: "Your Industry",
      id: "your-unique-id"
    },
    // Branding
    branding: {
      primaryColor: "#your-brand-color",
      primaryGold: "#your-accent-color",
      font: "Your Font, sans-serif"
    },
    // Business Context (for AI responses)
    context: {
      offerings: ["Service 1", "Service 2", "Service 3"],
      preferences: ["Option 1", "Option 2"],
      defaultPrice: 100.00,
      currency: "$"
    },
    // Widget UI Configuration
    logo: "https://your-domain.com/logo.png",
    brandName: "Your Brand",
    greeting: "Hi! I'm your {businessName} concierge ✨",
    peekText: "Welcome! How can we help?",
    phone: "1234567890"
  };
</script>
<script src="https://ovg-engage.vercel.app/src/loader.js"></script>
```

### Features
- **Shadow DOM isolation** - Widget styles won't conflict with your site's CSS
- **Double-load protection** - Safe to include multiple times
- **Domain whitelisting** - Only authorized domains can embed the widget
- **Responsive** - Works on mobile and desktop
- **Configurable** - Customize colors, text, and branding
- **Secure** - API keys protected server-side, CORS enabled

### Security Features
- **Domain Validation** - Widget only loads on authorized domains
- **Shadow DOM** - Prevents CSS/JS conflicts with host page
- **Server-Side API** - Sensitive API keys never exposed to client
- **Rate Limiting** - Built-in protection against abuse

### Domain Whitelisting
To add your client's domain, configure it before loading the widget:

```html
<script>
  window.ovgConfig = {
    allowedDomains: ['client-website.com', 'www.client-website.com'],
    // ... other config
  };
</script>
<script src="https://ovg-engage.vercel.app/src/loader.js"></script>
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code patterns and TypeScript strict mode
- Write tests for new features
- Run `npm run lint` before committing
- Keep the widget lightweight - consider performance impact

## License

Private - All rights reserved to OVG Engage.

---

## Additional Documentation

- **[Reseller User Guide](./Resellers_User_Guide.md)** - Complete guide for resellers on managing clients, configuring widgets, custom services, invoicing, and the VIP Customer Console
- **[Reseller Widget Architecture](./RESELLER_WIDGET_ARCHITECTURE.md)** - Technical architecture documentation for the white-label reseller system
