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
import { User } from '../users/entities/user.entity';
import { UserType } from '../users/entities/user.entity';

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

  async findAll(): Promise<Box[]> {
    return this.boxesRepository.find({
      relations: ['owner'],
    });
  }

  async findOne(id: number): Promise<Box> {
    const box = await this.boxesRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!box) {
      throw new NotFoundException(`Box with ID ${id} not found`);
    }

    return box;
  }

  async findOneByBoxId(boxId: string): Promise<Box> {
    const box = await this.boxesRepository.findOne({
      where: { boxId },
      relations: ['owner'],
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
      relations: ['owner'],
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
}
