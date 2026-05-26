# Build stage
FROM golang:1.25-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src

# Cache dependencies
COPY services/rules-engine/go.mod services/rules-engine/go.sum services/rules-engine/
COPY packages/go-common/go.mod packages/go-common/go.sum packages/go-common/
WORKDIR /src/services/rules-engine
RUN go mod download

# Copy source
COPY packages/go-common /src/packages/go-common
COPY ontology /src/ontology
COPY services/rules-engine /src/services/rules-engine

# Build: stripped, static binary
ARG CGO_ENABLED=0
RUN CGO_ENABLED=${CGO_ENABLED} go build -ldflags="-s -w" -trimpath -o /out/rules-engine ./cmd

# Runtime stage
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata

COPY --from=build --chown=nobody:nobody /out/rules-engine /rules-engine
COPY --chown=nobody:nobody ontology/v2-compiled/rules /ontology/v2-compiled/rules

ENV RULES_ROOT=/ontology/v2-compiled/rules
USER nobody:nobody
EXPOSE 8083
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8083/health || exit 1
ENTRYPOINT ["/rules-engine"]
