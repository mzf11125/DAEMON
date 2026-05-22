# ontology-service

Ontology manifest, object reads, and actions. Port **8081**.

- `GET /v1/ontology/v2/manifest`
- `GET /v1/objects/{objectType}`
- `POST /v1/actions/{actionType}` — `OpenCase`, `AssignCase`, `CloseCase`, `EscalateSignal`, `RecordObservation`, `RecordDecision`, `ExecuteWorkOrder` implemented; unknown actions return 501

```bash
make run-ontology-service
```
