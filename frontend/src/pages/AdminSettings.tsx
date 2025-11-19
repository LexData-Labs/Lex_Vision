import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Brain, Upload, Camera, Save } from "lucide-react";
import { faceDetectionService, FaceModel } from "@/services/faceDetectionService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, CameraConfig } from "@/services/api";

const DEFAULT_MODELS: FaceModel[] = [
  {
    id: 1,
    name: "YOLOv8 Face Detection",
    version: "v1.2.3",
    status: "active",
    accuracy: "94.2%",
    uploadDate: "2024-01-15"
  },
  {
    id: 2,
    name: "RetinaFace Model",
    version: "v2.1.0",
    status: "inactive",
    accuracy: "91.8%",
    uploadDate: "2024-01-10"
  }
];

export default function AdminSettings() {
  const [models, setModels] = useState<FaceModel[]>(() => {
    const savedModels = localStorage.getItem('lex-vision-models');
    return savedModels ? JSON.parse(savedModels) : DEFAULT_MODELS;
  });

  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Save models to localStorage whenever models change
  useEffect(() => {
    localStorage.setItem('lex-vision-models', JSON.stringify(models));
  }, [models]);

  // Fetch cameras from backend
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        console.log('Fetching cameras from API...');
        const camerasData = await api.cameras();
        console.log('Fetched cameras:', camerasData);
        console.log('Number of cameras:', camerasData?.length);

        if (Array.isArray(camerasData)) {
          setCameras(camerasData);
          setCameraError(null);
          console.log('Cameras state updated successfully');
        } else {
          console.error('API returned non-array data:', camerasData);
          setCameras([]);
          setCameraError('Invalid data format received from server');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Failed to fetch cameras:', error);
        console.error('Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack
        });
        setCameras([]);
        setCameraError(`Failed to fetch cameras: ${errorMsg}`);
      }
    };

    // Fetch initially
    fetchCameras();

    // Poll for camera updates every 5 seconds (faster to show auto-detected cameras)
    const interval = setInterval(fetchCameras, 5000);

    return () => clearInterval(interval);
  }, []);

  // Set the active model on component mount
  useEffect(() => {
    const activeModel = models.find(m => m.status === 'active');
    if (activeModel) {
      faceDetectionService.setActiveModel(activeModel).catch(error => {
        console.error('Failed to set active model:', error);
      });
    }
  }, [models]);

  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [newModel, setNewModel] = useState({
    name: "",
    version: "",
    file: null as File | null
  });

  const handleAddModel = async () => {
    if (newModel.name && newModel.version && newModel.file) {
      try {
        const model = await faceDetectionService.uploadAndTrainModel(
          newModel.name,
          newModel.version,
          newModel.file
        );
        
        // Ensure unique ID by finding the highest existing ID
        const maxId = Math.max(...models.map(m => m.id), 0);
        const modelWithId = { ...model, id: maxId + 1 };
        
        setModels([...models, modelWithId]);
        setNewModel({ name: "", version: "", file: null });
        setIsAddModelOpen(false);
      } catch (error) {
        console.error('Error uploading model:', error);
      }
    }
  };

  const toggleModelStatus = (id: number) => {
    const updatedModels = models.map(model => {
      if (model.id === id) {
        const newStatus = model.status === "active" ? "inactive" : "active";
        const updatedModel = { ...model, status: newStatus };
        
        // Set as active model in service if activating
        if (newStatus === "active") {
          // Deactivate all other models
          models.forEach(m => {
            if (m.id !== id && m.status === "active") {
              m.status = "inactive";
            }
          });
          faceDetectionService.setActiveModel(updatedModel).catch(error => {
            console.error('Failed to activate model:', error);
          });
        }
        
        return updatedModel;
      }
      return model.id !== id || model.status !== "active" ? model : { ...model, status: "inactive" };
    });
    
    setModels(updatedModels);
  };

  const deleteModel = (id: number) => {
    setModels(models.filter(model => model.id !== id));
  };

  const updateCameraRole = async (cameraId: string, role: "entry" | "exit" | "live" | "background-entry" | "background-exit" | "none") => {
    try {
      // Update on backend
      await api.updateCamera(cameraId, role);

      // Update local state
      setCameras(prev => prev.map(cam =>
        cam.id === cameraId ? { ...cam, role } : cam
      ));

      console.log(`Camera ${cameraId} role updated to ${role}`);
    } catch (error) {
      console.error('Failed to update camera role:', error);
      alert("Failed to update camera role. Please try again.");
    }
  };

  const saveCameraSettings = () => {
    // Settings are saved in real-time via updateCameraRole
    alert("Camera settings are automatically saved!");
  };

  const getCameraRoleBadge = (role: string) => {
    switch (role) {
      case "entry":
        return <Badge className="bg-green-500">Entry</Badge>;
      case "exit":
        return <Badge className="bg-blue-500">Exit</Badge>;
      case "live":
        return <Badge className="bg-purple-500">Live View</Badge>;
      case "background-entry":
        return <Badge className="bg-orange-500">Background Entry</Badge>;
      case "background-exit":
        return <Badge className="bg-amber-500">Background Exit</Badge>;
      default:
        return <Badge variant="secondary">Not Assigned</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
      </div>

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Model Management
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage face recognition models and their configurations
                </p>
              </div>
              
              <Dialog open={isAddModelOpen} onOpenChange={setIsAddModelOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Model
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New AI Model</DialogTitle>
                    <DialogDescription>
                      Upload a new face recognition model to the system
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="model-name">Model Name</Label>
                      <Input
                        id="model-name"
                        placeholder="Enter model name"
                        value={newModel.name}
                        onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="model-version">Version</Label>
                      <Input
                        id="model-version"
                        placeholder="e.g., v1.0.0"
                        value={newModel.version}
                        onChange={(e) => setNewModel({ ...newModel, version: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="model-file">Model File</Label>
                      <div className="mt-2">
                        <Input
                          id="model-file"
                          type="file"
                          accept=".h5,.pb,.onnx,.pt"
                          onChange={(e) => setNewModel({ ...newModel, file: e.target.files?.[0] || null })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddModelOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddModel}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Model
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <Brain className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{model.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Version {model.version} • Accuracy: {model.accuracy}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {model.uploadDate}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={model.status === "active" ? "default" : "secondary"}
                        className={model.status === "active" ? "bg-primary text-primary-foreground" : ""}
                      >
                        {model.status}
                      </Badge>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleModelStatus(model.id)}
                        >
                          {model.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteModel(model.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Camera Configuration
                </CardTitle>
                <CardDescription className="mt-1">
                  Configure camera roles for entry and exit monitoring. Cameras are automatically detected on startup.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      const result = await api.discoverCameras();
                      alert(`Found ${result.cameras.length} available cameras!`);
                      // Refresh camera list
                      const camerasData = await api.cameras();
                      setCameras(camerasData);
                    } catch (error) {
                      console.error('Failed to discover cameras:', error);
                      alert("Failed to discover cameras");
                    }
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Re-scan Cameras
                </Button>
                <Button onClick={saveCameraSettings} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cameraError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{cameraError}</p>
                    <p className="text-xs text-red-500 dark:text-red-500 mt-1">Check browser console (F12) for more details</p>
                  </div>
                )}
                {cameras.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No cameras detected</p>
                    <p className="text-sm">Cameras will appear here when they are active</p>
                    {!cameraError && (
                      <p className="text-xs mt-2">Backend API: http://localhost:8000/cameras</p>
                    )}
                  </div>
                ) : (
                  cameras.map((camera) => (
                  <div
                    key={camera.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{camera.name}</h3>
                          {getCameraRoleBadge(camera.role)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Camera ID: {camera.id}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${camera.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-xs text-muted-foreground">
                            {camera.status === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-48">
                        <Label htmlFor={`camera-${camera.id}`} className="text-xs text-muted-foreground mb-1">
                          Camera Role
                        </Label>
                        <Select
                          value={camera.role}
                          onValueChange={(value) => updateCameraRole(camera.id, value as "entry" | "exit" | "live" | "background-entry" | "background-exit" | "none")}
                        >
                          <SelectTrigger id={`camera-${camera.id}`}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not Assigned</SelectItem>
                            <SelectItem value="entry">Entry Camera (with boxes)</SelectItem>
                            <SelectItem value="exit">Exit Camera (with boxes)</SelectItem>
                            <SelectItem value="background-entry">Background Entry (clean video)</SelectItem>
                            <SelectItem value="background-exit">Background Exit (clean video)</SelectItem>
                            <SelectItem value="live">Live View (No Detection)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-blue-600" />
                  Camera Role Information
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Entry Camera:</strong> Monitors people entering - shows detection boxes on video and logs as entry</li>
                  <li>• <strong>Exit Camera:</strong> Monitors people leaving - shows detection boxes on video and logs as exit</li>
                  <li>• <strong>Background Entry:</strong> Clean video with silent detection - logs as entry without showing boxes (smooth video)</li>
                  <li>• <strong>Background Exit:</strong> Clean video with silent detection - logs as exit without showing boxes (smooth video)</li>
                  <li>• <strong>Live View:</strong> Shows raw video feed without AI detection or attendance tracking</li>
                  <li>• <strong>Not Assigned:</strong> Camera is active but not assigned to entry/exit tracking</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Security configuration options coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}