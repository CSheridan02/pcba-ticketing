import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ImageUpload';
import { RichTextEditor } from '@/components/RichTextEditor';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, Printer, AlertCircle, Clock, ExternalLink, Pencil, Trash2, X } from 'lucide-react';
import AAONLogo from '@/assets/SVG/AAON_Digital_AAON_Digital_Blue.svg';

export default function WorkOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isEditTicketOpen, setIsEditTicketOpen] = useState(false);
  const [isDeleteTicketOpen, setIsDeleteTicketOpen] = useState(false);
  const [isEditWorkOrderOpen, setIsEditWorkOrderOpen] = useState(false);
  const [isViewTicketOpen, setIsViewTicketOpen] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [isReferenceImageOpen, setIsReferenceImageOpen] = useState(false);
  const [isAlertOverflowing, setIsAlertOverflowing] = useState(false);
  const alertPreviewRef = useRef<HTMLDivElement | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [viewTicket, setViewTicket] = useState<any>(null);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketSort, setTicketSort] = useState<'newest' | 'oldest' | 'impact_desc' | 'impact_asc' | 'status' | 'ticket_number'>('newest');
  const [newComment, setNewComment] = useState('');
  const [newTicket, setNewTicket] = useState({
    description: '',
    impact: 'Medium',
    area_id: '',
  });
  const [editTicket, setEditTicket] = useState({
    description: '',
    impact: 'Medium',
    area_id: '',
  });
  const [editWorkOrder, setEditWorkOrder] = useState({
    asm_number: '',
    description: '',
    quantity: '',
    status: '',
  });
  const [editSerialRanges, setEditSerialRanges] = useState<Array<{start: string, end: string}>>([{start: '', end: ''}]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const statusOrder = ['Unresolved', 'Under Investigation', 'In Progress', 'Blocked', 'Resolved'];
  const impactOrder: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
  const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => api.getWorkOrder(id!),
    enabled: !!id,
  });

  const { data: serialSuggestion } = useQuery({
    queryKey: ['serial-suggestion', workOrder?.board_id],
    queryFn: () => api.getSerialSuggestion(workOrder.board_id),
    enabled: !!workOrder?.board_id && isEditWorkOrderOpen,
  });

  const suggestedStart = useMemo(() => {
    const latestEnd = serialSuggestion?.latest_end;
    if (!latestEnd) return null;

    const m = latestEnd.trim().toUpperCase().match(/^(\d+)([A-Z])$/);
    if (!m) return null;

    const prevNumStr = m[1];
    const suffix = m[2];
    const prevNum = parseInt(prevNumStr, 10);
    if (!Number.isFinite(prevNum)) return null;

    const startNum = prevNum + 1;
    const width = prevNumStr.length;

    return `${String(startNum).padStart(width, '0')}${suffix}`;
  }, [serialSuggestion?.latest_end]);

  const suggestedEnd = useMemo(() => {
    if (!suggestedStart) return null;
    const qty = parseInt(editWorkOrder.quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) return null;

    const m = suggestedStart.match(/^(\d+)([A-Z])$/);
    if (!m) return null;
    const startNumStr = m[1];
    const suffix = m[2];
    const startNum = parseInt(startNumStr, 10);
    if (!Number.isFinite(startNum)) return null;

    const endNum = startNum + qty - 1;
    const width = startNumStr.length;
    return `${String(endNum).padStart(width, '0')}${suffix}`;
  }, [editWorkOrder.quantity, suggestedStart]);

  const suggestionMessage = useMemo(() => {
    const qty = parseInt(editWorkOrder.quantity, 10);
    if (!workOrder?.board_id) return null;
    if (!serialSuggestion || serialSuggestion.latest_end == null) {
      return 'No previous serial ranges found to base a suggestion on.';
    }
    if (!Number.isFinite(qty) || qty <= 0) return 'Enter a quantity to see the suggested end.';
    return null;
  }, [editWorkOrder.quantity, serialSuggestion, workOrder?.board_id]);

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
        impact: 'Medium',
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

  const displayTickets = useMemo(() => {
    const tickets: any[] = workOrder?.tickets || [];

    const q = ticketSearch.trim().toLowerCase();
    const filtered = q
      ? tickets.filter((t) => {
          const haystack = [
            t.ticket_number,
            stripHtml(t.description),
            t.area?.name,
            t.submitted_by_user?.full_name,
            t.status,
            t.impact,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        })
      : tickets;

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (ticketSort === 'ticket_number') {
        return String(a.ticket_number || '').localeCompare(String(b.ticket_number || ''));
      }
      if (ticketSort === 'status') {
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      }
      if (ticketSort === 'impact_desc') {
        return (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
      }
      if (ticketSort === 'impact_asc') {
        return (impactOrder[a.impact] || 0) - (impactOrder[b.impact] || 0);
      }
      if (ticketSort === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      // newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return sorted;
  }, [workOrder?.tickets, ticketSearch, ticketSort]);

  const { data: ticketComments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['ticket-comments', viewTicket?.id],
    queryFn: () => api.getTicketComments(viewTicket.id),
    enabled: !!viewTicket?.id && isViewTicketOpen,
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ ticketId, comment }: { ticketId: string; comment: string }) =>
      api.addTicketComment(ticketId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', viewTicket?.id] });
      setNewComment('');
    },
  });

  const updateTicketStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: string }) =>
      api.updateTicket(ticketId, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      setViewTicket((prev: any) => (prev ? { ...prev, status: variables.status } : prev));
    },
  });

  const updateWorkOrderMutation = useMutation({
    mutationFn: (data: any) => api.updateWorkOrder(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-work-orders'] });
      setIsEditWorkOrderOpen(false);
    },
  });

  const handleCreateTicket = async () => {
    if (!newTicket.area_id || !newTicket.description) return;
    
    setIsUploading(true);
    try {
      let imageUrls: string[] = [];
      
      // Upload images if any are selected
      if (selectedImages.length > 0) {
        setUploadProgress(0);
        const uploadResult: any = await api.uploadTicketImages(selectedImages, (progress) => {
          setUploadProgress(progress);
        });
        imageUrls = uploadResult.urls || [];
        
        // Show warning if some images failed
        if (uploadResult.errors && uploadResult.errors.length > 0) {
          alert(`Warning: ${uploadResult.message}\n\nErrors:\n${uploadResult.errors.join('\n')}`);
        }
      }
      
      // Create ticket with image URLs
      createTicketMutation.mutate({
        work_order_id: id!,
        ...newTicket,
        images: imageUrls,
      });
    } catch (error: any) {
      console.error('Error uploading images:', error);
      alert(`Failed to upload images: ${error.message || 'Please try again.'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setEditTicket({
      description: ticket.description,
      impact: ticket.impact,
      area_id: ticket.area_id,
    });
    setIsEditTicketOpen(true);
  };

  const handleViewTicket = (ticket: any) => {
    setViewTicket(ticket);
    setNewComment('');
    setIsViewTicketOpen(true);
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

  const handleEditWorkOrderClick = () => {
    setEditWorkOrder({
      asm_number: workOrder.asm_number,
      description: workOrder.description,
      quantity: workOrder.quantity.toString(),
      status: workOrder.status,
    });
    // Load serial ranges or default to one empty range
    const ranges = workOrder.serial_ranges || [];
    setEditSerialRanges(ranges.length > 0 ? ranges : [{start: '', end: ''}]);
    setIsEditWorkOrderOpen(true);
  };

  const handleUpdateWorkOrder = () => {
    // Filter out empty ranges
    const validRanges = editSerialRanges.filter(r => r.start && r.end);
    
    const updateData: any = {
      asm_number: editWorkOrder.asm_number,
      description: editWorkOrder.description,
      quantity: parseInt(editWorkOrder.quantity),
      status: editWorkOrder.status,
    };
    
    // Include serial ranges if any are valid
    if (validRanges.length > 0) {
      updateData.serial_ranges = validRanges;
    } else {
      updateData.serial_ranges = [];
    }
    
    updateWorkOrderMutation.mutate(updateData);
  };

  const addEditSerialRange = () => {
    setEditSerialRanges([...editSerialRanges, {start: '', end: ''}]);
  };

  const removeEditSerialRange = (index: number) => {
    if (editSerialRanges.length > 1) {
      setEditSerialRanges(editSerialRanges.filter((_, i) => i !== index));
    }
  };

  const updateEditSerialRange = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...editSerialRanges];
    updated[index][field] = value.toUpperCase();
    setEditSerialRanges(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  // Alerts + reference image (must be defined before any early returns to keep hook order stable)
  const alerts: any[] = workOrder?.alerts || [];
  const alertsCount = alerts.length;
  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 1);
  const referenceImageUrl: string | null = workOrder?.board?.reference_image_url || null;

  useEffect(() => {
    if (showAllAlerts) return;
    const el = alertPreviewRef.current;
    if (!el) {
      setIsAlertOverflowing(false);
      return;
    }
    // Detect whether the collapsed preview is clipped
    const overflowing = el.scrollHeight > el.clientHeight + 1;
    setIsAlertOverflowing(overflowing);
  }, [showAllAlerts, visibleAlerts?.[0]?.content, alertsCount]);

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

  const getImpactColor = (impact: string) => {
    const colors: Record<string, string> = {
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-gray-100 text-gray-800',
    };
    return colors[impact] || colors['Medium'];
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Unresolved': 'bg-red-100 text-red-800',
      'Under Investigation': 'bg-purple-100 text-purple-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Blocked': 'bg-orange-100 text-orange-800',
      'Resolved': 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 print:hidden">
          <Button variant="ghost" className="justify-start w-fit" onClick={() => navigate('/work-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-end gap-2">
            <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
              <DialogTrigger asChild>
                <Button className="w-full xs:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create New Ticket</DialogTitle>
                  <DialogDescription>
                    Report an issue with this work order.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <RichTextEditor
                      content={newTicket.description}
                      onChange={(html) => setNewTicket({ ...newTicket, description: html })}
                      placeholder="Describe the issue..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="impact">Impact</Label>
                    <Select
                      value={newTicket.impact}
                      onValueChange={(value) => setNewTicket({ ...newTicket, impact: value })}
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
                
                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Uploading images...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateTicketOpen(false)} disabled={isUploading}>
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

            <Button className="w-full xs:w-auto" variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Tickets
            </Button>
          </div>
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
              {profile?.role === 'admin' && (
                <Button variant="outline" size="sm" onClick={handleEditWorkOrderClick}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
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
              {workOrder.serial_ranges && workOrder.serial_ranges.length > 0 && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Serial Number Ranges</h3>
                  <div className="space-y-1">
                    {workOrder.serial_ranges.map((range: any, idx: number) => (
                      <p key={idx} className="text-lg font-semibold font-mono">
                        {range.start} - {range.end}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ({workOrder.serial_ranges.reduce((total: number, range: any) => {
                      const count = parseInt(range.end.replace('W', '')) - parseInt(range.start.replace('W', '')) + 1;
                      return total + count;
                    }, 0)} units total)
                  </p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-base">{workOrder.description}</p>
              </div>
              {referenceImageUrl ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Reference Board</h3>
                  <button
                    type="button"
                    className="w-full max-w-[220px] border rounded-md overflow-hidden bg-white hover:shadow-sm transition-shadow text-left"
                    onClick={() => setIsReferenceImageOpen(true)}
                    title="View reference board image"
                  >
                    <img
                      src={referenceImageUrl}
                      alt="Reference board"
                      className="w-full h-28 object-cover"
                    />
                    <div className="px-2 py-1 text-xs text-gray-600">Click to enlarge</div>
                  </button>
                </div>
              ) : (
                <div />
              )}
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

              {/* Alerts (inline, "in your face") */}
              {alertsCount > 0 && (
                <div className="md:col-span-2">
                  <div className="border-l-4 border-l-red-600 bg-red-50/60 rounded-md p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-red-900">
                        Board Alerts ({alertsCount})
                      </div>
                      {(showAllAlerts || alertsCount > 1 || isAlertOverflowing) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllAlerts((v) => !v)}
                        >
                          {showAllAlerts ? 'Show less' : 'Show more…'}
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {visibleAlerts.map((a: any, idx: number) => (
                        <div
                          key={a.id || idx}
                          ref={!showAllAlerts && idx === 0 ? alertPreviewRef : undefined}
                          className={`relative bg-white border rounded-md p-3 ${
                            !showAllAlerts ? 'max-h-[9rem] overflow-hidden' : ''
                          }`}
                        >
                          <div className="rich-text" dangerouslySetInnerHTML={{ __html: a.content }} />
                          {!showAllAlerts && idx === 0 && isAlertOverflowing && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reference image modal */}
        <Dialog open={isReferenceImageOpen} onOpenChange={setIsReferenceImageOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Reference Board</DialogTitle>
              <DialogDescription>Example image for this board.</DialogDescription>
            </DialogHeader>
            {referenceImageUrl ? (
              <div className="flex items-center justify-center">
                <img
                  src={referenceImageUrl}
                  alt="Reference board large"
                  className="max-h-[70vh] w-auto object-contain rounded border bg-white"
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500">No reference image.</div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReferenceImageOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Work Order Dialog */}
        <Dialog open={isEditWorkOrderOpen} onOpenChange={setIsEditWorkOrderOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Work Order</DialogTitle>
              <DialogDescription>
                Update the work order details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label htmlFor="edit_wo_asm_number">ASM #</Label>
                <Input
                  id="edit_wo_asm_number"
                  value={editWorkOrder.asm_number}
                  onChange={(e) => setEditWorkOrder({ ...editWorkOrder, asm_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_wo_description">Description</Label>
                <Input
                  id="edit_wo_description"
                  value={editWorkOrder.description}
                  onChange={(e) => setEditWorkOrder({ ...editWorkOrder, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_wo_quantity">Quantity</Label>
                <Input
                  id="edit_wo_quantity"
                  type="number"
                  value={editWorkOrder.quantity}
                  onChange={(e) => setEditWorkOrder({ ...editWorkOrder, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_wo_status">Status</Label>
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
              
              {/* Serial Number Ranges */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Serial Number Ranges (Optional)
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addEditSerialRange}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Range
                  </Button>
                </div>
                
                {editSerialRanges.map((range, index) => (
                  <div key={index} className="relative">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`edit_wo_serial_start_${index}`}>Start</Label>
                        <Input
                          id={`edit_wo_serial_start_${index}`}
                          placeholder="1234567W"
                          value={range.start}
                          onChange={(e) => updateEditSerialRange(index, 'start', e.target.value)}
                          maxLength={8}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit_wo_serial_end_${index}`}>End</Label>
                        <Input
                          id={`edit_wo_serial_end_${index}`}
                          placeholder="1234890W"
                          value={range.end}
                          onChange={(e) => updateEditSerialRange(index, 'end', e.target.value)}
                          maxLength={8}
                        />
                      </div>
                    </div>
                    {editSerialRanges.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEditSerialRange(index)}
                        className="absolute -top-2 -right-2 p-1 h-auto w-auto text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {suggestedStart && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>
                      Suggested Start: <span className="font-mono">{suggestedStart}</span>
                    </div>
                    {suggestedEnd && (
                      <div>
                        Suggested End: <span className="font-mono">{suggestedEnd}</span>
                      </div>
                    )}
                  </div>
                )}
                {!suggestedStart && suggestionMessage && (
                  <p className="text-xs text-gray-500">{suggestionMessage}</p>
                )}
                {suggestedStart && !suggestedEnd && suggestionMessage && (
                  <p className="text-xs text-gray-500">{suggestionMessage}</p>
                )}
                <p className="text-xs text-gray-500">
                  Format: 7 digits + W (e.g., 1234567W - 1234890W)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditWorkOrderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateWorkOrder} disabled={updateWorkOrderMutation.isPending}>
                {updateWorkOrderMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            {workOrder.serial_ranges && workOrder.serial_ranges.length > 0 && (
              <div className="text-gray-600 font-mono">
                Serial Ranges: {workOrder.serial_ranges.map((range: any, idx: number) => (
                  <span key={idx}>
                    {idx > 0 && ', '}
                    {range.start} - {range.end}
                  </span>
                ))}
              </div>
            )}
            <p className="text-gray-600 mb-4">{workOrder.description}</p>
            <div className="border-b-2 border-gray-300 mb-4"></div>
          </div>

          <Card className="print:shadow-none print:border-0">
            <CardContent className="p-6 print:px-4 print:py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 print:mb-8">
                <h2 className="text-2xl font-bold print:text-xl">
                  Tickets ({workOrder.tickets?.length || 0})
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 print:hidden w-full sm:w-auto">
                  <Input
                    placeholder="Search tickets..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="w-full sm:w-56"
                  />
                  <Select value={ticketSort} onValueChange={(v) => setTicketSort(v as any)}>
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="impact_desc">Impact (High → Low)</SelectItem>
                      <SelectItem value="impact_asc">Impact (Low → High)</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="ticket_number">Ticket #</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              {/* Create Ticket button moved to page header (left of Print Tickets) */}
            </div>

            {/* Edit Ticket Dialog */}
            <Dialog open={isEditTicketOpen} onOpenChange={setIsEditTicketOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Edit Ticket</DialogTitle>
                  <DialogDescription>
                    Update the ticket details.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <RichTextEditor
                      content={editTicket.description}
                      onChange={(html) => setEditTicket({ ...editTicket, description: html })}
                      placeholder="Describe the issue..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-impact">Impact</Label>
                    <Select
                      value={editTicket.impact}
                      onValueChange={(value) => setEditTicket({ ...editTicket, impact: value })}
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
                {displayTickets.map((ticket: any) => (
                  <Card
                    key={ticket.id}
                    className="border-l-4 border-l-primary cursor-pointer hover:bg-gray-50/50 transition-colors print:cursor-default print:hover:bg-transparent print:shadow-none print:border print:border-gray-400 print:page-break-inside-avoid print:mb-4"
                    onClick={() => handleViewTicket(ticket)}
                  >
                    <CardContent className="p-4 print:p-5">
                      <div className="space-y-3">
                        {/* Header with ticket info and badges */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <span className="font-mono text-sm font-medium">
                                {ticket.ticket_number}
                              </span>
                              <Badge className={getImpactColor(ticket.impact)}>
                                {ticket.impact}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {ticket.area?.name}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Date and edit/delete actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString()}</span>
                            </div>
                            {/* Edit and delete buttons - admins can edit any ticket, operators can only edit their own */}
                            {(profile?.role === 'admin' || profile?.id === ticket.submitted_by) && (
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
                        <div 
                          className="text-gray-700 ticket-description" 
                          dangerouslySetInnerHTML={{ __html: ticket.description }}
                        />
                          
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

            {/* Ticket Details + Comments Modal */}
            <Dialog
              open={isViewTicketOpen}
              onOpenChange={(open) => {
                setIsViewTicketOpen(open);
                if (!open) setViewTicket(null);
              }}
            >
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Ticket Details</DialogTitle>
                  <DialogDescription>
                    {viewTicket?.ticket_number ? `Ticket ${viewTicket.ticket_number}` : 'View ticket details'}
                  </DialogDescription>
                </DialogHeader>

                {!viewTicket ? (
                  <div className="text-sm text-gray-500">No ticket selected.</div>
                ) : (
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                    {/* Metadata */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">{viewTicket.ticket_number}</span>
                        <Badge className={getImpactColor(viewTicket.impact)}>{viewTicket.impact}</Badge>
                        <Badge className={getStatusColor(viewTicket.status)}>{viewTicket.status}</Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {viewTicket.area?.name}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-600">
                        Submitted by: {viewTicket.submitted_by_user?.full_name || 'Unknown'} •{' '}
                        {new Date(viewTicket.created_at).toLocaleString()}
                      </div>

                      {/* Admin-only status editor */}
                      {profile?.role === 'admin' && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="ticket-status">Status</Label>
                            <Select
                              value={viewTicket.status}
                              onValueChange={(value) =>
                                updateTicketStatusMutation.mutate({ ticketId: viewTicket.id, status: value })
                              }
                            >
                              <SelectTrigger id="ticket-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Unresolved">Unresolved</SelectItem>
                                <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Blocked">Blocked</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Description</div>
                      <div
                        className="text-gray-800 ticket-description border rounded-md p-3 bg-white"
                        dangerouslySetInnerHTML={{ __html: viewTicket.description }}
                      />
                    </div>

                    {/* Images */}
                    {viewTicket.images && viewTicket.images.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Attachments</div>
                        <div className="flex flex-wrap gap-2">
                          {viewTicket.images.map((url: string, idx: number) => (
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
                                className="h-24 w-24 object-cover rounded border hover:opacity-80 transition-opacity"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                                <ExternalLink className="h-5 w-5 text-white" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">Comments</div>

                      <div className="space-y-2">
                        {isCommentsLoading ? (
                          <div className="text-sm text-gray-500">Loading comments...</div>
                        ) : ticketComments.length === 0 ? (
                          <div className="text-sm text-gray-500">No comments yet.</div>
                        ) : (
                          ticketComments.map((c: any) => (
                            <div key={c.id} className="border rounded-md p-3 bg-gray-50">
                              <div className="text-xs text-gray-600 mb-1">
                                {c.user?.full_name || 'Unknown'} • {new Date(c.created_at).toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-800 whitespace-pre-wrap">{c.comment}</div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-comment">Add a comment</Label>
                        <Textarea
                          id="new-comment"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Type your comment..."
                          rows={4}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => {
                              if (!viewTicket?.id) return;
                              const trimmed = newComment.trim();
                              if (!trimmed) return;
                              addCommentMutation.mutate({ ticketId: viewTicket.id, comment: trimmed });
                            }}
                            disabled={addCommentMutation.isPending || !newComment.trim()}
                          >
                            {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewTicketOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Photo Documentation Section - Only visible when printing */}
            {workOrder.tickets?.some((t: any) => t.images && t.images.length > 0) && (
              <div className="hidden print:block mt-12 pt-8 border-t-2 border-gray-300 print:break-before-page">
                <h2 className="text-xl font-bold mb-6 print:break-after-avoid">Photo Documentation</h2>
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

