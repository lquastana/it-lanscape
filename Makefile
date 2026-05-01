.PHONY: dev docker docker-netbox docker-netbox-run docker-netbox-run-build docker-stop

NETBOX_DEMO_URL ?= http://netbox:8080
NETBOX_DEMO_TOKEN ?= $(shell printf '%s%s%s' 0123456789abcdef 0123456789abcdef 01234567)
APP_AUTH_ENABLED ?= true

# Développement local — hot-reload, pas de Docker
dev:
	npm run dev

# Docker sans NetBox
docker:
	IT_LANDSCAPE_ENV=development \
	AUTH_ENABLED=$(APP_AUTH_ENABLED) \
	docker compose up --build

# Docker avec NetBox complet avec build
docker-netbox: docker-netbox-run

docker-netbox-run-build:
	IT_LANDSCAPE_ENV=development \
	AUTH_ENABLED=$(APP_AUTH_ENABLED) \
	NETBOX_URL=$(NETBOX_DEMO_URL) \
	NETBOX_TOKEN=$(NETBOX_DEMO_TOKEN) \
	NETBOX_SUPERUSER_API_TOKEN=$(NETBOX_DEMO_TOKEN) \
	docker compose --profile netbox up --build

# Docker avec NetBox complet
docker-netbox-run:
	IT_LANDSCAPE_ENV=development \
	AUTH_ENABLED=$(APP_AUTH_ENABLED) \
	NETBOX_URL=$(NETBOX_DEMO_URL) \
	NETBOX_TOKEN=$(NETBOX_DEMO_TOKEN) \
	NETBOX_SUPERUSER_API_TOKEN=$(NETBOX_DEMO_TOKEN) \
	docker compose --profile netbox up

docker-stop:
	docker compose --profile netbox down
