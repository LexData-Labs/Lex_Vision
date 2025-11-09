import { useState, useEffect } from "react";
import { Download, Filter, Calendar, Clock, User, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { faceDetectionService, DetectionResult } from "@/services/faceDetectionService";
import { api, AttendanceRecord } from "@/services/api";

export function DetectionLogs() {
  const [logs, setLogs] = useState<DetectionResult[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DetectionResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "entry" | "exit" | "known" | "unknown">("all");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Initial load: merge backend attendance with local detection history if available
    const load = async () => {
      try {
        const attendance = await api.attendance();
        const mapped: DetectionResult[] = attendance.map((a, idx) => ({
          id: `${a.employee_id}-${a.timestamp}-${idx}`,
          name: a.name || 'Unknown Person',
          personId: a.employee_id || undefined,
          confidence: 100,
          type: 'entry',
          location: 'Camera 0',
          timestamp: new Date(a.timestamp),
        }));
        const history = faceDetectionService.getDetectionHistory();
        const combined = [...mapped, ...history];
        setLogs(combined);
        setFilteredLogs(combined);
      } catch {
        const history = faceDetectionService.getDetectionHistory();
        setLogs(history);
        setFilteredLogs(history);
      }
    };
    load();
  }, []);

  // Refresh logs periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const attendance = await api.attendance();
        const mapped: DetectionResult[] = attendance.map((a, idx) => ({
          id: `${a.employee_id}-${a.timestamp}-${idx}`,
          name: a.name || 'Unknown Person',
          personId: a.employee_id || undefined,
          confidence: 100,
          type: 'entry',
          location: 'Camera 0',
          timestamp: new Date(a.timestamp),
        }));
        const history = faceDetectionService.getDetectionHistory();
        const combined = [...mapped, ...history];
        setLogs(combined);
        filterLogs(combined, searchTerm, filterType);
      } catch {
        const history = faceDetectionService.getDetectionHistory();
        setLogs(history);
        filterLogs(history, searchTerm, filterType);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [searchTerm, filterType]);

  const filterLogs = (logsData: DetectionResult[], search: string, filter: string) => {
    let filtered = logsData;

    // Apply search filter
    if (search) {
      filtered = filtered.filter(log => 
        log.name.toLowerCase().includes(search.toLowerCase()) ||
        log.location.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply type filter
    switch (filter) {
      case "entry":
        filtered = filtered.filter(log => log.type === "entry");
        break;
      case "exit":
        filtered = filtered.filter(log => log.type === "exit");
        break;
      case "known":
        filtered = filtered.filter(log => log.personId);
        break;
      case "unknown":
        filtered = filtered.filter(log => !log.personId);
        break;
      default:
        break;
    }

    setFilteredLogs(filtered);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterLogs(logs, value, filterType);
  };

  const handleFilterChange = (value: string) => {
    const filter = value as typeof filterType;
    setFilterType(filter);
    filterLogs(logs, searchTerm, filter);
  };

  const exportLogs = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const exportData = await faceDetectionService.exportDetectionData(format);
      
      // Create and download file
      const blob = new Blob([exportData], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detection-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
    setIsExporting(false);
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  const getPersonSessions = () => {
    const sessions: Record<string, { entries: DetectionResult[], exits: DetectionResult[] }> = {};
    
    logs.forEach(log => {
      if (log.personId) {
        if (!sessions[log.personId]) {
          sessions[log.personId] = { entries: [], exits: [] };
        }
        
        if (log.type === 'entry') {
          sessions[log.personId].entries.push(log);
        } else {
          sessions[log.personId].exits.push(log);
        }
      }
    });

    return sessions;
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Detection Logs & Entry/Exit Times
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => exportLogs('csv')}
                disabled={isExporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => exportLogs('json')}
                disabled={isExporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>
          
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <Select value={filterType} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Detections</SelectItem>
                <SelectItem value="entry">Entries Only</SelectItem>
                <SelectItem value="exit">Exits Only</SelectItem>
                <SelectItem value="known">Known People</SelectItem>
                <SelectItem value="unknown">Unknown People</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Detection Logs Table */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Recent Activity ({filteredLogs.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No detection logs found</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    log.personId
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      log.personId ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {log.personId ? (
                        <User className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.name}</span>
                        <Badge
                          variant={log.type === 'entry' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {log.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.location} • {log.confidence}% confidence
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Person Sessions Summary */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Today's Sessions Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(getPersonSessions()).map(([personId, sessions]) => {
              const person = logs.find(log => log.personId === personId);
              if (!person) return null;

              const lastEntry = sessions.entries[0];
              const lastExit = sessions.exits[0];
              const isCurrentlyInside = !lastExit || (lastEntry && lastEntry.timestamp > lastExit.timestamp);

              return (
                <div
                  key={personId}
                  className={`p-4 rounded-lg border ${
                    isCurrentlyInside ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{person.name}</span>
                    <Badge variant={isCurrentlyInside ? 'default' : 'secondary'}>
                      {isCurrentlyInside ? 'Inside' : 'Outside'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Entries: {sessions.entries.length}</div>
                    <div>Exits: {sessions.exits.length}</div>
                    {lastEntry && (
                      <div>Last entry: {formatTimestamp(lastEntry.timestamp)}</div>
                    )}
                    {lastExit && (
                      <div>Last exit: {formatTimestamp(lastExit.timestamp)}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}