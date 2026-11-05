# 🔐 Environment Setup Instructions

Since `.env` files cannot be automatically created, follow these steps:

## Backend Environment Variables

Create `backend/.env` file:

```bash
cd backend
touch .env
```

Add the following content:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/cafe-costing
# For Docker: mongodb://mongodb:27017/cafe-costing

# Server Port
PORT=5000

# AI API Key (Optional - works without it)
HF_API_KEY=your_huggingface_api_key_optional

# Environment
NODE_ENV=development
```

### Getting Hugging Face API Key (Optional)

1. Go to https://huggingface.co/
2. Sign up for free account
3. Go to https://huggingface.co/settings/tokens
4. Create a new token
5. Copy and paste into `HF_API_KEY`

**Note**: The app works fine without this key using formula-based pricing!

---

## Frontend Environment Variables

Create `frontend/.env` file:

```bash
cd frontend
touch .env
```

Add the following content:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Docker Environment

If using Docker, update `backend/.env`:

```env
MONGODB_URI=mongodb://mongodb:27017/cafe-costing
PORT=5000
HF_API_KEY=your_huggingface_api_key_optional
NODE_ENV=production
```

The frontend `.env` remains the same.

---

## Verification

After creating the files, verify they exist:

```bash
# Check backend
ls -la backend/.env

# Check frontend
ls -la frontend/.env
```

You should see the files listed.

---

## Security Notes

- ✅ `.env` files are already in `.gitignore`
- ✅ Never commit `.env` files to git
- ✅ Use `.env.example` for sharing templates
- ✅ Keep API keys secret

---

Ready to start! See [QUICKSTART.md](./QUICKSTART.md) for next steps.

