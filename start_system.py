#!/usr/bin/env python3
"""
CCTV System Startup Script with GPU Acceleration
"""

import subprocess
import time
import sys
import os
import threading
import requests

def check_gpu():
    """Check GPU status"""
    try:
        import torch
        print("🖥️  GPU Status:")
        print(f"   CUDA Available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   GPU Device: {torch.cuda.get_device_name()}")
            print(f"   CUDA Version: {torch.version.cuda}")
        return torch.cuda.is_available()
    except ImportError:
        print("❌ PyTorch not installed")
        return False

def start_backend():
    """Start the backend server"""
    print("🚀 Starting Backend Server...")
    try:
        # Start backend in a new process
        backend_process = subprocess.Popen(
            [sys.executable, "backend/backend.py"],
            cwd=os.getcwd(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for backend to start
        print("⏳ Waiting for backend to start...")
        for i in range(30):  # Wait up to 30 seconds
            try:
                response = requests.get('http://localhost:8000/docs', timeout=2)
                if response.status_code == 200:
                    print("✅ Backend started successfully!")
                    return backend_process
            except:
                time.sleep(1)
                print(f"   Waiting... ({i+1}/30)")
        
        print("❌ Backend failed to start")
        return None
        
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        return None

def start_frontend():
    """Start the frontend server"""
    print("🌐 Starting Frontend Server...")
    try:
        # Start frontend in a new process
        frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=os.path.join(os.getcwd(), "frontend"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for frontend to start
        print("⏳ Waiting for frontend to start...")
        for i in range(30):  # Wait up to 30 seconds
            try:
                response = requests.get('http://localhost:5173', timeout=2)
                if response.status_code == 200:
                    print("✅ Frontend started successfully!")
                    return frontend_process
            except:
                time.sleep(1)
                print(f"   Waiting... ({i+1}/30)")
        
        print("❌ Frontend failed to start")
        return None
        
    except Exception as e:
        print(f"❌ Error starting frontend: {e}")
        return None

def open_browser():
    """Open web browser to the system"""
    print("🎯 Opening web interface...")
    try:
        import webbrowser
        time.sleep(2)  # Wait a bit for services to be ready
        webbrowser.open('http://localhost:5173')
        webbrowser.open('http://localhost:8000/docs')
        print("✅ Browser opened")
    except Exception as e:
        print(f"⚠️  Could not open browser: {e}")

def main():
    print("🚀 Starting CCTV System with GPU Acceleration...")
    print("=" * 50)
    
    # Check GPU
    if not check_gpu():
        print("⚠️  GPU not available, but continuing...")
    
    print()
    
    # Start backend
    backend_process = start_backend()
    if not backend_process:
        print("❌ Failed to start backend. Exiting.")
        return
    
    print()
    
    # Start frontend
    frontend_process = start_frontend()
    if not frontend_process:
        print("❌ Failed to start frontend. Exiting.")
        backend_process.terminate()
        return
    
    print()
    print("✅ Both services started successfully!")
    print()
    
    # Show access points
    print("📱 Access Points:")
    print("   Frontend: http://localhost:5173")
    print("   Backend:  http://localhost:8000")
    print("   API Docs: http://localhost:8000/docs")
    print()
    
    # Open browser
    open_browser()
    
    print("🎯 System is now running!")
    print("💡 Press Ctrl+C to stop all services")
    print()
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        print("✅ Services stopped")

if __name__ == "__main__":
    main()
