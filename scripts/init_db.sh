#!/bin/bash
docker-compose exec postgres psql -U postgres -d digimag -c "CREATE EXTENSION IF NOT EXISTS vector;"
docker-compose exec backend npx prisma migrate deploy
