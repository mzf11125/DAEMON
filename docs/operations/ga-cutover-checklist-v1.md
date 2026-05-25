# GA cutover checklist (Phase 7)

## T-7 days

- [ ] Freeze `main` except hotfixes (ruleset enforced)
- [ ] Final `aip-eval` + full CI green
- [ ] Digest-pinned images in all `values.prod.yaml`

## T-1 day

- [ ] Backup verification (Postgres PITR, CH snapshots)
- [ ] On-call roster confirmed
- [ ] Customer comms draft approved

## Cutover

- [ ] ArgoCD sync prod cluster
- [ ] DNS flip to production ingress
- [ ] Smoke: `prove-staging-smoke.sh` adapted for prod URLs
- [ ] Enable elevated monitoring (hypercare)

## T+14 (hypercare end)

- [ ] Review SLO burn, incident count
- [ ] Downgrade monitoring to steady state
