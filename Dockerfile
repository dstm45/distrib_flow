# Build stage for Go and Goose
FROM golang:1.26-alpine AS build
RUN apk add --no-cache git
WORKDIR /app

# Install goose CLI for running migrations
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o distrib_flow cmd/main.go

# Production stage
FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache ca-certificates

COPY --from=build /go/bin/goose /usr/local/bin/goose
COPY --from=build /app/distrib_flow .
COPY --from=build /app/pkg/database/migrations ./pkg/database/migrations

# Entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8888
ENTRYPOINT ["docker-entrypoint.sh"]
