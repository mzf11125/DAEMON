# Build stage
FROM golang:1.25-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src

# Cache dependencies
COPY services/ontology-service/go.mod services/ontology-service/go.sum services/ontology-service/
COPY packages/go-common/go.mod packages/go-common/go.sum packages/go-common/
WORKDIR /src/services/ontology-service
RUN go mod download

# Copy source
COPY packages/go-common /src/packages/go-common
COPY ontology /src/ontology
COPY interfaces /src/interfaces
COPY services/ontology-service /src/services/ontology-service

# Build: stripped, static binary
ARG CGO_ENABLED=0
RUN CGO_ENABLED=${CGO_ENABLED} go build -ldflags="-s -w" -trimpath -o /out/ontology-service ./cmd

# Runtime stage
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata

COPY --from=build --chown=nobody:nobody /out/ontology-service /ontology-service
COPY --chown=nobody:nobody ontology/v2-compiled /ontology/v2-compiled
COPY --chown=nobody:nobody interfaces/ontology /interfaces/ontology

ENV ONTOLOGY_ROOT=/ontology/v2-compiled
USER nobody:nobody
EXPOSE 8081
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/health || exit 1
ENTRYPOINT ["/ontology-service"]
