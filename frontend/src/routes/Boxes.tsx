import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBoxes } from '@/store/boxesSlice';
import type { RootState, AppDispatch } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Box {
  id: string;
  name: string | null;
  hostId: number | null;
  [key: string]: any; 
}

export default function BoxesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, error } = useSelector((state: RootState) => state.boxes);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);

  useEffect(() => {
    dispatch(fetchBoxes());
  }, [dispatch]);

  useEffect(() => {
  }, [items, loading, error]);

  const validItems = (items as Box[]).filter((item) => {
    const hasId = item && typeof item.boxId === 'string' && item.boxId.length > 0;
    return hasId;
  });


  return (
    <div key="page-container" className="@container/main flex flex-1 flex-col gap-2">
      <div key="content-container" className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">Loading boxes...</div>
              <div className="text-sm text-muted-foreground">Please wait while we fetch your boxes</div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-red-500">
              <div className="text-lg font-medium mb-2">Error loading boxes</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && validItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {validItems.map((box) => (
              <Card key={`box-${box.boxId}`} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Box {box.boxId}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Location:</span>
                      <span className="text-sm font-medium">{box.location || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <span className="text-sm font-medium">{box.status || '-'}</span>
                    </div>
                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSelectedBox(box)}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && validItems.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">No boxes found</div>
              <div className="text-sm text-muted-foreground">You don't have any boxes yet</div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedBox} onOpenChange={() => setSelectedBox(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Box Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected box
            </DialogDescription>
          </DialogHeader>
          {selectedBox && (
            <div className="grid gap-4 py-4">
              {Object.entries(selectedBox).map(([key, value]) => (
                <div key={key} className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">{key}</div>
                  <div className="col-span-3">{value?.toString() || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
