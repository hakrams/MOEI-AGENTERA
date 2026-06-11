# Sah Labs MOEI Agentic AI Hackathon Submission

Prepared by Sah Labs for the Agentera - MOEI x 42 Abu Dhabi Hackathon.

Submission repository:

```text
https://github.com/hakrams/MOEI-AGENTERA.git
```

## Project Overview

This repository contains the Sah Labs submission for the MOEI Agentic AI Hackathon. The main submitted product focuses on Challenge 1 and Challenge 3, supported by TrustGate for identity and authorization.

- ArrearsFlow: AI-assisted housing arrears rescheduling.
- OneCX: omnichannel customer engagement and service continuity.

CountryIQ, the Challenge 2 workspace, is included only as an exploratory module and is not the primary submitted scope.

The system is designed as a working product slice, not only a static demo. It includes a Node.js backend, live API routes, customer and officer workspaces, AI-assisted document and briefing flows, TrustGate authorization integration, and an event-ledger approach for omnichannel activity.

## Live Demo

Public platform:

```text
https://moei.sahlabs.me
```

TrustGate identity and authorization service:

```text
https://trustgate.sahlabs.me
```

TrustGate is the identity and privilege layer for the demo. It protects officer access and separates AI recommendation from final human authorization.

Key demo routes:

```text
https://moei.sahlabs.me/app/
https://moei.sahlabs.me/customer/housing-arrears/
https://moei.sahlabs.me/office/housing-arrears/
https://moei.sahlabs.me/customer/omnichannel-intake/
https://moei.sahlabs.me/office/omnichannel-intake/
https://moei.sahlabs.me/leadership/dashboard/
https://trustgate.sahlabs.me
```

## Challenge 1: ArrearsFlow

ArrearsFlow supports housing arrears rescheduling through a structured customer and officer journey.

The customer flow allows an applicant to submit a service request, provide salary and hardship context, upload required documents, and track the application through a live case cockpit.

The officer flow provides a workspace for reviewing submitted cases, checking document status, viewing deterministic policy assessment, and preparing the case for human authorization.

Core principles:

- Financial calculations and policy checks are deterministic.
- AI assists with explanation, document understanding, and risk signals.
- Final approval remains with an authorized human officer.
- TrustGate is used as the identity and approval boundary.
- Audit history records meaningful case events.

Important policy controls include:

- Active request checks.
- Required document gate.
- Salary and repayment-cap checks.
- Repayment-period boundary checks.
- Officer escalation and review paths.
- TrustGate-backed final authorization.

## Challenge 2: CountryIQ

CountryIQ is included as an exploratory workspace only. It was not completed to the same submission-readiness standard as ArrearsFlow and OneCX, so it should not be treated as the primary judged product.

The intended direction was a source-grounded executive country intelligence advisor with source confidence, freshness, contradiction handling, and unsupported-claim blocking. For this submission, the completed focus remains Challenge 1 plus Challenge 3.

## Challenge 3: OneCX

OneCX is an omnichannel customer engagement layer for MOEI service journeys.

It connects customer conversations, officer support, and leadership visibility through shared service events and a customer brain.

Key capabilities:

- WhatsApp webhook integration.
- Customer service intake.
- Officer omnichannel workspace.
- Leadership command dashboard.
- Event-ledger based interaction history.
- Customer context lookup across service activity.
- Deterministic answer path before optional AI assistance.

The system is designed so that channels such as web, WhatsApp, and voice can contribute to the same service history instead of becoming isolated support conversations.

## TrustGate

TrustGate is the identity, privilege, and authorization layer used by the MOEI platform.

In this submission, TrustGate demonstrates:

- Customer and officer identity verification.
- Officer privilege checks.
- Approval authority separation.
- Digital approval callback flow.
- Clear boundary between AI recommendation and human authorization.

TrustGate is intentionally separate from the MOEI service engine. In a production integration, it can be replaced or connected to a government identity provider such as UAE Pass or an approved internal identity provider.

## Architecture

The platform is organized around a live backend and module-specific frontends.

High-level structure:

```text
server.js                         Main Node.js HTTP server and API router
app/                              Citizen case cockpit
customer/                         Customer-facing service routes
office/                           Officer-facing workspaces
challenge-1/                      ArrearsFlow module
challenge-2/                      CountryIQ module
challenge-3/                      OneCX module
shared/                           Shared contracts, services, and content
scripts/                          Verification scripts
```

Runtime services:

```text
/api/challenge-1/                 Housing arrears application APIs
/api/challenge-2/                 Country intelligence APIs
/api/challenge-3/                 Omnichannel and event APIs
/api/app/                         Case cockpit APIs
```

The platform is intentionally built around server-side state and APIs. Browser storage is limited to safe user-interface preferences and temporary session helpers, while customer applications, documents, assessments, office actions, approvals, and audit events are server-owned.

## Local Setup

Requirements:

- Node.js 20 or later.
- npm.

Install dependencies:

```bash
npm install
```

Start locally:

```bash
PORT=9710 node server.js
```

Open:

```text
http://localhost:9710
```

Optional AI and integration environment variables can be configured by the evaluator if they want to test live AI or external messaging integrations:

```text
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
META_APP_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

The core service flows are designed to degrade safely when optional third-party credentials are not present.

## Verification

Available verifier:

```bash
npm run verify:ddahub
```

Recommended manual checks:

```text
1. Open the public platform home.
2. Start or track a housing arrears request.
3. Open the officer workspace.
4. Open the OneCX customer, officer, and leadership surfaces.
5. Confirm TrustGate protects officer and executive areas.
```

For live deployment checks, confirm:

```text
GET /api/challenge-1/health
GET /api/challenge-2/health
GET /api/challenge-3/health
GET /api/app/case/:applicationId
```

## Data and Privacy

This submission is a hackathon prototype and does not represent an official MOEI production system.

The demo may use synthetic customer records, synthetic service cases, synthetic financial personas, and test interaction events. No real government approval is issued by the system.

Sensitive runtime secrets are intentionally excluded from this submission repository. Environment variables must be configured separately by the deployment owner.

## AI Usage

AI is used as an assistive layer for tasks such as document understanding, officer explanation, country briefing support, risk flagging, and customer-service assistance.

AI is not used as the final approval authority for government decisions. Financial calculations, policy checks, approval boundaries, and authorization remain deterministic or human-controlled depending on the workflow stage.

## Submission Notes

This repository is prepared as the clean committee-facing package. Internal planning notes, private environment files, working transcripts, scratch screenshots, local backups, and live customer data are intentionally excluded.

The accompanying presentation explains the product vision, live demo journey, architecture, AI governance model, and future production integration path.
