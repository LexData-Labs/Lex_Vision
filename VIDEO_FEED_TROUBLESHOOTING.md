# 🔍 Video Feed Troubleshooting Guide

If video feeds are not working on another device, follow these steps:

## Step 1: Check Browser Console

1. **Open Developer Tools:**
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Press `Cmd+Option+I` (Mac)

2. **Check Console Tab:**
   - Look for error messages
   - Check the video URLs being used
   - Look for messages starting with `[getVideoFeedUrl]` and `[MultiCameraView]`

3. **Check Network Tab:**
   - Look for requests to `/video_feed/0`, `/video_feed/1`, etc.
   - Check if requests are failing (red status)
   - Check the actual URL being requested

## Step 2: Verify URL Construction

The video feed URL should be:
- ✅ **Correct:** `https://192.168.140.36/video_feed/0`
- ❌ **Wrong:** `https://192.168.140.36/api/video_feed/0`

If you see `/api/video_feed/0`, the frontend needs to be rebuilt.

## Step 3: Rebuild Frontend

1. **Stop the frontend server** (if running)

2. **Rebuild:**
   ```bash
   cd frontend
   npm run build
   ```

3. **Restart frontend:**
   ```bash
   npm run dev
   # Or if using production build:
   npm run preview
   ```

4. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete` (Windows/Linux)
   - Press `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Click "Clear data"

5. **Hard refresh:**
   - Press `Ctrl+F5` (Windows/Linux)
   - Press `Cmd+Shift+R` (Mac)

## Step 4: Check SSL Certificate

1. **Accept the certificate:**
   - When accessing `https://192.168.140.36`, click "Advanced"
   - Click "Proceed to 192.168.140.36 (unsafe)"
   - The browser will remember this choice

2. **Verify certificate:**
   - Click the lock icon in the address bar
   - Check if certificate is accepted
   - If not, follow instructions in `SSL_CERTIFICATE_FIX.md`

## Step 5: Verify Nginx Configuration

1. **Check Nginx is running:**
   ```powershell
   # Windows
   cd C:\nginx
   .\nginx.exe -t
   ```

2. **Verify video_feed endpoint is configured:**
   - Open `nginx/nginx.conf`
   - Check that `video_feed` is in the location regex:
     ```nginx
     location ~ ^/(login|attendance|employees|alerts|cameras|video_feed|...)
     ```

3. **Reload Nginx:**
   ```powershell
   .\nginx.exe -s reload
   ```

## Step 6: Check Backend

1. **Verify backend is running:**
   - Check if backend is accessible: `http://192.168.140.36:8000/health`
   - Or through Nginx: `https://192.168.140.36/health`

2. **Check backend logs:**
   - Look for video feed requests
   - Check for errors when opening cameras

3. **Test video feed directly:**
   - Open in browser: `https://192.168.140.36/video_feed/0`
   - You should see MJPEG stream (moving video)
   - If you see an error, check backend logs

## Step 7: Check Camera Status

1. **Verify cameras are online:**
   - Check the camera list in the admin panel
   - Cameras should show "online" status

2. **Start a video stream:**
   - Click "Start Stream" if available
   - Check if cameras are being accessed

## Step 8: Network Issues

1. **Check firewall:**
   - Ensure port 443 (HTTPS) is open
   - Ensure port 8000 (backend) is accessible from server

2. **Check network connectivity:**
   - Ping the server: `ping 192.168.140.36`
   - Verify you can access the web interface

3. **Check CORS:**
   - Backend should allow all origins (`CORS_ORIGINS=*`)
   - Check backend logs for CORS errors

## Common Issues and Solutions

### Issue: "ERR_CERT_AUTHORITY_INVALID"
**Solution:** Accept the SSL certificate (see Step 4)

### Issue: "404 Not Found" for video feeds
**Solution:** 
- Check Nginx configuration includes `video_feed` in location regex
- Rebuild frontend
- Clear browser cache

### Issue: Video URL has `/api` prefix
**Solution:**
- Rebuild frontend: `cd frontend && npm run build`
- Clear browser cache
- Hard refresh the page

### Issue: Cameras show as "offline"
**Solution:**
- Check backend is running
- Check cameras are physically connected
- Restart backend to rediscover cameras

### Issue: Video loads but shows black screen
**Solution:**
- Check backend logs for camera errors
- Verify cameras are not being used by another process
- Check camera permissions

### Issue: Video works on server but not on other devices
**Solution:**
- Check Nginx is running and configured correctly
- Verify SSL certificate is accepted on client device
- Check firewall allows HTTPS connections
- Verify video feed URLs don't have `/api` prefix

## Debug Information

When reporting issues, provide:
1. Browser console logs (especially `[getVideoFeedUrl]` messages)
2. Network tab showing the actual video feed requests
3. Backend logs
4. Nginx error logs (if available)
5. The exact URL being used for video feeds

## Quick Test

To quickly test if video feeds work:

1. **Direct backend test:**
   ```
   http://192.168.140.36:8000/video_feed/0
   ```
   Should show video stream

2. **Through Nginx (HTTPS):**
   ```
   https://192.168.140.36/video_feed/0
   ```
   Should show video stream (after accepting certificate)

If both work, the issue is in the frontend URL construction. Rebuild the frontend.

