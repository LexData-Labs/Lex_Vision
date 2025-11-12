import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, User, Clock, AlertCircle, Monitor, Smartphone, Grid3x3 } from "lucide-react";
import { ClientCameraStream } from "@/components/ClientCameraStream";
import { MultiCameraView } from "@/components/MultiCameraView";
import type { CameraConfig } from "@/services/api";

interface FaceRecognitionData {
  id: string;
  name: string;
  confidence: number;
  timestamp: string;
  status: "recognized" | "unknown" | "alert";
  entryType?: "entry" | "exit" | null;
  cameraId?: string;
}

export default function FaceRecognition() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [recognizedFaces, setRecognizedFaces] = useState<FaceRecognitionData[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("Ready");
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [stats, setStats] = useState({ recognized: 0, unknown: 0, alerts: 0 });
  const [cameraMode, setCameraMode] = useState<"server" | "client" | "multi">("multi");
  const videoRef = useRef<HTMLObjectElement>(null);

  // Get backend URL based on current location
  const getBackendUrl = () => {
    // If accessing from network, use the same host
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `http://${window.location.hostname}:8000`;
    }
    return 'http://localhost:8000';
  };

  const BACKEND_URL = getBackendUrl();

  // Fetch cameras for multi-camera view
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/cameras`);
        if (response.ok) {
          const camerasData = await response.json();
          setCameras(camerasData);
        }
      } catch (error) {
        console.error('Failed to fetch cameras:', error);
      }
    };

    fetchCameras();
    const interval = setInterval(fetchCameras, 5000);
    return () => clearInterval(interval);
  }, [BACKEND_URL]);

  // Fetch real attendance data from backend
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/attendance`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const attendanceData = await response.json();
        
        // Debug: log the data we receive
        console.log('Attendance data received:', attendanceData);
        
        // Check if we have data
        if (!attendanceData || attendanceData.length === 0) {
          console.log('No attendance data available yet');
          setRecognizedFaces([]);
          setStats({ recognized: 0, unknown: 0, alerts: 0 });
          return;
        }
        
        // Convert attendance data to face recognition format
        // Show both recognized and unknown faces (limit to 6 most recent)
        const faceData: FaceRecognitionData[] = attendanceData
          .slice(0, 6)
          .map((record: any, index: number) => {
            const isRecognized = record.name && record.name !== "Unknown";
            return {
              id: `${record.employee_id}-${record.timestamp}-${index}`,
              name: record.name || "Unknown",
              confidence: isRecognized ? 0.85 + Math.random() * 0.15 : 0.5, // Simulated confidence
              timestamp: new Date(record.timestamp).toLocaleTimeString(),
              status: isRecognized ? "recognized" as const : "unknown" as const,
              entryType: record.entry_type,
              cameraId: record.camera_id
            };
          });
        
        console.log('Processed face data:', faceData);
        
        setRecognizedFaces(faceData);
        
        // Calculate statistics from all records (not just recognized)
        const recognized = attendanceData.filter((r: any) => r.name && r.name !== "Unknown").length;
        const unknown = attendanceData.filter((r: any) => !r.name || r.name === "Unknown").length;
        const alerts = 0; // No alerts for now
        
        setStats({ recognized, unknown, alerts });
      } catch (error) {
        console.error('Failed to fetch attendance data:', error);
        // Fallback to empty array if fetch fails
        setRecognizedFaces([]);
        setStats({ recognized: 0, unknown: 0, alerts: 0 });
      }
    };

    // Fetch data initially
    fetchAttendanceData();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchAttendanceData, 2000);
    
    return () => clearInterval(interval);
  }, [BACKEND_URL]);

  const startStream = () => {
    setIsStreaming(true);
    setCurrentStatus("Live");
    console.log("Starting stream with object element");
  };

  const stopStream = () => {
    setIsStreaming(false);
    setCurrentStatus("Stopped");
    
    // Stop the video stream
    if (videoRef.current) {
      // Remove the data attribute to stop the stream
      videoRef.current.removeAttribute('data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recognized":
        return "bg-green-100 text-green-800";
      case "unknown":
        return "bg-yellow-100 text-yellow-800";
      case "alert":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Face Recognition</h1>
          <p className="text-muted-foreground">
            Real-time face detection and recognition system
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {currentStatus}
          </Badge>

          {/* Camera Mode Toggle */}
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <Button
              variant={cameraMode === "server" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setCameraMode("server");
                setIsStreaming(false);
                setCurrentStatus("Ready");
              }}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              Physical Cameras
              {cameras.filter(c => c.id.startsWith("CAM-") && c.id !== "CLIENT-CAM").length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {cameras.filter(c => c.id.startsWith("CAM-") && c.id !== "CLIENT-CAM").length}
                </Badge>
              )}
            </Button>
            <Button
              variant={cameraMode === "client" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setCameraMode("client");
                setIsStreaming(false);
                setCurrentStatus("Ready");
              }}
              className="flex items-center gap-2"
            >
              <Smartphone className="h-4 w-4" />
              My Camera
            </Button>
          </div>

          {cameraMode === "server" && (
            <>
              {!isStreaming ? (
                <Button onClick={startStream} className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Start Stream
                </Button>
              ) : (
                <Button onClick={stopStream} variant="destructive" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Stop Stream
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Live Camera Feed
              </CardTitle>
              <CardDescription>
                Real-time video stream with face detection overlay
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cameraMode === "multi" ? (
                <MultiCameraView cameras={cameras.filter(c => c.status === "online")} />
              ) : cameraMode === "server" ? (
                isStreaming ? (
                  // Show all detected physical cameras (CAM-0, CAM-1, etc.)
                  <MultiCameraView cameras={cameras.filter(c => c.id.startsWith("CAM-") && c.id !== "CLIENT-CAM")} />
                ) : (
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <div className="flex items-center justify-center h-full text-white">
                      <div className="text-center">
                        <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">
                          {cameras.filter(c => c.id.startsWith("CAM-") && c.id !== "CLIENT-CAM").length} Physical Camera(s) Detected
                        </p>
                        <p className="text-sm opacity-75">Click "Start Stream" to view all cameras</p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <ClientCameraStream backendUrl={BACKEND_URL} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recognition Logs */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Recent Recognitions
              </CardTitle>
              <CardDescription>
                Latest face recognition results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recognizedFaces.length > 0 ? (
                  recognizedFaces.map((face, index) => (
                    <div key={`${face.id}-${index}`} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{face.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(face.confidence * 100).toFixed(0)}% confidence
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col gap-1">
                          <Badge className={getStatusColor(face.status)}>
                            {face.status}
                          </Badge>
                          {face.entryType && (
                            <Badge
                              variant="outline"
                              className={face.entryType === "entry" ? "bg-green-50 text-green-700 border-green-300" : "bg-blue-50 text-blue-700 border-blue-300"}
                            >
                              {face.entryType === "entry" ? "Entry" : "Exit"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {face.timestamp}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No recognitions yet</p>
                    <p className="text-sm">Face recognitions will appear here when detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Recognized Today</span>
                  <span className="font-medium">{stats.recognized}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Unknown Faces</span>
                  <span className="font-medium">{stats.unknown}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Alerts</span>
                  <span className="font-medium text-red-600">{stats.alerts}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
