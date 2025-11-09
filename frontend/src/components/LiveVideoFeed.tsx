import { useState, useRef, useEffect } from "react";
import { Camera, CameraOff, Play, Square, Users, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { faceDetectionService, DetectionResult } from "@/services/faceDetectionService";

export function LiveVideoFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [error, setError] = useState<string>("");
  const [stats, setStats] = useState({
    totalDetections: 0,
    knownFaces: 0,
    unknownFaces: 0
  });
  const [activeModel, setActiveModel] = useState(faceDetectionService.getActiveModel());

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setError("");
      }
    } catch (err) {
      setError("Failed to access camera. Please check permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setIsProcessing(false);
  };

  const toggleProcessing = async () => {
    if (isProcessing) {
      faceDetectionService.stopProcessing();
      setIsProcessing(false);
    } else {
      if (!activeModel || activeModel.status !== 'active') {
        setError("No active model selected. Please activate a model in Settings.");
        return;
      }
      faceDetectionService.startProcessing();
      setIsProcessing(true);
      setError("");
    }
  };

  // Real face detection processing using the service
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isProcessing && isStreaming && videoRef.current) {
      interval = setInterval(async () => {
        try {
          const newDetections = await faceDetectionService.processFrame(
            videoRef.current!,
            canvasRef.current || undefined
          );
          
          if (newDetections.length > 0) {
            setDetections(prev => [...newDetections, ...prev.slice(0, 9)]);
            
            // Update stats
            const detectionStats = faceDetectionService.getDetectionStats();
            setStats({
              totalDetections: detectionStats.total,
              knownFaces: detectionStats.known,
              unknownFaces: detectionStats.unknown
            });

            // Track each detection for entry/exit logging
            newDetections.forEach(detection => {
              faceDetectionService.trackPersonMovement(detection);
            });
          }
        } catch (error) {
          console.error('Detection processing error:', error);
        }
      }, 1500); // Process every 1.5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, isStreaming]);

  // Draw bounding boxes on canvas
  useEffect(() => {
    if (canvasRef.current && videoRef.current && detections.length > 0) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw latest detection bbox
        const latestDetection = detections[0];
        if (latestDetection?.bbox) {
          ctx.strokeStyle = latestDetection.name === 'Unknown Person' ? '#ef4444' : '#22c55e';
          ctx.lineWidth = 3;
          ctx.strokeRect(
            latestDetection.bbox.x,
            latestDetection.bbox.y,
            latestDetection.bbox.width,
            latestDetection.bbox.height
          );
          
          // Draw name label
          ctx.fillStyle = latestDetection.name === 'Unknown Person' ? '#ef4444' : '#22c55e';
          ctx.fillRect(
            latestDetection.bbox.x,
            latestDetection.bbox.y - 30,
            latestDetection.bbox.width,
            30
          );
          
          ctx.fillStyle = 'white';
          ctx.font = '14px Arial';
          ctx.fillText(
            `${latestDetection.name} (${latestDetection.confidence}%)`,
            latestDetection.bbox.x + 5,
            latestDetection.bbox.y - 10
          );
        }
      }
    }
  }, [detections]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Video Feed */}
      <div className="lg:col-span-2">
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Live Video Feed
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={isStreaming ? "destructive" : "default"}
                  onClick={isStreaming ? stopCamera : startCamera}
                  className="gap-2"
                >
                  {isStreaming ? (
                    <>
                      <CameraOff className="h-4 w-4" />
                      Stop Camera
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      Start Camera
                    </>
                  )}
                </Button>
                
                {isStreaming && (
                  <Button
                    variant={isProcessing ? "secondary" : "default"}
                    onClick={toggleProcessing}
                    className="gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Square className="h-4 w-4" />
                        Stop Detection
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Start Detection
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="relative">
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}
              
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
                
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Camera feed will appear here</p>
                    </div>
                  </div>
                )}
              </div>
              
              {isProcessing && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-red-600 text-white animate-pulse">
                    ● LIVE DETECTION
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Detection Results */}
      <div className="space-y-4">
        {/* Statistics */}
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Detection Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Detections</span>
              <span className="font-semibold">{stats.totalDetections}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Known Faces</span>
              <span className="font-semibold text-green-600">{stats.knownFaces}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Unknown Faces</span>
              <span className="font-semibold text-red-600">{stats.unknownFaces}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Detections */}
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Recent Detections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {detections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No detections yet. Start detection to see results.
                </p>
              ) : (
                detections.map((detection) => (
                  <div
                    key={detection.id}
                    className={`p-3 rounded-lg border ${
                      detection.name === 'Unknown Person' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{detection.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {detection.confidence}% confidence • {detection.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {detection.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge 
                        variant={detection.type === 'entry' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {detection.type}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}