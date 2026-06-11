# Challenge 2 Briefing Notes

Source: `planning/05-incoming/chatgpt-session-01-raw.md`, lines 458-599.

Status: extracted briefing notes, not final analysis.

## Speaker Context

- Speaker introduced herself as Fela Naghi, project manager at the International Relations Office.
- She works in International Relations and manually creates:
  - briefs for executives
  - short reports
  - reports based on data gathered from counterparts

## Clarified Need

- They do not only want a platform.
- They want an agent that helps place information into the executive template and gather required data from everywhere.
- The agent should return data in the specific way they need.
- They will inject the data system with their own data.

## Important Sectors

The sectors they care about are:

- energy
- transportation
- housing
- maritime
- infrastructure

## Example Use Case

- If there is a meeting with counterparts from Country X, the user asks the agent for information about that country.
- Example request: "I want this and this. Give me a presentation about this country."
- The agent should return the data in the specific format/style needed.

## Current Source Types

For now, International Relations gathers data from government sources available online.

Sources include:

- government sources online
- publications
- media
- news
- UAE government news
- other government data sources

## Bias And Source Control

- The agent should not be biased.
- Because the work relates to countries and international relations, they do not want the agent to provide unnecessary or biased content.
- They want rules to restrict the agent.
- A whitelist approach was preferred over blacklist.
- The whitelist should include reliable sources they already depend on.

## Main Pain Point

- The main challenge is lack of data.
- For the prototype, they want to build an agent, train the agent, and then give it data to build upon.
- General AI tools may provide a lot of irrelevant or unnecessary data.
- They want only the information that matters to their audience.
- They do not want unrelated categories such as:
  - human rights
  - labor
  - other categories outside MOEI scope
- The agent should be customized based on sectors.

## Executive Reporting Categories Mentioned

- JTC
- economic data about the country
- bilateral MOUs
- ministry-sector-specific categories

## Claude/GPT Comparison

- The speaker compared GPT and Claude using the same prompt and same data.
- GPT sometimes hallucinated.
- Claude was described as:
  - understanding more directly
  - more to the point
  - polished
  - requiring only small Arabic wording edits in some cases
- Errors still exist, but output was described as more concise.

## Why Not Just Claude

- They cannot use Claude directly for internal use because of data injection and internal data concerns.
- They need to train/build their own engine or agent.
- The agent should be trained on their data and be concise about it.
- It is better to have restrictions based on departments and ministry sectors.

## Deployment And Model Notes

- Local/internal deployment was considered likely.
- Open source or open-weights models are acceptable if they work better.
- Creating an LLM from scratch was acknowledged as impossible.
- For the hackathon, using GPT or Claude with mock data was said to be permissible.

## Outputs

End products include:

- presentations
- statistics
- data outputs
- Power BI-generated visuals
- pie charts
- trends
- Word documents

The most used output is Word documents.

Speaker summary: basically, it is all documents.

## Technical Support Clarification

- Technical colleagues will support on the technical side.
- The speaker described herself as the content agent.
- They are not responsible for filtering data from websites right now.
