# 🚀 How to Run the Application

## ⚡ The Easiest Way (One Command)

```bash
./start.sh
```

**That's it!** Open http://localhost:3000 in your browser.

---

## 📋 What You Need First

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop
   - That's the only requirement!

---

## 🎯 Step-by-Step Instructions

### 1. Open Terminal

**Mac/Linux:**
- Press `Cmd + Space`, type "Terminal", press Enter

**Windows:**
- Press `Win + R`, type "cmd", press Enter
- Or use PowerShell or Git Bash

### 2. Navigate to the Project

```bash
cd /path/to/espro-costing-app
```

### 3. Run the Start Script

```bash
./start.sh
```

If you get "permission denied":
```bash
chmod +x start.sh
./start.sh
```

### 4. Wait for It to Build

First time: ~2-5 minutes (downloading and building)
Next times: ~30 seconds (just starting)

You'll see logs from the containers starting up.

### 5. Open Your Browser

When you see "Server running...", open:
- **Main App**: http://localhost:3000
- **API**: http://localhost:5000/api
- **Database UI**: http://localhost:8081

---

## 🎉 You're Running!

You should see the Café Costing dashboard with:
- Navigation bar at the top
- Dashboard page with statistics cards
- Orange café theme

---

## 🛑 How to Stop

1. Go back to the terminal where it's running
2. Press `Ctrl + C` (or `Cmd + C` on Mac)
3. Wait for it to stop
4. Then run:
```bash
docker-compose down
```

---

## 🔄 How to Restart

Just run the start command again:
```bash
./start.sh
```

Your data (items, expenses) will still be there!

---

## 🗑️ Reset Everything (Fresh Start)

To delete all data and start fresh:
```bash
docker-compose down -v
./start.sh
```

---

## 💡 What the Script Does

When you run `./start.sh`, it:

1. ✅ Creates `backend/.env` file (if missing)
2. ✅ Creates `frontend/.env` file (if missing)
3. ✅ Builds Docker containers for:
   - MongoDB database
   - Node.js backend API
   - React frontend app
   - Mongo Express (database viewer)
4. ✅ Starts all services
5. ✅ Shows you where to access the app

---

## 🐛 Common Issues

### "Docker command not found"
**Solution**: Install Docker Desktop and make sure it's running

### "Port already in use"
**Solution**: Another app is using the port. Stop it or change ports:
- Edit `docker-compose.yml`
- Change port numbers (3000, 5000, 27017)

### "Cannot connect to backend"
**Solution**: 
1. Check if backend is running: http://localhost:5000/api/health
2. If not, check Docker Desktop - make sure containers are running

### Script won't run on Windows
**Solution**: 
1. Use Git Bash instead of CMD
2. Or run Docker Compose directly:
```bash
docker-compose up --build
```

---

## 🎓 Alternative Methods

### Method A: Docker Compose Directly
```bash
docker-compose up --build
```

### Method B: Without Script (Manual Steps)
```bash
# Create environment files
cat > backend/.env << EOF
MONGODB_URI=mongodb://mongodb:27017/cafe-costing
PORT=5000
NODE_ENV=development
EOF

cat > frontend/.env << EOF
VITE_API_URL=http://localhost:5000/api
EOF

# Start
docker-compose up --build
```

---

## 📱 Accessing from Phone/Tablet

If you want to access from other devices on your network:

1. Find your computer's IP address:
   - Mac: `ifconfig | grep "inet "`
   - Windows: `ipconfig`
   - Look for something like `192.168.1.x`

2. On your phone/tablet, open:
   - `http://YOUR_IP:3000`

---

## ✅ Verify It's Working

### Test Checklist:

1. ✅ Frontend loads at http://localhost:3000
2. ✅ Dashboard shows "Total Items: 0"
3. ✅ Navigation works (Dashboard, Items, Expenses, Import/Export)
4. ✅ Can add an expense in the Expenses page
5. ✅ Can add an item in the Items page

If all work, you're good to go! 🎉

---

## 📚 Next Steps

Now that it's running, see:
- **QUICKSTART.md** - Learn how to use the app
- **README.md** - Full documentation
- Start by adding operating expenses, then add items

Enjoy! ☕


