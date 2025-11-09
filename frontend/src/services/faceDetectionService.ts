import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { api } from '@/services/api';

export interface DetectionResult {
  id: string;
  personId?: string;
  name: string;
  confidence: number;
  timestamp: Date;
  type: 'entry' | 'exit';
  location: string;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FaceModel {
  id: number;
  name: string;
  version: string;
  status: 'active' | 'inactive';
  accuracy: string;
  uploadDate: string;
  modelFile?: File;
}

class FaceDetectionService {
  private activeModel: FaceModel | null = null;
  private loadedModel: blazeface.BlazeFaceModel | tf.GraphModel | null = null;
  private knownFaces: Map<string, string> = new Map();
  private detectionHistory: DetectionResult[] = [];
  private isProcessing = false;
  private modelCache: Map<number, blazeface.BlazeFaceModel | tf.GraphModel> = new Map();

  constructor() {
    // Initialize with some known faces for demo
    this.knownFaces.set('face1', 'John Doe');
    this.knownFaces.set('face2', 'Sarah Smith');
    this.knownFaces.set('face3', 'Mike Johnson');
    this.knownFaces.set('face4', 'Emily Brown');
    this.knownFaces.set('face5', 'David Wilson');
  }

  async setActiveModel(model: FaceModel) {
    this.activeModel = model;
    console.log(`Active model set to: ${model.name} v${model.version}`);
    
    // Load the model when it's set as active
    try {
      this.loadedModel = await this.loadModel(model);
      console.log(`Model ${model.name} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load model ${model.name}:`, error);
      this.loadedModel = null;
    }
  }

  private async loadModel(model: FaceModel): Promise<blazeface.BlazeFaceModel | tf.GraphModel> {
    // Check cache first
    if (this.modelCache.has(model.id)) {
      return this.modelCache.get(model.id)!;
    }

    let loadedModel: blazeface.BlazeFaceModel | tf.GraphModel;

    // Check if this is a custom uploaded model
    if (model.modelFile) {
      try {
        // For uploaded models, try to load as TensorFlow.js model
        const arrayBuffer = await model.modelFile.arrayBuffer();
        const modelBuffer = new Uint8Array(arrayBuffer);
        
        // Create a model from the uploaded file
        // This is a simplified version - actual implementation would depend on model format
        loadedModel = await tf.loadGraphModel(tf.io.fromMemory(modelBuffer));
        console.log(`Loaded custom model: ${model.name}`);
      } catch (error) {
        console.error(`Failed to load custom model ${model.name}, falling back to BlazeFace:`, error);
        // Fall back to default BlazeFace model
        loadedModel = await blazeface.load();
      }
    } else {
      // Use default models based on model name
      if (model.name.toLowerCase().includes('blazeface') || model.name.toLowerCase().includes('yolo')) {
        loadedModel = await blazeface.load();
      } else {
        // Default to BlazeFace for any built-in models
        loadedModel = await blazeface.load();
      }
    }

    // Cache the model
    this.modelCache.set(model.id, loadedModel);
    return loadedModel;
  }

  getActiveModel(): FaceModel | null {
    return this.activeModel;
  }

  async processFrame(
    videoElement: HTMLVideoElement,
    canvas?: HTMLCanvasElement
  ): Promise<DetectionResult[]> {
    if (!this.activeModel || this.activeModel.status !== 'active' || !this.loadedModel) {
      return [];
    }

    try {
      const detections: DetectionResult[] = [];
      
      // Create tensor from video element
      const videoTensor = tf.browser.fromPixels(videoElement);
      
      // Run face detection
      let predictions;
      
      if (this.loadedModel instanceof blazeface.BlazeFaceModel) {
        // Use BlazeFace model
        predictions = await this.loadedModel.estimateFaces(videoElement, false);
      } else {
        // For custom TensorFlow.js models, this would need to be adapted
        // based on the specific model's input/output format
        console.log('Custom model detection not fully implemented yet');
        videoTensor.dispose();
        return [];
      }

      // Process predictions into DetectionResult format
      predictions.forEach((prediction, index) => {
        // BlazeFace returns topLeft and bottomRight coordinates
        const bbox = {
          x: prediction.topLeft[0] as number,
          y: prediction.topLeft[1] as number,
          width: (prediction.bottomRight[0] as number) - (prediction.topLeft[0] as number),
          height: (prediction.bottomRight[1] as number) - (prediction.topLeft[1] as number)
        };

        // For face recognition, we'd need additional processing to identify who the person is
        // For now, we'll simulate this part while using real face detection for bounding boxes
        const isKnown = Math.random() > 0.3; // 70% chance of known face
        const faceId = isKnown ? 
          Array.from(this.knownFaces.keys())[Math.floor(Math.random() * this.knownFaces.size)] :
          null;

        const detection: DetectionResult = {
          id: `${Date.now()}_${index}`,
          personId: faceId,
          name: faceId ? this.knownFaces.get(faceId)! : 'Unknown Person',
          confidence: Math.round((prediction.probability[0] as number) * 100),
          timestamp: new Date(),
          type: Math.random() > 0.5 ? 'entry' : 'exit',
          location: 'Main Entrance',
          bbox: bbox
        };

        detections.push(detection);
      });

      // Draw bounding boxes on canvas if provided
      if (canvas && detections.length > 0) {
        this.drawDetections(canvas, detections);
      }

      // Clean up tensor
      videoTensor.dispose();

      // Store in history
      this.detectionHistory.unshift(...detections);
      
      // Keep only last 100 detections
      if (this.detectionHistory.length > 100) {
        this.detectionHistory = this.detectionHistory.slice(0, 100);
      }

      return detections;
    } catch (error) {
      console.error('Error processing frame:', error);
      return [];
    }
  }

  private drawDetections(canvas: HTMLCanvasElement, detections: DetectionResult[]) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    detections.forEach((detection) => {
      if (!detection.bbox) return;

      const { x, y, width, height } = detection.bbox;
      
      // Draw bounding box
      ctx.strokeStyle = detection.personId ? '#00ff00' : '#ff0000'; // Green for known, red for unknown
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Draw label background
      const label = `${detection.name} (${detection.confidence}%)`;
      ctx.font = '14px Arial';
      const textWidth = ctx.measureText(label).width;
      
      ctx.fillStyle = detection.personId ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
      ctx.fillRect(x, y - 25, textWidth + 10, 25);
      
      // Draw label text
      ctx.fillStyle = 'white';
      ctx.fillText(label, x + 5, y - 8);
    });
  }

  async uploadAndTrainModel(
    name: string,
    version: string,
    modelFile: File
  ): Promise<FaceModel> {
    // Simulate model upload and processing
    const model: FaceModel = {
      id: Date.now(),
      name,
      version,
      status: 'inactive',
      accuracy: 'Processing...',
      uploadDate: new Date().toISOString().split('T')[0],
      modelFile
    };

    // Simulate processing time
    setTimeout(() => {
      model.accuracy = `${Math.floor(Math.random() * 10) + 90}.${Math.floor(Math.random() * 10)}%`;
    }, 3000);

    return model;
  }

  getDetectionHistory(): DetectionResult[] {
    return this.detectionHistory;
  }

  getDetectionStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayDetections = this.detectionHistory.filter(
      d => d.timestamp >= today
    );
    
    const knownDetections = todayDetections.filter(d => d.personId);
    const unknownDetections = todayDetections.filter(d => !d.personId);
    const entries = todayDetections.filter(d => d.type === 'entry');
    const exits = todayDetections.filter(d => d.type === 'exit');

    return {
      total: todayDetections.length,
      known: knownDetections.length,
      unknown: unknownDetections.length,
      entries: entries.length,
      exits: exits.length,
      lastDetection: todayDetections[0]?.timestamp || null
    };
  }

  async exportDetectionData(format: 'csv' | 'json' = 'csv') {
    const data = this.detectionHistory.map(d => ({
      timestamp: d.timestamp.toISOString(),
      name: d.name,
      personId: d.personId || 'unknown',
      confidence: d.confidence,
      type: d.type,
      location: d.location
    }));

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    const headers = ['Timestamp', 'Name', 'Person ID', 'Confidence', 'Type', 'Location'];
    const csvRows = [
      headers.join(','),
      ...data.map(row => [
        row.timestamp,
        `"${row.name}"`,
        row.personId,
        row.confidence,
        row.type,
        `"${row.location}"`
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  // Real-time entry/exit tracking
  async trackPersonMovement(detection: DetectionResult) {
    const person = detection.personId ? this.knownFaces.get(detection.personId) : 'Unknown';
    
    // Log entry/exit with timestamp
    const logEntry = {
      person: person || 'Unknown',
      action: detection.type,
      timestamp: detection.timestamp,
      location: detection.location,
      confidence: detection.confidence
    };

    // This would typically be sent to a backend API
    console.log('Person Movement:', logEntry);
    
    // Send to backend attendance endpoint (best-effort)
    try {
      await api.postAttendance({
        employee_id: detection.personId || 'unknown',
        name: logEntry.person,
        timestamp: detection.timestamp.toISOString(),
      });
    } catch (e) {
      // Non-fatal
    }
    
    return logEntry;
  }

  startProcessing() {
    this.isProcessing = true;
  }

  stopProcessing() {
    this.isProcessing = false;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

export const faceDetectionService = new FaceDetectionService();