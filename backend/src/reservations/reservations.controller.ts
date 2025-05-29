import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Reservation } from './entities/reservation.entity';

@ApiTags('reservations')
@ApiBearerAuth('access-token')
@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiResponse({
    status: 201,
    description: 'The reservation has been successfully created.',
    type: Reservation,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Box, guest, or host not found.' })
  @ApiResponse({
    status: 409,
    description: 'Box is already reserved for this time period.',
  })
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reservations' })
  @ApiResponse({
    status: 200,
    description: 'Return all reservations.',
    type: [Reservation],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get('guest/:guestId')
  @ApiOperation({ summary: 'Get all reservations for a specific guest (USER type)' })
  @ApiResponse({
    status: 200,
    description: 'Return all reservations for the specified guest.',
    type: [Reservation],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Guest not found or not a USER type.' })
  findByGuest(@Param('guestId') guestId: string) {
    return this.reservationsService.findByGuest(+guestId);
  }

  @Get('host/:hostId')
  @ApiOperation({ summary: 'Get all reservations for a specific host (HOST type)' })
  @ApiResponse({
    status: 200,
    description: 'Return all reservations for the specified host.',
    type: [Reservation],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Host not found or not a HOST type.' })
  findByHost(@Param('hostId') hostId: string) {
    return this.reservationsService.findByHost(+hostId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the reservation.',
    type: Reservation,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  @ApiResponse({
    status: 200,
    description: 'The reservation has been successfully updated.',
    type: Reservation,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Reservation, box, guest, or host not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Box is already reserved for this time period.',
  })
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(+id, updateReservationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reservation' })
  @ApiResponse({
    status: 200,
    description: 'The reservation has been successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id);
  }
}
