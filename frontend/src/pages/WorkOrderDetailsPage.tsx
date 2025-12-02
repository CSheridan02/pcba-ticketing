import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, Printer, AlertCircle, Clock, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import AAONLogo from '@/assets/SVG/AAON_Digital_AAON_Digital_Blue.svg';

export default function WorkOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isEditTicketOpen, setIsEditTicketOpen] = useState(false);
  const [isDeleteTicketOpen, setIsDeleteTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newTicket, setNewTicket] = useState({
    description: '',
    priority: 'Medium',
    area_id: '',
  });
  const [editTicket, setEditTicket] = useState({
    description: '',
    priority: 'Medium',
    area_id: '',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
      setSelectedImages([]);
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: any }) => 
      api.updateTicket(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      setIsEditTicketOpen(false);
      setSelectedTicket(null);
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: (ticketId: string) => api.deleteTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      setIsDeleteTicketOpen(false);
      setSelectedTicket(null);
    },
  });

  const handleCreateTicket = async () => {
    if (!newTicket.area_id || !newTicket.description) return;
    
    setIsUploading(true);
    try {
      let imageUrls: string[] = [];
      
      // Upload images if any are selected
      if (selectedImages.length > 0) {
        const uploadResult = await api.uploadTicketImages(selectedImages);
        imageUrls = uploadResult.urls;
      }
      
      // Create ticket with image URLs
      createTicketMutation.mutate({
        work_order_id: id!,
        ...newTicket,
        images: imageUrls,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setEditTicket({
      description: ticket.description,
      priority: ticket.priority,
      area_id: ticket.area_id,
    });
    setIsEditTicketOpen(true);
  };

  const handleUpdateTicket = () => {
    if (!selectedTicket || !editTicket.area_id || !editTicket.description) return;
    updateTicketMutation.mutate({
      ticketId: selectedTicket.id,
      data: editTicket,
    });
  };

  const handleDeleteClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setIsDeleteTicketOpen(true);
  };

  const handleDeleteTicket = () => {
    if (!selectedTicket) return;
    deleteTicketMutation.mutate(selectedTicket.id);
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
          .page-break-before {
            page-break-before: always;
          }
          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
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
            <div className="flex items-center justify-between mb-6">
              <img src={AAONLogo} alt="AAON Logo" className="h-12" />
              <div className="text-right text-sm text-gray-600">
                {new Date().toLocaleDateString()}
              </div>
            </div>
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
                      <Textarea
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
                    <div>
                      <Label>Images (Optional)</Label>
                      <ImageUpload
                        onImagesSelected={setSelectedImages}
                        maxFiles={5}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateTicketOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTicket}
                      disabled={createTicketMutation.isPending || isUploading || !newTicket.area_id || !newTicket.description}
                    >
                      {isUploading ? 'Uploading...' : createTicketMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit Ticket Dialog */}
            <Dialog open={isEditTicketOpen} onOpenChange={setIsEditTicketOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Ticket</DialogTitle>
                  <DialogDescription>
                    Update the ticket details.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      placeholder="Describe the issue..."
                      value={editTicket.description}
                      onChange={(e) => setEditTicket({ ...editTicket, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-priority">Priority</Label>
                    <Select
                      value={editTicket.priority}
                      onValueChange={(value) => setEditTicket({ ...editTicket, priority: value })}
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
                    <Label htmlFor="edit-area">Area</Label>
                    <Select
                      value={editTicket.area_id}
                      onValueChange={(value) => setEditTicket({ ...editTicket, area_id: value })}
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
                  <Button variant="outline" onClick={() => setIsEditTicketOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateTicket}
                    disabled={updateTicketMutation.isPending || !editTicket.area_id || !editTicket.description}
                  >
                    {updateTicketMutation.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Ticket Dialog */}
            <Dialog open={isDeleteTicketOpen} onOpenChange={setIsDeleteTicketOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Ticket</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this ticket? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteTicketOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteTicket}
                    disabled={deleteTicketMutation.isPending}
                  >
                    {deleteTicketMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
                      <div className="space-y-3">
                        {/* Header with ticket info and badges */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
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
                          </div>
                          
                          {/* Date and admin actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString()}</span>
                            </div>
                            {profile?.role === 'admin' && (
                              <div className="flex items-center gap-1 print:hidden">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(ticket);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(ticket);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-700">{ticket.description}</p>
                          
                        {/* Image thumbnails */}
                        {ticket.images && ticket.images.length > 0 && (
                          <>
                            {/* Screen view - thumbnails */}
                            <div className="flex flex-wrap gap-2 print:hidden">
                              {ticket.images.map((url: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative group"
                                >
                                  <img
                                    src={url}
                                    alt={`Attachment ${idx + 1}`}
                                    className="h-20 w-20 object-cover rounded border hover:opacity-80 transition-opacity"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                                    <ExternalLink className="h-5 w-5 text-white" />
                                  </div>
                                </a>
                              ))}
                            </div>
                            
                            {/* Print view - figure references */}
                            <div className="hidden print:block text-sm text-gray-600 italic">
                              {ticket.images.length > 1 ? 'See Figures ' : 'See Figure '}
                              {ticket.images.map((_url: string, idx: number) => {
                                const ticketIndex = workOrder.tickets.findIndex((t: any) => t.id === ticket.id);
                                return `${ticketIndex + 1}-${idx + 1}`;
                              }).join(', ')}
                            </div>
                          </>
                        )}

                        {/* Submitted by */}
                        <div className="text-sm text-gray-600">
                          Submitted by: {ticket.submitted_by_user?.full_name || 'Unknown'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Photo Documentation Section - Only visible when printing */}
            {workOrder.tickets?.some((t: any) => t.images && t.images.length > 0) && (
              <div className="hidden print:block mt-12 pt-8 border-t-2 border-gray-300 page-break-before">
                <h2 className="text-xl font-bold mb-6">Photo Documentation</h2>
                <div className="space-y-8">
                  {workOrder.tickets.map((ticket: any, ticketIndex: number) => 
                    ticket.images && ticket.images.length > 0 ? (
                      <div key={ticket.id} className="space-y-4">
                        <h3 className="font-semibold text-gray-700">
                          Ticket {ticket.ticket_number}
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                          {ticket.images.map((url: string, imageIndex: number) => (
                            <div key={imageIndex} className="break-inside-avoid">
                              <div className="border border-gray-300 p-4 bg-white">
                                <img
                                  src={url}
                                  alt={`Figure ${ticketIndex + 1}-${imageIndex + 1}`}
                                  className="w-full max-h-96 object-contain mx-auto"
                                />
                                <p className="text-center text-sm font-medium mt-3 text-gray-700">
                                  Figure {ticketIndex + 1}-{imageIndex + 1}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </Layout>
  );
}

