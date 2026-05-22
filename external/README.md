# External upstream pins

| Path | Repository | ADR |
|------|------------|-----|
| [`daemon-system-ontology/`](daemon-system-ontology/) | [daemon-system-ontology](https://github.com/daemon-blockint-tech/daemon-system-ontology.git) (submodule or git subtree per branch) | [MERGE-STRATEGY-01](../docs/architecture/adr-merge-strategy-01.md) |

R0 vendors `packages/ontology-language` from this pin; runtime schemas compile from `ontology/v3` → `ontology/v2-compiled`.

**Submodule clone:**

```bash
git clone --recurse-submodules https://github.com/daemon-blockint-tech/DAEMON.git
git submodule update --init --recursive
```

**Subtree pin (R0):** `external/daemon-system-ontology` may be maintained via `git subtree add --prefix=external/daemon-system-ontology <url> main --squash` instead of `.gitmodules`.
