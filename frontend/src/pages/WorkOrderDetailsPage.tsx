import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, Printer, AlertCircle, Clock } from 'lucide-react';

export default function WorkOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    description: '',
    priority: 'Medium',
    area_id: '',
  });

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => api.getWorkOrder(id!),
    enabled: !!id,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.getAreas(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => api.updateWorkOrder(id!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-work-orders'] });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: api.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      setIsCreateTicketOpen(false);
      setNewTicket({
        description: '',
        priority: 'Medium',
        area_id: '',
      });
    },
  });

  const handleCreateTicket = () => {
    if (!newTicket.area_id || !newTicket.description) return;
    createTicketMutation.mutate({
      work_order_id: id!,
      ...newTicket,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!workOrder) {
    return (
      <Layout>
        <div className="text-center">
          <h2 className="text-2xl font-bold">Work Order Not Found</h2>
        </div>
      </Layout>
    );
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-gray-100 text-gray-800',
    };
    return colors[priority] || colors['Medium'];
  };

  return (
    <Layout>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #tickets-print-section,
          #tickets-print-section * {
            visibility: visible;
          }
          #tickets-print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
      <div className="space-y-6 print:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => navigate('/work-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Tickets
          </Button>
        </div>

        {/* Work Order Details */}
        <Card className="print:hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">Work Order Details</h1>
                <p className="text-gray-500 mt-1">
                  Created {new Date(workOrder.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Work Order #</h3>
                <p className="text-lg font-semibold">{workOrder.work_order_number}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">ASM #</h3>
                <p className="text-lg font-semibold">{workOrder.asm_number}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-base">{workOrder.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Quantity</h3>
                <p className="text-lg font-semibold">{workOrder.quantity}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <div className="print:hidden">
                  <Select
                    value={workOrder.status}
                    onValueChange={(value) => updateStatusMutation.mutate(value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="hidden print:block">
                  <p className="text-lg font-semibold">{workOrder.status}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Section */}
        <div id="tickets-print-section">
          {/* Print Header - Only visible when printing */}
          <div className="hidden print:block mb-8 px-4">
            <h1 className="text-2xl font-bold mb-2">Work Order: {workOrder.work_order_number}</h1>
            <p className="text-gray-600">ASM #: {workOrder.asm_number}</p>
            <p className="text-gray-600 mb-4">{workOrder.description}</p>
            <div className="border-b-2 border-gray-300 mb-4"></div>
          </div>

          <Card className="print:shadow-none print:border-0">
            <CardContent className="p-6 print:px-4 print:py-6">
              <div className="flex items-center justify-between mb-6 print:mb-8">
                <h2 className="text-2xl font-bold print:text-xl">
                  Tickets ({workOrder.tickets?.length || 0})
                </h2>
              <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
                <DialogTrigger asChild>
                  <Button className="print:hidden">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Ticket</DialogTitle>
                    <DialogDescription>
                      Report an issue with this work order.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="Describe the issue..."
                        value={newTicket.description}
                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={newTicket.priority}
                        onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="area">Area</Label>
                      <Select
                        value={newTicket.area_id}
                        onValueChange={(value) => setNewTicket({ ...newTicket, area_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an area" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.map((area: any) => (
                            <SelectItem key={area.id} value={area.id}>
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateTicketOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTicket}
                      disabled={createTicketMutation.isPending || !newTicket.area_id || !newTicket.description}
                    >
                      {createTicketMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {(!workOrder.tickets || workOrder.tickets.length === 0) ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg font-medium mb-1">No tickets yet</h3>
                <p className="text-sm">Create a ticket to report an issue with this work order</p>
              </div>
            ) : (
              <div className="space-y-4 print:space-y-6 print:px-2">
                {workOrder.tickets.map((ticket: any) => (
                  <Card key={ticket.id} className="border-l-4 border-l-primary print:shadow-none print:border print:border-gray-400 print:page-break-inside-avoid print:mb-4">
                    <CardContent className="p-4 print:p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm font-medium">
                              {ticket.ticket_number}
                            </span>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {ticket.area?.name}
                            </Badge>
                          </div>
                          <p className="text-gray-700">{ticket.description}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 ml-4">
                          <Clock className="h-4 w-4" />
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Submitted by: {ticket.submitted_by_user?.full_name || 'Unknown'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </Layout>
  );
}

