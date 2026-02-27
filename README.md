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
- Mock AI responses (easy to swap for real LLM like Grok, OpenAI, etc.)
- LocalStorage persistence (chat history saved across refreshes)

## Tech Stack
- React + Vite (fast dev & build)
- TypeScript
- Tailwind CSS + shadcn/ui (beautiful components)
- Lucide React (icons)
- Browser SpeechSynthesis (TTS) & SpeechRecognition (STT)
- LocalStorage for chat persistence

## Local Development
1. Clone the repo
   ```bash
   git clone https://github.com/lastchaptermedia/ovg-engage.git
   cd ovg-engage
