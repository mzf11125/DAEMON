# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Skills & Context Management
- Use `/skill-name` syntax to manually attach relevant skills before making requests. Confidence: 0.85
- Reference documentation using `@DocumentName` syntax (e.g., `@AWS DynamoDB`, `@DUNE`). Confidence: 0.80
- When plan documents are uploaded, implement as specified without editing the plan file itself. Confidence: 0.90

# Implementation Patterns
- Mark to-dos as `in_progress` when working on them, starting with the first one. Confidence: 0.85
- Reference terminal output files using `@/path/to/terminals/N.txt:line-range` syntax. Confidence: 0.75
- Continue working through all to-dos until completion when directed. Confidence: 0.85
- After a subagent completes, do not reiterate or summarize its results; end with a brief third-person confirmation. Confidence: 0.70

# Architecture & Domain
- Security framework integration includes MITRE ATT&CK coverage mapping. Confidence: 0.65
- Multi-domain system spanning geospatial, ML/AI, security, and enterprise data platforms. Confidence: 0.70

# Codebase Governance
- Maintain vendor-neutral language throughout documentation and source code; no references to Palantir, Anduril, Foundry, Gotham, Apollo, or Lattice. Confidence: 0.85
- Include geospatial coordinates (latitude/longitude) on all synthetic seed data Sites for geo-map visualization. Confidence: 0.75

# LangSmith Tracing
- Use `traceable` from `langsmith/traceable` to wrap agent loop steps (prompt formatting, LLM calls, output parsing) for per-step observability. Confidence: 0.70
- Use `run_type: "llm"` on `traceable` wrappers that make LLM calls to auto-categorize them as LLM spans. Confidence: 0.70
- `traceable`-wrapped functions always return Promises — always `await` them even if the inner function is synchronous. Confidence: 0.70
