# New Environment Setup Guide

## ✅ Problem Identified

You had **two sets of containers** running:
- **Old containers** (port 3000) → Using API port 8000 ❌
- **New containers** (port 4000) → Using API port 9000 ✅

## 🚀 Solution

### Step 1: Access the Correct Frontend

**Use the NEW frontend URL:**
- ❌ **OLD**: http://localhost:3000 (using port 8000 API)
- ✅ **NEW**: http://localhost:4000 (using port 9000 API)

### Step 2: Stop Old Containers (Already Done)

The old containers have been stopped. To verify:

```bash
docker ps | grep espro-costing
```

You should only see containers starting with `espro-costing-*`

### Step 3: Verify Configuration

**New Environment Ports:**
- Frontend: http://localhost:4000
- Backend API: http://localhost:9000/api
- MongoDB: localhost:27020
- Mongo Express: http://localhost:8083

## 🔧 To Start New Environment

```bash
cd /Users/cpolidan/Documents/espro/espro-costing-app
docker-compose -f docker-compose.new.yml up -d
```

## 🔧 To Stop Old Containers Manually (if needed)

```bash
docker stop cafe-costing-frontend-2 cafe-costing-backend-2 cafe-costing-mongo-express-2 cafe-costing-mongodb-2
docker rm cafe-costing-frontend-2 cafe-costing-backend-2 cafe-costing-mongo-express-2 cafe-costing-mongodb-2
```

## ✅ Verification

1. **Check frontend is running on port 4000:**
   ```bash
   docker ps | grep espro-costing-frontend
   ```
   Should show: `0.0.0.0:4000->3000/tcp`

2. **Check backend is running on port 9000:**
   ```bash
   docker ps | grep espro-costing-backend
   ```
   Should show: `0.0.0.0:9000->5000/tcp`

3. **Verify environment variable in container:**
   ```bash
   docker exec espro-costing-frontend printenv | grep VITE_API_URL
   ```
   Should show: `VITE_API_URL=http://localhost:9000/api`

4. **Test in browser:**
   - Open: http://localhost:4000
   - Check browser DevTools → Network tab
   - API calls should go to: `http://localhost:9000/api/...`

## 📝 Summary

- **Access the app at**: http://localhost:4000 (NOT port 3000)
- **API calls will go to**: http://localhost:9000/api
- **Old containers stopped**: Port 3000 containers are no longer running

