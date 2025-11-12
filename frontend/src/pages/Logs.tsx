import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Filter, Download, Calendar, User, Camera, AlertTriangle } from "lucide-react";
import { api, AttendanceRecord } from "@/services/api";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  category: "system" | "face_recognition" | "camera" | "user" | "security";
  message: string;
  userId?: string;
  details?: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch real attendance data from backend and convert to logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const attendanceData = await api.attendance();
        
        // Convert attendance records to log entries
        const logEntries: LogEntry[] = attendanceData.map((record: AttendanceRecord, index: number) => {
          const isRecognized = record.name && record.name !== "Unknown";
          const entryTypeText = record.entry_type ? ` (${record.entry_type === "entry" ? "Entry" : "Exit"})` : "";
          const cameraText = record.camera_id ? ` via ${record.camera_id}` : "";

          return {
            id: `${record.employee_id}-${record.timestamp}-${index}`,
            timestamp: record.timestamp,
            level: isRecognized ? "success" : "warning",
            category: "face_recognition",
            message: isRecognized
              ? `Face recognized: ${record.name}${entryTypeText}`
              : `Unknown face detected${entryTypeText}`,
            userId: record.employee_id,
            details: isRecognized
              ? `Employee ${record.name} (ID: ${record.employee_id}) detected${entryTypeText}${cameraText}`
              : `Unrecognized person detected${entryTypeText}${cameraText} at ${new Date(record.timestamp).toLocaleString()}`
          };
        });
        
        // Sort by timestamp (newest first)
        logEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setLogs(logEntries);
        setFilteredLogs(logEntries);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
        // If fetch fails, show empty logs instead of mock data
        setLogs([]);
        setFilteredLogs([]);
      }
    };

    // Fetch logs initially
    fetchLogs();
    
    // Set up polling for real-time updates (every 3 seconds)
    const interval = setInterval(fetchLogs, 3000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply level filter
    if (levelFilter !== "all") {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(log => log.category === categoryFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, levelFilter, categoryFilter]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "success":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "face_recognition":
        return <Camera className="h-4 w-4" />;
      case "camera":
        return <Camera className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      case "security":
        return <AlertTriangle className="h-4 w-4" />;
      case "system":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const exportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Timestamp,Level,Category,Message,User ID,Details\n" +
      filteredLogs.map(log => 
        `${log.timestamp},${log.level},${log.category},${log.message},${log.userId || ""},${log.details || ""}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">
            Monitor system activity, face recognition events, and security alerts
          </p>
        </div>
        <Button onClick={exportLogs} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="face_recognition">Face Recognition</SelectItem>
                <SelectItem value="camera">Camera</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Real-time system logs and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    {getCategoryIcon(log.category)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getLevelColor(log.level)}>
                      {log.level.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {log.category.replace('_', ' ')}
                    </Badge>
                    {log.userId && (
                      <Badge variant="secondary">
                        {log.userId}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="font-medium mb-1">{log.message}</p>
                  {log.details && (
                    <p className="text-sm text-muted-foreground mb-2">{log.details}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      ID: {log.id}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No logs found</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
