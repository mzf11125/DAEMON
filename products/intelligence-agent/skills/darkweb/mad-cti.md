# MAD-CTI — Multi-Agent Dark Web Cyber Threat Intelligence

**MAD-CTI** — official reference for the IEEE Access paper by Sayuj Shah and Vijay K. Madisetti.

| | |
| --- | --- |
| **Repository** | [github.com/sayujshah/MAD-CTI](https://github.com/sayujshah/MAD-CTI) (MIT License) |
| **Paper** | [IEEE Xplore 10908603](https://ieeexplore.ieee.org/document/10908603) — *MAD-CTI: Cyber Threat Intelligence Analysis of the Dark Web Using a Multi-Agent Framework* (IEEE Access, 2025) |

## What it implements

- **Microsoft AutoGen**-style **multi-agent** workflow: agents coordinate with minimal human intervention.
- **Replication path:** `MAD_CTI_CoDA.py` — requires [CoDA](https://huggingface.co/datasets/s2w-ai/CoDA) dataset access; OpenAI and Hugging Face tokens.
- **Tor / scraper path:** `MAD_CTI.py` — Tor installed, SocksPort aligned with [requests-tor](https://pypi.org/project/requests-tor/).

## Quickstart (upstream)

```bash
pip install -r requirements.txt
python MAD_CTI_CoDA.py   # CoDA replication
python MAD_CTI.py          # Tor scraper path
```

## Ethics and law

- Dark-web CTI research requires **institutional approval**, **applicable law**, and **terms of service** compliance.
- Daemon Ontology **does not execute** MAD-CTI, Tor, or scrapers — reference and summarization only.

## Citation

```bibtex
@ARTICLE{10908603,
  author={Shah, Sayuj and Madisetti, Vijay K.},
  journal={IEEE Access},
  title={MAD-CTI: Cyber Threat Intelligence Analysis of the Dark Web Using a Multi-Agent Framework},
  year={2025},
  volume={13},
  pages={40158-40168},
  doi={10.1109/ACCESS.2025.3547172}}
```
