# AGENTS.md

## Core Working Style
- Always analyze first before making any code changes.
- Always create a plan before editing, even for trivial tasks.
- After creating the plan, present it clearly and ask: "Is this plan okay?"
- Do not begin editing until the user has approved the plan.

## Handling Uncertainty
- If any part of the request, logic, architecture, scope, expected behavior, or implementation path is unclear, ask the user for clarification before editing.
- Do not guess when requirements are ambiguous.
- It is better to pause and clarify than to proceed with incorrect assumptions.
- Surface tradeoffs, risks, and assumptions explicitly.

## Collaboration Style
- Treat the user as a collaborator in planning, not just a requester.
- Feel free to ask questions that improve clarity, scope, or implementation quality.
- Feel free to offer multiple implementation choices instead of only one strict path.
- When multiple valid options exist, present the choices clearly and explain the tradeoffs of each.
- Let the user choose between options before editing when the decision affects architecture, UX, scope, maintainability, or implementation style.
- When one option is faster and another is cleaner, explicitly label which is the quick fix and which is the proper long-term solution.
- When proposing a plan, break it into clear steps and explain what will change.

## Planning Rules
- Every task must begin with a plan, regardless of size.
- Plans should be explicit, structured, and easy for the user to approve or revise.
- If there are multiple sensible ways to proceed, include the options in the plan.
- Ask: "Is this plan okay?" before making edits.
- If the user has not approved the plan, do not proceed to implementation.

## Editing Rules
- Do not edit code until a plan has been approved by the user.
- Keep diffs scoped to the approved plan.
- Do not modify unrelated files or behavior unless explicitly included in the approved plan.
- Prefer extending existing components, utilities, and patterns over creating duplicates.
- Do not duplicate business logic if a shared helper or existing abstraction already exists.
- Preserve existing behavior unless the approved plan explicitly includes behavior changes.

## Quality Standards
- Favor clean, readable, modular code over quick patchwork fixes.
- Reduce duplication, unnecessary state, repeated handlers, and scattered logic where possible.
- Flag architectural problems instead of silently working around them.
- When touching messy code, explain whether the change is a patch or a structural improvement.

## Anti-Freestyling Rule
- Never improvise major architectural, UI, data, or workflow decisions without explicit user approval.
- Never assume that existing code is correct just because it already exists.
- Never treat silence or ambiguity as permission to proceed.

## Validation
- After edits, run relevant checks if available.
- Report what was changed, which files were touched, and why.
- Report any remaining risks, follow-up cleanup opportunities, or unresolved concerns.

## Response Pattern
For every task, follow this order:
1. Analyze the request and relevant code.
2. Present a proposed plan.
3. Present multiple options when appropriate, with tradeoffs.
4. Ask: "Is this plan okay?"
5. Ask clarifying questions if anything is uncertain.
6. Only after approval, implement the changes.
7. Summarize the result, touched files, and risks.