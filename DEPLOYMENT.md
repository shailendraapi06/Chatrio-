# Deploying Chatrio to Render

This repository is configured as one Render web service: Express serves the
built React app, API, and Socket.IO from the same origin. This keeps
authentication cookies and realtime connections on the same site.

## Before deploying

1. Push this repository to GitHub.
2. Create a MongoDB Atlas database and database user.
3. In Atlas Network Access, allow connections from Render. For a quick setup,
   Atlas can allow `0.0.0.0/0`; use stronger network restrictions where your
   MongoDB plan and deployment setup support them.
4. In Render, create a new Blueprint and select this repository. Render reads
   `render.yaml` and builds the frontend and backend.
5. In the Render service environment, set `MONGO_URL` to the MongoDB connection
   string. Keep the generated `JWT_SECRET` private and do not commit secrets.
6. Wait for the `/healthz` check to pass, then open the Render service URL.

The Render service URL is automatically accepted for same-origin API and
Socket.IO requests. No `VITE_SERVER_URL` is needed for this single-service
deployment. If changing to a separate frontend host later, set the frontend's
`VITE_SERVER_URL` and configure the backend's `FRONTEND_URL`; cross-site cookie
behavior will also need to be reviewed.

## Local production build

From the repository root:

```sh
npm ci --prefix backend
npm ci --prefix frontend
npm --prefix frontend run build
```

Run the backend from the repository root with `npm --prefix backend start`.
Provide `MONGO_URL` and `JWT_SECRET` in `backend/.env` for local production
testing. The frontend build is served by Express when `NODE_ENV=production`.

## Operational notes

- `JWT_SECRET` must be set; the server refuses to start without it.
- `/healthz` returns HTTP 200 only when the database connection is ready.
- MongoDB TTL cleanup runs in the background after each message expires. It is
  not an exact-to-the-second deletion schedule.
- The current image implementation stores images (up to 1 MB each) inside
  MongoDB messages. Monitor database storage and backups as usage grows.
- Render's free web service may sleep when idle; use a paid plan if the app
  needs uninterrupted realtime availability.
