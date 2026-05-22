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

# Architecture & Domain
- Project involves Palantir Foundry concepts: ontology, AIP, rules SQL, OSDK integration. Confidence: 0.70
- Security framework integration includes MITRE ATT&CK coverage mapping. Confidence: 0.65
- Multi-domain system spanning geospatial, ML/AI, security, and enterprise data platforms. Confidence: 0.70
