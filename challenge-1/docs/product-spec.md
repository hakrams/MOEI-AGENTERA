# Challenge 1 Product Spec

Status: build-ready first product spec.

## Product Name

Working name:

> ArrearsFlow

Full framing:

> ArrearsFlow: the Housing Arrears module of the MOEI Service Operations Platform.

## One-Sentence Product

ArrearsFlow is a governed AI decision-support workflow that reviews housing arrears rescheduling requests, validates documents, applies policy rules, recommends a repayment plan, and requires verified officer approval before action.

## Design Principle

The prototype should feel like an operational government service system, not a marketing page.

First screen should be the usable work surface.

## Navigation

Primary navigation:

- Intake
- System Review
- Officer Dashboard
- Audit Record
- Platform Modules

## Screen 1: Intake

Purpose:

- show the applicant-side submission
- gather enough data for the system to prepare the request
- demonstrate document requirements

Layout:

- left: applicant/request form
- right: requirement checklist and case preview

Fields:

- applicant name
- Emirates ID placeholder
- phone/email placeholder
- arrears amount
- months delayed
- monthly income
- monthly obligations
- number of dependents/family members
- employment status
- reason for rescheduling
- existing loans/obligations toggle
- salary certificate upload status
- bank statement upload status

Interactions:

- User can select one of three mock cases.
- User can edit fields.
- User can toggle documents as valid/missing/invalid.
- Submit button runs the system review.

## Screen 2: System Review

Purpose:

- show the system preparing real workflow work
- make the review trace clear without making the officer click every step

Sections:

- extracted facts
- document validation
- policy rule trace
- risk classification
- recommended plan
- next action

System preparation steps to display:

1. Intake worker structured the request.
2. Document recognition service checked salary certificate.
3. Document rules checked conditional document needs.
4. Financial rules worker calculated affordability.
5. Risk rules worker classified the case.
6. Recommendation service prepared the rescheduling option.
7. Audit recorder saved the decision path.

Interaction:

- "Send to Officer" moves the case to Officer Dashboard.

## Screen 3: Officer Dashboard

Purpose:

- show human-in-the-loop decision control
- give officer enough context to trust or challenge the prepared recommendation

Layout:

- left: case queue
- center: selected case summary and recommendation
- right: rule trace, documents, and action log

Case queue statuses:

- Ready for review
- Missing information
- High-risk review
- Approved

Officer actions:

- Approve recommendation
- Request more information
- Escalate to supervisor
- Override recommendation

Important behavior:

- Clicking approve must not approve immediately.
- It opens the Dynamic Digital Approval Seal flow.

## Screen 4: Dynamic Digital Approval Seal

Purpose:

- create the demo's trust/security moment

Flow:

1. Officer clicks approve.
2. Modal opens with transaction details:
   - case ID
   - applicant
   - recommended duration
   - monthly repayment
   - officer ID
   - payload hash
   - expiry countdown
3. MOEI redirects the assigned official to TrustGate with the case ID,
   action, official subject, required privilege, and payload hash.
4. TrustGate confirms the request through number matching and final PIN
   verification on the trusted registered device.
5. MOEI verifies the callback payload against the pending approval contract.
6. Digital approval seal is issued.

Prototype rule:

- Do not use a fixed approval code. The demo must use the TrustGate
  callback payload for officer authorization.

Seal output:

- stamp ID
- approved by
- role
- timestamp
- method
- payload hash
- verified status

## Screen 5: Audit Record

Purpose:

- show governance and transparency after approval

Sections:

- final decision summary
- digital approval seal
- system action log
- officer action log
- rule trace
- document trace

Export-style element:

- "Stamped Decision Record" panel that looks like a final internal record.

## Screen 6: Platform Modules

Purpose:

- support the platform story without distracting from Challenge 1

Show three modules:

- Housing Arrears: active, complete
- Country Intelligence: extension preview
- Omnichannel Intake: extension preview

Keep previews light:

- Country Intelligence: country + sector + trusted-source brief preview
- Omnichannel: mock web/chat intake routed to backend preview

## Data Model

## Case

```json
{
  "id": "MOEI-HOUSING-2026-001",
  "applicantName": "Aisha Al Mansoori",
  "emiratesIdMasked": "784-1988-XXXXXXX-1",
  "arrearsAmount": 42000,
  "monthsDelayed": 9,
  "monthlyIncome": 18000,
  "monthlyObligations": 6500,
  "dependents": 5,
  "employmentStatus": "Employed",
  "reason": "Temporary salary reduction and family medical expenses",
  "existingLoans": true,
  "documents": [],
  "ruleResults": [],
  "riskLevel": "Review",
  "recommendation": {},
  "status": "Ready for officer review",
  "auditLog": []
}
```

## Document

```json
{
  "type": "salary_certificate",
  "status": "valid",
  "issuer": "Bank attested employer certificate",
  "signed": true,
  "attested": true,
  "confidence": 0.94,
  "notes": "Salary certificate present and attested."
}
```

## Rule Result

```json
{
  "id": "RULE-20PCT",
  "label": "Repayment should not exceed 20% of monthly salary",
  "status": "passed",
  "calculation": "3,500 AED <= 3,600 AED",
  "reason": "Recommended monthly repayment is within policy threshold."
}
```

## Recommendation

```json
{
  "durationMonths": 12,
  "monthlyRepayment": 3500,
  "rationale": "The proposed amount is within the 20% salary threshold and balances arrears recovery with declared obligations.",
  "requiresHumanApproval": true,
  "nextAction": "Officer review and digital approval seal"
}
```

## Approval Seal

```json
{
  "stampId": "STAMP-2026-000812",
  "caseId": "MOEI-HOUSING-2026-001",
  "approvedBy": "Mariam Al Ketbi",
  "role": "Finance Collection Officer / Approver",
  "action": "Arrears rescheduling recommendation approved",
  "approvedAt": "2026-05-30 16:25 GST",
  "method": "TrustGate number matching and PIN",
  "challengeId": "TGATE-DEMO-001",
  "payloadHash": "a91f2c8e",
  "status": "verified",
  "trustGate": {
    "requestId": "TGATE-DEMO-001",
    "relyingRequestId": "MOEI-SEAL-DEMO-001",
    "assuranceLevel": "simulated_number_match_and_pin",
    "pinVerifiedAt": "2026-05-30T16:25:00+04:00",
    "requiredPrivilege": "seal.stamp"
  }
}
```

## Mock Cases

## Case A: Straightforward

- applicant: Aisha Al Mansoori
- arrears: 42,000 AED
- delay: 9 months
- income: 18,000 AED
- obligations: 6,500 AED
- dependents: 5
- salary certificate: valid
- bank statement: valid
- recommended plan: 12 months at 3,500 AED
- risk: ready for review

## Case B: Missing Document

- applicant: Saeed Al Nuaimi
- arrears: 30,000 AED
- delay: 6 months
- income: 15,000 AED
- obligations: 4,000 AED
- salary certificate: missing attestation
- bank statement: not required
- recommended action: request corrected salary certificate
- risk: missing information

## Case C: High-Risk / Exceptional

- applicant: Mariam Al Ketbi
- arrears: 96,000 AED
- delay: 18 months
- income: 12,000 AED
- obligations: 8,900 AED
- employment status: salary reduced
- salary certificate: valid
- bank statement: missing
- recommended action: escalate to officer/supervisor
- risk: high-risk review

## Demo Script

1. Open Intake and select Case A.
2. Submit request.
3. On System Review, point to extracted facts, document validation, 20% salary rule, and recommendation.
4. Send to Officer.
5. On Officer Dashboard, show case summary and rule trace.
6. Click Approve.
7. Complete Dynamic Digital Approval Seal with demo code.
8. Show final stamped decision record and audit trail.
9. Optional: switch to Platform Modules and show Challenge 2/3 extension previews.

## AI And System Copy Guidelines

Use careful government-safe wording:

- "recommendation" instead of "final decision"
- "officer approval required" instead of "approved by AI"
- "requires review" instead of "rejected" when evidence is incomplete
- "policy check" instead of "judgment" when rule-based

## Build Priorities

Priority 1:

- screens 1-5
- mock cases
- rule engine
- audit log
- approval seal

Priority 2:

- bilingual UI labels
- stamped record export panel
- nicer document validation states

Priority 3:

- Platform Modules preview
- Challenge 2/3 light demos
