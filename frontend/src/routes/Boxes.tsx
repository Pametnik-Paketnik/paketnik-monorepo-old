import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBoxes } from '@/store/boxesSlice';
import type { RootState, AppDispatch } from '@/store';
import { apiPost, apiPatch, apiPostFormData, apiDelete } from '@/lib/api';
import { Card } from '@/components/ui/card';
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

interface BoxImage {
  id: number;
  imageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  imageUrl: string;
  isPrimary: boolean;
  createdAt: string;
}

interface Box {
  id: string;
  boxId: string;
  name: string | null;
  location: string | null;
  hostId: number | null;
  pricePerNight: string | number;
  images?: BoxImage[];
}

export default function BoxesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, error } = useSelector((state: RootState) => state.boxes);
  const user = useSelector((state: RootState) => state.auth.user);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBoxData, setNewBoxData] = useState({
    boxId: '',
    location: '',
    pricePerNight: ''
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [addBoxError, setAddBoxError] = useState<string | null>(null);
  const [newEditImages, setNewEditImages] = useState<File[]>([]);
  const [newEditPreviews, setNewEditPreviews] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

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

  // Handle image selection and create previews
  const handleImageSelection = (files: File[]) => {
    const totalImages = selectedImages.length + files.length;
    if (totalImages > 10) {
      setAddBoxError('Maximum 10 images allowed');
      return;
    }

    // Append to existing images instead of replacing
    const newImages = [...selectedImages, ...files];
    setSelectedImages(newImages);
    setAddBoxError(null);

    // Create preview URLs for new files only
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  // Remove a specific image
  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Clean up the removed preview URL
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
    
    // Adjust primary image index if necessary
    if (index === primaryImageIndex) {
      setPrimaryImageIndex(0); // Reset to first image
    } else if (index < primaryImageIndex) {
      setPrimaryImageIndex(primaryImageIndex - 1); // Shift index down
    }
  };

  // Set primary image
  const setPrimaryImage = (index: number) => {
    setPrimaryImageIndex(index);
  };

  // Clean up preview URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleAddBox = async () => {
    if (!user?.id) {
      setAddBoxError('No user ID available');
      return;
    }

    // Reset any previous errors
    setAddBoxError(null);
    setIsSubmitting(true);
    
    try {
      let response;
      
      if (selectedImages.length > 0) {
        // Use FormData for requests with images
        const formData = new FormData();
        formData.append('boxId', newBoxData.boxId);
        formData.append('location', newBoxData.location);
        formData.append('ownerId', user.id.toString());
        formData.append('pricePerNight', newBoxData.pricePerNight);
        
        // Append images with primary image first
        const reorderedImages = [...selectedImages];
        if (primaryImageIndex > 0) {
          // Move primary image to first position
          const primaryImage = reorderedImages.splice(primaryImageIndex, 1)[0];
          reorderedImages.unshift(primaryImage);
        }
        
        reorderedImages.forEach((image) => {
          formData.append('images', image);
        });

        response = await apiPostFormData(`${import.meta.env.VITE_API_URL}/boxes`, formData);
      } else {
        // Use regular JSON request when no images
        response = await apiPost(`${import.meta.env.VITE_API_URL}/boxes`, {
          ...newBoxData,
          ownerId: user.id,
          pricePerNight: Number(newBoxData.pricePerNight)
        });
      }

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Failed to add box';
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // Handle specific error cases
        if (response.status === 409) {
          errorMessage = `Box with ID "${newBoxData.boxId}" already exists. Please choose a different ID.`;
        } else if (response.status === 400) {
          errorMessage = 'Invalid data provided. Please check all fields.';
        } else if (response.status === 401) {
          errorMessage = 'You are not authorized to create boxes.';
        }
        
        throw new Error(errorMessage);
      }

      // Success - refresh the boxes list and close dialog
      dispatch(fetchBoxes());
      setIsAddDialogOpen(false);
      setNewBoxData({
        boxId: '',
        location: '',
        pricePerNight: ''
      });
      setSelectedImages([]);
      setPrimaryImageIndex(0);
      
      // Clean up image previews
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImagePreviews([]);
      
    } catch (error) {
      console.error('Error adding box:', error);
      setAddBoxError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBox = async () => {
    if (!user?.id || !editingBox) {
      console.error('No user ID or box data available');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update box basic information
      const response = await apiPatch(`${import.meta.env.VITE_API_URL}/boxes/${editingBox.boxId}`, {
        location: editingBox.location,
        pricePerNight: editingBox.pricePerNight ? Number(editingBox.pricePerNight) : null
      });

      if (!response.ok) {
        throw new Error('Failed to update box');
      }

      // Handle image deletions (if any)
      for (const imageId of imagesToDelete) {
        try {
          const deleteResponse = await apiDelete(`${import.meta.env.VITE_API_URL}/boxes/${editingBox.boxId}/images/${imageId}`);
          if (!deleteResponse.ok) {
            console.warn(`Failed to delete image ${imageId}`);
          }
        } catch (error) {
          console.warn(`Error deleting image ${imageId}:`, error);
        }
      }

      // Handle new image uploads (if any) - upload one by one
      if (newEditImages.length > 0) {
        for (let i = 0; i < newEditImages.length; i++) {
          try {
            const formData = new FormData();
            formData.append('image', newEditImages[i]); // Note: 'image' not 'images'
            
            const uploadResponse = await apiPostFormData(`${import.meta.env.VITE_API_URL}/boxes/${editingBox.boxId}/images`, formData);
            if (!uploadResponse.ok) {
              console.warn(`Failed to upload image ${i + 1}`);
            }
          } catch (error) {
            console.warn(`Error uploading image ${i + 1}:`, error);
          }
        }
      }

      // Refresh the boxes list
      dispatch(fetchBoxes());
      setSelectedBox(null);
      setEditingBox(null);
      // Clean up edit image state
      setNewEditImages([]);
      newEditPreviews.forEach(url => URL.revokeObjectURL(url));
      setNewEditPreviews([]);
      setImagesToDelete([]);
    } catch (error) {
      console.error('Error updating box:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBox = async () => {
    if (!editingBox) {
      console.error('No box data available');
      return;
    }

    if (!confirm(`Are you sure you want to delete Box ${editingBox.boxId}? This action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiDelete(`${import.meta.env.VITE_API_URL}/boxes/${editingBox.boxId}`);

      if (!response.ok) {
        throw new Error('Failed to delete box');
      }

      // Refresh the boxes list
      dispatch(fetchBoxes());
      setSelectedBox(null);
      setEditingBox(null);
    } catch (error) {
      console.error('Error deleting box:', error);
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
            {validItems.map((box) => {
              const primaryImage = box.images?.find(img => img.isPrimary) || box.images?.[0];
              const hasImages = box.images && box.images.length > 0;
              
              return (
                <Card 
                  key={`box-${box.boxId}`} 
                  className="flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => setSelectedBox(box)}
                >
                  {/* Image Section */}
                  <div className="relative h-48 bg-gray-100">
                    {hasImages && primaryImage ? (
                      <>
                        <img
                          src={`http://${primaryImage.imageUrl}`}
                          alt={`Box ${box.boxId}`}
                          className="w-full h-full object-cover rounded-t-lg"
                          onError={(e) => {
                            // Hide image if failed to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {box.images && box.images.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            +{box.images.length - 1} more
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 rounded-t-lg">
                        <div className="text-center">
                          <div className="text-2xl mb-1">📦</div>
                          <div className="text-sm">No Image</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex-1">
                    <h3 className="text-lg font-semibold mb-3">Box {box.boxId}</h3>
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
                      {hasImages && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Images:</span>
                          <span className="text-sm font-medium">{box.images?.length || 0}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
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
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          // Clean up when closing dialog
          setAddBoxError(null);
          setSelectedImages([]);
          imagePreviews.forEach(url => URL.revokeObjectURL(url));
          setImagePreviews([]);
          setPrimaryImageIndex(0);
          setNewBoxData({
            boxId: '',
            location: '',
            pricePerNight: ''
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Box</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new box
            </DialogDescription>
          </DialogHeader>
          
          {addBoxError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="flex">
                <div className="text-red-800 text-sm">
                  {addBoxError}
                </div>
              </div>
            </div>
          )}
          
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
            <div className="grid gap-2">
              <Label>Images (Optional - Max 10)</Label>
              
              {/* Custom File Input and Image Previews Grid */}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {/* Image Previews */}
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPrimaryImage(index)}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-black/70 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors"
                    >
                      ×
                    </button>
                    {index === primaryImageIndex && (
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Primary
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Add Images Button */}
                {selectedImages.length < 10 && (
                  <div className="relative aspect-square">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleImageSelection(files);
                        e.target.value = ''; // Reset input to allow selecting same files again
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
              
              {selectedImages.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedImages.length} image(s) selected • Click image to set as primary
                </div>
              )}
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
              disabled={isSubmitting || !newBoxData.boxId || !newBoxData.location || !newBoxData.pricePerNight}
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
        // Clean up edit image state
        setNewEditImages([]);
        newEditPreviews.forEach(url => URL.revokeObjectURL(url));
        setNewEditPreviews([]);
        setImagesToDelete([]);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Box {selectedBox?.boxId} Details</DialogTitle>
            <DialogDescription>
              Edit box information and view images
            </DialogDescription>
          </DialogHeader>
          {editingBox && (
            <div className="grid gap-4 py-4">
              {/* Box Images Display */}
              {editingBox.images && editingBox.images.length > 0 && (
                <div className="grid gap-2">
                  <Label>Box Images ({editingBox.images.length})</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                    {[...editingBox.images]
                      .filter(img => !imagesToDelete.includes(img.id))
                      .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)) // Primary first
                      .map((image) => (
                        <div key={image.id} className="relative aspect-square">
                                                    <img
                            src={`http://${image.imageUrl}`}
                            alt={image.fileName}
                            className="w-full h-full object-cover rounded-lg border"
                            onError={(e) => {
                              // Show placeholder if image fails to load
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ci8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTJhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagesToDelete(prev => [...prev, image.id]);
                            }}
                            className="absolute -top-2 -right-2 bg-black/70 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors"
                          >
                            ×
                          </button>
                          {image.isPrimary && (
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              Primary
                            </div>
                          )}
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {Math.round(image.fileSize / 1024)}KB
                          </div>
                        </div>
                      ))}
                    
                    {/* New Images Previews */}
                    {newEditPreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="relative aspect-square">
                        <img
                          src={preview}
                          alt={`New image ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg border border-blue-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = newEditImages.filter((_, i) => i !== index);
                            const newPreviews = newEditPreviews.filter((_, i) => i !== index);
                            URL.revokeObjectURL(newEditPreviews[index]);
                            setNewEditImages(newImages);
                            setNewEditPreviews(newPreviews);
                          }}
                          className="absolute -top-2 -right-2 bg-black/70 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors"
                        >
                          ×
                        </button>
                        <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          New
                        </div>
                      </div>
                    ))}
                    
                    {/* Add New Images Button */}
                    {(editingBox.images?.length || 0) - imagesToDelete.length + newEditImages.length < 10 && (
                      <div className="relative aspect-square">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            const totalImages = (editingBox.images?.length || 0) - imagesToDelete.length + newEditImages.length + files.length;
                            if (totalImages > 10) {
                              alert('Maximum 10 images allowed');
                              return;
                            }
                            
                            const newImages = [...newEditImages, ...files];
                            setNewEditImages(newImages);
                            
                            const newPreviews = files.map(file => URL.createObjectURL(file));
                            setNewEditPreviews(prev => [...prev, ...newPreviews]);
                            e.target.value = '';
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
                          <Plus className="h-8 w-8 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Click × to remove images • Add new images with the + button • Primary image is shown first
                  </div>
                </div>
              )}
              
              {/* Box Information Form */}
              <div className="grid gap-2">
                <Label>Box ID</Label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm font-medium">
                  {editingBox.boxId}
                </div>
                <div className="text-xs text-muted-foreground">
                  Box ID cannot be changed
                </div>
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
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={handleDeleteBox}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Box'}
            </Button>
            <div className="flex gap-2">
                              <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedBox(null);
                    setEditingBox(null);
                    // Clean up edit image state
                    setNewEditImages([]);
                    newEditPreviews.forEach(url => URL.revokeObjectURL(url));
                    setNewEditPreviews([]);
                    setImagesToDelete([]);
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
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
