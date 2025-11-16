# 🌐 Network Access Guide for Lex Vision

## Problem
When accessing the application from another PC on the network (e.g., `http://192.168.140.36:8080/`), the following issues may occur:
1. Camera access doesn't work
2. Detection model doesn't work
3. Backend API connection fails

## Solutions

### 1. Backend URL Configuration ✅ (Fixed)
The frontend now automatically detects the network IP and connects to the backend on port 8000.

**How it works:**
- If accessing from `http://192.168.140.36:8080/`, the frontend will automatically connect to `http://192.168.140.36:8000` for the backend API
- No configuration needed - it's automatic!

### 2. Camera Access Issue ⚠️ (Browser Security)

**Problem:** Modern browsers (Chrome, Firefox, Edge) **require HTTPS** for camera access when accessing from a network IP (not localhost).

**Solutions:**

#### Option A: Use Server Camera Mode (Recommended for Network Access)
Instead of using "My Camera" (client camera), use the **"Server Camera"** or **"Multi-Camera"** mode which uses cameras connected to the server PC.

1. Go to Face Recognition page
2. Select **"Server Camera"** or **"Multi-Camera"** mode
3. This uses cameras connected to the server (192.168.140.36), not the client PC

#### Option B: Set Up HTTPS (For Client Camera Access)
To use client cameras from network PCs, you need HTTPS:

1. **Using a reverse proxy (Nginx):**
   ```nginx
   server {
       listen 443 ssl;
       server_name 192.168.140.36;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:8080;
       }
       
       location /api {
           proxy_pass http://localhost:8000;
       }
   }
   ```

2. **Using self-signed certificate (for testing):**
   ```bash
   # Generate self-signed certificate
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
   ```

3. **Access via:** `https://192.168.140.36:8080/` (browser will show security warning - click "Advanced" → "Proceed")

#### Option C: Use localhost (Development Only)
If testing on the same PC:
- Access via: `http://localhost:8080/` (camera works on localhost)

### 3. Backend CORS Configuration ✅ (Already Configured)
The backend is configured to allow requests from any origin. Check `backend/backend.py`:
```python
origins_env = os.getenv("CORS_ORIGINS", "*,http://localhost:5173,http://localhost:8081,http://localhost:8082").split(",")
```

To add specific network IPs, set environment variable:
```bash
CORS_ORIGINS=http://192.168.140.36:8080,http://192.168.140.36:5173
```

### 4. Firewall Configuration 🔥
Make sure Windows Firewall allows connections:

1. **Backend (Port 8000):**
   ```powershell
   # Allow inbound on port 8000
   New-NetFirewallRule -DisplayName "Lex Vision Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

2. **Frontend (Port 8080):**
   ```powershell
   # Allow inbound on port 8080
   New-NetFirewallRule -DisplayName "Lex Vision Frontend" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
   ```

### 5. Testing Network Access

1. **Test Backend API:**
   ```bash
   # From another PC, test if backend is accessible:
   curl http://192.168.140.36:8000/health
   ```

2. **Test Frontend:**
   - Open browser on another PC
   - Navigate to: `http://192.168.140.36:8080/`
   - Check browser console (F12) for errors

3. **Test Camera:**
   - Try "Server Camera" mode first (should work)
   - Try "My Camera" mode (requires HTTPS for network access)

### 6. Troubleshooting

#### Issue: "Cannot access camera"
- **Cause:** Browser security requires HTTPS for network camera access
- **Solution:** Use Server Camera mode OR set up HTTPS

#### Issue: "Failed to fetch" or CORS errors
- **Cause:** Backend not accessible or CORS misconfigured
- **Solution:** 
  1. Check firewall rules
  2. Verify backend is running: `http://192.168.140.36:8000/health`
  3. Check CORS_ORIGINS environment variable

#### Issue: "Connection refused"
- **Cause:** Backend not running or wrong IP/port
- **Solution:**
  1. Verify backend is running on server PC
  2. Check backend is bound to `0.0.0.0` (not just `127.0.0.1`)
  3. Verify IP address: `ipconfig` (Windows) or `ifconfig` (Linux)

### 7. Quick Start for Network Access

1. **On Server PC:**
   ```bash
   # Start backend (should bind to 0.0.0.0:8000)
   python backend/backend.py
   
   # Start frontend (should bind to 0.0.0.0:8080)
   cd frontend
   npm run dev
   ```

2. **On Client PC:**
   - Open browser
   - Navigate to: `http://192.168.140.36:8080/`
   - Use **"Server Camera"** mode for detection
   - OR set up HTTPS to use **"My Camera"** mode

### 8. Recommended Setup for Production

For production with multiple client PCs:

1. **Use Server Camera Mode:**
   - All cameras connected to server
   - Clients view streams via web interface
   - No HTTPS needed for viewing

2. **OR Set Up HTTPS:**
   - Use reverse proxy (Nginx/Caddy)
   - SSL certificate (Let's Encrypt for production)
   - Clients can use their own cameras

3. **Network Configuration:**
   - Static IP for server
   - Firewall rules configured
   - CORS properly configured

---

## Summary

✅ **Fixed:** Backend URL auto-detection for network access  
⚠️ **Known Limitation:** Client camera requires HTTPS for network access  
✅ **Workaround:** Use Server Camera mode (no HTTPS needed)  
✅ **Backend CORS:** Already configured to allow network access

For best results with network access, use **Server Camera** mode instead of **My Camera** mode.

