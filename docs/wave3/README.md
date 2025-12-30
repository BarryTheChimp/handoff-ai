# Handoff AI - Wave 3: Smart Context Engine

## Vision

Transform Handoff AI from a spec-to-stories tool into an **intelligent translation system** that learns, adapts, and improves over time. The AI should understand the full context of a project - not just the spec it's currently reading.

## The Problem

Current state: AI translates each spec in isolation. It doesn't know:
- What OpenEyes is
- What Meditech is
- That "MRN" means Medical Record Number
- That your team prefers Gherkin format
- That you already translated 6 related specs
- That there are existing Jira tickets for this project

Result: Generic output that requires heavy manual editing.

## The Solution

A **Smart Context Engine** that:
1. Stores project knowledge (brief, glossary, architecture, conventions)
2. Connects to external sources (Jira, uploaded docs, other specs)
3. Intelligently selects relevant context for each translation
4. Learns from user edits to improve over time
5. Guides users to add more context where it helps

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROJECT KNOWLEDGE BASE (F14)                     │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Brief     │ │  Glossary   │ │  Reference  │ │    Team     │   │
│  │  (manual)   │ │  (manual)   │ │    Docs     │ │   Prefs     │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTEXT SOURCES (F15)                            │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ Translated  │ │   Jira      │ │  Uploaded   │ │   Future    │   │
│  │   Specs     │ │  Tickets    │ │    Files    │ │  Connectors │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 SMART CONTEXT BUILDER (F16)                         │
│                                                                     │
│  For each translation:                                              │
│  1. ANALYZE  - What does this spec reference?                       │
│  2. RETRIEVE - Pull relevant context chunks                         │
│  3. RANK     - Score by relevance                                   │
│  4. SELECT   - Fit within token budget                              │
│  5. INJECT   - Build context for AI prompt                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     TRANSLATION PIPELINE
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LEARNING LOOP (F17)                              │
│                                                                     │
│  • Track all edits to generated stories                             │
│  • Detect patterns ("user always adds error handling")              │
│  • Surface suggestions ("add to preferences?")                      │
│  • Improve future translations                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 SETUP WIZARD & HEALTH (F18)                         │
│                                                                     │
│  • Guided project setup                                             │
│  • Context health score (45% configured)                            │
│  • Recommendations ("add glossary terms")                           │
│  • Contextual prompts during use                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

### Foundation
| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 11 | User Session & Logout | Logout button, user info display, session management | 2h |
| 12 | Project Management | Project CRUD, selector in header, remove hardcoded IDs | 4h |
| 13 | Global Navigation | Nav bar, breadcrumbs, consistent layout | 2h |

### Smart Context Engine
| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 14 | Knowledge Base | Project brief, glossary, reference docs, team prefs storage | 6h |
| 15 | Context Sources | Connectors for specs, Jira, uploaded docs | 6h |
| 16 | Smart Context Builder | RAG-style retrieval and context construction | 8h |
| 17 | Learning Loop | Edit tracking, pattern detection, preference suggestions | 6h |
| 18 | Setup Wizard & Health | Guided setup, health score, contextual recommendations | 4h |

**Total: ~38 hours**

## Build Order

1. **Feature 11** - Need logout to test properly
2. **Feature 12** - Need projects before adding context to them
3. **Feature 13** - Need navigation to access new pages
4. **Feature 14** - Core knowledge storage
5. **Feature 15** - Connect external sources
6. **Feature 16** - The brain - smart context selection
7. **Feature 17** - Learning from user behavior
8. **Feature 18** - Polish - guided setup and health

## Key Principles

### From AI Engineering (Chip Huyen)

1. **Context Construction = Feature Engineering**: The quality of context determines quality of output. Invest here.

2. **RAG Pattern**: Don't dump everything into context. Retrieve what's relevant for *this specific query*.

3. **Implicit Feedback**: Every edit is a signal. Track them. Learn from them.

4. **Chunking Strategy**: Break documents into retrievable pieces. Add metadata.

5. **Token Budget**: Context has cost. Select wisely. ~2000 tokens overhead max.

### From UX (Krug, Frost)

1. **Don't Make Me Think**: Setup should be guided, not a blank form.

2. **Progressive Disclosure**: Show simple first, advanced when needed.

3. **Feedback Loops**: Show users the impact of their actions ("adding glossary improved confidence by 15%").

## Success Metrics

**Quality Metrics:**
- Story edit rate (% of stories edited after generation)
- Edit distance (how much editing needed)
- Confidence scores (AI's self-reported certainty)

**Engagement Metrics:**
- Context completeness (% of knowledge base filled)
- Learning suggestions accepted (% of patterns converted to prefs)
- Time to first translation

**Cost Metrics:**
- Context tokens per translation
- API cost per spec

## Files

```
handoff-wave3/
├── README.md                           # This file
├── OVERNIGHT-BUILD.md                  # Claude Code instructions
└── features/
    ├── FEATURE-11-USER-SESSION.md
    ├── FEATURE-12-PROJECT-MANAGEMENT.md
    ├── FEATURE-13-NAVIGATION.md
    ├── FEATURE-14-KNOWLEDGE-BASE.md
    ├── FEATURE-15-CONTEXT-SOURCES.md
    ├── FEATURE-16-SMART-CONTEXT-BUILDER.md
    ├── FEATURE-17-LEARNING-LOOP.md
    └── FEATURE-18-SETUP-WIZARD.md
```
