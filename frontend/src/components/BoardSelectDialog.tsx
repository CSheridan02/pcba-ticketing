import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Search } from 'lucide-react';

export type BoardSummary = {
  id: string;
  asm_number: string;
  internal_g_number?: string | null;
  description: string;
  revision?: string | null;
};

export function BoardSelectDialog(props: {
  selectedBoard: BoardSummary | null;
  onSelect: (board: BoardSummary) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards', 'picker', search],
    queryFn: () => api.getBoards(search || undefined),
    enabled: open,
  });

  const selectedLabel = useMemo(() => {
    if (!props.selectedBoard) return 'Select a Board…';
    return `${props.selectedBoard.asm_number} — ${props.selectedBoard.description}`;
  }, [props.selectedBoard]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start" disabled={props.disabled}>
          <span className="truncate">{selectedLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Board</DialogTitle>
          <DialogDescription>Search by ASM, G#, or description.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search boards…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="border rounded-md max-h-[50vh] overflow-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : boards.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No boards found.</div>
            ) : (
              <div className="divide-y">
                {boards.map((b: any) => (
                  <button
                    key={b.id}
                    type="button"
                    className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      props.onSelect({
                        id: b.id,
                        asm_number: b.asm_number,
                        internal_g_number: b.internal_g_number,
                        description: b.description,
                        revision: b.revision,
                      });
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-primary">{b.asm_number}</div>
                      {b.internal_g_number && (
                        <Badge variant="outline" className="font-normal">
                          {b.internal_g_number}
                        </Badge>
                      )}
                      {b.revision && (
                        <Badge variant="secondary" className="font-normal">
                          Rev {b.revision}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{b.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}




