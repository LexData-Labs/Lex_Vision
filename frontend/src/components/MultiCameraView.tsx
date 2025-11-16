import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
import { api, CameraConfig } from "@/services/api";

interface MultiCameraViewProps {
  cameras: CameraConfig[];
}

export function MultiCameraView({ cameras }: MultiCameraViewProps) {
  const [activeCameras, setActiveCameras] = useState<CameraConfig[]>([]);
  const [fallback, setFallback] = useState<Record<string, boolean>>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const anyFallback = Object.values(fallback).some(Boolean);
    if (anyFallback) {
      const id = setInterval(() => setTick((t) => t + 1), 800);
      return () => clearInterval(id);
    }
  }, [fallback]);

  useEffect(() => {
    // Filter only online cameras
    setActiveCameras(cameras.filter(cam => cam.status === "online"));
  }, [cameras]);

  const getCameraIndex = (cameraId: string): number | undefined => {
    // Extract index from CAM-{index} format
    const match = cameraId.match(/^CAM-(\d+)$/);
    return match ? parseInt(match[1]) : undefined;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "entry":
        return <Badge className="bg-green-500">Entry</Badge>;
      case "exit":
        return <Badge className="bg-blue-500">Exit</Badge>;
      default:
        return <Badge variant="secondary">General</Badge>;
    }
  };

  if (activeCameras.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No active cameras</p>
            <p className="text-sm">Start a camera stream to see it here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`grid gap-4 ${
      activeCameras.length === 1 ? "grid-cols-1" :
      activeCameras.length === 2 ? "grid-cols-2" :
      activeCameras.length <= 4 ? "grid-cols-2" :
      "grid-cols-3"
    }`}>
      {activeCameras.map((camera) => {
        const cameraIndex = getCameraIndex(camera.id);
        const videoUrl = cameraIndex !== undefined
          ? api.getVideoFeedUrl(cameraIndex)
          : api.getVideoFeedUrl();
        const snapshotUrl = videoUrl.replace('/video_feed', '/snapshot') + `?cb=${tick}`;


        return (
          <Card key={camera.id} className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  {camera.name}
                </CardTitle>
                {getRoleBadge(camera.role)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <img
                  src={fallback[camera.id] ? snapshotUrl : videoUrl}
                  alt={camera.name}
                  className="w-full h-full object-contain"
                  onLoad={() => {
                    console.log(`[MultiCameraView] Camera ${camera.id} ${fallback[camera.id] ? 'snapshot' : 'video'} loaded successfully`);
                  }}
                  onError={() => {
                    setFallback((prev) => ({ ...prev, [camera.id]: true }));
                  }}
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {camera.id}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
