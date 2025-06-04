import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBoxDto } from './dto/create-box.dto';
import { UpdateBoxDto } from './dto/update-box.dto';
import { Box } from './entities/box.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getDirect4meConfig } from '../config/direct4me.config';
import { OpenBoxDto } from './dto/open-box.dto';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { UnlockHistory } from './entities/unlock-history.entity';
import { User, UserType } from '../users/entities/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Not, Between } from 'typeorm';
import { ReservationStatus } from '../reservations/entities/reservation.entity';
import { BoxImagesService } from './services/box-images.service';
import { MulterFile } from '../common/interfaces/multer.interface';

export interface OpenBoxResponse {
  data: string;
  result: number;
  errorNumber: number;
  message?: string;
  validationErrors?: Record<string, string>;
}

@Injectable()
export class BoxesService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly configTokenFormat: number;

  constructor(
    @InjectRepository(Box)
    private boxesRepository: Repository<Box>,
    @InjectRepository(UnlockHistory)
    private readonly unlockHistoryRepo: Repository<UnlockHistory>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    private readonly boxImagesService: BoxImagesService,
  ) {
    const config = getDirect4meConfig(this.configService);
    this.apiKey = config.apiKey ?? '';
    this.baseUrl = config.baseUrl ?? '';
    this.configTokenFormat = config.tokenFormat;
  }

  async create(createBoxDto: CreateBoxDto): Promise<Box> {
    // Check if box with same boxId already exists
    const existingBox = await this.boxesRepository.findOne({
      where: { boxId: createBoxDto.boxId },
    });

    if (existingBox) {
      throw new ConflictException(
        `Box with ID ${createBoxDto.boxId} already exists`,
      );
    }

    // Verify that the owner exists and is a HOST
    const owner = await this.boxesRepository.manager.findOne(User, {
      where: { id: createBoxDto.ownerId, userType: UserType.HOST },
    });

    if (!owner) {
      throw new NotFoundException(
        `Host with ID ${createBoxDto.ownerId} not found`,
      );
    }

    const box = this.boxesRepository.create({
      ...createBoxDto,
      owner: owner,
    });
    return this.boxesRepository.save(box);
  }

  async createWithImages(
    createBoxDto: CreateBoxDto,
    images?: MulterFile[],
  ): Promise<Box> {
    // First create the box using the existing create method
    const box = await this.create(createBoxDto);

    // If images are provided, upload them
    if (images && images.length > 0) {
      // Upload the first image as primary, rest as secondary
      for (let i = 0; i < images.length; i++) {
        const isPrimary = i === 0; // First image is primary
        await this.boxImagesService.uploadImage(
          box.boxId,
          images[i],
          isPrimary,
        );
      }

      // Return the box with images loaded
      return this.findOne(box.id);
    }

    return box;
  }

  async findAll(): Promise<Box[]> {
    return this.boxesRepository.find({
      relations: ['owner', 'images'],
      order: {
        images: {
          isPrimary: 'DESC',
          createdAt: 'ASC',
        },
      },
    });
  }

  async findOne(id: number): Promise<Box> {
    const box = await this.boxesRepository.findOne({
      where: { id },
      relations: ['owner', 'images'],
      order: {
        images: {
          isPrimary: 'DESC',
          createdAt: 'ASC',
        },
      },
    });

    if (!box) {
      throw new NotFoundException(`Box with ID ${id} not found`);
    }

    return box;
  }

  async findOneByBoxId(boxId: string): Promise<Box> {
    const box = await this.boxesRepository.findOne({
      where: { boxId },
      relations: ['owner', 'images'],
      order: {
        images: {
          isPrimary: 'DESC',
          createdAt: 'ASC',
        },
      },
    });

    if (!box) {
      throw new NotFoundException(`Box with ID ${boxId} not found`);
    }

    return box;
  }

  async update(id: number, updateBoxDto: UpdateBoxDto): Promise<Box> {
    const box = await this.findOne(id);

    // If boxId is being updated, check for uniqueness
    if (updateBoxDto.boxId && updateBoxDto.boxId !== box.boxId) {
      const existingBox = await this.boxesRepository.findOne({
        where: { boxId: updateBoxDto.boxId },
      });

      if (existingBox) {
        throw new ConflictException(
          `Box with ID ${updateBoxDto.boxId} already exists`,
        );
      }
    }

    // Update the box with new values
    Object.assign(box, updateBoxDto);
    return this.boxesRepository.save(box);
  }

  async updateByBoxId(boxId: string, updateBoxDto: UpdateBoxDto): Promise<Box> {
    const box = await this.findOneByBoxId(boxId);

    // If boxId is being updated, check for uniqueness
    if (updateBoxDto.boxId && updateBoxDto.boxId !== box.boxId) {
      const existingBox = await this.boxesRepository.findOne({
        where: { boxId: updateBoxDto.boxId },
      });

      if (existingBox) {
        throw new ConflictException(
          `Box with ID ${updateBoxDto.boxId} already exists`,
        );
      }
    }

    // Update the box with new values
    Object.assign(box, updateBoxDto);
    return this.boxesRepository.save(box);
  }

  async remove(id: number): Promise<void> {
    const box = await this.findOne(id);
    await this.boxesRepository.remove(box);
  }

  async removeByBoxId(boxId: string): Promise<void> {
    const box = await this.findOneByBoxId(boxId);
    await this.boxesRepository.remove(box);
  }

  async openBox(
    openBoxDto: OpenBoxDto,
    user: User,
  ): Promise<OpenBoxResponse & { tokenFormat: number }> {
    const usedTokenFormat =
      typeof openBoxDto.tokenFormat === 'number'
        ? openBoxDto.tokenFormat
        : this.configTokenFormat;
    let status = 'failure';
    let errorMessage = '';

    try {
      const response: AxiosResponse<OpenBoxResponse> = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}`,
          {
            boxId: openBoxDto.boxId,
            tokenFormat: usedTokenFormat,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (!response || !response.data) {
        throw new HttpException(
          'No response from Direct4me API',
          HttpStatus.BAD_GATEWAY,
        );
      }
      status = response.data.result === 0 ? 'success' : 'failure';
      return { ...response.data, tokenFormat: usedTokenFormat };
    } catch (error: unknown) {
      function hasStringMessage(obj: unknown): obj is { message: string } {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          'message' in obj &&
          typeof (obj as { message?: unknown }).message === 'string'
        );
      }
      if (typeof error === 'object' && error !== null) {
        type ErrorWithResponse = { response?: { data?: { message?: string } } };
        const errWithResponse = error as ErrorWithResponse;
        if (errWithResponse.response?.data?.message) {
          errorMessage = errWithResponse.response.data.message;
        } else if (hasStringMessage(error)) {
          errorMessage = (error as { message: string }).message;
        }
      }
      throw new HttpException(
        `Failed to open box: ${errorMessage || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Always log the unlock attempt
      await this.unlockHistoryRepo.save({
        user: { id: user.id },
        boxId: String(openBoxDto.boxId),
        status,
        tokenFormat: usedTokenFormat,
      });
    }
  }

  async findByHostId(hostId: number): Promise<Box[]> {
    // First, verify that the user exists and is a HOST
    const host = await this.boxesRepository.manager.findOne(User, {
      where: { id: hostId, userType: UserType.HOST },
    });

    if (!host) {
      throw new NotFoundException(`Host with ID ${hostId} not found`);
    }

    return this.boxesRepository.find({
      where: { owner: { id: hostId } },
      relations: ['owner', 'images'],
      order: {
        images: {
          isPrimary: 'DESC',
          createdAt: 'ASC',
        },
      },
    });
  }

  async getOpeningHistory(): Promise<UnlockHistory[]> {
    return this.unlockHistoryRepo.find({
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  async getOpeningHistoryByBoxId(boxId: string): Promise<UnlockHistory[]> {
    return this.unlockHistoryRepo.find({
      where: { boxId },
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  async getOpeningHistoryByUserId(userId: number): Promise<UnlockHistory[]> {
    return this.unlockHistoryRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  async getBoxAvailability(boxId: string) {
    const box = await this.findOneByBoxId(boxId);
    if (!box) {
      throw new NotFoundException(`Box with ID ${boxId} not found`);
    }

    const now = new Date();

    const query = this.boxesRepository
      .createQueryBuilder('box')
      .leftJoinAndSelect('box.reservations', 'reservation')
      .where('box.boxId = :boxId', { boxId })
      .andWhere('reservation.status != :cancelled', { cancelled: 'CANCELLED' })
      .andWhere('reservation.checkoutAt > :now', { now }); // Only future reservations

    const boxWithReservations = await query.getOne();

    // Transform reservations into unavailable dates
    const unavailableDates = (boxWithReservations?.reservations || []).map(
      (reservation) => ({
        startDate: reservation.checkinAt,
        endDate: reservation.checkoutAt,
        status: reservation.status,
      }),
    );

    return {
      boxId: box.boxId,
      location: box.location,
      unavailableDates,
    };
  }

  async calculateBoxRevenue(
    boxId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRevenue: number;
    totalBookings: number;
    averageRevenuePerBooking: number;
  }> {
    const box = await this.findOneByBoxId(boxId);
    const reservations = await this.reservationsRepository.find({
      where: {
        box: { id: box.id },
        status: Not(ReservationStatus.CANCELLED),
        ...(startDate && endDate
          ? {
              checkinAt: Between(startDate, endDate),
            }
          : {}),
      },
    });

    const totalRevenue = reservations.reduce(
      (sum, res) => sum + Number(res.totalPrice || 0),
      0,
    );
    const totalBookings = reservations.length;
    const averageRevenuePerBooking =
      totalBookings > 0 ? Number((totalRevenue / totalBookings).toFixed(2)) : 0;

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalBookings,
      averageRevenuePerBooking,
    };
  }

  async getHostRevenue(
    hostId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRevenue: number;
    totalBookings: number;
    averageRevenuePerBooking: number;
    boxesRevenue: Array<{
      boxId: string;
      revenue: number;
      bookings: number;
      averageRevenuePerBooking: number;
    }>;
  }> {
    const boxes = await this.findByHostId(hostId);
    let totalRevenue = 0;
    let totalBookings = 0;
    const boxesRevenue: Array<{
      boxId: string;
      revenue: number;
      bookings: number;
      averageRevenuePerBooking: number;
    }> = [];

    for (const box of boxes) {
      const boxStats = await this.calculateBoxRevenue(
        box.boxId,
        startDate,
        endDate,
      );
      totalRevenue += boxStats.totalRevenue;
      totalBookings += boxStats.totalBookings;
      boxesRevenue.push({
        boxId: box.boxId,
        revenue: boxStats.totalRevenue,
        bookings: boxStats.totalBookings,
        averageRevenuePerBooking: boxStats.averageRevenuePerBooking,
      });
    }

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalBookings,
      averageRevenuePerBooking:
        totalBookings > 0
          ? Number((totalRevenue / totalBookings).toFixed(2))
          : 0,
      boxesRevenue,
    };
  }
}
