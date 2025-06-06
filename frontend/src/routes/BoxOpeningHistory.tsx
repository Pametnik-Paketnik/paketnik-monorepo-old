import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBoxOpeningHistory } from '@/store/boxOpeningHistorySlice';
import type { RootState, AppDispatch } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface User {
  id: number;
  username: string;
  userType: string;
  createdAt: string;
  updatedAt: string;
}

interface BoxOpeningHistory {
  user: User;
  boxId: string;
  timestamp: string;
  status: string;
  tokenFormat: number;
}

export default function BoxOpeningHistoryPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, error } = useSelector((state: RootState) => state.boxOpeningHistory);

  useEffect(() => {
    dispatch(fetchBoxOpeningHistory());
  }, [dispatch]);

  const validItems = (items as BoxOpeningHistory[]).filter((item) => {
    return item && item.user && item.boxId;
  }).sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
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

  const getStatusBadge = (status: string) => {
    const variant = status === 'success' ? 'default' : 'destructive';
    return (
      <Badge variant={variant}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div>
          <h1 className="text-2xl font-bold">Box Opening History</h1>
          <p className="text-sm text-muted-foreground">
            All opening attempts for your boxes ({validItems.length} records)
          </p>
        </div>
        
        {validItems.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">No box opening history found</div>
              <div className="text-sm text-muted-foreground">No one has attempted to open your boxes yet</div>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Opening History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Box ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>User Type</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Token Format</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validItems.map((item, index) => (
                    <TableRow key={`${item.boxId}-${item.user.id}-${item.timestamp}-${index}`}>
                      <TableCell className="font-medium">{item.boxId}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.user.username}</div>
                          <div className="text-sm text-muted-foreground">ID: {item.user.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.user.userType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell>{item.tokenFormat}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 