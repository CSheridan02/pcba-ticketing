import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Plus, Trash2, Settings as SettingsIcon, Users, Shield, User, Pencil } from 'lucide-react';

export default function SettingsPage() {
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserName, setEditUserName] = useState('');
  const queryClient = useQueryClient();

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.getAreas(),
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  const createAreaMutation = useMutation({
    mutationFn: api.createArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setIsAddAreaOpen(false);
      setNewAreaName('');
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: api.deleteArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { full_name: string } }) =>
      api.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditUserOpen(false);
      setEditingUser(null);
      setEditUserName('');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleAddArea = () => {
    if (!newAreaName.trim()) return;
    createAreaMutation.mutate({ name: newAreaName.trim() });
  };

  const handleDeleteArea = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the area "${name}"?`)) {
      deleteAreaMutation.mutate(id);
    }
  };

  const handleRoleChange = (userId: string, newRole: string, userName: string) => {
    const roleLabel = newRole === 'admin' ? 'Administrator' : 'Line Operator';
    if (window.confirm(`Are you sure you want to change ${userName}'s role to ${roleLabel}?`)) {
      updateUserRoleMutation.mutate({ userId, role: newRole });
    }
  };

  const handleEditUserClick = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.full_name);
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editUserName.trim() || !editingUser) return;
    updateUserMutation.mutate({
      userId: editingUser.id,
      data: { full_name: editUserName.trim() },
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>User Management</CardTitle>
            </div>
            <CardDescription>
              Manage user roles and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="text-center py-4 text-gray-500">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        user.role === 'admin' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {user.role === 'admin' ? (
                          <Shield className="h-5 w-5 text-blue-600" />
                        ) : (
                          <User className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.full_name}</div>
                        <div className="text-sm text-gray-500 truncate">{user.email || 'No email'}</div>
                      </div>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={user.role === 'admin' ? 'bg-blue-600' : ''}
                      >
                        {user.role === 'admin' ? 'Administrator' : 'Line Operator'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value, user.full_name)}
                        disabled={updateUserRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line_operator">Line Operator</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUserClick(user)}
                        disabled={updateUserMutation.isPending}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user.id, user.full_name)}
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Admin Note:</strong> Administrators have full access to create/edit/delete work orders and tickets, and can manage settings. Line Operators can create tickets and edit their own tickets only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editUserName">Full Name</Label>
                <Input
                  id="editUserName"
                  placeholder="Enter full name"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateUser();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={updateUserMutation.isPending || !editUserName.trim()}
              >
                {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Area Management */}
        <Card>
          <CardHeader>
            <CardTitle>Area Management</CardTitle>
            <CardDescription>
              Configure areas that can be assigned to tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : areas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No areas configured yet</p>
                  <p className="text-sm">Add an area to get started</p>
                </div>
              ) : (
                areas.map((area: any) => (
                  <div
                    key={area.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium">{area.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteArea(area.id, area.name)}
                      disabled={deleteAreaMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <Dialog open={isAddAreaOpen} onOpenChange={setIsAddAreaOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Area
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Area</DialogTitle>
                  <DialogDescription>
                    Enter the name of the new area.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="areaName">Area Name</Label>
                    <Input
                      id="areaName"
                      placeholder="e.g., Assembly, Quality Control"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddArea();
                        }
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddAreaOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddArea}
                    disabled={createAreaMutation.isPending || !newAreaName.trim()}
                  >
                    {createAreaMutation.isPending ? 'Adding...' : 'Add Area'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Admin Note:</strong> Areas added here will be available for selection when creating tickets. Make sure to configure all the areas your team needs before line operators start creating tickets.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

