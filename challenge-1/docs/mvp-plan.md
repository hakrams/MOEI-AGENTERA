# Challenge 1 MVP Plan

Status: first MVP plan based on `planning/02-strategy/decision-report.md`.

## MVP Thesis

Build a governed AI decision-support workflow for housing arrears rescheduling.

The prototype should prove:

- request data can be structured
- documents can be validated
- policy rules can be applied
- a rescheduling recommendation can be generated
- high-risk cases can be escalated
- the officer remains in control
- every step is auditable

## Primary Users

- Applicant / customer
- MOEI finance/collection officer
- Supervisor / auditor

## Main Screens

## 1. Applicant Intake

Purpose:

- collect request details
- upload/support documents
- show missing requirements

Fields:

- applicant name
- Emirates ID placeholder
- arrears amount
- months delayed
- monthly income
- monthly obligations
- number of family members
- reason for rescheduling
- salary certificate upload
- bank statement upload

## 2. System Review

Purpose:

- show what the system extracted and checked

Sections:

- extracted facts
- document validation
- missing information
- policy checks
- risk flags
- recommendation draft

## 3. Officer Dashboard

Purpose:

- officer reviews case before action

Sections:

- case queue
- selected case summary
- applicant financial profile
- document status
- rule trace
- recommended rescheduling plan
- explanation
- approve / request more info / escalate controls

## 4. Dynamic Digital Approval Seal

Purpose:

- prove human-in-the-loop authorization

Flow:

- officer clicks approve
- system opens approval challenge
- QR/code appears
- officer enters simulated rolling code
- system verifies transaction-bound challenge
- decision receives digital seal

## 5. Audit Trail / Decision Record

Purpose:

- show transparency and governance

Includes:

- request submitted
- documents uploaded
- extraction completed
- salary certificate checked
- bank statement checked
- 20% salary rule evaluated
- recommendation generated
- officer reviewed
- digital seal issued

## System Preparation Steps

1. Intake worker: read applicant request.
2. Document recognition service: validate required documents.
3. Financial rules worker: calculate affordability and policy checks.
4. Risk rules worker: classify straightforward vs review needed vs high-risk.
5. Recommendation service: propose amount/duration and rationale.
6. Officer support service: prepare officer summary.
7. Audit recorder: log every step.

These can be implemented as one controlled workflow with visible sub-steps.

## Mock Rules

Minimum rules to include:

- Required salary certificate must be present.
- Salary certificate must be signed/attested.
- Bank statement required if applicant claims other loans/obligations.
- Proposed monthly repayment must not exceed 20% of salary.
- High arrears amount or missing evidence triggers officer review.
- Salary decrease/unemployment/emergency reason increases need for supporting evidence.

## Mock Case Types

Case A: Straightforward approval recommendation

- salary certificate valid
- income stable
- obligations reasonable
- proposed repayment under 20%

Case B: Missing document

- salary certificate missing or unsigned
- system keeps the customer in correction loop

Case C: High-risk / exceptional

- salary decreased or unemployment claimed
- bank statement missing
- obligations high
- system routes the exceptional case to officer review

## Demo Order

1. Show applicant submits messy request.
2. Show system extraction and document validation.
3. Show rule trace and 20% salary check.
4. Show recommendation.
5. Show officer dashboard.
6. Show Dynamic Digital Approval Seal.
7. Show final stamped record and audit log.

## Success Metrics To Show

- Current average: five working days.
- Target: instant recommendation for straightforward cases.
- Manual reading reduced.
- Missing documents detected before employee review.
- Rule consistency improved.
- Every recommendation has rationale.
- Human authority preserved through digital approval seal.

## Non-Goals

- Do not connect to real TrustGate.
- Do not process real personal data.
- Do not make final legal/financial decisions autonomously.
- Do not implement full production document OCR unless easy.
- Do not build all Challenge 2/3 modules before this core flow works.
