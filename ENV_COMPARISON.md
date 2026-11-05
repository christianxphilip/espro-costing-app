# Environment Configuration Comparison

This document explains the differences between the original and new Docker Compose environments.

## 🔵 Original Environment (`docker-compose.yml`)

### Ports
- **MongoDB**: `27019` (external) → `27017` (internal)
- **Backend**: `8000` (external) → `8000` (internal)
- **Frontend**: `3000` (external) → `3000` (internal)
- **Mongo Express**: `8081` (external) → `8081` (internal)

### Container Names
- `cafe-costing-mongodb`
- `cafe-costing-backend`
- `cafe-costing-frontend`
- `cafe-costing-mongo-express`

### Database
- **Name**: `cafe-costing`
- **Volume**: `mongodb_data`

### Environment Variables

#### Backend `.env`
```env
MONGODB_URI=mongodb://mongodb:27017/cafe-costing
PORT=8000
NODE_ENV=production
HF_API_KEY=your_huggingface_api_key_optional
```

#### Frontend `.env`
```env
VITE_API_URL=http://localhost:8000/api
```

### Access URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Mongo Express: http://localhost:8081

---

## 🟢 New Environment (`docker-compose.new.yml`)

### Ports
- **MongoDB**: `27020` (external) → `27017` (internal)
- **Backend**: `9000` (external) → `5000` (internal)
- **Frontend**: `4000` (external) → `3000` (internal)
- **Mongo Express**: `8083` (external) → `8081` (internal)

### Container Names
- `espro-costing-mongodb`
- `espro-costing-backend`
- `espro-costing-frontend`
- `espro-costing-mongo-express`

### Database
- **Name**: `espro-costing`
- **Volume**: `espro_costing_mongodb_data`

### Network
- **Name**: `espro-costing-network`
- **Type**: Bridge network for service isolation

### Environment Variables

#### Backend `.env`
```env
MONGODB_URI=mongodb://mongodb:27017/espro-costing
PORT=5000
NODE_ENV=production
HF_API_KEY=your_huggingface_api_key_optional
```

#### Frontend `.env`
```env
VITE_API_URL=http://localhost:9000/api
```

### Access URLs
- Frontend: http://localhost:4000
- Backend API: http://localhost:9000/api
- Mongo Express: http://localhost:8083

---

## 🚀 Quick Start

### Original Environment
```bash
# Use original docker-compose.yml
docker-compose up -d

# Or with start script
./start.sh
```

### New Environment
```bash
# Use new docker-compose file
docker-compose -f docker-compose.new.yml up -d
```

---

## 🔧 Setup Instructions

### For Original Environment

1. **Backend `.env`** (copy from `.env.example`):
   ```bash
   cp backend/.env.example backend/.env
   ```
   Then update:
   ```env
   MONGODB_URI=mongodb://mongodb:27017/cafe-costing
   PORT=8000
   ```

2. **Frontend `.env`** (copy from `.env.example`):
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   Then update:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

### For New Environment

1. **Backend `.env`** (copy from `.env.example.new`):
   ```bash
   cp backend/.env.example.new backend/.env
   ```
   Already configured for new environment.

2. **Frontend `.env`** (copy from `.env.example.new`):
   ```bash
   cp frontend/.env.example.new frontend/.env
   ```
   Already configured for new environment.

---

## 🔒 Important Notes

1. **Both environments can run simultaneously** - they use different ports and container names
2. **Separate databases** - `cafe-costing` vs `espro-costing`
3. **No port conflicts** - all ports are different
4. **Isolated networks** - new environment has dedicated network
5. **Separate volumes** - data is stored separately

---

## 📝 Default Credentials (Mongo Express)

Both environments use:
- **Username**: `admin`
- **Password**: `admin123`

---

## 🐛 Troubleshooting

### Port Already in Use
If you see port conflicts, check which environment is using the port:
```bash
# Check what's using a port
lsof -i :27019  # Original MongoDB
lsof -i :27020  # New MongoDB
```

### Container Name Conflicts
```bash
# List all containers
docker ps -a

# Remove old containers if needed
docker-compose down  # Original
docker-compose -f docker-compose.new.yml down  # New
```

### Database Connection Issues
Make sure your `.env` file matches the docker-compose configuration:
- Check `MONGODB_URI` matches the database name
- Verify port mapping is correct
- Ensure MongoDB container is healthy

