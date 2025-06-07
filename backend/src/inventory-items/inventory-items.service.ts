import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryItem } from './entities/inventory-item.entity';
import { User, UserType } from '../users/entities/user.entity';

@Injectable()
export class InventoryItemsService {
  constructor(
    @InjectRepository(InventoryItem)
    private inventoryItemsRepository: Repository<InventoryItem>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(
    createInventoryItemDto: CreateInventoryItemDto,
    hostId: number,
  ): Promise<InventoryItem> {
    // Validate that the user is a host
    const host = await this.usersRepository.findOne({
      where: { id: hostId },
    });

    if (!host) {
      throw new NotFoundException(`User with ID ${hostId} not found`);
    }

    if (host.userType !== UserType.HOST) {
      throw new BadRequestException('Only hosts can create inventory items');
    }

    const inventoryItem = this.inventoryItemsRepository.create({
      ...createInventoryItemDto,
      host,
    });

    return await this.inventoryItemsRepository.save(inventoryItem);
  }

  async findAll(): Promise<InventoryItem[]> {
    return this.inventoryItemsRepository.find({
      relations: ['host'],
      where: { isAvailable: true },
    });
  }

  async findByHost(hostId: number): Promise<InventoryItem[]> {
    const host = await this.usersRepository.findOne({
      where: { id: hostId },
    });

    if (!host) {
      throw new NotFoundException(`User with ID ${hostId} not found`);
    }

    if (host.userType !== UserType.HOST) {
      throw new BadRequestException('Only hosts can view their inventory');
    }

    return this.inventoryItemsRepository.find({
      where: { host: { id: hostId } },
      relations: ['host'],
    });
  }

  async findOne(id: number): Promise<InventoryItem> {
    const inventoryItem = await this.inventoryItemsRepository.findOne({
      where: { id },
      relations: ['host'],
    });

    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return inventoryItem;
  }

  async update(
    id: number,
    updateInventoryItemDto: UpdateInventoryItemDto,
    hostId: number,
  ): Promise<InventoryItem> {
    const inventoryItem = await this.findOne(id);

    // Validate that the host owns this item
    if (inventoryItem.host.id !== hostId) {
      throw new ForbiddenException(
        'You can only update your own inventory items',
      );
    }

    Object.assign(inventoryItem, updateInventoryItemDto);
    return await this.inventoryItemsRepository.save(inventoryItem);
  }

  async remove(id: number, hostId: number): Promise<void> {
    const inventoryItem = await this.findOne(id);

    // Validate that the host owns this item
    if (inventoryItem.host.id !== hostId) {
      throw new ForbiddenException(
        'You can only delete your own inventory items',
      );
    }

    await this.inventoryItemsRepository.remove(inventoryItem);
  }

  async findAvailableByHost(hostId: number): Promise<InventoryItem[]> {
    return this.inventoryItemsRepository.find({
      where: {
        host: { id: hostId },
        isAvailable: true,
      },
      relations: ['host'],
    });
  }
}
