import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { InventoryItemsService } from './inventory-items.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryItem } from './entities/inventory-item.entity';

interface AuthenticatedRequest extends Request {
  user: { userId: number; username: string };
}

@ApiTags('inventory-items')
@ApiBearerAuth('access-token')
@Controller('inventory-items')
@UseGuards(JwtAuthGuard)
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new inventory item (hosts only)' })
  @ApiBody({
    description: 'Inventory item creation data',
    examples: {
      toiletPaper: {
        summary: 'Toilet Paper',
        description: 'Example of creating a toilet paper inventory item',
        value: {
          name: 'Premium Toilet Paper',
          description: 'Soft 3-ply toilet paper, pack of 12 rolls',
          price: 15.99,
          stockQuantity: 50,
          isAvailable: true,
        },
      },
      carpet: {
        summary: 'Carpet',
        description: 'Example of creating a carpet inventory item',
        value: {
          name: 'Bathroom Carpet',
          description: 'Soft microfiber bathroom carpet, 60x40cm',
          price: 25.5,
          stockQuantity: 20,
          isAvailable: true,
        },
      },
      towels: {
        summary: 'Towels',
        description: 'Example of creating towels inventory item',
        value: {
          name: 'Bath Towel Set',
          description: 'Set of 2 premium cotton bath towels',
          price: 35.0,
          stockQuantity: 15,
          isAvailable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The inventory item has been successfully created.',
    type: InventoryItem,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Only hosts can create inventory items.',
  })
  create(
    @Body() createInventoryItemDto: CreateInventoryItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inventoryItemsService.create(
      createInventoryItemDto,
      req.user.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all available inventory items' })
  @ApiResponse({
    status: 200,
    description: 'Return all available inventory items.',
    type: [InventoryItem],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll() {
    return this.inventoryItemsService.findAll();
  }

  @Get('host/:hostId')
  @ApiOperation({ summary: 'Get all inventory items for a specific host' })
  @ApiResponse({
    status: 200,
    description: 'Return all inventory items for the specified host.',
    type: [InventoryItem],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Only hosts can view their inventory.',
  })
  @ApiResponse({ status: 404, description: 'Host not found.' })
  findByHost(@Param('hostId') hostId: string) {
    return this.inventoryItemsService.findByHost(+hostId);
  }

  @Get('host/:hostId/available')
  @ApiOperation({
    summary:
      'Get all available inventory items for a specific host (host only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all available inventory items for the specified host.',
    type: [InventoryItem],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'You can only view available items for your own host account.',
  })
  @ApiResponse({ status: 404, description: 'Host not found.' })
  findAvailableByHost(
    @Param('hostId') hostId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if the requesting user is the same as the host
    if (+hostId !== req.user.userId) {
      throw new ForbiddenException(
        'You can only view available items for your own host account',
      );
    }
    return this.inventoryItemsService.findAvailableByHost(+hostId);
  }

  @Get('my-inventory')
  @ApiOperation({ summary: "Get current host's inventory items" })
  @ApiResponse({
    status: 200,
    description: 'Return all inventory items for the current host.',
    type: [InventoryItem],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Only hosts can view their inventory.',
  })
  findMyInventory(@Req() req: AuthenticatedRequest) {
    return this.inventoryItemsService.findByHost(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an inventory item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the inventory item.',
    type: InventoryItem,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Inventory item not found.' })
  findOne(@Param('id') id: string) {
    return this.inventoryItemsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an inventory item (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'The inventory item has been successfully updated.',
    type: InventoryItem,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'You can only update your own inventory items.',
  })
  @ApiResponse({ status: 404, description: 'Inventory item not found.' })
  update(
    @Param('id') id: string,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inventoryItemsService.update(
      +id,
      updateInventoryItemDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inventory item (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'The inventory item has been successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'You can only delete your own inventory items.',
  })
  @ApiResponse({ status: 404, description: 'Inventory item not found.' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.inventoryItemsService.remove(+id, req.user.userId);
  }
}
