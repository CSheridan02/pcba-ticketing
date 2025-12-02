import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Plus, Trash2, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const queryClient = useQueryClient();

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.getAreas(),
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

  const handleAddArea = () => {
    if (!newAreaName.trim()) return;
    createAreaMutation.mutate({ name: newAreaName.trim() });
  };

  const handleDeleteArea = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the area "${name}"?`)) {
      deleteAreaMutation.mutate(id);
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

