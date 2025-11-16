# 🌐 HTTP Access Guide - Video Feeds

The system now uses **HTTP only** (no HTTPS required) for video feeds. This makes it easier to access from any device on the network.

## 📋 Access Information

### Server Access
- **Frontend:** `http://192.168.140.36:8080` (or your server IP)
- **Backend API:** `http://192.168.140.36:8000`
- **Video Feeds:** `http://192.168.140.36:8000/video_feed/0`, `/video_feed/1`, etc.

### Default Login
- **Username:** `admin`
- **Password:** `admin`

## 🔧 Configuration

### Video Feed URLs
All video feeds now use direct HTTP access:
- Format: `http://[server-ip]:8000/video_feed/[camera-index]`
- Example: `http://192.168.140.36:8000/video_feed/0`

### Network Access
When accessing from another device:
1. Use the server's IP address (e.g., `192.168.140.36`)
2. Access via: `http://192.168.140.36:8080`
3. Video feeds will automatically use: `http://192.168.140.36:8000/video_feed/X`

## ✅ What Changed

1. **Removed HTTPS requirement** - All video feeds use HTTP
2. **Simplified URL construction** - Always uses `http://hostname:8000` for backend
3. **Direct backend access** - Video feeds connect directly to backend on port 8000
4. **No SSL certificate needed** - No certificate errors or warnings

## 🚀 Quick Start

1. **Start Backend:**
   ```bash
   cd backend
   python backend.py
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access from Any Device:**
   - Open browser on any device on the same network
   - Go to: `http://[server-ip]:8080`
   - Login with admin credentials
   - Video feeds should work automatically

## 🔍 Troubleshooting

### Video feeds not showing?

1. **Check backend is running:**
   - Test: `http://[server-ip]:8000/health`
   - Should return JSON with status

2. **Check video feed directly:**
   - Test: `http://[server-ip]:8000/video_feed/0`
   - Should show MJPEG video stream

3. **Check firewall:**
   - Ensure port 8000 (backend) is open
   - Ensure port 8080 (frontend) is open

4. **Check browser console:**
   - Press F12 to open developer tools
   - Check Console tab for errors
   - Check Network tab for failed requests

5. **Rebuild frontend:**
   ```bash
   cd frontend
   npm run build
   ```

### CORS Errors?

The backend is configured to allow all origins (`CORS_ORIGINS=*`). If you see CORS errors:
- Check backend is running
- Verify CORS configuration in `backend/backend.py`
- Check backend logs for CORS-related messages

## 📝 Notes

- **No HTTPS:** All communication is over HTTP (not encrypted)
- **Local Network Only:** This setup is for local network access
- **Port Requirements:** 
  - Port 8000: Backend API and video feeds
  - Port 8080: Frontend web interface
- **Firewall:** Make sure both ports are accessible on your network

## 🔒 Security Note

This HTTP-only setup is suitable for:
- ✅ Local network access
- ✅ Development/testing
- ✅ Internal company networks

For production or internet access, consider:
- Using HTTPS with valid SSL certificates
- Setting up proper authentication
- Using a reverse proxy (Nginx) with SSL

