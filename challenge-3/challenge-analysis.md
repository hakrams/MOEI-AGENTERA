# Challenge 3 Analysis

Status: first analysis pass based on `official-statement.md` and `briefing-notes.md`.

## Real Problem

MOEI customers interact through multiple channels, but those channels do not share a unified customer context, service workflow, or operational view. The deeper problem is backend fragmentation: multiple entities, services, CRMs, databases, channels, and forms.

The challenge is asking for an intelligent engagement and orchestration layer that can sit above fragmented channels and route customer requests into the right backend/service process.

## Hidden Judging Clues

- The speaker explicitly called this tricky and difficult.
- It has high reward because it could be reused across many entities.
- They are not only asking for chat. They are asking for an integration layer.
- No-code/zero-code form management is a major strategic clue.
- Document reading and business-rule checking are core, not optional.
- A hackathon prototype does not need full API integration, but should define integration specifications.
- The current reality includes many CRMs and databases, not one clean backend.
- The UX platform framing matters: customer journey plus government/PMO requirements.

## Prototype Must Prove

- It can receive a customer request from at least two simulated channels.
- It can preserve customer context across those channels.
- It can identify the service type.
- It can dynamically present or generate the right form fields.
- It can read or simulate extraction from an uploaded document.
- It can validate required fields and business rules.
- It can create a structured case.
- It can route the case to a mock backend/CRM.
- It can show an officer/contact-center copilot view.
- It can show leadership KPIs across the simulated channels.

## Strong Prototype Shape

The best shape is a narrow omnichannel orchestration slice:

1. Customer starts on web chat.
2. Customer continues through a simulated WhatsApp panel.
3. Agent remembers context.
4. Agent identifies a housing-related service.
5. Agent collects fields and uploads.
6. Agent validates missing data/documents.
7. Agent creates a structured case.
8. Agent routes it to a mock housing CRM/backend.
9. Officer/contact-center view sees summary and next-best action.
10. Leadership dashboard shows channel activity and resolution metrics.

## Strengths

- Biggest platform vision.
- Strong reuse story across entities and services.
- Can connect all three official channels in the pitch.
- Good fit for agentic orchestration, routing, document checking, and dashboards.
- Could impress judges if scoped tightly and visually clear.

## Risks

- Very high scope.
- Easy to become a shallow mock of too many things.
- Voice sentiment, WhatsApp, CRM, mobile, website, forms, APIs, dashboards, and AI copilot are too much for one hackathon build.
- Real integration is impossible without their systems.
- Needs strict framing so judges understand what is real and what is simulated.

## Best Differentiators

- "Integration layer, not channel replacement" framing.
- Configurable service-form builder.
- Persistent customer context across mock channels.
- Mock API connector registry showing where each backend would plug in.
- Officer copilot plus leadership dashboard in one flow.
- Focus on one service journey while showing the architecture can scale.

## Early Verdict

Challenge 3 has the biggest vision and highest enterprise value, but it is the riskiest. It should not be attempted as the full omnichannel platform. If chosen, it must be reduced to one narrow vertical slice that demonstrates the reusable orchestration layer. It may work best as a supporting module in a broader platform pitch rather than the only fully built challenge.
