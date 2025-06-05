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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface Box {
  id: string;
  name: string | null;
  hostId: number | null;
  pricePerNight: string | number;
  [key: string]: any; 
}

export default function BoxesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, error } = useSelector((state: RootState) => state.boxes);
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBoxData, setNewBoxData] = useState({
    boxId: '',
    location: '',
    pricePerNight: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);

  useEffect(() => {
    dispatch(fetchBoxes());
  }, [dispatch]);

  useEffect(() => {
    if (selectedBox) {
      setEditingBox(selectedBox);
    }
  }, [selectedBox]);

  const validItems = (items as Box[]).filter((item) => {
    const hasId = item && typeof item.boxId === 'string' && item.boxId.length > 0;
    return hasId;
  });

  const handleAddBox = async () => {
    if (!user?.id || !token) {
      console.error('No user ID or token available');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/boxes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          ...newBoxData,
          ownerId: user.id,
          pricePerNight: Number(newBoxData.pricePerNight)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add box');
      }

      // Refresh the boxes list
      dispatch(fetchBoxes());
      setIsAddDialogOpen(false);
      setNewBoxData({
        boxId: '',
        location: '',
        pricePerNight: ''
      });
    } catch (error) {
      console.error('Error adding box:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBox = async () => {
    if (!user?.id || !token || !editingBox) {
      console.error('No user ID, token, or box data available');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/boxes/${editingBox.boxId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          boxId: editingBox.boxId,
          location: editingBox.location,
          pricePerNight: editingBox.pricePerNight ? Number(editingBox.pricePerNight) : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update box');
      }

      // Refresh the boxes list
      dispatch(fetchBoxes());
      setSelectedBox(null);
      setEditingBox(null);
    } catch (error) {
      console.error('Error updating box:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div key="page-container" className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-6 lg:px-8">
      <div key="content-container" className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Boxes</h1>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Box
          </Button>
        </div>

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
                      <span className="text-sm text-muted-foreground">Price per night:</span>
                      <span className="text-sm font-medium">
                        ${Number(box.pricePerNight || 0).toFixed(2)}
                      </span>
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

      {/* Add Box Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Box</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new box
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="boxId">Box ID</Label>
              <Input
                id="boxId"
                value={newBoxData.boxId}
                onChange={(e) => setNewBoxData(prev => ({ ...prev, boxId: e.target.value }))}
                placeholder="Enter box ID (e.g., BOX126)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newBoxData.location}
                onChange={(e) => setNewBoxData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter box location"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pricePerNight">Price per Night</Label>
              <Input
                id="pricePerNight"
                type="number"
                step="0.01"
                min="0"
                value={newBoxData.pricePerNight}
                onChange={(e) => setNewBoxData(prev => ({ ...prev, pricePerNight: e.target.value }))}
                placeholder="Enter price per night"
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
              onClick={handleAddBox}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Box'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Box Details Dialog */}
      <Dialog open={!!selectedBox} onOpenChange={() => {
        setSelectedBox(null);
        setEditingBox(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Box Details</DialogTitle>
            <DialogDescription>
              Edit box information
            </DialogDescription>
          </DialogHeader>
          {editingBox && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-boxId">Box ID</Label>
                <Input
                  id="edit-boxId"
                  value={editingBox.boxId}
                  onChange={(e) => setEditingBox(prev => prev ? { ...prev, boxId: e.target.value } : null)}
                  placeholder="Enter box ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editingBox.location || ''}
                  onChange={(e) => setEditingBox(prev => prev ? { ...prev, location: e.target.value } : null)}
                  placeholder="Enter location"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-pricePerNight">Price per Night</Label>
                <Input
                  id="edit-pricePerNight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingBox.pricePerNight || ''}
                  onChange={(e) => setEditingBox(prev => prev ? { ...prev, pricePerNight: e.target.value } : null)}
                  placeholder="Enter price per night"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedBox(null);
                setEditingBox(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateBox}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
