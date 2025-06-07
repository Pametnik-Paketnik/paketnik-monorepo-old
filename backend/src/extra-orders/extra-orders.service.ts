import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateExtraOrderDto } from './dto/create-extra-order.dto';
import { FulfillExtraOrderDto } from './dto/fulfill-extra-order.dto';
import { ExtraOrder, ExtraOrderStatus } from './entities/extra-order.entity';
import { User, UserType } from '../users/entities/user.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity';

@Injectable()
export class ExtraOrdersService {
  constructor(
    @InjectRepository(ExtraOrder)
    private extraOrdersRepository: Repository<ExtraOrder>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(InventoryItem)
    private inventoryItemsRepository: Repository<InventoryItem>,
  ) {}

  async create(
    createExtraOrderDto: CreateExtraOrderDto,
    guestId: number,
  ): Promise<ExtraOrder> {
    // Validate that the user is a guest
    const guest = await this.usersRepository.findOne({
      where: { id: guestId },
    });

    if (!guest) {
      throw new NotFoundException(`User with ID ${guestId} not found`);
    }

    if (guest.userType !== UserType.USER) {
      throw new BadRequestException('Only guests can create extra orders');
    }

    // Validate reservation exists and belongs to the guest
    const reservation = await this.reservationsRepository.findOne({
      where: { id: createExtraOrderDto.reservationId },
      relations: ['guest', 'host', 'box'],
    });

    if (!reservation) {
      throw new NotFoundException(
        `Reservation with ID ${createExtraOrderDto.reservationId} not found`,
      );
    }

    if (reservation.guest.id !== guestId) {
      throw new ForbiddenException(
        'You can only create orders for your own reservations',
      );
    }

    // Validate reservation is checked in
    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new BadRequestException(
        'You can only place extra orders after checking in',
      );
    }

    // Validate inventory item exists and belongs to the host
    const inventoryItem = await this.inventoryItemsRepository.findOne({
      where: { id: createExtraOrderDto.inventoryItemId },
      relations: ['host'],
    });

    if (!inventoryItem) {
      throw new NotFoundException(
        `Inventory item with ID ${createExtraOrderDto.inventoryItemId} not found`,
      );
    }

    if (inventoryItem.host.id !== reservation.host.id) {
      throw new BadRequestException(
        'You can only order items from your reservation host',
      );
    }

    if (!inventoryItem.isAvailable) {
      throw new BadRequestException('This inventory item is not available');
    }

    const quantity = createExtraOrderDto.quantity || 1;

    // Check if there's enough stock
    if (
      inventoryItem.stockQuantity > 0 &&
      inventoryItem.stockQuantity < quantity
    ) {
      throw new BadRequestException(
        `Not enough stock available. Available: ${inventoryItem.stockQuantity}, Requested: ${quantity}`,
      );
    }

    const unitPrice = inventoryItem.price;
    const totalPrice = unitPrice * quantity;

    const extraOrder = this.extraOrdersRepository.create({
      reservation,
      inventoryItem,
      quantity,
      unitPrice,
      totalPrice,
      notes: createExtraOrderDto.notes,
      status: ExtraOrderStatus.PENDING,
    });

    // Update stock quantity if tracking stock
    if (inventoryItem.stockQuantity > 0) {
      inventoryItem.stockQuantity -= quantity;
      await this.inventoryItemsRepository.save(inventoryItem);
    }

    return await this.extraOrdersRepository.save(extraOrder);
  }

  async findAll(): Promise<ExtraOrder[]> {
    return this.extraOrdersRepository.find({
      relations: [
        'reservation',
        'inventoryItem',
        'fulfilledBy',
        'reservation.guest',
        'reservation.host',
      ],
    });
  }

  async findByReservation(
    reservationId: number,
    userId: number,
  ): Promise<ExtraOrder[]> {
    // Find the reservation first to check ownership
    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
      relations: ['guest', 'host'],
    });

    if (!reservation) {
      throw new NotFoundException(
        `Reservation with ID ${reservationId} not found`,
      );
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if user is either the guest or the host of the reservation
    if (reservation.guest.id !== userId && reservation.host.id !== userId) {
      throw new ForbiddenException(
        'You can only view orders for your own reservations',
      );
    }

    return this.extraOrdersRepository.find({
      where: { reservation: { id: reservationId } },
      relations: [
        'reservation',
        'inventoryItem',
        'fulfilledBy',
        'reservation.guest',
        'reservation.host',
      ],
    });
  }

  async findPendingOrders(): Promise<ExtraOrder[]> {
    return this.extraOrdersRepository.find({
      where: { status: ExtraOrderStatus.PENDING },
      relations: [
        'reservation',
        'inventoryItem',
        'reservation.guest',
        'reservation.host',
      ],
    });
  }

  async findPendingOrdersForCleaner(cleanerId: number): Promise<ExtraOrder[]> {
    // Validate that the user is a cleaner and get their host
    const cleaner = await this.usersRepository.findOne({
      where: { id: cleanerId, userType: UserType.CLEANER },
      relations: ['host'],
    });

    if (!cleaner) {
      throw new NotFoundException(`Cleaner with ID ${cleanerId} not found`);
    }

    if (!cleaner.host) {
      throw new BadRequestException('Cleaner must be assigned to a host');
    }

    // Find pending orders for inventory items owned by the cleaner's host
    return this.extraOrdersRepository.find({
      where: {
        status: ExtraOrderStatus.PENDING,
        inventoryItem: { host: { id: cleaner.host.id } },
      },
      relations: [
        'reservation',
        'inventoryItem',
        'inventoryItem.host',
        'reservation.guest',
        'reservation.host',
      ],
    });
  }

  async findOne(id: number): Promise<ExtraOrder> {
    const extraOrder = await this.extraOrdersRepository.findOne({
      where: { id },
      relations: [
        'reservation',
        'inventoryItem',
        'inventoryItem.host',
        'fulfilledBy',
        'reservation.guest',
        'reservation.host',
      ],
    });

    if (!extraOrder) {
      throw new NotFoundException(`Extra order with ID ${id} not found`);
    }

    return extraOrder;
  }

  async fulfill(
    id: number,
    fulfillDto: FulfillExtraOrderDto,
    cleanerId: number,
  ): Promise<ExtraOrder> {
    // Validate that the user is a cleaner and get their host
    const cleaner = await this.usersRepository.findOne({
      where: { id: cleanerId, userType: UserType.CLEANER },
      relations: ['host'],
    });

    if (!cleaner) {
      throw new NotFoundException(`Cleaner with ID ${cleanerId} not found`);
    }

    if (!cleaner.host) {
      throw new BadRequestException('Cleaner must be assigned to a host');
    }

    const extraOrder = await this.findOne(id);

    // Verify that the cleaner's host owns the inventory item
    if (extraOrder.inventoryItem.host.id !== cleaner.host.id) {
      throw new ForbiddenException(
        "You can only fulfill orders for your host's inventory items",
      );
    }

    if (extraOrder.status !== ExtraOrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot fulfill order with status: ${extraOrder.status}`,
      );
    }

    extraOrder.status = ExtraOrderStatus.FULFILLED;
    extraOrder.fulfilledBy = cleaner;
    extraOrder.fulfilledAt = new Date();
    if (fulfillDto.notes) {
      extraOrder.notes = fulfillDto.notes;
    }

    // Update reservation total price
    const reservation = extraOrder.reservation;
    if (reservation.totalPrice) {
      reservation.totalPrice =
        Number(reservation.totalPrice) + Number(extraOrder.totalPrice);
    } else {
      reservation.totalPrice = Number(extraOrder.totalPrice);
    }
    await this.reservationsRepository.save(reservation);

    return await this.extraOrdersRepository.save(extraOrder);
  }

  async cancel(id: number, userId: number): Promise<ExtraOrder> {
    const extraOrder = await this.findOne(id);

    // Get user information to determine if they can cancel
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['host'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if user can cancel this order
    const canCancel =
      // Guest who placed the order can cancel
      extraOrder.reservation.guest.id === userId ||
      // Cleaner who belongs to the host can cancel
      (user.userType === UserType.CLEANER &&
        user.host &&
        user.host.id === extraOrder.inventoryItem.host.id);

    if (!canCancel) {
      throw new ForbiddenException(
        "You can only cancel your own orders or orders for your host's inventory items",
      );
    }

    if (extraOrder.status === ExtraOrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    const wasAlreadyFulfilled =
      extraOrder.status === ExtraOrderStatus.FULFILLED;
    extraOrder.status = ExtraOrderStatus.CANCELLED;

    // Restore stock if tracking stock
    if (extraOrder.inventoryItem.stockQuantity >= 0) {
      extraOrder.inventoryItem.stockQuantity += extraOrder.quantity;
      await this.inventoryItemsRepository.save(extraOrder.inventoryItem);
    }

    // If the order was already fulfilled, subtract its price from reservation total
    if (wasAlreadyFulfilled) {
      const reservation = extraOrder.reservation;
      if (reservation.totalPrice) {
        reservation.totalPrice =
          Number(reservation.totalPrice) - Number(extraOrder.totalPrice);
        // Ensure totalPrice doesn't go below 0
        if (reservation.totalPrice < 0) {
          reservation.totalPrice = 0;
        }
        await this.reservationsRepository.save(reservation);
      }
    }

    return await this.extraOrdersRepository.save(extraOrder);
  }
}
