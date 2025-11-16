# Nginx Setup Script for Windows
# This script helps set up Nginx with HTTPS for LexVision

Write-Host "🔒 Nginx HTTPS Setup for LexVision" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  This script requires administrator privileges!" -ForegroundColor Yellow
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Configuration
$nginxPath = "C:\nginx"
$sslPath = "$nginxPath\conf\ssl"
$configPath = "$nginxPath\conf\nginx.conf"

# Step 1: Check if Nginx is installed
Write-Host "Step 1: Checking Nginx installation..." -ForegroundColor Green
if (-not (Test-Path $nginxPath)) {
    Write-Host "❌ Nginx not found at $nginxPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download and extract Nginx:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://nginx.org/en/download.html" -ForegroundColor Yellow
    Write-Host "2. Extract to: C:\nginx" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Nginx found at $nginxPath" -ForegroundColor Green
Write-Host ""

# Step 2: Create SSL directory
Write-Host "Step 2: Creating SSL directory..." -ForegroundColor Green
if (-not (Test-Path $sslPath)) {
    New-Item -ItemType Directory -Path $sslPath -Force | Out-Null
    Write-Host "✅ Created SSL directory: $sslPath" -ForegroundColor Green
} else {
    Write-Host "✅ SSL directory already exists" -ForegroundColor Green
}
Write-Host ""

# Step 3: Check for OpenSSL
Write-Host "Step 3: Checking for OpenSSL..." -ForegroundColor Green
$opensslPath = $null

# Check common OpenSSL locations
$opensslPaths = @(
    "C:\Program Files\Git\usr\bin\openssl.exe",
    "C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
    "C:\OpenSSL-Win64\bin\openssl.exe",
    "openssl.exe"  # In PATH
)

foreach ($path in $opensslPaths) {
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        $opensslPath = $path
        break
    }
}

if (-not $opensslPath) {
    Write-Host "⚠️  OpenSSL not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install OpenSSL:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    Write-Host "2. Install and add to PATH" -ForegroundColor Yellow
    Write-Host "   OR use Git Bash (includes OpenSSL)" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "✅ OpenSSL found: $opensslPath" -ForegroundColor Green
}
Write-Host ""

# Step 4: Generate SSL certificate
Write-Host "Step 4: Generating SSL certificate..." -ForegroundColor Green
$certFile = "$sslPath\cert.pem"
$keyFile = "$sslPath\key.pem"

if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
    Write-Host "⚠️  SSL certificate already exists" -ForegroundColor Yellow
    $regenerate = Read-Host "Regenerate? (y/n)"
    if ($regenerate -eq "y") {
        Remove-Item $certFile -Force
        Remove-Item $keyFile -Force
    } else {
        Write-Host "✅ Using existing certificate" -ForegroundColor Green
        Write-Host ""
        goto ConfigNginx
    }
}

if ($opensslPath) {
    Write-Host "Generating self-signed certificate..." -ForegroundColor Cyan
    Write-Host "You will be prompted for certificate information." -ForegroundColor Yellow
    Write-Host ""
    
    # Get server IP
    $serverIP = Read-Host "Enter server IP address (e.g., 192.168.140.36)"
    if ([string]::IsNullOrWhiteSpace($serverIP)) {
        $serverIP = "192.168.140.36"
    }
    
    # Generate certificate
    $opensslCmd = "$opensslPath req -x509 -newkey rsa:4096 -keyout `"$keyFile`" -out `"$certFile`" -days 365 -nodes -subj `/CN=$serverIP`"
    
    try {
        Invoke-Expression $opensslCmd
        Write-Host "✅ SSL certificate generated successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to generate certificate: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please generate manually:" -ForegroundColor Yellow
        Write-Host "openssl req -x509 -newkey rsa:4096 -keyout `"$keyFile`" -out `"$certFile`" -days 365 -nodes" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "⚠️  Cannot generate certificate without OpenSSL" -ForegroundColor Yellow
    Write-Host "Please generate manually or install OpenSSL" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Configure Nginx
:ConfigNginx
Write-Host "Step 5: Configuring Nginx..." -ForegroundColor Green

# Get server IP
$serverIP = Read-Host "Enter server IP address (e.g., 192.168.140.36)"
if ([string]::IsNullOrWhiteSpace($serverIP)) {
    $serverIP = "192.168.140.36"
}

# Read the nginx.conf template
$nginxConfigTemplate = @"
# Nginx Configuration for LexVision
# Auto-generated by setup script

upstream frontend {
    server 127.0.0.1:8080;
}

upstream backend {
    server 127.0.0.1:8000;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name $serverIP;
    return 301 https://`$server_name`$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $serverIP;

    ssl_certificate $sslPath\cert.pem;
    ssl_certificate_key $sslPath\key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
    }

    location /api {
        rewrite ^/api/(.*) /`$1 break;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        if (`$request_method = OPTIONS) {
            return 204;
        }
    }

    location ~ ^/(login|attendance|employees|alerts|cameras|video_feed|process_frame|health|docs|openapi.json) {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
"@

# Backup existing config
if (Test-Path $configPath) {
    $backupPath = "$configPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $configPath $backupPath
    Write-Host "✅ Backed up existing config to: $backupPath" -ForegroundColor Green
}

# Write new config
$nginxConfigTemplate | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "✅ Nginx configuration created" -ForegroundColor Green
Write-Host ""

# Step 6: Test Nginx configuration
Write-Host "Step 6: Testing Nginx configuration..." -ForegroundColor Green
Push-Location $nginxPath
try {
    $testResult = & .\nginx.exe -t 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Nginx configuration is valid" -ForegroundColor Green
    } else {
        Write-Host "❌ Nginx configuration test failed:" -ForegroundColor Red
        Write-Host $testResult -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to test configuration: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
Write-Host ""

# Step 7: Configure Firewall
Write-Host "Step 7: Configuring Windows Firewall..." -ForegroundColor Green
try {
    # Check if rules exist
    $httpRule = Get-NetFirewallRule -DisplayName "Nginx HTTP" -ErrorAction SilentlyContinue
    $httpsRule = Get-NetFirewallRule -DisplayName "Nginx HTTPS" -ErrorAction SilentlyContinue
    
    if (-not $httpRule) {
        New-NetFirewallRule -DisplayName "Nginx HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow | Out-Null
        Write-Host "✅ Added firewall rule for HTTP (port 80)" -ForegroundColor Green
    } else {
        Write-Host "✅ Firewall rule for HTTP already exists" -ForegroundColor Green
    }
    
    if (-not $httpsRule) {
        New-NetFirewallRule -DisplayName "Nginx HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow | Out-Null
        Write-Host "✅ Added firewall rule for HTTPS (port 443)" -ForegroundColor Green
    } else {
        Write-Host "✅ Firewall rule for HTTPS already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Failed to configure firewall: $_" -ForegroundColor Yellow
    Write-Host "Please configure manually:" -ForegroundColor Yellow
    Write-Host "New-NetFirewallRule -DisplayName 'Nginx HTTP' -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow" -ForegroundColor Yellow
    Write-Host "New-NetFirewallRule -DisplayName 'Nginx HTTPS' -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow" -ForegroundColor Yellow
}
Write-Host ""

# Step 8: Summary
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Make sure LexVision backend is running on port 8000" -ForegroundColor White
Write-Host "2. Make sure LexVision frontend is running on port 8080" -ForegroundColor White
Write-Host "3. Start Nginx:" -ForegroundColor White
Write-Host "   cd C:\nginx" -ForegroundColor Cyan
Write-Host "   .\nginx.exe" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Access the application:" -ForegroundColor White
Write-Host "   https://$serverIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Accept the security warning (self-signed certificate)" -ForegroundColor White
Write-Host ""
Write-Host "6. Test camera access from another PC:" -ForegroundColor White
Write-Host "   - Navigate to: https://$serverIP" -ForegroundColor Cyan
Write-Host "   - Go to Face Recognition page" -ForegroundColor Cyan
Write-Host "   - Click 'My Camera' mode" -ForegroundColor Cyan
Write-Host "   - Camera should now work! 🎉" -ForegroundColor Green
Write-Host ""
Write-Host "Nginx commands:" -ForegroundColor Yellow
Write-Host "  Start:   cd C:\nginx && .\nginx.exe" -ForegroundColor White
Write-Host "  Stop:    cd C:\nginx && .\nginx.exe -s stop" -ForegroundColor White
Write-Host "  Reload:  cd C:\nginx && .\nginx.exe -s reload" -ForegroundColor White
Write-Host "  Test:    cd C:\nginx && .\nginx.exe -t" -ForegroundColor White
Write-Host ""

