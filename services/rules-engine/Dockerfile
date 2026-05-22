FROM golang:1.22-alpine AS build
WORKDIR /src
COPY packages/go-common /src/packages/go-common
COPY ontology /src/ontology
COPY services/rules-engine /src/services/rules-engine
WORKDIR /src/services/rules-engine
RUN go build -o /out/rules-engine ./cmd

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
ENV RULES_ROOT=/ontology/v2-compiled/rules
COPY --from=build /out/rules-engine /rules-engine
COPY ontology/v2-compiled/rules /ontology/v2-compiled/rules
EXPOSE 8083
ENTRYPOINT ["/rules-engine"]
