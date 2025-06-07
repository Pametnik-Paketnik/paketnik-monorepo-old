import { InventoryItem } from '../../inventory-items/entities/inventory-item.entity';

export class CheckinWithInventoryResponseDto {
  success: boolean;
  message: string;
  reservationId: number;
  boxId: string;
  status: string;
  data: any;
  availableInventoryItems: InventoryItem[];
}
