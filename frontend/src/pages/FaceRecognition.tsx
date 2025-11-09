import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, User, Clock, AlertCircle } from "lucide-react";

interface FaceRecognitionData {
  id: string;
  name: string;
  confidence: number;
  timestamp: string;
  status: "recognized" | "unknown" | "alert";
}

export default function FaceRecognition() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [recognizedFaces, setRecognizedFaces] = useState<FaceRecognitionData[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("Ready");
  const [stats, setStats] = useState({ recognized: 0, unknown: 0, alerts: 0 });
  const videoRef = useRef<HTMLObjectElement>(null);

  // Fetch real attendance data from backend
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const response = await fetch('http://localhost:8000/attendance');
        const attendanceData = await response.json();
        
        // Convert attendance data to face recognition format
        const faceData: FaceRecognitionData[] = attendanceData.slice(0, 10).map((record: any, index: number) => ({
          id: record.employee_id || `${index}`,
          name: record.name || "Unknown",
          confidence: 0.85 + Math.random() * 0.15, // Simulated confidence
          timestamp: new Date(record.timestamp).toLocaleTimeString(),
          status: record.name && record.name !== "Unknown" ? "recognized" : "unknown"
        }));
        
        setRecognizedFaces(faceData);
        
        // Calculate statistics
        const recognized = faceData.filter(face => face.status === "recognized").length;
        const unknown = faceData.filter(face => face.status === "unknown").length;
        const alerts = faceData.filter(face => face.status === "alert").length;
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
  }, []);

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
      videoRef.current.src = "";
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
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {isStreaming ? (
                  <object
                    ref={videoRef}
                    className="w-full h-full"
                    style={{ 
                      border: 'none',
                      background: '#000'
                    }}
                    type="multipart/x-mixed-replace"
                    data="http://localhost:8000/video_feed"
                  >
                    <p>Video stream not available</p>
                  </object>
                ) : (
                  <div className="flex items-center justify-center h-full text-white">
                    <div className="text-center">
                      <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Camera Offline</p>
                      <p className="text-sm opacity-75">Click Start Stream to begin</p>
                    </div>
                  </div>
                )}
                {isStreaming && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary" className="bg-black/50 text-white">
                      LIVE
                    </Badge>
                  </div>
                )}
              </div>
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
                {recognizedFaces.map((face, index) => (
                  <div key={`${face.id}-${index}`} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{face.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {face.confidence.toFixed(2)}% confidence
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(face.status)}>
                        {face.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {face.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
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
