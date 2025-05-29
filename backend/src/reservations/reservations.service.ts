import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Reservation } from './entities/reservation.entity';
import { Box } from '../boxes/entities/box.entity';
import { User, UserType } from '../users/entities/user.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(Box)
    private boxesRepository: Repository<Box>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(
    createReservationDto: CreateReservationDto,
  ): Promise<Reservation> {
    try {
      // Convert ISO 8601 date strings to Date objects
      const checkinAt = new Date(createReservationDto.checkinAt);
      const checkoutAt = new Date(createReservationDto.checkoutAt);

      // Validate that the dates are valid
      if (isNaN(checkinAt.getTime()) || isNaN(checkoutAt.getTime())) {
        throw new BadRequestException('Invalid date format provided');
      }

      // Validate dates
      if (checkinAt >= checkoutAt) {
        throw new BadRequestException(
          'Check-in date must be before check-out date',
        );
      }

      // Check if box exists
      const box = await this.boxesRepository.findOne({
        where: { boxId: createReservationDto.boxId },
      });
      if (!box) {
        throw new NotFoundException(
          `Box with BoxID ${createReservationDto.boxId} not found`,
        );
      }

      // Check if guest exists
      const guest = await this.usersRepository.findOne({
        where: { id: createReservationDto.guestId },
      });
      if (!guest) {
        throw new NotFoundException(
          `Guest with ID ${createReservationDto.guestId} not found`,
        );
      }
      if (guest.userType !== UserType.USER) {
        throw new BadRequestException(
          `User with ID ${createReservationDto.guestId} is not a guest user (USER type)`,
        );
      }

      // Check if host exists
      const host = await this.usersRepository.findOne({
        where: { id: createReservationDto.hostId },
      });
      if (!host) {
        throw new NotFoundException(
          `Host with ID ${createReservationDto.hostId} not found`,
        );
      }
      if (host.userType !== UserType.HOST) {
        throw new BadRequestException(
          `User with ID ${createReservationDto.hostId} is not a host user (HOST type)`,
        );
      }

      // Check for overlapping reservations
      const overlappingReservation = await this.reservationsRepository
        .createQueryBuilder('reservation')
        .where('reservation.box_id = :boxId', {
          boxId: box.id,
        })
        .andWhere('reservation.status != :cancelled', {
          cancelled: 'CANCELLED',
        })
        .andWhere(
          '(reservation.checkinAt <= :checkoutAt AND reservation.checkoutAt >= :checkinAt)',
          {
            checkinAt,
            checkoutAt,
          },
        )
        .getOne();

      if (overlappingReservation) {
        throw new ConflictException(
          'Box is already reserved for this time period',
        );
      }

      const reservation = this.reservationsRepository.create({
        ...createReservationDto,
        checkinAt,
        checkoutAt,
        box,
        guest,
        host,
      });

      return await this.reservationsRepository.save(reservation);
    } catch (error) {
      console.error('Error creating reservation:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create reservation: ${error.message}`,
      );
    }
  }

  async findAll(): Promise<Reservation[]> {
    return this.reservationsRepository.find({
      relations: ['guest', 'host', 'box'],
    });
  }

  async findOne(id: number): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: ['guest', 'host', 'box'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
  }

  async update(
    id: number,
    updateReservationDto: UpdateReservationDto,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id);

    // Convert ISO 8601 date strings to Date objects if provided
    let checkinAt: Date | undefined;
    let checkoutAt: Date | undefined;

    if (updateReservationDto.checkinAt) {
      checkinAt = new Date(updateReservationDto.checkinAt);
      if (isNaN(checkinAt.getTime())) {
        throw new BadRequestException('Invalid check-in date format provided');
      }
    }

    if (updateReservationDto.checkoutAt) {
      checkoutAt = new Date(updateReservationDto.checkoutAt);
      if (isNaN(checkoutAt.getTime())) {
        throw new BadRequestException('Invalid check-out date format provided');
      }
    }

    // If dates are being updated, check for overlapping reservations
    if (updateReservationDto.checkinAt || updateReservationDto.checkoutAt) {
      const finalCheckinAt = checkinAt || reservation.checkinAt;
      const finalCheckoutAt = checkoutAt || reservation.checkoutAt;

      if (finalCheckinAt >= finalCheckoutAt) {
        throw new BadRequestException(
          'Check-in date must be before check-out date',
        );
      }

      const overlappingReservation = await this.reservationsRepository
        .createQueryBuilder('reservation')
        .where('reservation.box_id = :boxId', { boxId: reservation.box.id })
        .andWhere('reservation.id != :id', { id })
        .andWhere('reservation.status != :cancelled', {
          cancelled: 'CANCELLED',
        })
        .andWhere(
          '(reservation.checkinAt <= :checkoutAt AND reservation.checkoutAt >= :checkinAt)',
          {
            checkinAt: finalCheckinAt,
            checkoutAt: finalCheckoutAt,
          },
        )
        .getOne();

      if (overlappingReservation) {
        throw new ConflictException(
          'Box is already reserved for this time period',
        );
      }
    }

    // Update related entities if IDs are provided
    if (updateReservationDto.boxId) {
      const box = await this.boxesRepository.findOne({
        where: { boxId: updateReservationDto.boxId },
      });
      if (!box) {
        throw new NotFoundException(
          `Box with BoxID ${updateReservationDto.boxId} not found`,
        );
      }
      reservation.box = box;
    }

    if (updateReservationDto.guestId) {
      const guest = await this.usersRepository.findOne({
        where: { id: updateReservationDto.guestId },
      });
      if (!guest) {
        throw new NotFoundException(
          `Guest with ID ${updateReservationDto.guestId} not found`,
        );
      }
      if (guest.userType !== UserType.USER) {
        throw new BadRequestException(
          `User with ID ${updateReservationDto.guestId} is not a guest user (USER type)`,
        );
      }
      reservation.guest = guest;
    }

    if (updateReservationDto.hostId) {
      const host = await this.usersRepository.findOne({
        where: { id: updateReservationDto.hostId },
      });
      if (!host) {
        throw new NotFoundException(
          `Host with ID ${updateReservationDto.hostId} not found`,
        );
      }
      if (host.userType !== UserType.HOST) {
        throw new BadRequestException(
          `User with ID ${updateReservationDto.hostId} is not a host user (HOST type)`,
        );
      }
      reservation.host = host;
    }

    // Update other fields, including converted dates
    const updateData = { ...updateReservationDto };
    // Remove the string dates from updateData since we'll assign Date objects directly
    delete updateData.checkinAt;
    delete updateData.checkoutAt;

    Object.assign(reservation, updateData);

    // Assign converted Date objects directly to the reservation entity
    if (checkinAt) reservation.checkinAt = checkinAt;
    if (checkoutAt) reservation.checkoutAt = checkoutAt;

    return this.reservationsRepository.save(reservation);
  }

  async remove(id: number): Promise<void> {
    const reservation = await this.findOne(id);
    await this.reservationsRepository.remove(reservation);
  }
}
