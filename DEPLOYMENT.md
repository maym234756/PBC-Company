# Deployment Guide

## Railway

1. Connect your GitHub repo to a new Railway project.
2. Set `PORT=3000` and `NODE_ENV=production` environment variables.
3. Railway auto-detects the `Dockerfile` and builds the image on each push to `main`.
4. The app serves the API on port 3000; add a Railway Static Service for the web dist if needed.

## Render

1. Create a new **Web Service** connected to this repo.
2. Set **Environment** to Docker and point to the root `Dockerfile`.
3. Set env vars: `NODE_ENV=production`, `PORT=3000`.
4. Render triggers a new deploy on every push to `main`.

## Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | Set to `production` |
| `PORT` | API port (default `3000`) |
| `DATABASE_URL` | SQLite path (defaults to bundled `dev.db`) |

## Notes

- The SQLite `dev.db` is bundled into the Docker image for demo use.
- For production, replace SQLite with a persistent Postgres database and update the Prisma schema accordingly.
