import { useState, useEffect } from "react";
import { Camera, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";

export default function EditorCameras() {
  const [cameras, setCameras] = useState<{ id: string; name: string; role: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const data = await api.cameras();
      setCameras(data);
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Live Cameras</h1>
        <p className="text-muted-foreground mt-1">View live camera feeds</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading cameras...</p>
        </div>
      ) : cameras.length === 0 ? (
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardContent className="text-center py-12">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No cameras configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <Card key={camera.id} className="bg-gradient-card border-0 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  {camera.name}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      camera.status === "online"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {camera.status}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {camera.role}
                    </span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ paddingBottom: "75%" }}>
                  <img
                    src={api.getVideoFeedUrl(parseInt(camera.id.replace('CAM-', '')))}
                    alt={camera.name}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ccc' width='100' height='100'/%3E%3Ctext fill='%23888' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3ENo Signal%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
