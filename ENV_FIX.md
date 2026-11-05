# Fix: Frontend Calling Wrong API Port

## Problem
Frontend is calling port 8000 but should call port 9000 (new environment).

## Solution

### Option 1: Restart Containers (Recommended)

If using `docker-compose.new.yml`, restart the containers to pick up the new environment variable:

```bash
# Stop containers
docker-compose -f docker-compose.new.yml down

# Start with fresh environment
docker-compose -f docker-compose.new.yml up -d

# Check frontend logs to verify
docker-compose -f docker-compose.new.yml logs frontend
```

### Option 2: Update Frontend .env File

The frontend `.env` file should match your docker-compose configuration:

**For new environment (docker-compose.new.yml):**
```bash
# Edit frontend/.env
echo "VITE_API_URL=http://localhost:9000/api" > frontend/.env
```

**For original environment (docker-compose.yml):**
```bash
# Edit frontend/.env
echo "VITE_API_URL=http://localhost:8000/api" > frontend/.env
```

### Option 3: Rebuild Frontend Container

If the environment variable isn't being picked up, rebuild the container:

```bash
# Stop and remove containers
docker-compose -f docker-compose.new.yml down

# Rebuild frontend container
docker-compose -f docker-compose.new.yml build --no-cache frontend

# Start containers
docker-compose -f docker-compose.new.yml up -d
```

## Verify Configuration

### Check Current Environment Variable

**In Docker container:**
```bash
docker exec espro-costing-frontend printenv | grep VITE_API_URL
```

Should show: `VITE_API_URL=http://localhost:9000/api`

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `import.meta.env.VITE_API_URL`
4. Should show: `"http://localhost:9000/api"`

### Check Network Requests

1. Open browser DevTools (F12)
2. Go to Network tab
3. Make a request (e.g., load items)
4. Check the request URL - should be `http://localhost:9000/api/...`

## Important Notes

1. **Environment Variable Precedence:**
   - Docker-compose environment variables override `.env` files
   - But Vite needs to be restarted to pick up changes
   - Browser may cache the old API URL - hard refresh (Ctrl+Shift+R)

2. **Which docker-compose file are you using?**
   - `docker-compose.yml` → Port 8000 (original)
   - `docker-compose.new.yml` → Port 9000 (new)

3. **If running locally (not Docker):**
   - Make sure `frontend/.env` has the correct port
   - Restart the Vite dev server

## Quick Fix Command

For new environment, run:
```bash
cd /Users/cpolidan/Documents/espro/espro-costing-app
docker-compose -f docker-compose.new.yml down
docker-compose -f docker-compose.new.yml up -d
```

Then clear browser cache and hard refresh the page.

