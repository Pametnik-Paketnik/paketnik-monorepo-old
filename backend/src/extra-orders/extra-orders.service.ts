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
import { ExtraOrderItem } from './entities/extra-order-item.entity';
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
    @InjectRepository(ExtraOrderItem)
    private extraOrderItemsRepository: Repository<ExtraOrderItem>,
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

    // Validate all inventory items and calculate total
    let totalOrderPrice = 0;
    const inventoryItems: { item: InventoryItem; quantity: number }[] = [];

    for (const orderItem of createExtraOrderDto.items) {
      const inventoryItem = await this.inventoryItemsRepository.findOne({
        where: { id: orderItem.inventoryItemId },
        relations: ['host'],
      });

      if (!inventoryItem) {
        throw new NotFoundException(
          `Inventory item with ID ${orderItem.inventoryItemId} not found`,
        );
      }

      if (inventoryItem.host.id !== reservation.host.id) {
        throw new BadRequestException(
          'You can only order items from your reservation host',
        );
      }

      if (!inventoryItem.isAvailable) {
        throw new BadRequestException(
          `Inventory item "${inventoryItem.name}" is not available`,
        );
      }

      // Check if there's enough stock
      if (
        inventoryItem.stockQuantity > 0 &&
        inventoryItem.stockQuantity < orderItem.quantity
      ) {
        throw new BadRequestException(
          `Not enough stock available for "${inventoryItem.name}". Available: ${inventoryItem.stockQuantity}, Requested: ${orderItem.quantity}`,
        );
      }

      const itemTotal = Number(inventoryItem.price) * orderItem.quantity;
      totalOrderPrice += itemTotal;

      inventoryItems.push({
        item: inventoryItem,
        quantity: orderItem.quantity,
      });
    }

    // Create the extra order
    const extraOrder = this.extraOrdersRepository.create({
      reservation,
      totalPrice: totalOrderPrice,
      notes: createExtraOrderDto.notes,
      status: ExtraOrderStatus.PENDING,
    });

    const savedOrder = await this.extraOrdersRepository.save(extraOrder);

    // Create order items and update stock
    for (let i = 0; i < inventoryItems.length; i++) {
      const { item, quantity } = inventoryItems[i];
      const unitPrice = Number(item.price);
      const totalPrice = unitPrice * quantity;

      const orderItem = this.extraOrderItemsRepository.create({
        extraOrder: savedOrder,
        inventoryItem: item,
        quantity,
        unitPrice,
        totalPrice,
      });

      await this.extraOrderItemsRepository.save(orderItem);

      // Update stock quantity if tracking stock
      if (item.stockQuantity > 0) {
        item.stockQuantity -= quantity;
        await this.inventoryItemsRepository.save(item);
      }
    }

    // Return the order with items included
    return this.findOne(savedOrder.id);
  }

  async findAll(): Promise<ExtraOrder[]> {
    return this.extraOrdersRepository.find({
      relations: [
        'reservation',
        'items',
        'items.inventoryItem',
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
        'items',
        'items.inventoryItem',
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
        'items',
        'items.inventoryItem',
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
        items: { inventoryItem: { host: { id: cleaner.host.id } } },
      },
      relations: [
        'reservation',
        'items',
        'items.inventoryItem',
        'items.inventoryItem.host',
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
        'items',
        'items.inventoryItem',
        'items.inventoryItem.host',
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

    // Verify that the cleaner's host owns all inventory items in the order
    for (const orderItem of extraOrder.items) {
      if (orderItem.inventoryItem.host.id !== cleaner.host.id) {
        throw new ForbiddenException(
          "You can only fulfill orders for your host's inventory items",
        );
      }
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
        extraOrder.items.some(
          (item) => item.inventoryItem.host.id === user.host.id,
        ));

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

    // Restore stock for all items
    for (const orderItem of extraOrder.items) {
      if (orderItem.inventoryItem.stockQuantity >= 0) {
        orderItem.inventoryItem.stockQuantity += orderItem.quantity;
        await this.inventoryItemsRepository.save(orderItem.inventoryItem);
      }
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
