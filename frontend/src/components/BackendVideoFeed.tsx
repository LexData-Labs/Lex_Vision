import { useState, useEffect } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Simple MJPEG stream viewer that consumes the FastAPI `/video_feed` endpoint.
 * The backend returns multipart JPEG frames, which most browsers can display
 * by assigning the endpoint URL as the `src` of an <img> element.
 */
export function BackendVideoFeed() {
  // Whether the MJPEG <img> element is currently rendered
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamKey, setStreamKey] = useState<number>(Date.now());
  const [retryCount, setRetryCount] = useState<number>(0);

  // Base URL for video feed - always use HTTP with port 8000
  const deriveVideoBase = () => {
    const envBase = import.meta.env.VITE_API_BASE as string | undefined;
    if (envBase) {
      // Remove /api prefix if present
      let base = envBase;
      if (base.endsWith('/api')) {
        base = base.slice(0, -4);
      } else if (base.includes('/api/')) {
        base = base.replace('/api', '');
      }
      return base;
    }
    
    try {
      const hostname = window?.location?.hostname;
      
      // For network access, always use HTTP with port 8000
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        return `http://${hostname}:8000`;
      }
    } catch {
      // ignore if window is not available
    }
    
    return "http://localhost:8000";
  };
  const videoBase = deriveVideoBase();
  const streamUrl = `${videoBase}/video_feed?t=${streamKey}&retry=${retryCount}`;

  // Reset stream key when starting/stopping stream
  useEffect(() => {
    if (isStreaming) {
      setStreamKey(Date.now());
      setRetryCount(0);
    }
  }, [isStreaming]);

  const handleVideoError = () => {
    console.error('[BackendVideoFeed] Stream error, retrying in 2 seconds...');

    // Retry after 2 seconds
    setTimeout(() => {
      setRetryCount(prev => prev + 1);
    }, 2000);
  };

  const handleVideoLoad = () => {
    console.log('[BackendVideoFeed] Stream loaded successfully');
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Live CCTV Stream
          </CardTitle>
          <Button
            variant={isStreaming ? "destructive" : "default"}
            onClick={() => setIsStreaming((prev) => !prev)}
            className="gap-2"
          >
            {isStreaming ? (
              <>
                <CameraOff className="h-4 w-4" /> Stop Stream
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" /> Start Stream
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {isStreaming ? (
            <img
              key={streamUrl}
              src={streamUrl}
              alt="CCTV Stream"
              className="w-full h-full object-cover"
              onLoad={handleVideoLoad}
              onError={handleVideoError}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Camera className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}