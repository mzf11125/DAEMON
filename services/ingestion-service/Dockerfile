# Build stage
FROM golang:1.25-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src

# Cache dependencies
COPY services/ingestion-service/go.mod services/ingestion-service/go.sum services/ingestion-service/
COPY packages/go-common/go.mod packages/go-common/go.sum packages/go-common/
COPY packages/dune-ingest/go.mod packages/dune-ingest/go.sum packages/dune-ingest/
COPY packages/pipeline-runner/go.mod packages/pipeline-runner/go.sum packages/pipeline-runner/
WORKDIR /src/services/ingestion-service
RUN go mod download

# Copy source
COPY packages/go-common /src/packages/go-common
COPY packages/dune-ingest /src/packages/dune-ingest
COPY packages/pipeline-runner /src/packages/pipeline-runner
COPY services/ingestion-service /src/services/ingestion-service

# Build: stripped, static binary
ARG CGO_ENABLED=0
RUN CGO_ENABLED=${CGO_ENABLED} go build -ldflags="-s -w" -trimpath -o /out/ingestion-service ./cmd

# Runtime stage
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata

COPY --from=build --chown=nobody:nobody /out/ingestion-service /ingestion-service
COPY --chown=nobody:nobody connectors /repo/connectors
COPY --chown=nobody:nobody observability /repo/observability

ENV REPO_ROOT=/repo
USER nobody:nobody
EXPOSE 8082
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8082/health || exit 1
ENTRYPOINT ["/ingestion-service"]
