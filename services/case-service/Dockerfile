# Build stage
FROM golang:1.25-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src

# Cache dependencies
COPY services/case-service/go.mod services/case-service/go.sum services/case-service/
COPY packages/go-common/go.mod packages/go-common/go.sum packages/go-common/
WORKDIR /src/services/case-service
RUN go mod download

# Copy source
COPY packages/go-common /src/packages/go-common
COPY services/case-service /src/services/case-service

# Build: stripped, static binary
ARG CGO_ENABLED=0
RUN CGO_ENABLED=${CGO_ENABLED} go build -ldflags="-s -w" -trimpath -o /out/case-service ./cmd

# Runtime stage
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata

COPY --from=build --chown=nobody:nobody /out/case-service /case-service

USER nobody:nobody
EXPOSE 8084
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8084/health || exit 1
ENTRYPOINT ["/case-service"]
