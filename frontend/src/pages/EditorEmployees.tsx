import { useState, useEffect } from "react";
import { User, Edit, Trash2, Search, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";

interface Employee {
  id: string;
  name: string;
  role: string;
  has_password: boolean;
  password_reset_required: boolean;
  last_login: string | null;
}

export default function EditorEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    role: "employee" as "employee" | "editor",
  });

  // Fetch employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.employees();
      const employeeList = data.map((emp) => ({
        id: emp.id.trim(),
        name: emp.name.trim(),
        role: emp.role || "employee",
        has_password: emp.has_password,
        password_reset_required: emp.password_reset_required,
        last_login: emp.last_login,
      }));
      setEmployees(employeeList);
      setFilteredEmployees(employeeList);
    } catch (error: any) {
      alert("Failed to fetch employees: " + error.message);
    }
  };

  // Filter employees
  useEffect(() => {
    const filtered = employees.filter((emp) =>
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  // Edit employee
  const handleEditClick = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeId: employee.id,
      name: employee.name,
      role: employee.role as "employee" | "editor",
    });
    setEditDialogOpen(true);
  };

  const handleEditEmployee = async () => {
    if (!editingEmployee) return;

    const trimmedId = formData.employeeId.trim();
    const trimmedName = formData.name.trim();

    if (!trimmedId || !trimmedName) {
      alert("Employee ID and Name are required");
      return;
    }

    try {
      const idChanged = trimmedId !== editingEmployee.id;

      await api.updateEmployee(editingEmployee.id, {
        newEmployeeId: idChanged ? trimmedId : undefined,
        name: trimmedName,
        role: formData.role,
      });

      alert(`Employee ${trimmedId} updated successfully`);
      setEditDialogOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      alert("Failed to update employee: " + error.message);
    }
  };

  // Delete employee
  const deleteEmployee = async (employeeId: string, employeeName: string) => {
    if (window.confirm(`Are you sure you want to delete employee ${employeeId} (${employeeName})?`)) {
      try {
        await api.deleteEmployee(employeeId);
        alert(`Employee ${employeeId} (${employeeName}) deleted successfully`);
        fetchEmployees();
      } catch (error: any) {
        alert("Failed to delete employee: " + error.message);
      }
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground mt-1">View and manage employee information</p>
        </div>
      </div>

      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            All Employees
          </CardTitle>
          <CardDescription>
            Showing {filteredEmployees.length} of {employees.length} employees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Employees Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Employee ID</th>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Role</th>
                    <th className="text-left p-4 font-semibold">Last Login</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{employee.id}</td>
                        <td className="p-4">{employee.name}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            employee.role === "editor"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {employee.role}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {employee.last_login
                            ? new Date(employee.last_login).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(employee)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEmployee(employee.id, employee.name)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
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

      {/* Edit Employee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-employee-id">Employee ID</Label>
              <Input
                id="edit-employee-id"
                className="col-span-3"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="Enter employee ID (numbers only)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter employee name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as "employee" | "editor" })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEmployee}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
