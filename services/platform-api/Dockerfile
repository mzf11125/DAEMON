FROM golang:1.25-alpine AS build
WORKDIR /src
COPY packages/go-common /src/packages/go-common
COPY services/platform-api /src/services/platform-api
WORKDIR /src/services/platform-api
RUN go build -o /out/platform-api ./cmd

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /out/platform-api /platform-api
EXPOSE 8080
ENTRYPOINT ["/platform-api"]
