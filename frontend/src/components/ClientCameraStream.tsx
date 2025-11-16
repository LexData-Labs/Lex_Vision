import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle } from "lucide-react";

interface ClientCameraStreamProps {
  onFrame?: (imageData: string) => void;
  backendUrl: string;
}

export function ClientCameraStream({ backendUrl }: ClientCameraStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>("");
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    try {
      setError("");

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera API not available. Please use a modern browser (Chrome, Firefox, Edge).");
        return;
      }

      // Check if we're on HTTPS or localhost (required for camera access)
      const isSecure = window.location.protocol === "https:" || 
                       window.location.hostname === "localhost" || 
                       window.location.hostname === "127.0.0.1";
      
      if (!isSecure) {
        setError("Camera access requires HTTPS. Please access via https:// or use localhost. For network access, you may need to set up HTTPS or use the server camera mode instead.");
        return;
      }

      // Request camera access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Use front camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);

        // Start sending frames to backend
        startFrameCapture();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errorMessage = "Cannot access camera. ";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage += "Please grant camera permissions in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage += "No camera found. Please connect a camera.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage += "Camera is already in use by another application.";
      } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
        errorMessage += "Camera doesn't support the required settings.";
      } else {
        errorMessage += `Error: ${err.message || err.name || "Unknown error"}`;
      }
      
      setError(errorMessage);
    }
  };

  const startFrameCapture = () => {
    // Capture and send frames every 100ms (10 FPS)
    intervalRef.current = setInterval(() => {
      captureAndSendFrame();
    }, 100);
  };

  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to JPEG and send to backend
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("frame", blob, "frame.jpg");

      try {
        await fetch(`${backendUrl}/process_frame`, {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        console.error("Error sending frame:", err);
      }
    }, "image/jpeg", 0.8);
  };

  const stopCamera = () => {
    // Stop frame capture
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Click "Start Camera" to begin</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 text-white p-4">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Camera Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isStreaming ? (
          <Button onClick={startCamera} className="flex items-center gap-2 w-full">
            <Camera className="h-4 w-4" />
            Start Camera
          </Button>
        ) : (
          <Button onClick={stopCamera} variant="destructive" className="flex items-center gap-2 w-full">
            <StopCircle className="h-4 w-4" />
            Stop Camera
          </Button>
        )}
      </div>
    </div>
  );
}
