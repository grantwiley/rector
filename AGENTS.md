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

## File Sync

**CLAUDE.md and AGENTS.md must stay identical.** When editing either, always copy the full content to the other. They serve different contexts but contain the same instructions.
