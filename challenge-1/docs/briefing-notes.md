# Challenge 1 Briefing Notes

Source: `planning/05-incoming/chatgpt-session-01-raw.md`, lines 272-456.

Status: extracted briefing notes, not final analysis.

## Service Context

- The service is for rescheduling housing arrears based on an employee's study of the applicant's situation.
- The customer submits an application, then an employee studies the situation.
- Average current service time was described as five to six days.
- During this period, the employee studies conditions and legal perspectives, then recommends how many months or years should be given for rescheduling arrears.
- The desired change is to transform the service from three to six days into an instant service using an AI agent that studies the situation, briefs the employee, and recommends the rescheduling decision.

## Sheikh Zayed Housing Program Context

- The main service is housing assistance.
- Housing assistance is divided into two categories:
  - loan
  - grant
- This challenge is specifically for a loan-related subservice after the main housing service.
- Grant was explained as `Minha`, meaning free government support.
- Loan means the customer pays the money back to the government.

## Expected Agent Behavior

- The agent receives the input.
- It analyzes the situation according to its training.
- It gives a final result or recommendation.
- Example recommendation periods mentioned:
  - 20 months
  - 30 months
  - 3 years
  - 4 years
- The agent should read and analyze the situation, then make an action or recommendation.
- The situation includes:
  - financial situation
  - family members
  - general situation
  - age
  - social situation
  - salary changes
  - emergency cases
  - unemployment
  - other case-specific aspects

## Data Notes

- They can provide cases.
- They want participants to work together with different cases because every case is different.
- They will provide dummy data without IDs or names.
- If actual data is provided, names and identifying information will be removed.
- Some basic information is already taken from UAE systems.
- Salary cannot always be taken through integration from different entities.
- Applicants may need to submit salary documents or evidence.

## Policy And Rules

- There is policy for some situations.
- A key condition mentioned: repayment should not exceed 20% of salary.
- They said there are many other conditions they will provide.
- The agent should follow approved governance rules and requirements.

## Document Validation

- The main document mentioned is the salary certificate.
- The salary certificate needs to be attested from the bank.
- It must follow the right format.
- The agent should validate:
  - where the salary certificate was issued from
  - whether it is written correctly
  - whether it is signed
  - whether it comes from the right source
- They will provide guidelines explaining requirements and what needs to be input.
- In some cases, the system may ask for a real bank statement, not only a salary certificate, especially if the applicant claims they already have a loan.

## Human Role

- The agent is meant to support the employee's situation study.
- The agent will not replace the human.
- The employee still needs to study or review the situation.
- Instead of spending hours analyzing received material, the agent should provide:
  - overall summary
  - what to look for
  - what is missing
  - recommendation
- Exceptional or high-risk cases should remain subject to employee referral.

## Automation Vs Agent

- A distinction was made between automation and agentic behavior.
- Automation skips or streamlines some procedure.
- An agent makes an action or recommendation after analyzing the situation.

## Possible Applicant Messaging

- The agent could send an automated message to the applicant.
- Example: reject or return the request because of an issue with the salary certificate or bank certificate.
- It could ask for additional documents such as a bank statement.

## Deployment And Data Protection Clarifications

- A concern was raised that the system should not be exposed to the internet.
- The answer given was yes: it should be local/on ministry servers.
- The application would eventually be embedded into their system.
- For the hackathon/pilot, it was clarified as a testing exercise.
- Data protection/GDPR-type concern was raised; answer/clarification was that it is a pilot for testing.

## Recommendation Vs Execution Clarification

- They will not start directly with full live service execution.
- The current phase is recommendation, not full execution.
- They want to see how the agent can:
  - analyze data
  - take a decision/recommendation
  - deal with the service
- After confirming there is no error in the process or recommendation, they can move toward action/execution.

## Future Sessions

- Two sessions after Eid were mentioned.
- They will send a link for more questions, answers, elaboration, and clarification.
