# Challenge 3 Briefing Notes

Source: `planning/05-incoming/chatgpt-session-01-raw.md`, lines 600-921.

Status: extracted briefing notes, not final analysis.

## Speaker Context

- One speaker introduced himself as Shailendra, responsible for core support services, especially project group.
- Another repeated/related clarification identified Shariq Alqaba, responsible for support services, especially in the project.

## High-Level Framing

- Challenge 3 was described as tricky and difficult to implement.
- It is complex, but the reward is high because it could become one solution that can be sold or reused across all entities.
- MOEI is complex because it is a mix of four different entities.
- The common part between those entities is that they all provide services to customers.

## Service Landscape

- There are more than 14 entities, including federal and local entities.
- There are around 124 different services on the mobile app and website.

## Existing Channels

Existing service channels include:

- mobile app
- website
- WhatsApp
- voice/contact center

WhatsApp is currently used for:

- queries
- issuing/searching results
- contacting

Voice/contact center also exists.

## Backend Fragmentation

- Each channel connects to a particular backend or touchpoint.
- Example: if someone applies through the website for housing, the form data is sent to the housing backend/network.
- Example: if someone applies for infrastructure services, data is sent through API integration.
- CRM is not one single integrator.
- CRM itself is a channel for complaints and inquiries.
- Housing has its own CRM.
- Infrastructure has its own CRM.
- The call center has its own CRM.
- Therefore, API integration is needed.
- Expected flow: receive the full form, then send it to the correct CRM/backend.

## Strategic Requirement

- Participants need to think strategically about the integration layer.
- The solution should consider a zero-code / no-code type integration layer where forms can be managed.
- Participants can decide whether to build:
  - a standalone application
  - something on top of existing systems
  - a replacement for all channels
  - a proxy server on top of existing channels

## Forms Capability

The system should support:

- simple forms
- complex forms
- form elements
- AI-assisted checking
- normal validation
- enhancement
- AI-assisted fast tracking
- conditional sub-forms depending on the service or case

## Document Handling

- The system may need to read documents.
- It should extract needed information/data from documents.
- It should cross-check extracted information against business rules before submitting the request.

## API Integration

- The solution needs API integration specifications for impact.
- For a local prototype, full API integration may not be needed.
- Eventually, an API is needed to send the actual form to the cloud platform/backend/core platform.
- It also needs integration with:
  - WhatsApp
  - contact center solution
  - CRM/backend systems

## Current Platforms

Current channels/platforms mentioned:

- WhatsApp
- NICE call center solution
- website built in React
- mobile app, exact technology not confirmed

## Databases

- There are two main databases:
  - one for e-channel/omnichannel
  - one for website
- There are also databases related to sub-platforms.
- Examples:
  - housing has its own database
  - website has its own database
  - mobile app has its own database

## UX Platform Clarification

- When asked if this is a user experience platform, the answer was yes.
- It becomes more complex because they need to split:
  - UI/UX design
  - government requirements
  - PMO requirements

## Example Housing Form

- For a housing application, the main information will be retrieved from TrustGate/e-pass.
- Retrieved information may include:
  - name
  - Emirates ID
  - age
  - other basic identity information
- For some integrations, salary cannot be retrieved automatically.
- Salary may need to be entered manually or submitted manually.
- Other service-specific data may include:
  - number of children
  - service-specific details
  - supporting documents

## Complexity Summary

- They want an omnichannel solution.
- Complexity is high because the system must coordinate channels, forms, documents, business rules, CRMs, databases, and backend routing.
