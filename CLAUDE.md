# Project Context

OWEM is an AI-assisted group expense settlement application. Frontend: Next.js / React / TypeScript. Backend: ASP.NET Core with PostgreSQL. The system digitizes restaurant receipts, assigns items to participants, and calculates exact reimbursement balances.

# Engineering Principles

- AI interprets uncertain information. Deterministic code performs all financial calculations.
- Never allow an LLM to compute, modify, or approve a balance.
- All monetary values use decimal at boundaries and integer minor
units inside the settlement engine. NEVER float or double.
- The Domain project has no references to EF Core, ASP.NET, HTTP,
or any AI SDK.
- Controllers are thin: parse, authorize, delegate, map. No logic.
- Business logic lives in the domain or application layer.
- External AI calls are abstracted behind interfaces defined in Owem.Application and implemented in Settle.Infrastructure.
- Every AI-produced value carries a provenance tag. The settlement
engine rejects AI_SUGGESTED inputs.
- All business logic has unit tests, including edge cases and
failure paths, not only happy paths.
- No secrets in source. Configuration via environment variables.
- Prefer small, reviewable, incremental changes.



# Coding Workflow

Before implementing anything:

1. Inspect the relevant existing files.
2. State the implementation plan in prose.
3. List every file that will be created or modified.
4. Identify assumptions and open questions.
5. STOP. Do not write implementation code until the plan is approved.

After approval:
6. Implement only what was approved.
7. Add or update tests.
8. Run the test suite and report results, including failures. 9. Explain every file changed and why.
10. Do not modify unrelated files.

# Things That Are Never Acceptable

- Business logic in a controller
- double or float for money
- A model call outside an interface implementation
- Catching an exception and returning a default monetary value
- A settlement calculation whose parts do not sum exactly to the total - New dependencies added without being called out explicitly


# Where The Detail Lives
- Schema and tables: docs/architecture/data-model.md
- Endpoints and errors: docs/architecture/api-design.md
- AI contracts: docs/architecture/ai-design.md
- Security controls: docs/architecture/security.md
- Why things are this way: docs/architecture/decisions/

# Frontend UI 
reference docs/design-system.md for the design sysytem for the ui


If a task touches one of these areas and the relevant document was not given to you, ASK FOR IT before planning. Do not infer the schema or the API contract from surrounding code.
