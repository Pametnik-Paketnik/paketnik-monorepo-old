import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBoxOpeningHistory } from '@/store/boxOpeningHistorySlice';
import type { RootState, AppDispatch } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface BoxOpeningHistory {
  id: string;
  boxId: string;
  userId: number;
  openedAt: string;
  closedAt: string | null;
  status: string;
  [key: string]: any;
}

export default function BoxOpeningHistoryPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, error } = useSelector((state: RootState) => state.boxOpeningHistory);

  useEffect(() => {
    dispatch(fetchBoxOpeningHistory());
  }, [dispatch]);

  const validItems = (items as BoxOpeningHistory[]).filter((item) => {
    return item && item.id;
  }).sort((a, b) => {
    return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading box opening history...</div>
          <div className="text-sm text-muted-foreground">Please wait while we fetch your data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-500">
          <div className="text-lg font-medium mb-2">Error loading box opening history</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <h1 className="text-2xl font-bold">Box Opening History</h1>
        
        {validItems.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">No box opening history found</div>
              <div className="text-sm text-muted-foreground">You haven't opened any boxes yet</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {validItems.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Box {item.boxId}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Opened At:</span>
                      <span className="text-sm font-medium">
                        {new Date(item.openedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Closed At:</span>
                      <span className="text-sm font-medium">
                        {item.closedAt ? new Date(item.closedAt).toLocaleString() : 'Still Open'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <span className="text-sm font-medium">{item.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 