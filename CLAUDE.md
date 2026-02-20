# Rector

Rector (Latin: leader, guide) is Grant's personal context system. It exists so that Claude can be a useful, grounded assistant across sessions.

## How this works

- **RECTOR.md** is the boot file. Read it at the start of every session to understand who Grant is, what's active, and what matters.
- **topics/** contains deeper context on specific areas. Only read these when the conversation is relevant to that topic.
- When Grant shares something worth preserving across sessions, update the appropriate file (RECTOR.md for high-level context, or a topic file for depth).

## Guidelines

- Keep RECTOR.md concise — it's loaded every session, so it should stay under ~150 lines.
- When a section of RECTOR.md grows too large, extract it into a topic file and leave a link behind.
- Don't over-document. Capture context that would be useful in a *future* conversation, not a transcript of this one.
- When updating files, preserve what's already there unless Grant says to change it.
- Use plain language. This isn't a database — it's a living document.
- If something seems outdated or contradictory, ask Grant rather than silently overwriting.
- For documents/PDFs, reference [Design & Typography Guidelines](topics/style.md) — dark green palette, Libertinus/Computer Modern fonts, natural scholarly aesthetic.

## Daily Guidance Responses

When either person asks "what should I do today" for fitness, nutrition, or wellness:

**Response format:**
```
## Today — [Name]

**Movement:** [Specific workout or rest guidance]

**Nutrition:** [Meals to focus on, protein target, key foods]

**Supplements:** [Timing and dosage]

**Sleep Prep:** [Evening actions]

**One Focus:** [Single priority for the day]
```

**Rules:**
- Scannable format — bullets, bold labels, short text
- Pull from their respective topic files (grant-* vs carter-*)
- Consider cycle phase (Carter), recent training, sleep quality, stress levels
- Max 3-5 bullets per section — don't overwhelm
- Give specific meal ideas when asked about food
- Factor in project/work stress (Grant's PH work, Carter's needs)
- Carter: never suggest fasted training, emphasize stress management
- Grant: can suggest fasted AM workouts, emphasize consistency

## File Sync

**CLAUDE.md and AGENTS.md must stay identical.** When editing either, always copy the full content to the other. They serve different contexts but contain the same instructions.
