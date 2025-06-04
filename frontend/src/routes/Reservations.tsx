import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReservations } from '@/store/reservationsSlice';
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Box {
  id: string;
  boxId: string;
  location: string;
  status: string;
  pricePerNight: number;
}

interface BoxAvailability {
  boxId: string;
  location: string;
  unavailableDates: Array<{
    startDate: string;
    endDate: string;
    status: string;
  }>;
}

interface Reservation {
  id: string;
  boxId: string;
  guestId: string;
  checkinAt: string;
  checkoutAt: string;
  status: string;
  totalPrice: number;
  hostId: number;
  [key: string]: any;
}

export default function ReservationsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, error } = useSelector((state: RootState) => state.reservations);
  const { items: boxes } = useSelector((state: RootState) => state.boxes);
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newReservationData, setNewReservationData] = useState({
    boxId: '',
    guestId: '',
    checkinAt: '',
    checkoutAt: '',
    hostId: user?.id || 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBoxAvailability, setSelectedBoxAvailability] = useState<BoxAvailability | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  useEffect(() => {
    dispatch(fetchReservations());
    dispatch(fetchBoxes());
  }, [dispatch]);

  const validItems = (items as Reservation[]).filter((item) => {
    return item && item.id;
  }).sort((a, b) => {
    const now = new Date();
    const dateA = new Date(a.checkinAt);
    const dateB = new Date(b.checkinAt);
    // Calculate absolute difference from current date
    const diffA = Math.abs(dateA.getTime() - now.getTime());
    const diffB = Math.abs(dateB.getTime() - now.getTime());
    return diffA - diffB;
  });

  const totalReservations = validItems.length;

  const validBoxes = (boxes as Box[]).filter((item) => {
    const hasId = item && typeof item.boxId === 'string' && item.boxId.length > 0;
    return hasId;
  });

  const fetchBoxAvailability = async (boxId: string) => {
    if (!token) return;
    
    setIsLoadingAvailability(true);
    try {
      const response = await fetch(`http://localhost:3000/api/boxes/${boxId}/availability`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch box availability');
      }

      const data = await response.json();
      setSelectedBoxAvailability(data);
    } catch (error) {
      console.error('Error fetching box availability:', error);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const handleBoxChange = (boxId: string) => {
    setNewReservationData(prev => ({ ...prev, boxId }));
    fetchBoxAvailability(boxId);
  };

  const isDateUnavailable = (date: Date) => {
    if (!selectedBoxAvailability) return false;

    return selectedBoxAvailability.unavailableDates.some(({ startDate, endDate }) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return date >= start && date <= end;
    });
  };

  const getDateClassName = (date: Date) => {
    if (isDateUnavailable(date)) {
      return 'bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200 hover:text-gray-400';
    }
    return '';
  };

  const handleAddReservation = async () => {
    if (!user?.id || !token) {
      console.error('No user ID or token available');
      return;
    }

    console.log('Starting reservation creation with data:', {
      newReservationData,
      user: user.id,
      token: token ? 'Token exists' : 'No token'
    });

    setIsSubmitting(true);
    try {
      const requestBody = {
        guestId: parseInt(newReservationData.guestId),
        hostId: user.id,
        boxId: newReservationData.boxId,
        checkinAt: newReservationData.checkinAt,
        checkoutAt: newReservationData.checkoutAt
      };

      console.log('Sending reservation request with body:', requestBody);

      const response = await fetch(`http://localhost:3000/api/reservations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error(`Failed to add reservation: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Successfully created reservation:', responseData);

      // Refresh the reservations list
      dispatch(fetchReservations());
      setIsAddDialogOpen(false);
      setNewReservationData({
        boxId: '',
        guestId: '',
        checkinAt: '',
        checkoutAt: '',
        hostId: user?.id || 0
      });
      setSelectedBoxAvailability(null);
    } catch (error) {
      console.error('Error in handleAddReservation:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div key="page-container" className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-6 lg:px-8">
      <div key="content-container" className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Reservations</h1>
            <p className="text-sm text-muted-foreground">Total Reservations: {totalReservations}</p>
          </div>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Reservation
          </Button>
        </div>

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

        {!loading && !error && validItems.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {validItems.map((reservation) => (
              <Card key={`reservation-${reservation.id}`} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Reservation {reservation.id}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Box ID:</span>
                      <span className="text-sm font-medium">{reservation.boxId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Guest ID:</span>
                      <span className="text-sm font-medium">{reservation.guestId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Check-in:</span>
                      <span className="text-sm font-medium">
                        {new Date(reservation.checkinAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Check-out:</span>
                      <span className="text-sm font-medium">
                        {new Date(reservation.checkoutAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <span className="text-sm font-medium">{reservation.status}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Price:</span>
                      <span className="text-sm font-medium">
                        ${typeof reservation.totalPrice === 'number' ? reservation.totalPrice.toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSelectedReservation(reservation)}
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
              <div className="text-lg font-medium mb-2">No reservations found</div>
              <div className="text-sm text-muted-foreground">You don't have any reservations yet</div>
            </div>
          </div>
        )}
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
              <Label htmlFor="boxId">Box</Label>
              <Select
                value={newReservationData.boxId}
                onValueChange={handleBoxChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a box" />
                </SelectTrigger>
                <SelectContent>
                  {validBoxes.map((box) => (
                    <SelectItem key={box.boxId} value={box.boxId}>
                      Box {box.boxId} - {box.location} (${box.pricePerNight}/night)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guestId">Guest ID</Label>
              <Input
                id="guestId"
                value={newReservationData.guestId}
                onChange={(e) => setNewReservationData(prev => ({ ...prev, guestId: e.target.value }))}
                placeholder="Enter guest ID"
                disabled={!newReservationData.boxId}
              />
            </div>
            <div className="grid gap-2">
              <Label>Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newReservationData.checkinAt && "text-muted-foreground"
                    )}
                    disabled={!newReservationData.boxId}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newReservationData.checkinAt ? (
                      format(new Date(newReservationData.checkinAt), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-3 h-3 rounded-sm bg-gray-200" />
                      <span>Unavailable dates</span>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={newReservationData.checkinAt ? new Date(newReservationData.checkinAt) : undefined}
                    onSelect={(date: Date | undefined) => date && setNewReservationData(prev => ({ 
                      ...prev, 
                      checkinAt: date.toISOString() 
                    }))}
                    disabled={(date: Date) => isDateUnavailable(date)}
                    className="rounded-md border"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                      ...getDateClassName
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Check-out Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newReservationData.checkoutAt && "text-muted-foreground"
                    )}
                    disabled={!newReservationData.boxId || !newReservationData.checkinAt}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newReservationData.checkoutAt ? (
                      format(new Date(newReservationData.checkoutAt), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-3 h-3 rounded-sm bg-gray-200" />
                      <span>Unavailable dates</span>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={newReservationData.checkoutAt ? new Date(newReservationData.checkoutAt) : undefined}
                    onSelect={(date: Date | undefined) => date && setNewReservationData(prev => ({ 
                      ...prev, 
                      checkoutAt: date.toISOString() 
                    }))}
                    disabled={(date: Date) => {
                      if (!newReservationData.checkinAt) return true;
                      const checkinDate = new Date(newReservationData.checkinAt);
                      return date <= checkinDate || isDateUnavailable(date);
                    }}
                    className="rounded-md border"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                      ...getDateClassName
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false);
                setSelectedBoxAvailability(null);
                setNewReservationData({
                  boxId: '',
                  guestId: '',
                  checkinAt: '',
                  checkoutAt: '',
                  hostId: user?.id || 0
                });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddReservation}
              disabled={isSubmitting || !newReservationData.boxId || !newReservationData.guestId || !newReservationData.checkinAt || !newReservationData.checkoutAt}
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
                    {key === 'checkinAt' || key === 'checkoutAt'
                      ? new Date(value as string).toLocaleDateString()
                      : key === 'totalPrice'
                      ? `$${typeof value === 'number' ? value.toFixed(2) : '0.00'}`
                      : value?.toString() || '-'}
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