import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Filter, Download, Calendar, Clock } from "lucide-react";
import { api, AttendanceRecord } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface LogEntry {
  id: string;
  timestamp: string;
  entry_type?: "entry" | "exit" | null;
  camera_id?: string;
}

export default function MyLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("all");

  // Fetch employee's own attendance logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const attendanceData = await api.attendance();

        // Filter to show only current employee's logs
        const myLogs = attendanceData
          .filter((record: AttendanceRecord) => record.employee_id === user?.employee_id)
          .map((record: AttendanceRecord, index: number) => ({
            id: `${record.employee_id}-${record.timestamp}-${index}`,
            timestamp: record.timestamp,
            entry_type: record.entry_type,
            camera_id: record.camera_id,
          }));

        // Sort by timestamp (newest first)
        myLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setLogs(myLogs);
        setFilteredLogs(myLogs);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
        setLogs([]);
        setFilteredLogs([]);
      }
    };

    fetchLogs();

    // Set up polling for real-time updates (every 5 seconds)
    const interval = setInterval(fetchLogs, 5000);

    return () => clearInterval(interval);
  }, [user?.employee_id]);

  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.timestamp.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.camera_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply entry type filter
    if (entryTypeFilter !== "all") {
      filtered = filtered.filter(log => log.entry_type === entryTypeFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, entryTypeFilter]);

  const getEntryTypeBadge = (type?: "entry" | "exit" | null) => {
    if (!type) return <Badge variant="outline">Unknown</Badge>;
    if (type === "entry") return <Badge className="bg-green-100 text-green-800 border-green-300">Entry</Badge>;
    return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Exit</Badge>;
  };

  const handleExport = () => {
    const csv = [
      ["Timestamp", "Type", "Camera"],
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.entry_type || "Unknown",
        log.camera_id || "N/A"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-attendance-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Attendance Logs</h1>
          <p className="text-muted-foreground mt-1">View your attendance history and records</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Attendance Records
          </CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by date or camera..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="entry">Entry Only</SelectItem>
                <SelectItem value="exit">Exit Only</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => { setSearchTerm(""); setEntryTypeFilter("all"); }}>
              Clear Filters
            </Button>
          </div>

          {/* Logs Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Timestamp
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Type
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold">Camera</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-muted-foreground">
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="p-4">
                          {getEntryTypeBadge(log.entry_type)}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {log.camera_id || "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
