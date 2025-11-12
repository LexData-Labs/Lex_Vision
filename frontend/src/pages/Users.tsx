import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users as UsersIcon, UserPlus, Search, Filter, Edit, Trash2, Shield, User, Camera, Settings } from "lucide-react";
import { api } from "@/services/api";

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
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form state for Add/Edit User
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "employee" as "administrator" | "employee" | "viewer",
    department: "",
  });
  // Add Employee form (backend requires id and name)
  const [newEmployee, setNewEmployee] = useState({ id: "", name: "" });
  const [newEmployeeFile, setNewEmployeeFile] = useState<File | null>(null);

  // Load employees from backend (no mock users)
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employees = await api.employees();
        // Map minimal backend employee -> UI User with sensible defaults
        const mapped: User[] = employees.map((e) => ({
          id: e.id,
          username: e.name || e.id,
          email: "",
          role: "employee",
          status: "active",
          createdAt: new Date().toISOString(),
          permissions: [],
          department: undefined,
          faceRegistered: false,
        }));
        setUsers(mapped);
        setFilteredUsers(mapped);
      } catch {
        // On failure, show empty list (no mock data)
        setUsers([]);
        setFilteredUsers([]);
      }
    };
    loadEmployees();
  }, []);

  const syncFromFaces = async () => {
    try {
      await api.reloadEmployees();
      const employees = await api.employees();
      const mapped: User[] = employees.map((e) => ({
        id: e.id,
        username: e.name || e.id,
        email: "",
        role: "employee",
        status: "active",
        createdAt: new Date().toISOString(),
        permissions: [],
        department: undefined,
        faceRegistered: false,
      }));
      setUsers(mapped);
      setFilteredUsers(mapped);
    } catch {
      alert("Failed to sync employees from faces");
    }
  };

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
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  const handleAddUser = async () => {
    if (!newEmployee.id || !newEmployee.name || !newEmployeeFile) {
      alert("Please provide Employee ID, Name, and a face image");
      return;
    }
    try {
      await api.uploadEmployee({ id: newEmployee.id, name: newEmployee.name, file: newEmployeeFile });
      // Reload employees from backend
      const employees = await api.employees();
      const mapped: User[] = employees.map((e) => ({
        id: e.id,
        username: e.name || e.id,
        email: "",
        role: "employee",
        status: "active",
        createdAt: new Date().toISOString(),
        permissions: [],
        department: undefined,
        faceRegistered: false,
      }));
      setUsers(mapped);
      setFilteredUsers(mapped);
      setNewEmployee({ id: "", name: "" });
      setNewEmployeeFile(null);
      setIsAddUserOpen(false);
    } catch (e) {
      alert((e as Error).message || "Failed to add employee");
    }
  };

  const handleEditUser = () => {
    if (!editingUser || !formData.username || !formData.email) {
      alert("Please fill in all required fields");
      return;
    }

    setUsers(prev =>
      prev.map(user =>
        user.id === editingUser.id
          ? {
              ...user,
              username: formData.username,
              email: formData.email,
              role: formData.role,
              department: formData.department || undefined,
              permissions: formData.role === "administrator" ? ["all"] : ["view_cameras", "view_logs"],
            }
          : user
      )
    );

    setFormData({ username: "", email: "", role: "employee", department: "" });
    setEditingUser(null);
    setIsEditUserOpen(false);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department || "",
    });
    setIsEditUserOpen(true);
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
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Create a new employee in the system (ID and Name are required)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emp-id" className="text-right">Employee ID</Label>
                <Input id="emp-id" className="col-span-3" value={newEmployee.id} onChange={(e) => setNewEmployee({ ...newEmployee, id: e.target.value })} placeholder="e.g. 800001" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emp-name" className="text-right">Name</Label>
                <Input id="emp-name" className="col-span-3" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} placeholder="e.g. John Doe" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emp-file" className="text-right">Face Image</Label>
                <Input
                  id="emp-file"
                  type="file"
                  accept="image/*"
                  className="col-span-3"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setNewEmployeeFile(file);
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddUserOpen(false);
                  setNewEmployee({ id: "", name: "" });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddUser}>
                Add Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={syncFromFaces}>
          Sync from Faces
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <UsersIcon className="h-4 w-4 text-blue-600" />
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
                    onClick={() => openEditDialog(user)}
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
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No users found</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">Username</Label>
              <Input
                id="edit-username"
                className="col-span-3"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input
                id="edit-email"
                type="email"
                className="col-span-3"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as any })}
              >
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-department" className="text-right">Department</Label>
              <Input
                id="edit-department"
                className="col-span-3"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Enter department (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditUserOpen(false);
                setEditingUser(null);
                setFormData({ username: "", email: "", role: "employee", department: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
