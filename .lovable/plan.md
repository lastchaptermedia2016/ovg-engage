

# OVGweb Prototype – AI Concierge Overlay

## Overview
A full-stack embeddable AI chat widget that website owners can customize and deploy via a single script tag. Includes a marketing landing page, admin dashboard, and the widget itself with conversational lead capture.

---

## Phase 1: Foundation & Landing Page

### Marketing Landing Page
- Hero section: "Turn passive browsers into conversations" with animated widget preview mockup
- Benefits section with stats (e.g., "3x more leads", "24/7 engagement")
- How-it-works steps (Embed → Customize → Capture Leads)
- "Get Started Free" CTA leading to sign-up
- Indigo (#6366F1) accent color scheme, dark/light mode, elegant transparency effects

### Authentication
- Supabase Auth with email/password and Google OAuth
- Login and signup pages with proper redirect handling
- Protected routes for dashboard

---

## Phase 2: Database & Backend Setup

### Supabase Tables
- **profiles** – user profile data (name, company)
- **widgets** – id, user_id, domain, config JSON (colors, greeting text, promo text, logo URL)
- **leads** – id, widget_id, name, email, phone, consent status + timestamp, transcript JSON, created_at
- **user_roles** – role-based access (standard security pattern)

### Row-Level Security
- Widget owners can only CRUD their own widgets
- Leads are scoped to widget owners
- Storage bucket for logo uploads (public read, authenticated write)

---

## Phase 3: Admin Dashboard

### Dashboard Home
- Overview stats cards (total leads, active widgets, conversations today)
- Quick-access widget preview pane showing live preview of the chat bubble

### Widget Customization Page
- Color picker for primary/accent colors
- Logo upload (Supabase Storage)
- Welcome message editor
- Promo text editor (e.g., "20% off first consultation")
- Domain whitelist field
- Live preview that updates as settings change

### Leads Table
- Sortable/filterable table showing captured leads
- Columns: name, email, timestamp, last message snippet, consent status
- Export placeholder (future CSV download)

### Embed Code Page
- Copy-to-clipboard script tag with the user's unique widget ID
- Installation instructions

---

## Phase 4: Embeddable Chat Widget

### Floating Bubble
- Bottom-right positioned animated chat/mic bubble
- Pulsing animation to draw attention
- Unread message indicator dot

### Chat Overlay
- Semi-transparent overlay with backdrop blur effect
- AI avatar (animated circle placeholder)
- Chat message bubbles (user vs AI styled differently)
- Text input bar with send button
- Mic button using Web Speech API (graceful fallback if denied)
- Minimize button to collapse back to bubble
- "Talk to Human" button (logs request as placeholder)
- Fully responsive – full-screen on mobile

### Proactive Greeting
- After 2-3 seconds on page, AI auto-sends a customizable welcome message
- Message appears as a toast/peek above the bubble before user opens

### Consent Flow
- On first interaction, modal overlay with AI Terms & Conditions
- Checkbox required before proceeding
- Consent stored in localStorage + synced to Supabase

### Conversation Persistence
- Messages stored in localStorage for cross-navigation continuity
- Session synced to Supabase when lead is identified

### Lead Capture
- AI conversationally asks for name and email during natural flow
- Stores with consent flag and timestamp
- Mock AI responses with rule-based logic (with clear comments for future LLM integration)

---

## Phase 5: Polish & Deployment Readiness

### Design & UX
- Indigo accent palette with dark/light mode throughout
- Calm, trustworthy aesthetic with rounded corners, clean typography
- Smooth animations (bubble expand, message slide-in, overlay fade)
- Responsive across all breakpoints

### Performance
- Lazy-load the chat overlay (only load on bubble click)
- Keep widget bundle minimal
- Code-split dashboard pages

### Error Handling
- Toast notifications for all user actions (save, copy, errors)
- Form validation with Zod on all inputs
- Graceful fallbacks for voice API, network issues

