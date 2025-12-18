import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { Plus, Search, PlayCircle, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function WorkOrdersPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, _setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const [newWorkOrder, setNewWorkOrder] = useState({
    work_order_number: '',
    asm_number: '',
    description: '',
    quantity: '',
    status: 'Not Started',
    serial_number_start: '',
    serial_number_end: '',
  });
  const [editWorkOrder, setEditWorkOrder] = useState({
    work_order_number: '',
    asm_number: '',
    description: '',
    quantity: '',
    status: '',
    serial_number_start: '',
    serial_number_end: '',
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders', search, statusFilter, sortBy],
    queryFn: () => api.getWorkOrders(search || undefined, statusFilter || undefined, sortBy || undefined),
  });

  const { data: activeWorkOrders = [] } = useQuery({
    queryKey: ['active-work-orders'],
    queryFn: () => api.getActiveWorkOrders(),
  });

  const createMutation = useMutation({
    mutationFn: api.createWorkOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-work-orders'] });
      setIsCreateDialogOpen(false);
      setNewWorkOrder({
        work_order_number: '',
        asm_number: '',
        description: '',
        quantity: '',
        status: 'Not Started',
        serial_number_start: '',
        serial_number_end: '',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateWorkOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-work-orders'] });
      setIsEditDialogOpen(false);
      setSelectedWorkOrder(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteWorkOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-work-orders'] });
      setIsDeleteDialogOpen(false);
      setSelectedWorkOrder(null);
    },
  });

  const handleCreateWorkOrder = () => {
    const workOrderData: any = {
      work_order_number: newWorkOrder.work_order_number,
      asm_number: newWorkOrder.asm_number,
      description: newWorkOrder.description,
      quantity: parseInt(newWorkOrder.quantity),
      status: newWorkOrder.status,
    };
    
    // Only include serial numbers if both are provided
    if (newWorkOrder.serial_number_start && newWorkOrder.serial_number_end) {
      workOrderData.serial_number_start = newWorkOrder.serial_number_start;
      workOrderData.serial_number_end = newWorkOrder.serial_number_end;
    }
    
    createMutation.mutate(workOrderData);
  };

  const handleEditClick = (workOrder: any) => {
    setSelectedWorkOrder(workOrder);
    setEditWorkOrder({
      work_order_number: workOrder.work_order_number,
      asm_number: workOrder.asm_number,
      description: workOrder.description,
      quantity: workOrder.quantity.toString(),
      status: workOrder.status,
      serial_number_start: workOrder.serial_number_start || '',
      serial_number_end: workOrder.serial_number_end || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateWorkOrder = () => {
    if (selectedWorkOrder) {
      const updateData: any = {
        asm_number: editWorkOrder.asm_number,
        description: editWorkOrder.description,
        quantity: parseInt(editWorkOrder.quantity),
        status: editWorkOrder.status,
      };
      
      // Include serial numbers if both are provided, or explicitly set to undefined to clear
      if (editWorkOrder.serial_number_start && editWorkOrder.serial_number_end) {
        updateData.serial_number_start = editWorkOrder.serial_number_start;
        updateData.serial_number_end = editWorkOrder.serial_number_end;
      }
      
      updateMutation.mutate({
        id: selectedWorkOrder.id,
        data: updateData,
      });
    }
  };

  const handleDeleteClick = (workOrder: any) => {
    setSelectedWorkOrder(workOrder);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteWorkOrder = () => {
    if (selectedWorkOrder) {
      deleteMutation.mutate(selectedWorkOrder.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'Not Started': 'secondary',
      'Active': 'default',
      'Completed': 'outline',
    };
    const colors: Record<string, string> = {
      'Not Started': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      'Active': 'bg-green-100 text-green-800 hover:bg-green-100',
      'Completed': 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    };
    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Work Orders</h1>
          {profile?.role === 'admin' && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden xs:inline">Create Work Order</span>
                  <span className="xs:hidden">Create</span>
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Work Order</DialogTitle>
                <DialogDescription>
                  Enter the details for the new work order.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="work_order_number">Work Order #</Label>
                  <Input
                    id="work_order_number"
                    placeholder="2356234"
                    value={newWorkOrder.work_order_number}
                    onChange={(e) => setNewWorkOrder({ ...newWorkOrder, work_order_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="asm_number">ASM #</Label>
                  <Input
                    id="asm_number"
                    placeholder="ASM902831"
                    value={newWorkOrder.asm_number}
                    onChange={(e) => setNewWorkOrder({ ...newWorkOrder, asm_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Description of the work order"
                    value={newWorkOrder.description}
                    onChange={(e) => setNewWorkOrder({ ...newWorkOrder, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="300"
                    value={newWorkOrder.quantity}
                    onChange={(e) => setNewWorkOrder({ ...newWorkOrder, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newWorkOrder.status}
                    onValueChange={(value) => setNewWorkOrder({ ...newWorkOrder, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Serial Number Range (Optional) */}
                <div className="border-t pt-4 space-y-4">
                  <div className="text-sm text-gray-600">
                    Serial Number Range (Optional)
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="serial_number_start">Start</Label>
                      <Input
                        id="serial_number_start"
                        placeholder="1234567W"
                        value={newWorkOrder.serial_number_start}
                        onChange={(e) => setNewWorkOrder({ ...newWorkOrder, serial_number_start: e.target.value.toUpperCase() })}
                        maxLength={8}
                      />
                    </div>
                    <div>
                      <Label htmlFor="serial_number_end">End</Label>
                      <Input
                        id="serial_number_end"
                        placeholder="1234890W"
                        value={newWorkOrder.serial_number_end}
                        onChange={(e) => setNewWorkOrder({ ...newWorkOrder, serial_number_end: e.target.value.toUpperCase() })}
                        maxLength={8}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Format: 7 digits + W (e.g., 1234567W - 1234890W)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkOrder} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Edit Work Order Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Work Order</DialogTitle>
              <DialogDescription>
                Update the work order details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_work_order_number">Work Order #</Label>
                <Input
                  id="edit_work_order_number"
                  value={editWorkOrder.work_order_number}
                  onChange={(e) => setEditWorkOrder({ ...editWorkOrder, work_order_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_asm_number">ASM #</Label>
                <Input
                  id="edit_asm_number"
                  value={editWorkOrder.asm_number}
                  onChange={(e) => setEditWorkOrder({ ...editWorkOrder, asm_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_description">Description</Label>
                <Input
                  id="edit_description"
                  value={editWorkOrder.description}
                  onChange={(e) => setEditWorkOrder({ ...editWorkOrder, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_quantity">Quantity</Label>
                <Input
                  id="edit_quantity"
                  type="number"
                  value={editWorkOrder.quantity}
                  onChange={(e) => setEditWorkOrder({ ...editWorkOrder, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select
                  value={editWorkOrder.status}
                  onValueChange={(value) => setEditWorkOrder({ ...editWorkOrder, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Serial Number Range (Optional) */}
              <div className="border-t pt-4 space-y-4">
                <div className="text-sm text-gray-600">
                  Serial Number Range (Optional)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_serial_number_start">Start</Label>
                    <Input
                      id="edit_serial_number_start"
                      placeholder="1234567W"
                      value={editWorkOrder.serial_number_start}
                      onChange={(e) => setEditWorkOrder({ ...editWorkOrder, serial_number_start: e.target.value.toUpperCase() })}
                      maxLength={8}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_serial_number_end">End</Label>
                    <Input
                      id="edit_serial_number_end"
                      placeholder="1234890W"
                      value={editWorkOrder.serial_number_end}
                      onChange={(e) => setEditWorkOrder({ ...editWorkOrder, serial_number_end: e.target.value.toUpperCase() })}
                      maxLength={8}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Format: 7 digits + W (e.g., 1234567W - 1234890W)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateWorkOrder} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Work Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete work order "{selectedWorkOrder?.work_order_number}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteWorkOrder} 
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Active Work Orders Section */}
        {activeWorkOrders.length > 0 && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-green-600" />
                <CardTitle>Active Work Orders ({activeWorkOrders.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeWorkOrders.map((wo: any) => (
                  <Card
                    key={wo.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-primary">
                        {wo.work_order_number}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {wo.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <div>
                        <span className="font-medium">ASM:</span> {wo.asm_number}
                      </div>
                      <div>
                        <span className="font-medium">Qty:</span> {wo.quantity}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search work orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Recent (default)</SelectItem>
                <SelectItem value="serial_number">Serial Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Work Orders Table */}
        <Card>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Work Order #</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">ASM #</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Serial Range</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Description</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Quantity</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Status</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Tickets</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Created</th>
                  {profile?.role === 'admin' && (
                    <th className="text-left p-4 font-medium text-sm text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={profile?.role === 'admin' ? 9 : 8} className="text-center p-8 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={profile?.role === 'admin' ? 9 : 8} className="text-center p-8 text-gray-500">
                      No work orders found
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo: any) => (
                    <tr
                      key={wo.id}
                      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/work-orders/${wo.id}`)}
                    >
                      <td className="p-4">
                        <span className="text-primary font-medium">{wo.work_order_number}</span>
                      </td>
                      <td className="p-4 text-gray-700">{wo.asm_number}</td>
                      <td className="p-4 text-gray-700">
                        {wo.serial_number_start && wo.serial_number_end ? (
                          <span className="text-sm font-mono">
                            {wo.serial_number_start} - {wo.serial_number_end}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-700">{wo.description}</td>
                      <td className="p-4 text-gray-700">{wo.quantity}</td>
                      <td className="p-4">{getStatusBadge(wo.status)}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="font-normal">
                          {wo.tickets?.[0]?.count || 0}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-700">
                        {new Date(wo.created_at).toLocaleDateString()}
                      </td>
                      {profile?.role === 'admin' && (
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(wo);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(wo);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

