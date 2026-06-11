# Challenge 2 Analysis

Status: first analysis pass based on `official-statement.md` and `briefing-notes.md`.

## Real Problem

International Relations teams need to prepare executive-ready country and sector briefings quickly, but the work is fragmented across many sources, formats, templates, and internal expectations.

The real bottleneck is not ordinary search. It is turning trusted, ministry-relevant information into the exact executive format needed for meetings, visits, and strategic engagement.

## Hidden Judging Clues

- They want an agent, not just a dashboard.
- The agent must fit information into executive templates.
- Trusted-source control is critical. Whitelist beats blacklist.
- Bias control matters because the output concerns countries and international relations.
- Sector filtering matters: energy, transportation, housing, maritime, and infrastructure.
- They do not want broad unrelated political or social material unless it is relevant.
- Word documents may matter more than flashy slides because the speaker said the work is basically documents.
- Using GPT/Claude with mock data is acceptable for the hackathon, but production would likely need internal or controlled deployment.

## Prototype Must Prove

- It can select a country and one or more MOEI sectors.
- It can retrieve or simulate trusted-source evidence.
- It can filter out irrelevant categories.
- It can produce an executive brief in a defined template.
- It can generate talking points for a leadership meeting.
- It can show source traceability.
- It can produce at least one polished output artifact, such as a Word-style brief or slide outline.
- It can handle a conversational follow-up, such as comparing two countries or changing the sector focus.

## Strong Prototype Shape

The best shape is an executive briefing workbench:

1. User selects country, meeting type, sectors, and output format.
2. Agent searches trusted mock/real source library.
3. Agent extracts relevant sector facts.
4. Agent rejects or hides out-of-scope categories.
5. Agent drafts executive brief.
6. Agent generates talking points and opportunity map.
7. User asks follow-up questions.
8. Agent exports a Word-style document or slide-ready outline with sources.

## Strengths

- Very executive-friendly.
- Can look beautiful and polished.
- Strong fit for document generation, RAG, source governance, and template automation.
- Less operationally sensitive than loan/financial case decisions.
- The content owner clearly explained what she wants.
- Can be impressive if the UI and generated outputs feel premium.

## Risks

- Can collapse into "ChatGPT with a nicer UI" if not designed as an agentic workflow.
- Reliable current international data is hard without live web/data integrations.
- Source/bias control is hard to prove deeply in a hackathon.
- Short videos and real-time indicators could explode scope.
- Judges may ask what is new if Claude already performs well with the same prompt.

## Best Differentiators

- Whitelisted-source intelligence mode.
- Executive template lock: agent must fill only ministry-approved sections.
- Sector relevance filter that explicitly suppresses unrelated categories.
- Source confidence and evidence trace.
- Before/after demo: messy source pack to polished brief.
- Bias and sensitivity guardrails for diplomatic content.

## Early Verdict

Challenge 2 is strong if the team wants a polished executive product. It is less straightforward than Challenge 1 but can impress if the output quality is excellent. The risk is that it may be judged as research automation rather than agentic execution unless the workflow shows source selection, filtering, template filling, evidence trace, and iterative briefing preparation.
