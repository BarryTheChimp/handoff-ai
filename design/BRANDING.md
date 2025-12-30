# Handoff AI - Brand Guidelines

## Brand Overview

**Handoff AI** bridges the gap between product vision and engineering execution.

### Brand Personality
- **Professional** but approachable
- **Intelligent** but not intimidating
- **Efficient** - respects everyone's time
- **Trustworthy** - the handoff is clean

---

## Logo

[Logo files to be added]

**Product Name:** Handoff AI  
**Tagline:** Clean specs in. Actionable tickets out.

---

## Colour Palette

### Primary

| Name | Hex | Usage |
|------|-----|-------|
| **Toucan Orange** | `#FF6B35` | Primary CTAs, highlights |
| **Toucan Orange Light** | `#FF8F66` | Hover states |
| **Toucan Orange Dark** | `#E55A2B` | Active states |

### Dark Theme

| Name | Hex | Usage |
|------|-----|-------|
| **Dark Base** | `#1A1A2E` | Page background |
| **Dark Lighter** | `#252542` | Cards, panels |
| **Dark Border** | `#3D3D5C` | Borders |

### Text

| Name | Hex | Usage |
|------|-----|-------|
| **Grey 100** | `#F5F5F7` | Primary text |
| **Grey 200** | `#E5E5E7` | Secondary text |
| **Grey 400** | `#9999A5` | Muted text |
| **Grey 600** | `#66667A` | Disabled text |

### Semantic

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#4ADE80` | Success, approved |
| **Warning** | `#FBBF24` | Warning, attention |
| **Error** | `#F87171` | Error, destructive |
| **Info** | `#60A5FA` | Info, links |

---

## Typography

### Font Families

| Type | Font |
|------|------|
| **Primary** | Inter |
| **Monospace** | JetBrains Mono |

### Scale

| Name | Size | Usage |
|------|------|-------|
| xs | 12px | Labels, captions |
| sm | 14px | Secondary text |
| base | 16px | Body text |
| lg | 18px | Subheadings |
| xl | 20px | Section headers |
| 2xl | 24px | Page titles |
| 3xl | 30px | Hero text |

---

## Spacing

4px base unit. Common: 4, 8, 12, 16, 24, 32, 48

---

## Border Radius

- **sm:** 4px (badges)
- **md:** 6px (buttons, inputs)
- **lg:** 8px (cards, modals)

---

## Components

### Buttons

**Primary:**
```css
background: #FF6B35;
color: white;
padding: 10px 20px;
border-radius: 6px;
```

**Secondary:**
```css
background: transparent;
border: 1px solid #3D3D5C;
color: #F5F5F7;
```

### Cards

```css
background: #252542;
border: 1px solid #3D3D5C;
border-radius: 8px;
padding: 24px;
```

### Inputs

```css
background: #1A1A2E;
border: 1px solid #3D3D5C;
border-radius: 6px;
/* Focus: orange ring */
```

### Tree Nodes

Selected:
```css
background: rgba(255, 107, 53, 0.2);
border-left: 3px solid #FF6B35;
```

---

## Voice & Tone

- **Clear, not clever** - "Upload your spec" not "Feed me docs!"
- **Helpful, not condescending** - Guide, don't lecture
- **Concise** - Respect the user's time

### Examples

| Context | Example |
|---------|---------|
| Success | "Translated 47 stories" |
| Error | "Couldn't connect to Jira. Check your credentials." |
| Empty | "No specs yet. Upload your first one." |
| Loading | "Translating your spec..." |

---

*Last updated: December 2024*
