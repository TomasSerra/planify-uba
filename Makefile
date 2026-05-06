.PHONY: up down restart logs ps psql scrape reset help

DC := docker compose

# Comando único: levanta DB + API + Frontend; siembra la DB si está vacía.
up:
	@$(DC) up -d --build db api frontend
	@echo "→ Esperando DB lista..."
	@until $(DC) exec -T db pg_isready -U postgres -d horarios >/dev/null 2>&1; do sleep 1; done
	@count=$$($(DC) exec -T db psql -U postgres -d horarios -tAc "SELECT COUNT(*) FROM cursos" 2>/dev/null || echo 0); \
	if [ "$$count" = "0" ]; then \
		echo "→ DB vacía, scrapeando (~2 min)..."; \
		$(DC) run --rm scraper; \
	else \
		echo "→ DB ya tiene $$count cursos."; \
	fi
	@echo ""
	@echo "✓ Stack listo:"
	@echo "  Frontend:  http://localhost:5173"
	@echo "  API:       http://localhost:8000"
	@echo "  Docs:      http://localhost:8000/docs"
	@echo "  DB:        postgresql://postgres:postgres@localhost:5432/horarios"

down:
	$(DC) down

restart: down up

logs:
	$(DC) logs -f api frontend

ps:
	$(DC) ps

psql:
	$(DC) exec db psql -U postgres -d horarios

scrape:
	$(DC) run --rm scraper

reset:
	$(DC) down -v
	$(MAKE) up

help:
	@echo "Targets:"
	@echo "  make up       - Levanta DB + API + Frontend; si la DB está vacía, la siembra"
	@echo "  make down     - Apaga containers (preserva datos)"
	@echo "  make restart  - down + up"
	@echo "  make reset    - Borra datos y vuelve a levantar desde cero"
	@echo "  make scrape   - Re-corre el scraper (idempotente)"
	@echo "  make psql     - Abre psql contra la DB"
	@echo "  make logs     - Sigue logs de API + Frontend"
	@echo "  make ps       - Lista containers"
