import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ExtraOrdersService } from './extra-orders.service';
import { CreateExtraOrderDto } from './dto/create-extra-order.dto';
import { FulfillExtraOrderDto } from './dto/fulfill-extra-order.dto';
import { ExtraOrder } from './entities/extra-order.entity';

interface AuthenticatedRequest extends Request {
  user: { userId: number; username: string };
}

@ApiTags('extra-orders')
@ApiBearerAuth('access-token')
@Controller('extra-orders')
@UseGuards(JwtAuthGuard)
export class ExtraOrdersController {
  constructor(private readonly extraOrdersService: ExtraOrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new extra order (guests only, after check-in)',
  })
  @ApiBody({
    description: 'Extra order creation data',
    examples: {
      toiletPaper: {
        summary: 'Order Toilet Paper',
        description: 'Example of ordering toilet paper for a reservation',
        value: {
          reservationId: 123,
          inventoryItemId: 45,
          quantity: 2,
          notes: 'Please deliver to room 101',
        },
      },
      carpet: {
        summary: 'Order Bathroom Carpet',
        description: 'Example of ordering a bathroom carpet',
        value: {
          reservationId: 123,
          inventoryItemId: 67,
          quantity: 1,
          notes: 'For the main bathroom',
        },
      },
      towels: {
        summary: 'Order Towel Set',
        description: 'Example of ordering additional towels',
        value: {
          reservationId: 123,
          inventoryItemId: 89,
          quantity: 1,
          notes: 'Extra towels for extended stay',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The extra order has been successfully created.',
    type: ExtraOrder,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description:
      'Only guests can create extra orders, and only after check-in.',
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation or inventory item not found.',
  })
  create(
    @Body() createExtraOrderDto: CreateExtraOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.extraOrdersService.create(createExtraOrderDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all extra orders' })
  @ApiResponse({
    status: 200,
    description: 'Return all extra orders.',
    type: [ExtraOrder],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll() {
    return this.extraOrdersService.findAll();
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending extra orders (for cleaners)' })
  @ApiResponse({
    status: 200,
    description: 'Return all pending extra orders.',
    type: [ExtraOrder],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findPendingOrders() {
    return this.extraOrdersService.findPendingOrders();
  }

  @Get('reservation/:reservationId')
  @ApiOperation({ summary: 'Get all extra orders for a specific reservation' })
  @ApiResponse({
    status: 200,
    description: 'Return all extra orders for the specified reservation.',
    type: [ExtraOrder],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'You can only view orders for your own reservations.',
  })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  findByReservation(
    @Param('reservationId') reservationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.extraOrdersService.findByReservation(
      +reservationId,
      req.user.userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an extra order by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the extra order.',
    type: ExtraOrder,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Extra order not found.' })
  findOne(@Param('id') id: string) {
    return this.extraOrdersService.findOne(+id);
  }

  @Patch(':id/fulfill')
  @ApiOperation({ summary: 'Fulfill an extra order (cleaners only)' })
  @ApiBody({
    description: 'Fulfillment data (optional notes)',
    examples: {
      withNotes: {
        summary: 'Fulfill with Notes',
        description: 'Example of fulfilling an order with completion notes',
        value: {
          notes: 'Delivered toilet paper to room 101. Customer was satisfied.',
        },
      },
      withoutNotes: {
        summary: 'Fulfill without Notes',
        description: 'Example of fulfilling an order without additional notes',
        value: {},
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'The extra order has been successfully fulfilled.',
    type: ExtraOrder,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Only cleaners can fulfill extra orders.',
  })
  @ApiResponse({ status: 404, description: 'Extra order not found.' })
  fulfill(
    @Param('id') id: string,
    @Body() fulfillDto: FulfillExtraOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.extraOrdersService.fulfill(+id, fulfillDto, req.user.userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an extra order (guest only)' })
  @ApiResponse({
    status: 200,
    description: 'The extra order has been successfully cancelled.',
    type: ExtraOrder,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'You can only cancel your own orders.',
  })
  @ApiResponse({ status: 404, description: 'Extra order not found.' })
  cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.extraOrdersService.cancel(+id, req.user.userId);
  }
}
