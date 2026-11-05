# 📦 Installation Guide

## ⚡ Super Quick Start (One Command)

**Prerequisites**: Docker Desktop installed and running

**Run this command:**
```bash
./start.sh
```

**Done!** Access the app at http://localhost:3000

---

## 🎯 What You Need

### Required
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
  - Includes Docker and Docker Compose
  - Available for Mac, Windows, and Linux

### Optional
- **Hugging Face API Key** (for AI features)
  - Sign up free at https://huggingface.co/
  - Get token from https://huggingface.co/settings/tokens
  - Add to `backend/.env` after first run
  - **Note**: App works fine without this!

---

## 🚀 Installation Methods

### Method 1: One Command (Recommended)

```bash
cd espro-costing-app
./start.sh
```

Access at http://localhost:3000

### Method 2: Docker Compose

```bash
cd espro-costing-app

# First time only - create environment files
cat > backend/.env << EOF
MONGODB_URI=mongodb://mongodb:27017/cafe-costing
PORT=5000
HF_API_KEY=your_huggingface_api_key_optional
NODE_ENV=development
EOF

cat > frontend/.env << EOF
VITE_API_URL=http://localhost:5000/api
EOF

# Start the app
docker-compose up --build
```

### Method 3: Manual Setup (No Docker)

**Prerequisites**: Node.js 18+, MongoDB

```bash
# 1. Start MongoDB locally
mongod --dbpath /path/to/data

# 2. Setup Backend
cd backend
npm install

cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/cafe-costing
PORT=5000
HF_API_KEY=your_huggingface_api_key_optional
NODE_ENV=development
EOF

npm run dev

# 3. Setup Frontend (new terminal)
cd frontend
npm install

cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
EOF

npm run dev
```

Access at http://localhost:3000

---

## 📝 First Run Checklist

After installation:

1. ✅ Open http://localhost:3000
2. ✅ You should see the Dashboard
3. ✅ Go to "Expenses" and add an operating expense
4. ✅ Go to "Items" and add your first café item
5. ✅ Click the 🤖 icon to get AI pricing

---

## 🛑 Stopping the Application

### If using start.sh or docker-compose:
1. Press `Ctrl+C` in the terminal
2. Run: `docker-compose down`

### If using manual setup:
Press `Ctrl+C` in both terminal windows

---

## 🔄 Restarting

### Quick restart:
```bash
./start.sh
```

### Reset everything (clear database):
```bash
docker-compose down -v  # Removes database data
./start.sh              # Fresh start
```

---

## 🐛 Troubleshooting

### "Permission denied: ./start.sh"
```bash
chmod +x start.sh
./start.sh
```

### "Docker command not found"
Install Docker Desktop from https://www.docker.com/products/docker-desktop/

### "Port already in use"
Another app is using the port. Stop it or change ports in `docker-compose.yml`

### "Cannot connect to MongoDB"
Make sure Docker Desktop is running

---

## 💡 Tips

- **First time**: Takes ~2-5 minutes to build containers
- **Subsequent runs**: Takes ~30 seconds to start
- **Data persists**: Your items and expenses are saved in Docker volume
- **AI is optional**: Works perfectly fine without Hugging Face API key

---

## 📚 Next Steps

After installation, see:
- **QUICKSTART.md** - First steps guide
- **README.md** - Full documentation
- **PROJECT_SUMMARY.md** - Technical details

Enjoy your café costing app! ☕


