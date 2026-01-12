import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  const isAdmin = profile?.role === 'admin';
  const isQuality = profile?.role === 'quality';
  const canEditWorkOrderWorkflow = isAdmin || isQuality;
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isCreateQualityTicketOpen, setIsCreateQualityTicketOpen] = useState(false);
  const [isEditTicketOpen, setIsEditTicketOpen] = useState(false);
  const [isDeleteTicketOpen, setIsDeleteTicketOpen] = useState(false);
  const [isEditWorkOrderOpen, setIsEditWorkOrderOpen] = useState(false);
  const [isViewTicketOpen, setIsViewTicketOpen] = useState(false);
  const [ticketTab, setTicketTab] = useState<'operator' | 'quality'>('operator');
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [isReferenceImageOpen, setIsReferenceImageOpen] = useState(false);
  const [isAlertOverflowing, setIsAlertOverflowing] = useState(false);
  const alertPreviewRef = useRef<HTMLDivElement | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [viewTicket, setViewTicket] = useState<any>(null);
  const [viewQualityTicket, setViewQualityTicket] = useState<any>(null);
  const [isViewQualityTicketOpen, setIsViewQualityTicketOpen] = useState(false);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketSort, setTicketSort] = useState<'newest' | 'oldest' | 'impact_desc' | 'impact_asc' | 'status' | 'ticket_number'>('newest');
  const [newComment, setNewComment] = useState('');
  const [newQualityComment, setNewQualityComment] = useState('');
  const [newTicket, setNewTicket] = useState({
    description: '',
    impact: 'Medium',
    area_id: '',
  });
  const [newQualityTicket, setNewQualityTicket] = useState({
    description: '',
    serial_numbers_input: '',
  });
  const [editTicket, setEditTicket] = useState({
    description: '',
    impact: 'Medium',
    area_id: '',
  });
  const [editQualityTicket, setEditQualityTicket] = useState({
    description: '',
    serial_numbers_input: '',
  });
  const [isEditQualityTicketOpen, setIsEditQualityTicketOpen] = useState(false);
  const [isDeleteQualityTicketOpen, setIsDeleteQualityTicketOpen] = useState(false);
  const [selectedQualityTicket, setSelectedQualityTicket] = useState<any>(null);
  const [editWorkOrder, setEditWorkOrder] = useState({
    asm_number: '',
    description: '',
    quantity: '',
    status: '',
  });
  const [editSerialRanges, setEditSerialRanges] = useState<Array<{start: string, end: string}>>([{start: '', end: ''}]);
  const [editHasExtraLabels, setEditHasExtraLabels] = useState(false);
  const [editExtraLabelRange, setEditExtraLabelRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedQualityImages, setSelectedQualityImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isQualityUploading, setIsQualityUploading] = useState(false);
  const [qualityUploadProgress, setQualityUploadProgress] = useState(0);

  const statusOrder = ['Unresolved', 'Under Investigation', 'In Progress', 'Blocked', 'Resolved'];
  const impactOrder: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
  const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const isPostProductionStatus = (status?: string) =>
    status === 'Production Done' ||
    status === 'Quality Received' ||
    status === 'Quality Done' ||
    status === 'Completed';

  useEffect(() => {
    // Default tab: Quality users land on Quality tickets; everyone else defaults to Operator tickets.
    if (isQuality) {
      setTicketTab('quality');
    } else if (!isAdmin) {
      setTicketTab('operator');
    }
  }, [isQuality, isAdmin]);

  useEffect(() => {
    // Quality tickets don't support impact/status sorting; keep UX predictable.
    if (ticketTab === 'quality' && (ticketSort === 'impact_desc' || ticketSort === 'impact_asc' || ticketSort === 'status')) {
      setTicketSort('newest');
    }
  }, [ticketTab, ticketSort]);

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
    mutationFn: (status: string) => api.updateWorkOrderStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-work-orders'] });
    },
  });

  const updateQualityResultMutation = useMutation({
    mutationFn: (quality_result: string) => api.updateWorkOrderQualityResult(id!, quality_result),
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

  const createQualityTicketMutation = useMutation({
    mutationFn: api.createQualityTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      setIsCreateQualityTicketOpen(false);
      setNewQualityTicket({
        description: '',
        serial_numbers_input: '',
      });
      setSelectedQualityImages([]);
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

  const updateQualityTicketMutation = useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: any }) =>
      api.updateQualityTicket(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      setIsEditQualityTicketOpen(false);
      setSelectedQualityTicket(null);
    },
  });

  const deleteQualityTicketMutation = useMutation({
    mutationFn: (ticketId: string) => api.deleteQualityTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      setIsDeleteQualityTicketOpen(false);
      setSelectedQualityTicket(null);
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

  const displayQualityTickets = useMemo(() => {
    const tickets: any[] = workOrder?.quality_tickets || [];
    const q = ticketSearch.trim().toLowerCase();

    const filtered = q
      ? tickets.filter((t) => {
          const haystack = [
            t.quality_ticket_number,
            stripHtml(t.description),
            Array.isArray(t.serial_numbers) ? t.serial_numbers.join(' ') : '',
            t.submitted_by_user?.full_name,
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
        return String(a.quality_ticket_number || '').localeCompare(String(b.quality_ticket_number || ''));
      }
      if (ticketSort === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      // newest (default)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return sorted;
  }, [workOrder?.quality_tickets, ticketSearch, ticketSort]);

  const { data: ticketComments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['ticket-comments', viewTicket?.id],
    queryFn: () => api.getTicketComments(viewTicket.id),
    enabled: !!viewTicket?.id && isViewTicketOpen,
  });

  const { data: qualityTicketComments = [], isLoading: isQualityCommentsLoading } = useQuery({
    queryKey: ['quality-ticket-comments', viewQualityTicket?.id],
    queryFn: () => api.getQualityTicketComments(viewQualityTicket.id),
    enabled: !!viewQualityTicket?.id && isViewQualityTicketOpen,
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ ticketId, comment }: { ticketId: string; comment: string }) =>
      api.addTicketComment(ticketId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', viewTicket?.id] });
      setNewComment('');
    },
  });

  const addQualityCommentMutation = useMutation({
    mutationFn: ({ ticketId, comment }: { ticketId: string; comment: string }) =>
      api.addQualityTicketComment(ticketId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-ticket-comments', viewQualityTicket?.id] });
      setNewQualityComment('');
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

  const parseSerialNumbers = (raw: string): string[] => {
    const normalized = (raw || '').replace(/\r/g, '\n');
    return normalized
      .split(/[\n,]+/g)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  };

  const handleCreateQualityTicket = async () => {
    const serials = parseSerialNumbers(newQualityTicket.serial_numbers_input);
    if (!newQualityTicket.description || serials.length === 0) return;

    setIsQualityUploading(true);
    try {
      let imageUrls: string[] = [];

      if (selectedQualityImages.length > 0) {
        setQualityUploadProgress(0);
        const uploadResult: any = await api.uploadQualityTicketImages(selectedQualityImages, (progress) => {
          setQualityUploadProgress(progress);
        });
        imageUrls = uploadResult.urls || [];

        if (uploadResult.errors && uploadResult.errors.length > 0) {
          alert(`Warning: ${uploadResult.message}\n\nErrors:\n${uploadResult.errors.join('\n')}`);
        }
      }

      createQualityTicketMutation.mutate({
        work_order_id: id!,
        description: newQualityTicket.description,
        serial_numbers: serials,
        images: imageUrls,
      });
    } catch (error: any) {
      console.error('Error uploading images:', error);
      alert(`Failed to upload images: ${error.message || 'Please try again.'}`);
    } finally {
      setIsQualityUploading(false);
      setQualityUploadProgress(0);
    }
  };

  const handleViewQualityTicket = (ticket: any) => {
    setViewQualityTicket(ticket);
    setNewQualityComment('');
    setIsViewQualityTicketOpen(true);
  };

  const handleEditQualityClick = (ticket: any) => {
    setSelectedQualityTicket(ticket);
    setEditQualityTicket({
      description: ticket.description || '',
      serial_numbers_input: Array.isArray(ticket.serial_numbers) ? ticket.serial_numbers.join('\n') : '',
    });
    setIsEditQualityTicketOpen(true);
  };

  const handleUpdateQualityTicket = () => {
    if (!selectedQualityTicket || !editQualityTicket.description) return;
    const serials = parseSerialNumbers(editQualityTicket.serial_numbers_input);
    if (serials.length === 0) return;

    updateQualityTicketMutation.mutate({
      ticketId: selectedQualityTicket.id,
      data: {
        description: editQualityTicket.description,
        serial_numbers: serials,
      },
    });
  };

  const handleDeleteQualityClick = (ticket: any) => {
    setSelectedQualityTicket(ticket);
    setIsDeleteQualityTicketOpen(true);
  };

  const handleDeleteQualityTicket = () => {
    if (!selectedQualityTicket) return;
    deleteQualityTicketMutation.mutate(selectedQualityTicket.id);
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
    const hasExtras = !!workOrder.has_extra_labels || !!workOrder.extra_label_range;
    setEditHasExtraLabels(hasExtras);
    setEditExtraLabelRange({
      start: (workOrder.extra_label_range?.start || '').toString().toUpperCase(),
      end: (workOrder.extra_label_range?.end || '').toString().toUpperCase(),
    });
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

    // Extra labels (optional)
    updateData.has_extra_labels = editHasExtraLabels;
    if (editHasExtraLabels) {
      const start = (editExtraLabelRange.start || '').trim().toUpperCase();
      const end = (editExtraLabelRange.end || '').trim().toUpperCase();
      if (!start || !end) {
        alert('Please enter the extra labels start and end range (or uncheck "Has extra labels?").');
        return;
      }
      updateData.extra_label_range = { start, end };
    } else {
      updateData.extra_label_range = null;
    }
    
    updateWorkOrderMutation.mutate(updateData);
  };

  const countSerialRange = (range: any): number => {
    const startRaw = (range?.start || '').toString().trim().toUpperCase();
    const endRaw = (range?.end || '').toString().trim().toUpperCase();
    const m1 = startRaw.match(/^(\d+)([A-Z])$/);
    const m2 = endRaw.match(/^(\d+)([A-Z])$/);
    if (!m1 || !m2) return 0;
    if (m1[2] !== m2[2]) return 0;
    const a = parseInt(m1[1], 10);
    const b = parseInt(m2[1], 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    if (b < a) return 0;
    return b - a + 1;
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
            <Button
              className="w-full xs:w-auto"
              onClick={() => {
                // Admin: create based on selected tab. Quality: quality ticket. Operators: operator ticket.
                if (isAdmin) {
                  if (ticketTab === 'quality') setIsCreateQualityTicketOpen(true);
                  else setIsCreateTicketOpen(true);
                } else if (isQuality) {
                  setIsCreateQualityTicketOpen(true);
                } else {
                  setIsCreateTicketOpen(true);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAdmin ? (ticketTab === 'quality' ? 'Create Quality Ticket' : 'Create Ticket') : isQuality ? 'Create Quality Ticket' : 'Create Ticket'}
            </Button>

            {/* Operator Ticket Create Dialog */}
            <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
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

            {/* Quality Ticket Create Dialog */}
            <Dialog open={isCreateQualityTicketOpen} onOpenChange={setIsCreateQualityTicketOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create Quality Ticket</DialogTitle>
                  <DialogDescription>
                    Report a quality issue for this work order.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quality-description">Description</Label>
                    <RichTextEditor
                      content={newQualityTicket.description}
                      onChange={(html) => setNewQualityTicket({ ...newQualityTicket, description: html })}
                      placeholder="Describe the issue..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="quality-serials">Serial Number(s)</Label>
                    <Textarea
                      id="quality-serials"
                      placeholder="Enter one serial per line (or comma-separated)"
                      value={newQualityTicket.serial_numbers_input}
                      onChange={(e) => setNewQualityTicket({ ...newQualityTicket, serial_numbers_input: e.target.value })}
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supports single or multiple serial numbers.
                    </p>
                  </div>
                  <div>
                    <Label>Images (Optional)</Label>
                    <ImageUpload
                      onImagesSelected={setSelectedQualityImages}
                      maxFiles={50}
                    />
                  </div>
                </div>

                {isQualityUploading && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Uploading images...</span>
                      <span>{qualityUploadProgress}%</span>
                    </div>
                    <Progress value={qualityUploadProgress} className="h-2" />
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateQualityTicketOpen(false)} disabled={isQualityUploading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateQualityTicket}
                    disabled={
                      createQualityTicketMutation.isPending ||
                      isQualityUploading ||
                      !newQualityTicket.description ||
                      parseSerialNumbers(newQualityTicket.serial_numbers_input).length === 0
                    }
                  >
                    {isQualityUploading ? 'Uploading...' : createQualityTicketMutation.isPending ? 'Creating...' : 'Create'}
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
                    ({workOrder.serial_ranges.reduce((total: number, range: any) => total + countSerialRange(range), 0)} units total)
                  </p>
                </div>
              )}
              {(workOrder.has_extra_labels || workOrder.extra_label_range) && workOrder.extra_label_range?.start && workOrder.extra_label_range?.end && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Extra Labels Range</h3>
                  <p className="text-lg font-semibold font-mono text-blue-600" title="Extras">
                    {workOrder.extra_label_range.start} - {workOrder.extra_label_range.end}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ({countSerialRange(workOrder.extra_label_range)} extra labels)
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
                  {canEditWorkOrderWorkflow ? (
                    <Select
                      value={workOrder.status}
                      onValueChange={(value) => updateStatusMutation.mutate(value)}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isQuality ? (
                          <>
                            <SelectItem value="Production Done">Production Done</SelectItem>
                            <SelectItem value="Quality Received">Quality Received</SelectItem>
                            <SelectItem value="Quality Done">Quality Done</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Production Done">Production Done</SelectItem>
                            <SelectItem value="Quality Received">Quality Received</SelectItem>
                            <SelectItem value="Quality Done">Quality Done</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-lg font-semibold">{workOrder.status}</p>
                  )}
                </div>
                <div className="hidden print:block">
                  <p className="text-lg font-semibold">{workOrder.status}</p>
                </div>
              </div>

              {isPostProductionStatus(workOrder.status) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Quality Result</h3>
                  <div className="print:hidden">
                    {canEditWorkOrderWorkflow ? (
                      <Select
                        value={workOrder.quality_result || 'Hold'}
                        onValueChange={(value) => updateQualityResultMutation.mutate(value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hold">Hold</SelectItem>
                          <SelectItem value="Pass">Pass</SelectItem>
                          <SelectItem value="Fail">Fail</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-lg font-semibold">{workOrder.quality_result || 'Hold'}</p>
                    )}
                  </div>
                  <div className="hidden print:block">
                    <p className="text-lg font-semibold">{workOrder.quality_result || 'Hold'}</p>
                  </div>
                </div>
              )}

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
                      <SelectItem value="Production Done">Production Done</SelectItem>
                      <SelectItem value="Quality Received">Quality Received</SelectItem>
                      <SelectItem value="Quality Done">Quality Done</SelectItem>
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

                {/* Extra Labels */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit_wo_has_extra_labels"
                      checked={editHasExtraLabels}
                      onCheckedChange={(v) => {
                        const checked = v === true;
                        setEditHasExtraLabels(checked);
                        if (!checked) setEditExtraLabelRange({ start: '', end: '' });
                      }}
                    />
                    <Label htmlFor="edit_wo_has_extra_labels" className="cursor-pointer">
                      Has extra labels?
                    </Label>
                  </div>
                  {editHasExtraLabels && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_wo_extra_labels_start">Extra Start</Label>
                        <Input
                          id="edit_wo_extra_labels_start"
                          placeholder="1234891W"
                          value={editExtraLabelRange.start}
                          onChange={(e) => setEditExtraLabelRange((p) => ({ ...p, start: e.target.value.toUpperCase() }))}
                          maxLength={8}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_wo_extra_labels_end">Extra End</Label>
                        <Input
                          id="edit_wo_extra_labels_end"
                          placeholder="1234894W"
                          value={editExtraLabelRange.end}
                          onChange={(e) => setEditExtraLabelRange((p) => ({ ...p, end: e.target.value.toUpperCase() }))}
                          maxLength={8}
                        />
                      </div>
                    </div>
                  )}
                </div>
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
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold print:text-xl">
                    {ticketTab === 'quality'
                      ? `Quality Tickets (${workOrder.quality_tickets?.length || 0})`
                      : `Operator Tickets (${workOrder.tickets?.length || 0})`}
                  </h2>
                  {isAdmin && (
                    <div className="flex items-center gap-2 print:hidden">
                      <Button
                        type="button"
                        variant={ticketTab === 'operator' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTicketTab('operator')}
                      >
                        Operator
                      </Button>
                      <Button
                        type="button"
                        variant={ticketTab === 'quality' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTicketTab('quality')}
                      >
                        Quality
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 print:hidden w-full sm:w-auto">
                  <Input
                    placeholder={ticketTab === 'quality' ? 'Search quality tickets...' : 'Search tickets...'}
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
                      <SelectItem value="ticket_number">Ticket #</SelectItem>
                      {ticketTab === 'operator' && (
                        <>
                          <SelectItem value="impact_desc">Impact (High → Low)</SelectItem>
                          <SelectItem value="impact_asc">Impact (Low → High)</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </>
                      )}
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

            {/* Quality Ticket Edit Dialog */}
            <Dialog open={isEditQualityTicketOpen} onOpenChange={setIsEditQualityTicketOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Edit Quality Ticket</DialogTitle>
                  <DialogDescription>Update the quality ticket details.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-quality-description">Description</Label>
                    <RichTextEditor
                      content={editQualityTicket.description}
                      onChange={(html) => setEditQualityTicket({ ...editQualityTicket, description: html })}
                      placeholder="Describe the issue..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-quality-serials">Serial Number(s)</Label>
                    <Textarea
                      id="edit-quality-serials"
                      value={editQualityTicket.serial_numbers_input}
                      onChange={(e) => setEditQualityTicket({ ...editQualityTicket, serial_numbers_input: e.target.value })}
                      rows={4}
                      placeholder="Enter one serial per line (or comma-separated)"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditQualityTicketOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateQualityTicket}
                    disabled={updateQualityTicketMutation.isPending || !editQualityTicket.description || parseSerialNumbers(editQualityTicket.serial_numbers_input).length === 0}
                  >
                    {updateQualityTicketMutation.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Quality Ticket Delete Dialog */}
            <Dialog open={isDeleteQualityTicketOpen} onOpenChange={setIsDeleteQualityTicketOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Quality Ticket</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this quality ticket? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteQualityTicketOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteQualityTicket}
                    disabled={deleteQualityTicketMutation.isPending}
                  >
                    {deleteQualityTicketMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {((ticketTab === 'operator'
              ? (!workOrder.tickets || workOrder.tickets.length === 0)
              : (!workOrder.quality_tickets || workOrder.quality_tickets.length === 0))) ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg font-medium mb-1">No tickets yet</h3>
                <p className="text-sm">
                  {ticketTab === 'quality'
                    ? 'Create a quality ticket to report an issue with this work order'
                    : 'Create a ticket to report an issue with this work order'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 print:space-y-6 print:px-2">
                {ticketTab === 'operator' ? (
                  displayTickets.map((ticket: any) => (
                    <Card
                      key={ticket.id}
                      className="border-l-4 border-l-primary cursor-pointer hover:bg-gray-50/50 transition-colors print:cursor-default print:hover:bg-transparent print:shadow-none print:border print:border-gray-400 print:page-break-inside-avoid print:mb-4"
                      onClick={() => handleViewTicket(ticket)}
                    >
                      <CardContent className="p-4 print:p-5">
                        <div className="space-y-3">
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

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString()}</span>
                              </div>
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

                          <div
                            className="text-gray-700 ticket-description"
                            dangerouslySetInnerHTML={{ __html: ticket.description }}
                          />

                          {ticket.images && ticket.images.length > 0 && (
                            <>
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

                              <div className="hidden print:block text-sm text-gray-600 italic">
                                {ticket.images.length > 1 ? 'See Figures ' : 'See Figure '}
                                {ticket.images.map((_url: string, idx: number) => {
                                  const ticketIndex = workOrder.tickets.findIndex((t: any) => t.id === ticket.id);
                                  return `${ticketIndex + 1}-${idx + 1}`;
                                }).join(', ')}
                              </div>
                            </>
                          )}

                          <div className="text-sm text-gray-600">
                            Submitted by: {ticket.submitted_by_user?.full_name || 'Unknown'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  displayQualityTickets.map((ticket: any) => (
                    <Card
                      key={ticket.id}
                      className="border-l-4 border-l-purple-600 cursor-pointer hover:bg-gray-50/50 transition-colors print:cursor-default print:hover:bg-transparent print:shadow-none print:border print:border-gray-400 print:page-break-inside-avoid print:mb-4"
                      onClick={() => handleViewQualityTicket(ticket)}
                    >
                      <CardContent className="p-4 print:p-5">
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-2 mb-2">
                                <span className="font-mono text-sm font-medium">
                                  {ticket.quality_ticket_number}
                                </span>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                  {(Array.isArray(ticket.serial_numbers) ? ticket.serial_numbers : []).length} Serial(s)
                                </Badge>
                              </div>
                              {Array.isArray(ticket.serial_numbers) && ticket.serial_numbers.length > 0 && (
                                <div className="text-sm text-gray-700 font-mono">
                                  {ticket.serial_numbers.slice(0, 6).join(', ')}
                                  {ticket.serial_numbers.length > 6 ? '…' : ''}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString()}</span>
                              </div>
                              {(profile?.role === 'admin' || profile?.id === ticket.submitted_by) && (
                                <div className="flex items-center gap-1 print:hidden">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditQualityClick(ticket);
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
                                      handleDeleteQualityClick(ticket);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            className="text-gray-700 ticket-description"
                            dangerouslySetInnerHTML={{ __html: ticket.description }}
                          />

                          {ticket.images && ticket.images.length > 0 && (
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
                          )}

                          <div className="text-sm text-gray-600">
                            Submitted by: {ticket.submitted_by_user?.full_name || 'Unknown'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
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

            {/* Quality Ticket Details + Comments Modal */}
            <Dialog
              open={isViewQualityTicketOpen}
              onOpenChange={(open) => {
                setIsViewQualityTicketOpen(open);
                if (!open) setViewQualityTicket(null);
              }}
            >
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Quality Ticket Details</DialogTitle>
                  <DialogDescription>
                    {viewQualityTicket?.quality_ticket_number
                      ? `Ticket ${viewQualityTicket.quality_ticket_number}`
                      : 'View ticket details'}
                  </DialogDescription>
                </DialogHeader>

                {!viewQualityTicket ? (
                  <div className="text-sm text-gray-500">No ticket selected.</div>
                ) : (
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">{viewQualityTicket.quality_ticket_number}</span>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          {(Array.isArray(viewQualityTicket.serial_numbers) ? viewQualityTicket.serial_numbers : []).length} Serial(s)
                        </Badge>
                      </div>

                      {Array.isArray(viewQualityTicket.serial_numbers) && viewQualityTicket.serial_numbers.length > 0 && (
                        <div className="text-sm text-gray-700 font-mono">
                          {viewQualityTicket.serial_numbers.join(', ')}
                        </div>
                      )}

                      <div className="text-sm text-gray-600">
                        Submitted by: {viewQualityTicket.submitted_by_user?.full_name || 'Unknown'} •{' '}
                        {new Date(viewQualityTicket.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Description</div>
                      <div
                        className="text-gray-800 ticket-description border rounded-md p-3 bg-white"
                        dangerouslySetInnerHTML={{ __html: viewQualityTicket.description }}
                      />
                    </div>

                    {viewQualityTicket.images && viewQualityTicket.images.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Attachments</div>
                        <div className="flex flex-wrap gap-2">
                          {viewQualityTicket.images.map((url: string, idx: number) => (
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

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">Comments</div>

                      <div className="space-y-2">
                        {isQualityCommentsLoading ? (
                          <div className="text-sm text-gray-500">Loading comments...</div>
                        ) : qualityTicketComments.length === 0 ? (
                          <div className="text-sm text-gray-500">No comments yet.</div>
                        ) : (
                          qualityTicketComments.map((c: any) => (
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
                        <Label htmlFor="new-quality-comment">Add a comment</Label>
                        <Textarea
                          id="new-quality-comment"
                          value={newQualityComment}
                          onChange={(e) => setNewQualityComment(e.target.value)}
                          placeholder="Type your comment..."
                          rows={4}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => {
                              if (!viewQualityTicket?.id) return;
                              if (!newQualityComment.trim()) return;
                              addQualityCommentMutation.mutate({
                                ticketId: viewQualityTicket.id,
                                comment: newQualityComment.trim(),
                              });
                            }}
                            disabled={addQualityCommentMutation.isPending || !newQualityComment.trim()}
                          >
                            {addQualityCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewQualityTicketOpen(false)}>
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

