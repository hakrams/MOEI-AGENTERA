# Challenge 1 Build Checklist

Status: implementation checklist derived from `product-spec.md`.

## Phase 1: Prototype Foundation

- [x] Choose stack.
- [x] Create app shell.
- [x] Add navigation: Intake, System Review, Officer Dashboard, Audit Record, Platform Modules.
- [x] Add mock case data.
- [x] Add basic state flow between screens.

## Phase 2: Intake

- [x] Build applicant/request form.
- [x] Add mock case selector.
- [x] Add document status controls.
- [x] Add submit action that runs system review.

## Phase 3: System Review Logic

- [x] Implement document validation.
- [x] Implement 20% salary rule.
- [x] Implement missing-information detection.
- [x] Implement risk classification.
- [x] Implement recommendation calculation.
- [x] Generate system action log.

## Phase 4: Officer Dashboard

- [x] Build case queue.
- [x] Build selected case summary.
- [x] Show financial profile.
- [x] Show document status.
- [x] Show rule trace.
- [x] Show recommendation rationale.
- [x] Add approve / request more info / escalate / override actions.

## Phase 5: Dynamic Digital Approval Seal

- [x] Add approval modal.
- [x] Show transaction-bound approval details.
- [x] Show simulated QR/code block.
- [x] Verify demo rolling code.
- [x] Generate digital seal record.
- [x] Append officer approval to audit log.

## Phase 6: Audit Record

- [x] Show final decision summary.
- [x] Show digital approval seal.
- [x] Show system action log.
- [x] Show officer action log.
- [x] Show rule trace.
- [x] Show document trace.

## Phase 7: Polish

- [ ] Add Arabic/English UI labels or toggle.
- [ ] Improve visual hierarchy.
- [ ] Ensure dashboard feels operational, not marketing-like.
- [ ] Add success metrics strip.
- [ ] Add Platform Modules preview.
- [ ] Verify mobile and desktop layouts.

## Phase 8: Demo Readiness

- [ ] Rehearse Case A full flow.
- [ ] Rehearse Case B missing-document flow.
- [ ] Rehearse Case C escalation flow.
- [ ] Confirm approval code is easy to enter.
- [ ] Confirm audit log is visible.
- [ ] Confirm pitch line appears near approval seal.
