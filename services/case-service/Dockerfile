FROM golang:1.25-alpine AS build
WORKDIR /src
COPY packages/go-common /src/packages/go-common
COPY services/case-service /src/services/case-service
WORKDIR /src/services/case-service
RUN go build -o /out/case-service ./cmd

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /out/case-service /case-service
EXPOSE 8084
ENTRYPOINT ["/case-service"]
