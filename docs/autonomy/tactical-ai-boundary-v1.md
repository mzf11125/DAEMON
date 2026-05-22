# Tactical AI autonomy boundary v1

DAEMON sprint **does not** ship autonomous edge platforms (UAS, ROS, tactical planners).

AIP agent is **read-only triage** over ontology HTTP — not closed-loop control.

Any future autonomy integration must:

- Keep human approval for mutations.
- Separate eval paths from safety-critical actuation.
- Document in risk tier before new tools.

Reference skill: `tactical-ai-autonomy-developer` for future design only.
