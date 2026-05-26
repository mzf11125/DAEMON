# Build stage
FROM golang:1.25-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src

# Cache dependencies — copy go.mod/go.sum first for layer reuse
COPY services/platform-api/go.mod services/platform-api/go.sum services/platform-api/
COPY packages/go-common/go.mod packages/go-common/go.sum packages/go-common/
WORKDIR /src/services/platform-api
RUN go mod download

# Copy source
COPY packages/go-common /src/packages/go-common
COPY services/platform-api /src/services/platform-api

# Build: stripped, static binary
ARG CGO_ENABLED=0
RUN CGO_ENABLED=${CGO_ENABLED} go build -ldflags="-s -w" -trimpath -o /out/platform-api ./cmd

# Runtime stage
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata

COPY --from=build --chown=nobody:nobody /out/platform-api /platform-api

USER nobody:nobody
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["/platform-api"]
