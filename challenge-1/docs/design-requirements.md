# Challenge 1 Design Requirements

Status: applies to all Challenge 1 prototype work.

## Core Requirement

ArrearsFlow must support Arabic and English from the first usable prototype.

Arabic is the core/original product language for both the customer side and the
office side. English is the secondary language for demo, accessibility, and
non-Arabic-speaking users or reviewers.

Arabic copy is the source of truth. Do not write English first and then treat
Arabic as a translation afterthought. The Arabic should be authored as original
UAE government-service Arabic with correct grammar, punctuation, tone, and
terminology. English should be derived from the Arabic meaning second.

Updated real-page finding:

- Public UAE/MOEI pages generally use a language switch, not side-by-side
  English and Arabic on the same page.
- Arabic pages use RTL Arabic content.
- English pages use LTR English content.
- The prototype should therefore support both languages, but the customer-facing
  and office-facing UI should move toward a language-toggle mode.

Every visible user-facing element must have both English and Arabic content
available in the system, including:

- navigation
- form labels
- section headings
- buttons
- status labels
- rule labels
- recommendation text
- approval seal text
- audit log labels
- demo/pitch labels

For content creation:

1. Draft the Arabic first.
2. Review it for Emirati/UAE government tone.
3. Derive the English equivalent.
4. Do not let English sentence structure force awkward Arabic phrasing.
5. Avoid literal machine-translation style Arabic.

## Layout Requirement

The app should look like a UAE federal digital service workflow.

Design should prioritize:

- service task completion
- clarity
- trust
- accessibility
- auditability
- human approval

## Typography Requirement

Use system fallbacks that support English and Arabic well.

Preferred stack:

```css
font-family: "Roboto", "Noto Kufi Arabic", "Noto Sans Arabic", -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", sans-serif;
```

## Content Alignment

- Arabic is primary.
- English text should read left-to-right.
- Arabic text should read right-to-left.
- Arabic labels should be visibly right-aligned or marked with `dir="rtl"` when standalone.
- Do not justify paragraphs.

Preferred behavior for both customer-facing and office-facing UI:

- Show one active language at a time.
- Arabic mode: `lang="ar"`, RTL layout, Arabic copy visible.
- English mode: `lang="en"`, LTR layout, English copy visible.
- Keep a language toggle in the top header.
- Treat Arabic mode as the primary/default product experience unless a demo
  situation requires English first.

Temporary side-by-side bilingual labels are acceptable during early prototyping,
but should not be the final service behavior.

## Government UI Cues

Include:

- UAE flag accent strip
- service name and case ID clarity
- structured forms
- clear statuses
- simple white panels
- audit/action timeline
- official-looking digital approval seal

## Demo Rule

If a judge sees only one screen, they should immediately understand:

> This is an Arabic-first UAE government service workflow where AI recommends and a verified officer authorizes, with English available as a secondary language.
