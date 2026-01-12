import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/RichTextEditor';
import { api } from '@/lib/api';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';

export default function BoardsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<any>(null);
  const [newReferenceFile, setNewReferenceFile] = useState<File | null>(null);
  const [newReferencePreview, setNewReferencePreview] = useState<string | null>(null);
  const [editReferenceFile, setEditReferenceFile] = useState<File | null>(null);
  const [editReferencePreview, setEditReferencePreview] = useState<string | null>(null);
  const [referenceUploadProgress, setReferenceUploadProgress] = useState(0);
  const [isUploadingReference, setIsUploadingReference] = useState(false);

  const [newBoard, setNewBoard] = useState({
    asm_number: '',
    internal_g_number: '',
    description: '',
  });

  const [editBoard, setEditBoard] = useState({
    asm_number: '',
    internal_g_number: '',
    description: '',
    reference_image_url: '',
  });

  const [openBoardId, setOpenBoardId] = useState<string | null>(null);

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards', search],
    queryFn: () => api.getBoards(search || undefined),
  });

  const selectedBoardSummary = useMemo(() => {
    if (!openBoardId) return null;
    return boards.find((b: any) => b.id === openBoardId) || null;
  }, [boards, openBoardId]);

  const { data: boardDetails, isLoading: isLoadingBoardDetails } = useQuery({
    queryKey: ['board', openBoardId],
    queryFn: () => api.getBoard(openBoardId!),
    enabled: !!openBoardId,
  });

  const createBoardMutation = useMutation({
    mutationFn: api.createBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setIsCreateOpen(false);
      setNewBoard({ asm_number: '', internal_g_number: '', description: '' });
      setNewReferenceFile(null);
      setNewReferencePreview(null);
      setReferenceUploadProgress(0);
      setIsUploadingReference(false);
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateBoard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      if (editingBoard?.id) {
        queryClient.invalidateQueries({ queryKey: ['board', editingBoard.id] });
      }
      setIsEditOpen(false);
      setEditingBoard(null);
      setEditReferenceFile(null);
      setEditReferencePreview(null);
      setReferenceUploadProgress(0);
      setIsUploadingReference(false);
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: api.deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setOpenBoardId(null);
    },
  });

  const addCycleTimeMutation = useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: any }) => api.addBoardCycleTime(boardId, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['board', vars.boardId] });
    },
  });

  const updateCycleTimeMutation = useMutation({
    mutationFn: ({ cycleTimeId, data }: { cycleTimeId: string; data: any }) => api.updateBoardCycleTime(cycleTimeId, data),
    onSuccess: () => {
      if (openBoardId) queryClient.invalidateQueries({ queryKey: ['board', openBoardId] });
    },
  });

  const deleteCycleTimeMutation = useMutation({
    mutationFn: api.deleteBoardCycleTime,
    onSuccess: () => {
      if (openBoardId) queryClient.invalidateQueries({ queryKey: ['board', openBoardId] });
    },
  });

  const addBoardAlertMutation = useMutation({
    mutationFn: ({ boardId, content }: { boardId: string; content: string }) =>
      api.addBoardAlert(boardId, { content }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['board', vars.boardId] });
    },
  });

  const updateBoardAlertMutation = useMutation({
    mutationFn: ({ alertId, content }: { alertId: string; content: string }) =>
      api.updateBoardAlert(alertId, { content }),
    onSuccess: () => {
      if (openBoardId) queryClient.invalidateQueries({ queryKey: ['board', openBoardId] });
    },
  });

  const deleteBoardAlertMutation = useMutation({
    mutationFn: ({ alertId }: { alertId: string; boardId: string }) => api.deleteBoardAlert(alertId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['board', vars.boardId] });
    },
  });

  const handleCreateBoard = async () => {
    if (!newBoard.asm_number.trim() || !newBoard.description.trim()) return;

    try {
      setIsUploadingReference(!!newReferenceFile);
      setReferenceUploadProgress(0);

      let reference_image_url: string | undefined;
      if (newReferenceFile) {
        const res = await api.uploadBoardReferenceImage(newReferenceFile, setReferenceUploadProgress);
        reference_image_url = res.url;
      }

      createBoardMutation.mutate({
        asm_number: newBoard.asm_number.trim(),
        internal_g_number: newBoard.internal_g_number.trim() || undefined,
        description: newBoard.description.trim(),
        reference_image_url,
      });
    } catch (e: any) {
      console.error(e);
      alert(`Failed to upload reference image: ${e?.message || 'Please try again.'}`);
      setIsUploadingReference(false);
      setReferenceUploadProgress(0);
    }
  };

  const handleEditClick = (board: any) => {
    setEditingBoard(board);
    setEditBoard({
      asm_number: board.asm_number || '',
      internal_g_number: board.internal_g_number || '',
      description: board.description || '',
      reference_image_url: board.reference_image_url || '',
    });
    setEditReferenceFile(null);
    setEditReferencePreview(null);
    setIsEditOpen(true);
  };

  const handleUpdateBoard = async () => {
    if (!editingBoard?.id) return;

    try {
      setIsUploadingReference(!!editReferenceFile);
      setReferenceUploadProgress(0);

      let reference_image_url: string | undefined = editBoard.reference_image_url?.trim() || undefined;
      if (editReferenceFile) {
        const res = await api.uploadBoardReferenceImage(editReferenceFile, setReferenceUploadProgress);
        reference_image_url = res.url;
      }

      updateBoardMutation.mutate({
        id: editingBoard.id,
        data: {
          asm_number: editBoard.asm_number.trim() || undefined,
          internal_g_number: editBoard.internal_g_number.trim() || undefined,
          description: editBoard.description.trim() || undefined,
          reference_image_url,
        },
      });
    } catch (e: any) {
      console.error(e);
      alert(`Failed to upload reference image: ${e?.message || 'Please try again.'}`);
      setIsUploadingReference(false);
      setReferenceUploadProgress(0);
    }
  };

  const handleDeleteBoard = (board: any) => {
    if (!board?.id) return;
    if (window.confirm(`Delete board ${board.asm_number}? This cannot be undone.`)) {
      deleteBoardMutation.mutate(board.id);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Boards</h1>
            <p className="text-gray-500 text-sm mt-1">Manage boards and theoretical cycle times</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Board
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Board</DialogTitle>
                <DialogDescription>Add a new board to the system.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new_asm">ASM #</Label>
                  <Input
                    id="new_asm"
                    placeholder="ASM902831"
                    value={newBoard.asm_number}
                    onChange={(e) => setNewBoard({ ...newBoard, asm_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="new_g">Internal G #</Label>
                  <Input
                    id="new_g"
                    placeholder="G123456"
                    value={newBoard.internal_g_number}
                    onChange={(e) => setNewBoard({ ...newBoard, internal_g_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="new_desc">Description</Label>
                  <Input
                    id="new_desc"
                    placeholder="Board description/name"
                    value={newBoard.description}
                    onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference Board Image (Optional)</Label>
                  {newReferencePreview ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={newReferencePreview}
                        alt="Reference preview"
                        className="h-20 w-20 object-cover rounded border"
                      />
                      <div className="space-y-2">
                        <div className="text-xs text-gray-600">
                          {isUploadingReference && referenceUploadProgress > 0 ? `Uploading… ${referenceUploadProgress}%` : 'Preview'}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewReferenceFile(null);
                              setNewReferencePreview(null);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setNewReferenceFile(f);
                        if (f) {
                          const url = URL.createObjectURL(f);
                          setNewReferencePreview(url);
                        } else {
                          setNewReferencePreview(null);
                        }
                      }}
                    />
                  )}
                  <div className="text-xs text-gray-500">JPEG/PNG/WebP/HEIC, up to 5MB.</div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBoard} disabled={createBoardMutation.isPending || isUploadingReference}>
                  {isUploadingReference ? 'Uploading...' : createBoardMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <Input
            placeholder="Search boards by ASM, G#, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Boards list */}
        <Card>
          <CardHeader>
            <CardTitle>All Boards</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading…' : `${boards.length} board(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading boards…</div>
            ) : boards.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No boards found</div>
            ) : (
              <div className="space-y-2">
                {boards.map((b: any) => {
                  const workOrderCount = b.work_orders?.[0]?.count || 0;
                  const isOpen = openBoardId === b.id;

                  return (
                    <Collapsible
                      key={b.id}
                      open={isOpen}
                      onOpenChange={(open) => setOpenBoardId(open ? b.id : null)}
                    >
                      <div className="border rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="cursor-pointer hover:bg-gray-50 transition-colors px-4 py-3 flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-medium text-primary">{b.asm_number}</div>
                                {b.internal_g_number && (
                                  <Badge variant="outline" className="font-normal">
                                    {b.internal_g_number}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="font-normal">
                                  {workOrderCount} WO
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 truncate">{b.description}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(b);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBoard(b);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border-t bg-white px-4 py-4 space-y-6">
                            {/* Board alerts */}
                            <BoardAlerts
                              boardId={b.id}
                              loading={isLoadingBoardDetails && openBoardId === b.id}
                              alerts={isOpen ? (boardDetails?.board_alerts || []) : []}
                              onAdd={(content) => addBoardAlertMutation.mutate({ boardId: b.id, content })}
                              onUpdate={(alertId, content) => updateBoardAlertMutation.mutate({ alertId, content })}
                              onDelete={(alertId) => {
                                if (window.confirm('Delete this alert?')) {
                                  deleteBoardAlertMutation.mutate({ alertId, boardId: b.id });
                                }
                              }}
                              disabled={
                                addBoardAlertMutation.isPending ||
                                updateBoardAlertMutation.isPending ||
                                deleteBoardAlertMutation.isPending
                              }
                            />

                            {/* Cycle times */}
                            <BoardCycleTimes
                              boardId={b.id}
                              loading={isLoadingBoardDetails && openBoardId === b.id}
                              cycleTimes={isOpen ? (boardDetails?.board_cycle_times || []) : []}
                              onAdd={(data) => addCycleTimeMutation.mutate({ boardId: b.id, data })}
                              onUpdate={(cycleTimeId, data) => updateCycleTimeMutation.mutate({ cycleTimeId, data })}
                              onDelete={(cycleTimeId) => {
                                if (window.confirm('Delete this cycle time?')) {
                                  deleteCycleTimeMutation.mutate(cycleTimeId);
                                }
                              }}
                              disabled={
                                addCycleTimeMutation.isPending ||
                                updateCycleTimeMutation.isPending ||
                                deleteCycleTimeMutation.isPending
                              }
                            />

                            {/* Linked work orders */}
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-800">Linked Work Orders</div>
                              {isOpen && selectedBoardSummary && isLoadingBoardDetails ? (
                                <div className="text-sm text-gray-500">Loading work orders…</div>
                              ) : isOpen && (boardDetails?.work_orders?.length || 0) === 0 ? (
                                <div className="text-sm text-gray-500">No work orders linked yet.</div>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {(isOpen ? boardDetails?.work_orders || [] : []).map((wo: any) => (
                                    <div key={wo.id} className="border rounded-md p-3">
                                      <div className="text-sm font-medium">{wo.work_order_number}</div>
                                      <div className="text-xs text-gray-500">
                                        {wo.status} • Qty {wo.quantity}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Board</DialogTitle>
              <DialogDescription>Update board details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_asm">ASM #</Label>
                <Input
                  id="edit_asm"
                  value={editBoard.asm_number}
                  onChange={(e) => setEditBoard({ ...editBoard, asm_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_g">Internal G #</Label>
                <Input
                  id="edit_g"
                  value={editBoard.internal_g_number}
                  onChange={(e) => setEditBoard({ ...editBoard, internal_g_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_desc">Description</Label>
                <Input
                  id="edit_desc"
                  value={editBoard.description}
                  onChange={(e) => setEditBoard({ ...editBoard, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reference Board Image (Optional)</Label>
                {(editReferencePreview || editBoard.reference_image_url) ? (
                  <div className="flex items-start gap-3">
                    <img
                      src={editReferencePreview || editBoard.reference_image_url}
                      alt="Reference"
                      className="h-20 w-20 object-cover rounded border"
                    />
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">
                        {isUploadingReference && referenceUploadProgress > 0 ? `Uploading… ${referenceUploadProgress}%` : 'Reference image'}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setEditReferenceFile(f);
                            if (f) {
                              const url = URL.createObjectURL(f);
                              setEditReferencePreview(url);
                            } else {
                              setEditReferencePreview(null);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditReferenceFile(null);
                            setEditReferencePreview(null);
                            setEditBoard({ ...editBoard, reference_image_url: '' });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setEditReferenceFile(f);
                      if (f) {
                        const url = URL.createObjectURL(f);
                        setEditReferencePreview(url);
                      } else {
                        setEditReferencePreview(null);
                      }
                    }}
                  />
                )}
                <div className="text-xs text-gray-500">JPEG/PNG/WebP/HEIC, up to 5MB.</div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateBoard} disabled={updateBoardMutation.isPending || isUploadingReference}>
                {isUploadingReference ? 'Uploading...' : updateBoardMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function BoardAlerts(props: {
  boardId: string;
  loading: boolean;
  alerts: any[];
  onAdd: (content: string) => void;
  onUpdate: (alertId: string, content: string) => void;
  onDelete: (alertId: string) => void;
  disabled: boolean;
}) {
  const [newAlertContent, setNewAlertContent] = useState('');
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [editContent, setEditContent] = useState('');

  if (props.loading) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-800">Board Alerts</div>
        <div className="text-sm text-gray-500">Loading alerts…</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-800">Board Alerts</div>
        <Badge variant="outline" className="font-normal">
          {props.alerts.length} alert(s)
        </Badge>
      </div>

      {/* Add */}
      <div className="space-y-2">
        <RichTextEditor
          content={newAlertContent}
          onChange={setNewAlertContent}
          placeholder="Enter a board alert…"
        />
        <Button
          variant="outline"
          className="w-full"
          disabled={props.disabled || !newAlertContent.trim()}
          onClick={() => {
            props.onAdd(newAlertContent);
            setNewAlertContent('');
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Alert
        </Button>
      </div>

      {/* List */}
      {props.alerts.length === 0 ? (
        <div className="text-sm text-gray-500">No alerts yet.</div>
      ) : (
        <div className="space-y-2">
          {props.alerts.map((a: any) => (
            <div key={a.id} className="border rounded-md p-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="rich-text flex-1"
                  dangerouslySetInnerHTML={{ __html: a.content }}
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={props.disabled}
                    onClick={() => {
                      setEditingAlert(a);
                      setEditContent(a.content || '');
                    }}
                    aria-label="Edit alert"
                    title="Edit alert"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={props.disabled}
                    onClick={() => props.onDelete(a.id)}
                    aria-label="Delete alert"
                    title="Delete alert"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={!!editingAlert}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAlert(null);
            setEditContent('');
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Alert</DialogTitle>
            <DialogDescription>Update the board alert text.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <RichTextEditor content={editContent} onChange={setEditContent} placeholder="Update alert…" />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingAlert(null);
                setEditContent('');
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={props.disabled || !editContent.trim() || !editingAlert?.id}
              onClick={() => {
                props.onUpdate(editingAlert.id, editContent);
                setEditingAlert(null);
                setEditContent('');
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BoardCycleTimes(props: {
  boardId: string;
  loading: boolean;
  cycleTimes: any[];
  onAdd: (data: any) => void;
  onUpdate: (cycleTimeId: string, data: any) => void;
  onDelete: (cycleTimeId: string) => void;
  disabled: boolean;
}) {
  const [newMachineName, setNewMachineName] = useState('');
  const [newCycleTime, setNewCycleTime] = useState('');

  if (props.loading) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-800">Theoretical Cycle Times</div>
        <div className="text-sm text-gray-500">Loading cycle times…</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-800">Theoretical Cycle Times</div>
        <Badge variant="outline" className="font-normal">
          {props.cycleTimes.length} machine(s)
        </Badge>
      </div>

      {/* Add */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
        <div className="sm:col-span-2">
          <Label htmlFor={`machine_${props.boardId}`}>Machine</Label>
          <Input
            id={`machine_${props.boardId}`}
            placeholder="e.g., P&P Line 2"
            value={newMachineName}
            onChange={(e) => setNewMachineName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`ct_${props.boardId}`}>Cycle Time (sec)</Label>
          <Input
            id={`ct_${props.boardId}`}
            type="number"
            placeholder="45"
            value={newCycleTime}
            onChange={(e) => setNewCycleTime(e.target.value)}
          />
        </div>
        <div className="sm:col-span-3">
          <Button
            variant="outline"
            className="w-full"
            disabled={props.disabled || !newMachineName.trim() || !newCycleTime.trim()}
            onClick={() => {
              props.onAdd({
                machine_name: newMachineName.trim(),
                cycle_time_seconds: Number(newCycleTime),
              });
              setNewMachineName('');
              setNewCycleTime('');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Cycle Time
          </Button>
        </div>
      </div>

      {/* List */}
      {props.cycleTimes.length === 0 ? (
        <div className="text-sm text-gray-500">No cycle times yet.</div>
      ) : (
        <div className="space-y-2">
          {props.cycleTimes.map((ct: any) => (
            <CycleTimeRow
              key={ct.id}
              cycleTime={ct}
              disabled={props.disabled}
              onUpdate={(data) => props.onUpdate(ct.id, data)}
              onDelete={() => props.onDelete(ct.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CycleTimeRow(props: {
  cycleTime: any;
  disabled: boolean;
  onUpdate: (data: any) => void;
  onDelete: () => void;
}) {
  const [machineName, setMachineName] = useState(props.cycleTime.machine_name || '');
  const [cycleTimeSeconds, setCycleTimeSeconds] = useState(
    props.cycleTime.cycle_time_seconds?.toString?.() || '',
  );

  const dirty =
    machineName !== (props.cycleTime.machine_name || '') ||
    cycleTimeSeconds !== (props.cycleTime.cycle_time_seconds?.toString?.() || '');

  return (
    <div className="border rounded-md p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
      <div className="sm:col-span-2">
        <Label className="text-xs text-gray-500">Machine</Label>
        <Input value={machineName} onChange={(e) => setMachineName(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs text-gray-500">Cycle Time (sec)</Label>
        <Input
          type="number"
          value={cycleTimeSeconds}
          onChange={(e) => setCycleTimeSeconds(e.target.value)}
        />
      </div>
      <div className="sm:col-span-3 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={props.disabled || !dirty}
          onClick={() =>
            props.onUpdate({
              machine_name: machineName.trim() || undefined,
              cycle_time_seconds: cycleTimeSeconds.trim() ? Number(cycleTimeSeconds) : undefined,
            })
          }
        >
          Save
        </Button>
        <Button variant="destructive" className="flex-1" disabled={props.disabled} onClick={props.onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}




