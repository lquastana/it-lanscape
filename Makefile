.PHONY: dev docker docker-netbox docker-netbox-run docker-netbox-run-build docker-stop

# Développement local — hot-reload, pas de Docker
dev:
	npm run dev

# Docker sans NetBox
docker:
	IT_LANDSCAPE_ENV=development \
	AUTH_ENABLED=true \
	docker compose up --build

# Docker avec NetBox complet avec build
docker-netbox: docker-netbox-run

docker-netbox-run-build:
	IT_LANDSCAPE_ENV=development \
	AUTH_ENABLED=true \
	docker compose --profile netbox up --build

# Docker avec NetBox complet
docker-netbox-run:
	IT_LANDSCAPE_ENV=development \
	AUTH_ENABLED=true \
	docker compose --profile netbox up

docker-stop:
	docker compose --profile netbox down
