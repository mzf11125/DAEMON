# Transform catalog v1

Harmonized pipeline transforms for medallion silver/gold (operational-class **patterns**, DAEMON **Go** runner today).

| Function | Input | Output | Notes |
|----------|-------|--------|-------|
| `trim` | string column | string | Whitespace normalize |
| `lower` | string column | string | Case normalize for keys |
| `cast` | column + type | typed column | CH-compatible types |
| `case` | condition | derived column | Simple branching |
| `select` | columns | projection | Stage output schema |

Silver outputs must register in ontology `backingDatasets` (A-DATA-04).

Future: PySpark batch jobs per Reference Project narrative — not v1 runtime.
