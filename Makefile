.PHONY: dev docker docker-netbox docker-netbox-run docker-netbox-run-build docker-stop

# Développement local — hot-reload, pas de Docker
dev:
	npm run dev

# Docker sans NetBox
docker:
	AUTH_ENABLED=true \
	NEXTAUTH_SECRET=it-landscape-docker-dev-local-only \
	NEXTAUTH_URL=http://localhost:3000 \
	docker compose up --build

# Docker avec NetBox complet avec build
docker-netbox: docker-netbox-run

docker-netbox-run-build:
	AUTH_ENABLED=true \
	NEXTAUTH_SECRET=it-landscape-docker-dev-local-only \
	NEXTAUTH_URL=http://localhost:3000 \
	docker compose --profile netbox up --build

# Docker avec NetBox complet
docker-netbox-run:
	AUTH_ENABLED=true \
	NEXTAUTH_SECRET=it-landscape-docker-dev-local-only \
	NEXTAUTH_URL=http://localhost:3000 \
	docker compose --profile netbox up

docker-stop:
	docker compose --profile netbox down
