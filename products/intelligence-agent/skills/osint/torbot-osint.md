# TorBot / GoTor OSINT Stack

Reference KB for OWASP TorBot project page and active implementations: [DedSecInside/TorBot](https://github.com/DedSecInside/TorBot) (Python) and [DedSecInside/gotor](https://github.com/DedSecInside/gotor) (Go).

| Resource | Role |
| --- | --- |
| [OWASP project page](https://owasp.org/www-project-torbot/) | Documentation, Tor/SOCKS setup (`localhost:9050`), citation |
| [OWASP www-project-torbot](https://github.com/OWASP/www-project-torbot) | Archived Jekyll site — not the crawler executable |
| [DedSecInside/TorBot](https://github.com/DedSecInside/TorBot) | Primary Python OSINT tool for dark-web / Tor crawling |
| [DedSecInside/gotor](https://github.com/DedSecInside/gotor) | Go companion: REST API + CLI; SOCKS5 defaults; GPL-3.0 |

## Setup (local developer machine)

1. Install **Tor**; configure SOCKS (commonly `127.0.0.1:9050`).
2. Clone TorBot and gotor.
3. **TorBot:** Python 3.9+, `pip install -r requirements.txt`.
4. **gotor:** Go toolchain; `go build` from repo root.

## Ethics and law

Use only for **lawful OSINT**, authorized research, or law-enforcement workflows permitted in your jurisdiction. Daemon Ontology intelligence agent does **not** run Tor, TorBot, or gotor.

## OSINT crawling patterns

- Seed from known `.onion` directories (Ahmia, Torch) when authorized.
- Rate-limit requests; rotate Tor circuits per target.
- Collect PGP fingerprints, vendor aliases, listing metadata for ppatk-darkweb ontology mapping.
- Never crawl without legal authority reference (UU 8/2010 Pasal 44 for PPATK context).
