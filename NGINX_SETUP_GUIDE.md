# 🔒 Nginx HTTPS Setup Guide for Lex Vision

This guide will help you set up Nginx as a reverse proxy with HTTPS to enable client camera access from network PCs.

## 📋 Prerequisites

- Windows Server or Linux server with Nginx installed
- Lex Vision backend running on port 8000
- Lex Vision frontend running on port 8080
- Administrator/root access

---

## 🪟 Windows Setup

### Step 1: Install Nginx for Windows

1. **Download Nginx:**
   - Visit: https://nginx.org/en/download.html
   - Download the latest Windows version (e.g., `nginx/Windows-1.25.x`)

2. **Extract Nginx:**
   - Extract to `C:\nginx\` (or your preferred location)

3. **Test Installation:**
   ```powershell
   cd C:\nginx
   .\nginx.exe
   ```
   - Open browser: `http://localhost` - you should see "Welcome to nginx!"

4. **Stop Nginx:**
   ```powershell
   .\nginx.exe -s stop
   ```

### Step 2: Generate SSL Certificate (Self-Signed for Testing)

1. **Install OpenSSL for Windows:**
   - Download from: https://slproweb.com/products/Win32OpenSSL.html
   - Or use Git Bash (includes OpenSSL)

2. **Create SSL directory:**
   ```powershell
   mkdir C:\nginx\conf\ssl
   ```

3. **Generate Self-Signed Certificate:**
   ```powershell
   # Using OpenSSL (in Git Bash or OpenSSL installation)
   openssl req -x509 -newkey rsa:4096 -keyout C:\nginx\conf\ssl\key.pem -out C:\nginx\conf\ssl\cert.pem -days 365 -nodes
   ```
   
   **When prompted, enter:**
   - Country: `BD` (or your country)
   - State: `Dhaka` (or your state)
   - City: `Dhaka` (or your city)
   - Organization: `Lex Vision`
   - Common Name: `192.168.140.36` (your server IP) **OR** your domain name
   - Email: (optional)

### Step 3: Configure Nginx

1. **Copy configuration file:**
   - Copy `nginx/nginx.conf` to `C:\nginx\conf\nginx.conf`
   - **OR** edit `C:\nginx\conf\nginx.conf` and replace with the configuration

2. **Update configuration:**
   - Open `C:\nginx\conf\nginx.conf`
   - Update `server_name` to your IP: `192.168.140.36`
   - Update SSL certificate paths:
     ```nginx
     ssl_certificate C:/nginx/conf/ssl/cert.pem;
     ssl_certificate_key C:/nginx/conf/ssl/key.pem;
     ```

3. **Test configuration:**
   ```powershell
   cd C:\nginx
   .\nginx.exe -t
   ```
   - Should show: `nginx: configuration file ... test is successful`

### Step 4: Start Nginx

```powershell
cd C:\nginx
.\nginx.exe
```

### Step 5: Configure Windows Firewall

```powershell
# Allow HTTPS (port 443)
New-NetFirewallRule -DisplayName "Nginx HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# Allow HTTP (port 80) - for redirect
New-NetFirewallRule -DisplayName "Nginx HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

### Step 6: Update Frontend API Configuration (Optional)

If you want to use `/api` prefix for backend:

1. **Create `.env` file in `frontend/` directory:**
   ```env
   VITE_API_BASE=https://192.168.140.36/api
   ```

2. **Restart frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```

---

## 🐧 Linux Setup

### Step 1: Install Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y
# or
sudo dnf install nginx -y
```

### Step 2: Generate SSL Certificate

#### Option A: Self-Signed Certificate (Testing)

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate certificate
sudo openssl req -x509 -newkey rsa:4096 -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem -days 365 -nodes

# Set permissions
sudo chmod 600 /etc/nginx/ssl/key.pem
sudo chmod 644 /etc/nginx/ssl/cert.pem
```

#### Option B: Let's Encrypt (Production - Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

### Step 3: Configure Nginx

1. **Backup default config:**
   ```bash
   sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
   ```

2. **Create new configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/lex-vision
   ```

3. **Paste the configuration from `nginx/nginx.conf`**

4. **Update paths for Linux:**
   ```nginx
   ssl_certificate /etc/nginx/ssl/cert.pem;
   ssl_certificate_key /etc/nginx/ssl/key.pem;
   ```

5. **Enable site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/lex-vision /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default  # Remove default if needed
   ```

6. **Test configuration:**
   ```bash
   sudo nginx -t
   ```

### Step 4: Start Nginx

```bash
# Start and enable on boot
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 5: Configure Firewall

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🔧 Configuration Details

### Important Settings

1. **Server Name:**
   - Update `server_name` to your IP or domain
   - For IP: `192.168.140.36`
   - For domain: `lexvision.example.com`

2. **SSL Certificate Paths:**
   - Windows: `C:/nginx/conf/ssl/cert.pem`
   - Linux: `/etc/nginx/ssl/cert.pem`

3. **Upstream Servers:**
   - Frontend: `127.0.0.1:8080` (Vite dev server)
   - Backend: `127.0.0.1:8000` (FastAPI server)

### Backend CORS Configuration

Update `backend/backend.py` or set environment variable:

```bash
# Windows PowerShell
$env:CORS_ORIGINS="https://192.168.140.36,https://192.168.140.36:443"

# Linux
export CORS_ORIGINS="https://192.168.140.36,https://192.168.140.36:443"
```

Or in `.env` file:
```env
CORS_ORIGINS=https://192.168.140.36,https://192.168.140.36:443
```

---

## 🧪 Testing

### 1. Test Nginx

```bash
# Check if Nginx is running
# Windows
tasklist | findstr nginx

# Linux
sudo systemctl status nginx
```

### 2. Test HTTPS

1. **Open browser:**
   - Navigate to: `https://192.168.140.36`
   - You'll see a security warning (self-signed certificate)
   - Click "Advanced" → "Proceed to 192.168.140.36 (unsafe)"

2. **Verify redirect:**
   - Try: `http://192.168.140.36` (should redirect to HTTPS)

### 3. Test Backend API

```bash
# Test health endpoint
curl -k https://192.168.140.36/health

# Test via /api prefix
curl -k https://192.168.140.36/api/health
```

### 4. Test Camera Access

1. **Open browser on another PC:**
   - Navigate to: `https://192.168.140.36`
   - Go to Face Recognition page
   - Click "My Camera" mode
   - Click "Start Camera"
   - **Camera should now work!** ✅

---

## 🔍 Troubleshooting

### Issue: "502 Bad Gateway"

**Cause:** Backend or frontend not running

**Solution:**
```bash
# Check if services are running
# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :8080

# Linux
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :8080

# Start services if not running
```

### Issue: "SSL certificate error"

**Cause:** Self-signed certificate not trusted

**Solution:**
- For testing: Accept the security warning in browser
- For production: Use Let's Encrypt certificate

### Issue: "Connection refused"

**Cause:** Firewall blocking or wrong IP

**Solution:**
```bash
# Check firewall rules
# Windows
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Nginx*"}

# Linux
sudo ufw status
# or
sudo firewall-cmd --list-all
```

### Issue: "Camera still not working"

**Cause:** Browser cache or CORS issue

**Solution:**
1. Clear browser cache
2. Check browser console (F12) for errors
3. Verify CORS_ORIGINS includes HTTPS URL
4. Try incognito/private mode

### Issue: "Video stream not loading"

**Cause:** Proxy buffering or timeout

**Solution:**
- The configuration already includes:
  ```nginx
  proxy_buffering off;
  proxy_cache off;
  proxy_read_timeout 300s;
  ```
- If still issues, increase timeout values

---

## 📝 Nginx Commands Reference

### Windows

```powershell
# Start
cd C:\nginx
.\nginx.exe

# Stop
.\nginx.exe -s stop

# Reload (after config changes)
.\nginx.exe -s reload

# Test configuration
.\nginx.exe -t

# View logs
type C:\nginx\logs\error.log
type C:\nginx\logs\access.log
```

### Linux

```bash
# Start
sudo systemctl start nginx

# Stop
sudo systemctl stop nginx

# Restart
sudo systemctl restart nginx

# Reload (after config changes)
sudo systemctl reload nginx

# Enable on boot
sudo systemctl enable nginx

# Test configuration
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 🚀 Production Recommendations

### 1. Use Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

### 2. Use Domain Name

Instead of IP address:
- Set up DNS A record pointing to your server IP
- Use domain in `server_name`: `lexvision.example.com`
- Update SSL certificate for domain

### 3. Security Hardening

- Keep Nginx updated
- Use strong SSL ciphers (already configured)
- Enable fail2ban for brute force protection
- Regular security updates

### 4. Performance

- Enable gzip compression (add to nginx.conf):
  ```nginx
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
  ```

---

## ✅ Verification Checklist

- [ ] Nginx installed and running
- [ ] SSL certificate generated/installed
- [ ] Nginx configuration tested (`nginx -t`)
- [ ] Firewall rules configured
- [ ] Backend running on port 8000
- [ ] Frontend running on port 8080
- [ ] HTTPS accessible: `https://192.168.140.36`
- [ ] HTTP redirects to HTTPS
- [ ] Backend API accessible: `https://192.168.140.36/health`
- [ ] Camera works from network PC
- [ ] CORS configured correctly

---

## 📞 Quick Start Summary

**Windows:**
1. Install Nginx → Extract to `C:\nginx`
2. Generate SSL: `openssl req -x509 ...`
3. Copy `nginx.conf` → Update paths
4. Start: `.\nginx.exe`
5. Access: `https://192.168.140.36`

**Linux:**
1. Install: `sudo apt install nginx`
2. Generate SSL: `sudo openssl req -x509 ...`
3. Copy config → `/etc/nginx/sites-available/lex-vision`
4. Enable: `sudo ln -s ...`
5. Start: `sudo systemctl start nginx`
6. Access: `https://192.168.140.36`

---

**After setup, clients can access `https://192.168.140.36` and use their own cameras for detection!** 🎉

