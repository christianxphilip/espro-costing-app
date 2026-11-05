# Deploy ESPRO Costing

## Render backend

1. Push this directory to [the costing GitHub repository](https://github.com/christianxphilip/espro-costing-app).
2. In Render, create a Blueprint from that repository using `render.yaml`. The Blueprint uses a Free Node web service.
3. Set `MONGODB_URI` in Render to a connection string for the same MongoDB Atlas cluster payroll uses. The Blueprint sets `MONGODB_DB_NAME=espro_costing` to use the existing costing database. Use an Atlas database user with read and write access to `espro_costing` and allow the Render service's outbound IP ranges in Atlas.
4. Generate a random `WORKER_API_TOKEN` with `openssl rand -hex 32` and save it in Render. Save `HF_API_KEY` as a Render environment variable if using the Hugging Face integration.
5. Deploy the Blueprint and check that `/api/health` returns HTTP 200 on the service URL.

## Cloudflare Worker

From `frontend`, use an authenticated Wrangler session and run:

```sh
npm ci
VITE_API_URL=/api npm run build
npx wrangler@4 deploy
npx wrangler@4 secret put RENDER_API_ORIGIN
npx wrangler@4 secret put WORKER_API_TOKEN
```

For `RENDER_API_ORIGIN`, enter the HTTPS Render service origin, such as `https://espro-costing-api.onrender.com`. For `WORKER_API_TOKEN`, enter the same value configured in Render.

Generate a strong shared password and store the Base64 encoding of `username:password` in the Worker secret `APP_BASIC_AUTH`. The Worker returns HTTP 503 until this secret is set. Base64 is an encoding, so protect the encoded value as you would the password.

Verify that signed-out requests to the app and API return HTTP 401, that the signed-in app can load its costing records, and that requests to the direct Render data endpoints without the Worker token return HTTP 401.
