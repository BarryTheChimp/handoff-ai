# Handoff AI

> The bridge between product specs and developer-ready work

[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude-orange)](https://anthropic.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18.x-61dafb)](https://react.dev)

## The Problem

The handoff between product and engineering is broken:
- Specs are written in product language
- Developers need technical, actionable tasks
- Translation takes hours and loses context
- Everyone's frustrated

## The Solution

Handoff AI translates specification documents into developer-ready work packages:

```
Product Spec                    Developer-Ready Tickets
────────────                    ──────────────────────
"The system shall              Epic: Appointment Management
support appointment              └── Feature: Booking Flow
management including               └── Story: Create appointment endpoint
creation, modification,            └── Story: Validate time slot availability
and cancellation..."               └── Story: Send confirmation notification
```

## How It Works

1. **Upload** your spec (PDF, DOCX, YAML, JSON)
2. **AI translates** into Epics → Features → Stories
3. **Review** in an interactive tree view
4. **Refine** with drag-drop, split, merge
5. **Export** to Jira with proper linking

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd handoff-ai
npm install

# Configure
cp .env.example .env
# Add your CLAUDE_API_KEY

# Start database
docker-compose up -d db

# Run migrations
cd backend && npx prisma migrate dev && cd ..

# Start development
npm run dev
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:3001`

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Project conventions and standards |
| [docs/SPEC.md](./docs/SPEC.md) | Full technical specification |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design |
| [docs/API.md](./docs/API.md) | API reference |
| [design/BRANDING.md](./design/BRANDING.md) | Visual guidelines |

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Zustand
- **Backend:** Node.js 20, Fastify, Prisma
- **Database:** PostgreSQL 15
- **AI:** Claude API
- **Testing:** Vitest, Playwright

## Contributing

1. Read [CLAUDE.md](./CLAUDE.md) for coding standards
2. Create a feature branch
3. Write tests alongside code
4. Submit a PR

## License

Proprietary - Toucan Labs

---

Built with ☕ and 🤖 by Toucan Labs
