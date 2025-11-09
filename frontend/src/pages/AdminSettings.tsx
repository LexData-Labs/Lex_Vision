import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Brain, Upload } from "lucide-react";
import { faceDetectionService, FaceModel } from "@/services/faceDetectionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Save models to localStorage whenever models change
  useEffect(() => {
    localStorage.setItem('lex-vision-models', JSON.stringify(models));
  }, [models]);

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

        <TabsContent value="system">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">System configuration options coming soon...</p>
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