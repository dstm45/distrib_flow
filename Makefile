GOOSE:=goose -env .env
.PHONY: sql migrate-up migrate-down migrate-status migrate-reset run-server

sql:
	sqlc generate -f ./pkg/database/sqlc.yaml

migrate-up:
	$(GOOSE) up

migrate-down:
	$(GOOSE) down

migrate-status:
	$(GOOSE) status

migrate-reset:
	$(GOOSE) reset

distrib_flow:
	go build -o distrib_flow cmd/main.go
	mv distrib_flow ./build

run-server: 
	./build/distrib_flow

run-frontend:
	cd frontend && npm run dev
