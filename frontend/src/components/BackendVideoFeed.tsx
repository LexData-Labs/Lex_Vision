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

  // Base URL for video feed - always use HTTP with port 8000
  const deriveVideoBase = () => {
    const envBase = import.meta.env.VITE_API_BASE as string | undefined;
    if (envBase) {
      let base = envBase;
      if (base.endsWith('/api')) base = base.slice(0, -4);
      else if (base.includes('/api/')) base = base.replace('/api', '');
      return base;
    }
    try {
      const loc = window?.location as Location | undefined;
      if (loc?.protocol === 'https:') return loc.origin;
      const hostname = loc?.hostname;
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        return `http://${hostname}:8000`;
      }
    } catch {}
    return "http://localhost:8000";
  };
  const videoBase = deriveVideoBase();
  const [useSnapshot, setUseSnapshot] = useState<boolean>(false);
  const [tick, setTick] = useState<number>(0);
  useEffect(() => {
    if (isStreaming && useSnapshot) {
      const id = setInterval(() => setTick((t) => t + 1), 800);
      return () => clearInterval(id);
    }
  }, [isStreaming, useSnapshot]);
  const streamUrl = useSnapshot ? `${videoBase}/snapshot?cb=${tick}` : `${videoBase}/video_feed`;

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
            onClick={() => {
              if (isStreaming) setUseSnapshot(false);
              setIsStreaming((prev) => !prev);
            }}
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
              src={streamUrl}
              alt="CCTV Stream"
              className="w-full h-full object-cover"
              onError={() => setUseSnapshot(true)}
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