FROM golang:1.22-alpine AS build
WORKDIR /src
COPY packages/go-common /src/packages/go-common
COPY ontology /src/ontology
COPY interfaces /src/interfaces
COPY services/ontology-service /src/services/ontology-service
WORKDIR /src/services/ontology-service
RUN go build -o /out/ontology-service ./cmd

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
ENV ONTOLOGY_ROOT=/ontology/v2
COPY --from=build /out/ontology-service /ontology-service
COPY ontology/v2 /ontology/v2
COPY interfaces/ontology /interfaces/ontology
EXPOSE 8081
ENTRYPOINT ["/ontology-service"]
