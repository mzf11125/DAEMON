FROM golang:1.25-alpine AS build
WORKDIR /src
COPY packages/go-common /src/packages/go-common
COPY packages/dune-ingest /src/packages/dune-ingest
COPY packages/pipeline-runner /src/packages/pipeline-runner
COPY services/ingestion-service /src/services/ingestion-service
WORKDIR /src/services/ingestion-service
RUN go build -o /out/ingestion-service ./cmd

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
ENV REPO_ROOT=/repo
COPY --from=build /out/ingestion-service /ingestion-service
COPY connectors /repo/connectors
COPY observability /repo/observability
EXPOSE 8082
ENTRYPOINT ["/ingestion-service"]
