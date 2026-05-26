# Build stage
FROM golang:1.25-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src

COPY services/ontology-builder/go.mod services/ontology-builder/go.sum services/ontology-builder/
COPY packages/go-common/go.mod packages/go-common/go.sum packages/go-common/
WORKDIR /src/services/ontology-builder
RUN go mod download

COPY packages/go-common /src/packages/go-common
COPY services/ontology-builder /src/services/ontology-builder

ARG CGO_ENABLED=0
RUN CGO_ENABLED=${CGO_ENABLED} go build -ldflags="-s -w" -trimpath -o /out/ontology-builder ./cmd

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata

COPY --from=build --chown=nobody:nobody /out/ontology-builder /ontology-builder

USER nobody:nobody
EXPOSE 8085
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8085/health || exit 1
ENTRYPOINT ["/ontology-builder"]
