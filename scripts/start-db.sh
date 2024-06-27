#! /bin/sh
if [ -z "$(docker ps -f name=langit-db --all --format '{{.Names}}')" ]; then
  # running postgres on port 5435 so it doesn't collide with native postgres
  # that may be running on your system
  docker run --name langit-db -e POSTGRES_HOST_AUTH_METHOD=trust -p 5433:5432 -d postgres:16.3 >/dev/null
else
  docker start langit-db >/dev/null
fi
