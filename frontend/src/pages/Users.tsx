import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Search, Filter, Edit, Trash2, Shield, User, Camera, Settings } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: "administrator" | "employee" | "viewer";
  status: "active" | "inactive" | "suspended";
  lastLogin?: string;
  createdAt: string;
  permissions: string[];
  department?: string;
  faceRegistered: boolean;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockUsers: User[] = [
      {
        id: "1",
        username: "admin",
        email: "admin@company.com",
        role: "administrator",
        status: "active",
        lastLogin: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        permissions: ["all"],
        department: "IT",
        faceRegistered: true
      },
      {
        id: "2",
        username: "john.doe",
        email: "john.doe@company.com",
        role: "employee",
        status: "active",
        lastLogin: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        permissions: ["view_cameras", "view_logs"],
        department: "Engineering",
        faceRegistered: true
      },
      {
        id: "3",
        username: "jane.smith",
        email: "jane.smith@company.com",
        role: "employee",
        status: "active",
        lastLogin: new Date(Date.now() - 7200000).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        permissions: ["view_cameras", "view_logs"],
        department: "Marketing",
        faceRegistered: false
      },
      {
        id: "4",
        username: "bob.wilson",
        email: "bob.wilson@company.com",
        role: "viewer",
        status: "inactive",
        lastLogin: new Date(Date.now() - 86400000 * 7).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
        permissions: ["view_cameras"],
        department: "Security",
        faceRegistered: true
      },
      {
        id: "5",
        username: "alice.johnson",
        email: "alice.johnson@company.com",
        role: "employee",
        status: "suspended",
        lastLogin: new Date(Date.now() - 86400000 * 3).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        permissions: ["view_cameras"],
        department: "HR",
        faceRegistered: false
      }
    ];
    setUsers(mockUsers);
    setFilteredUsers(mockUsers);
  }, []);

  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "administrator":
        return <Shield className="h-4 w-4" />;
      case "employee":
        return <User className="h-4 w-4" />;
      case "viewer":
        return <Camera className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "administrator":
        return "bg-purple-100 text-purple-800";
      case "employee":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPermissionsText = (permissions: string[]) => {
    if (permissions.includes("all")) return "All Permissions";
    return permissions.map(p => p.replace('_', ' ')).join(", ");
  };

  const toggleUserStatus = (userId: string, newStatus: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus as any } : user
    ));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  const getActiveUsersCount = () => users.filter(user => user.status === "active").length;
  const getAdministratorsCount = () => users.filter(user => user.role === "administrator").length;
  const getFaceRegisteredCount = () => users.filter(user => user.faceRegistered).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users, roles, and permissions
          </p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with appropriate permissions
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">Username</Label>
                <Input id="username" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddUserOpen(false)}>
                Add User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getActiveUsersCount()}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getAdministratorsCount()}</p>
                <p className="text-sm text-muted-foreground">Administrators</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Camera className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getFaceRegisteredCount()}</p>
                <p className="text-sm text-muted-foreground">Face Registered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="administrator">Administrator</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {filteredUsers.length} of {users.length} users
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                                         <div className="flex items-center gap-2 mb-1">
                       <h3 className="font-semibold text-lg">{user.username}</h3>
                       <Badge className={getRoleColor(user.role)}>
                         <div className="flex items-center gap-1">
                           {getRoleIcon(user.role)}
                           {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                         </div>
                       </Badge>
                       <Badge className={getStatusColor(user.status)}>
                         {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                       </Badge>
                       {user.faceRegistered && (
                         <Badge variant="outline" className="flex items-center gap-1">
                           <Camera className="h-3 w-3" />
                           Face Registered
                         </Badge>
                       )}
                     </div>
                    
                    <p className="text-muted-foreground mb-1">{user.email}</p>
                    {user.department && (
                      <p className="text-sm text-muted-foreground mb-1">Department: {user.department}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Permissions: {getPermissionsText(user.permissions)}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                      {user.lastLogin && (
                        <span>Last Login: {new Date(user.lastLogin).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingUser(user)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {user.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserStatus(user.id, "suspended")}
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserStatus(user.id, "active")}
                    >
                      Activate
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteUser(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No users found</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
