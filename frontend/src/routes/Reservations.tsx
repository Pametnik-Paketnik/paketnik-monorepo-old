import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReservations } from '@/store/reservationsSlice';
import type { RootState, AppDispatch } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Reservation {
  id: number;
  guestId: number;
  hostId: number;
  boxId: string;
  status: string;
  checkinAt: string;
  checkoutAt: string;
  [key: string]: any;
}

export default function ReservationsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, error } = useSelector((state: RootState) => state.reservations);
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newReservationData, setNewReservationData] = useState({
    boxId: '',
    guestId: '',
    checkinAt: '',
    checkoutAt: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchReservations());
  }, [dispatch]);

  const handleAddReservation = async () => {
    if (!user?.id || !token) {
      console.error('No user ID or token available');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          ...newReservationData,
          hostId: user.id,
          guestId: parseInt(newReservationData.guestId),
          checkinAt: new Date(newReservationData.checkinAt).toISOString(),
          checkoutAt: new Date(newReservationData.checkoutAt).toISOString(),
          status: 'PENDING'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add reservation');
      }

      // Refresh the reservations list
      dispatch(fetchReservations());
      setIsAddDialogOpen(false);
      setNewReservationData({
        boxId: '',
        guestId: '',
        checkinAt: '',
        checkoutAt: ''
      });
    } catch (error) {
      console.error('Error adding reservation:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Reservations</h1>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Reservation
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">Loading reservations...</div>
                  <div className="text-sm text-muted-foreground">Please wait while we fetch your reservations</div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center text-red-500">
                  <div className="text-lg font-medium mb-2">Error loading reservations</div>
                  <div className="text-sm">{error}</div>
                </div>
              </div>
            )}

            {!loading && !error && (
              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-4 py-2 border">ID</th>
                      <th className="px-4 py-2 border">Guest</th>
                      <th className="px-4 py-2 border">Host</th>
                      <th className="px-4 py-2 border">Box</th>
                      <th className="px-4 py-2 border">Check-in</th>
                      <th className="px-4 py-2 border">Check-out</th>
                      <th className="px-4 py-2 border">Status</th>
                      <th className="px-4 py-2 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((reservation: Reservation) => (
                      <tr key={reservation.id} className="border-b">
                        <td className="px-4 py-2 border">{reservation.id}</td>
                        <td className="px-4 py-2 border">{reservation.guestId || '-'}</td>
                        <td className="px-4 py-2 border">{reservation.hostId || '-'}</td>
                        <td className="px-4 py-2 border">{reservation.boxId || '-'}</td>
                        <td className="px-4 py-2 border">{new Date(reservation.checkinAt).toLocaleString()}</td>
                        <td className="px-4 py-2 border">{new Date(reservation.checkoutAt).toLocaleString()}</td>
                        <td className="px-4 py-2 border">{reservation.status || '-'}</td>
                        <td className="px-4 py-2 border">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setSelectedReservation(reservation)}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Reservation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Reservation</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new reservation
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="boxId">Box ID</Label>
              <Input
                id="boxId"
                value={newReservationData.boxId}
                onChange={(e) => setNewReservationData(prev => ({ ...prev, boxId: e.target.value }))}
                placeholder="Enter box ID (e.g., BOX126)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guestId">Guest ID</Label>
              <Input
                id="guestId"
                type="number"
                value={newReservationData.guestId}
                onChange={(e) => setNewReservationData(prev => ({ ...prev, guestId: e.target.value }))}
                placeholder="Enter guest ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkinAt">Check-in Date</Label>
              <Input
                id="checkinAt"
                type="datetime-local"
                value={newReservationData.checkinAt}
                onChange={(e) => setNewReservationData(prev => ({ ...prev, checkinAt: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkoutAt">Check-out Date</Label>
              <Input
                id="checkoutAt"
                type="datetime-local"
                value={newReservationData.checkoutAt}
                onChange={(e) => setNewReservationData(prev => ({ ...prev, checkoutAt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddReservation}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reservation Details Dialog */}
      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected reservation
            </DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="grid gap-4 py-4">
              {Object.entries(selectedReservation).map(([key, value]) => (
                <div key={key} className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">{key}</div>
                  <div className="col-span-3">
                    {key.includes('At') ? new Date(value).toLocaleString() : value?.toString() || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 