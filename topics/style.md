# Design & Typography Guidelines

Personal style guide for documents, PDFs, and branded materials.

## Core Aesthetic

Natural, refined, scholarly. Think: cabin in the woods with leather-bound books and good coffee.

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Forest Green** | `#1a3d2e` | Primary text, headers, accents |
| **Sage** | `#4a7c59` | Secondary elements, borders |
| **Cream** | `#f5f2eb` | Backgrounds, paper |
| **Charcoal** | `#2d2d2d` | Body text on light backgrounds |
| **Terracotta** | `#c17c53` | Accent highlights (use sparingly) |

## Typography

### Primary Fonts

| Font | Use Case | Notes |
|------|----------|-------|
| **Libertinus Serif** | Body text, long-form | LaTeX classic, excellent readability |
| **Libertinus Sans** | Subheadings, UI | Clean, pairs beautifully with Serif |
| **EB Garamond** | Elegant alternatives | When Libertinus feels too academic |
| **Computer Modern** | Technical docs | The LaTeX standard |

### Secondary/Display

| Font | Use Case | Notes |
|------|----------|-------|
| **Baskerville** | Titles, formal docs | Timeless, authoritative |
| **Franklin Gothic** | Headlines, posters | Bold, industrial, modern contrast |

### Fallbacks

```css
font-family: 'Libertinus Serif', 'Georgia', 'Times New Roman', serif;
font-family: 'Libertinus Sans', 'Helvetica Neue', 'Arial', sans-serif;
```

## Font Pairings

**Academic/Technical:**
- Headers: Computer Modern (Bold)
- Body: Libertinus Serif

**Elegant/Formal:**
- Headers: Baskerville
- Body: EB Garamond or Libertinus Serif

**Modern Contrast:**
- Headers: Franklin Gothic
- Body: Libertinus Serif

## Sizing Scale

| Element | Size | Weight |
|---------|------|--------|
| Title/H1 | 24-32pt | Bold or SemiBold |
| Heading/H2 | 18-20pt | SemiBold |
| Subheading/H3 | 14-16pt | Medium |
| Body | 11-12pt | Regular (400) |
| Caption/Small | 9-10pt | Regular |

## Spacing & Layout

- **Line height:** 1.5-1.6 for body text
- **Margins:** Generous (1-1.5in) for printed docs
- **Paragraph spacing:** 0.5-1em (don't indent *and* space)
- **Letter spacing:** Slightly loose (-0.01em to +0.02em) for headers

## PDF Generation Tips

- Embed fonts when possible (especially Libertinus variants)
- Use cream/off-white backgrounds instead of pure white for warmth
- Forest green rules/borders instead of black
- 2-3mm bleed for print
- 300 DPI minimum for images

## When in Doubt

- Lean toward classic over trendy
- Prioritize readability over decoration
- Let typography do the heavy lifting—minimal color, maximum contrast
- Green is your friend, but don't overdo it
