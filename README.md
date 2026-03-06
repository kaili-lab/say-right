# SayRight · AI English Coach

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=flat&logo=hono&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat&logo=cloudflare&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)

> Turn your Chinese thoughts into natural English — then lock them in with spaced repetition.

[🔗 Live Demo](https://say-right.kaili.dev) · [中文文档](./README_CN.md)

---


<table>
  <tr>
    <td width="50%" align="center" valign="top">
      <img src="./mock-ui/record1.png" alt="Record page with Chinese input and generated English result" width="100%" />
      <br />
      <sub><strong>Record</strong> · Input Chinese and generate natural English</sub>
    </td>
    <td width="50%" align="center" valign="top">
      <img src="./mock-ui/record2.png" alt="Record page after saving a card into a deck" width="100%" />
      <br />
      <sub><strong>Save Flow</strong> · Review the generated text before saving</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="top">
      <img src="./mock-ui/card-group.png" alt="Deck management page showing grouped cards" width="100%" />
      <br />
      <sub><strong>Decks</strong> · AI auto-organizes cards into the right deck</sub>
    </td>
    <td width="50%" align="center" valign="top">
      <img src="./mock-ui/review.png" alt="Review page with FSRS-based study flow" width="100%" />
      <br />
      <sub><strong>Review</strong> · Practice, rate, and reinforce with FSRS</sub>
    </td>
  </tr>
</table>

---

## ✨ Highlights

**1. The complete loop no mainstream app has**
Type a Chinese thought → AI rewrites it as natural English → saved as a flashcard → reviewed via FSRS spaced repetition. Most vocabulary apps stop at word lists. SayRight closes the full cycle from expression to retention.

**2. Group Agent: AI auto-organizes your cards**
When you save a card, an AI agent reads your existing decks and decides where it belongs — creating a new deck if needed. No manual tagging. Cards find their own home.

**3. FSRS + AI review scoring**
During review, optionally type your own English attempt and get an AI score (0–100) mapped to Anki's four grades (Again / Hard / Good / Easy). The FSRS algorithm schedules the next review based on your actual retention — not fixed intervals.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| State & Data | TanStack Query, React Hook Form, Zod |
| Backend | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Auth | better-auth (session cookie) |
| AI | Claude / GPT-4o (OpenAI-compatible) |

---

## Features

- **Record** — input Chinese (up to 200 chars), generate natural English, edit before saving
- **Auto-deck** — Group Agent assigns each card to the best existing deck, or creates one
- **Review** — FSRS scheduling with 4-grade self-rating; optional AI scoring with feedback
- **Deck management** — view cards by deck, move cards between decks, delete empty decks
- **Home dashboard** — today's review count, recent decks, streak stats
- **Responsive** — bottom nav on mobile, top nav on desktop (Warm Orange theme)
- **Session auth** — cookie-based auth via better-auth; multi-tenant data isolation

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  React 19 SPA (Vite)                        │
│  TanStack Query · React Hook Form · Zod     │
└──────────────────────┬──────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────┐
│  Hono  ·  Cloudflare Workers                │
│  better-auth  ·  Drizzle ORM                │
│  Group Agent (AI orchestration)             │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────▼────────────┐
          │  Cloudflare D1 (SQLite) │
          └─────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 20+, pnpm
- Cloudflare account (for D1 and Workers)
- Wrangler CLI: `pnpm install -g wrangler`

### Frontend

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

### Backend

```bash
cd backend-hono
pnpm install

# Create D1 database (first time only)
wrangler d1 create say-right
# Paste the database_id into wrangler.toml

# Run migrations
wrangler d1 migrations apply say-right --local

# Start local dev server
pnpm dev          # http://localhost:8787
```

### Environment

Copy `.dev.vars.example` to `.dev.vars` in `backend-hono/` and fill in:

```
BETTER_AUTH_SECRET=your_secret
LLM_MODE=deterministic
# deterministic only uses the built-in stub; switch to provider for real translation
# If you switch to provider mode, also fill these in:
LLM_API_KEY=your_key
LLM_BASE_URL=https://api.openai.com/v1   # or any OpenAI-compatible endpoint
```

---

## Roadmap

- [ ] Real LLM integration for English generation — API contract defined, provider connection pending
- [ ] Group Agent with live AI — stub complete, wiring to provider pending
- [ ] AI review scoring with live model — stub complete, wiring pending
- [ ] Deploy to Cloudflare Workers + D1 (production)
- [ ] Voice input: speak Chinese → auto transcribe → generate English (v2)
- [ ] Pronunciation practice: read English aloud → AI scores accuracy (v2)

---

## License

MIT

---

<a name="demo"></a>
> **Live Demo:** https://say-right.kaili.dev
