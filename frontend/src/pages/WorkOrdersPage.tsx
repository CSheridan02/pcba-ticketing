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
  });
  const [editWorkOrder, setEditWorkOrder] = useState({
    work_order_number: '',
    asm_number: '',
    description: '',
    quantity: '',
    status: '',
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders', search, statusFilter],
    queryFn: () => api.getWorkOrders(search || undefined, statusFilter || undefined),
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
    createMutation.mutate({
      ...newWorkOrder,
      quantity: parseInt(newWorkOrder.quantity),
    });
  };

  const handleEditClick = (workOrder: any) => {
    setSelectedWorkOrder(workOrder);
    setEditWorkOrder({
      work_order_number: workOrder.work_order_number,
      asm_number: workOrder.asm_number,
      description: workOrder.description,
      quantity: workOrder.quantity.toString(),
      status: workOrder.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateWorkOrder = () => {
    if (selectedWorkOrder) {
      updateMutation.mutate({
        id: selectedWorkOrder.id,
        data: {
          ...editWorkOrder,
          quantity: parseInt(editWorkOrder.quantity),
        },
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Work Orders</h1>
          {profile?.role === 'admin' && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Work Order
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

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Work Orders Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Work Order #</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">ASM #</th>
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
                    <td colSpan={profile?.role === 'admin' ? 8 : 7} className="text-center p-8 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={profile?.role === 'admin' ? 8 : 7} className="text-center p-8 text-gray-500">
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
        </Card>
      </div>
    </Layout>
  );
}

