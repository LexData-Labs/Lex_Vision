# 🔒 SSL Certificate Error Fix

## Problem
When accessing the system via HTTPS from another device, you may see:
```
ERR_CERT_AUTHORITY_INVALID
```

This happens because the SSL certificate is self-signed and browsers don't trust it by default.

## Solution

### Option 1: Accept the Certificate (Quick Fix for Testing)

1. **In Chrome/Edge:**
   - Click "Advanced" on the warning page
   - Click "Proceed to 192.168.140.36 (unsafe)"
   - The browser will remember your choice for this site

2. **In Firefox:**
   - Click "Advanced"
   - Click "Accept the Risk and Continue"

3. **For Other Devices:**
   - Each device needs to accept the certificate once
   - After accepting, the warning won't appear again

### Option 2: Install Certificate on Client Devices (More Secure)

1. **Export the Certificate:**
   ```powershell
   # On the server, copy the certificate
   copy C:\nginx\conf\ssl\cert.pem C:\nginx\conf\ssl\cert.crt
   ```

2. **On Windows Client:**
   - Copy `cert.crt` to the client device
   - Double-click the certificate file
   - Click "Install Certificate"
   - Select "Current User" or "Local Machine"
   - Select "Place all certificates in the following store"
   - Click "Browse" → Select "Trusted Root Certification Authorities"
   - Click "Next" → "Finish"
   - Restart the browser

3. **On Other Devices:**
   - Import the certificate into the device's trusted certificate store
   - Follow device-specific instructions for certificate installation

### Option 3: Use a Valid SSL Certificate (Production)

For production use, obtain a valid SSL certificate from:
- **Let's Encrypt** (free, automated)
- **Cloudflare** (free with their service)
- **Commercial CA** (paid)

## Video Feed URL Fix

The video feed URLs have been updated to use the correct path (`/video_feed/0` instead of `/api/video_feed/0`).

After rebuilding the frontend, video feeds should work correctly through HTTPS.

## Rebuild Frontend

After making changes, rebuild the frontend:

```bash
cd frontend
npm run build
```

Then restart your frontend server or Nginx.

