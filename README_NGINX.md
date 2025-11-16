# 🔒 Quick Nginx Setup for Lex Vision

## 🚀 Quick Start (Windows)

### Option 1: Automated Setup (Recommended)

1. **Run the setup script:**
   ```powershell
   # Right-click PowerShell → Run as Administrator
   .\setup_nginx_windows.ps1
   ```

2. **Follow the prompts:**
   - Enter your server IP (e.g., `192.168.140.36`)
   - Script will generate SSL certificate and configure Nginx

3. **Start Nginx:**
   ```powershell
   cd C:\nginx
   .\nginx.exe
   ```

4. **Access:** `https://192.168.140.36`

### Option 2: Manual Setup

See `NGINX_SETUP_GUIDE.md` for detailed instructions.

---

## 📋 Prerequisites

- ✅ Nginx installed (download from https://nginx.org/en/download.html)
- ✅ OpenSSL installed (or use Git Bash)
- ✅ Lex Vision backend running on port 8000
- ✅ Lex Vision frontend running on port 8080
- ✅ Administrator privileges

---

## 🔧 What This Does

1. **Sets up HTTPS** - Enables secure camera access from network PCs
2. **Reverse Proxy** - Routes traffic to frontend (8080) and backend (8000)
3. **Auto Redirect** - HTTP automatically redirects to HTTPS
4. **SSL Certificate** - Generates self-signed certificate (for testing)

---

## ✅ After Setup

1. **Start services:**
   ```powershell
   # Terminal 1: Backend
   python backend/backend.py
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   
   # Terminal 3: Nginx
   cd C:\nginx
   .\nginx.exe
   ```

2. **Access from network:**
   - Open browser on another PC
   - Navigate to: `https://192.168.140.36`
   - Accept security warning (self-signed certificate)
   - Camera access will now work! 🎉

---

## 🐧 Linux Users

See `NGINX_SETUP_GUIDE.md` for Linux instructions.

---

## 📚 Full Documentation

- **Detailed Guide:** `NGINX_SETUP_GUIDE.md`
- **Network Access:** `NETWORK_ACCESS_GUIDE.md`
- **Nginx Config:** `nginx/nginx.conf`

---

## ⚠️ Important Notes

1. **Self-Signed Certificate:** Browsers will show a security warning. This is normal for testing.
2. **Production:** Use Let's Encrypt for production (see guide).
3. **Firewall:** Make sure ports 80 and 443 are open.
4. **IP Address:** Update `server_name` in config if your IP changes.

---

## 🆘 Troubleshooting

**502 Bad Gateway?**
- Check if backend (8000) and frontend (8080) are running

**Certificate Error?**
- Accept the security warning in browser
- For production, use Let's Encrypt

**Camera Still Not Working?**
- Make sure you're accessing via HTTPS (not HTTP)
- Check browser console (F12) for errors
- Try incognito mode

See `NGINX_SETUP_GUIDE.md` for more troubleshooting.

