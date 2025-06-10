import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  FaceAuthRequest,
  FaceAuthRequestStatus,
} from '../entities/face-auth-request.entity';

export interface CreateFaceAuthRequestDto {
  userId: number;
  expiresInMinutes?: number;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface CompleteFaceAuthRequestDto {
  requestId: string;
  success: boolean;
  failureReason?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class FaceAuthRequestService {
  private readonly logger = new Logger(FaceAuthRequestService.name);

  constructor(
    @InjectRepository(FaceAuthRequest)
    private readonly faceAuthRequestRepository: Repository<FaceAuthRequest>,
  ) {}

  /**
   * Create a new Face ID authentication request
   */
  async createRequest(dto: CreateFaceAuthRequestDto): Promise<FaceAuthRequest> {
    const requestId = uuidv4();
    const expiresAt = new Date();
    const additionalMinutes = dto.expiresInMinutes || 5;
    expiresAt.setTime(expiresAt.getTime() + additionalMinutes * 60 * 1000);

    const request = this.faceAuthRequestRepository.create({
      requestId,
      userId: dto.userId,
      expiresAt,
      deviceInfo: dto.deviceInfo,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      metadata: dto.metadata,
      status: FaceAuthRequestStatus.PENDING,
    });

    const savedRequest = await this.faceAuthRequestRepository.save(request);

    this.logger.log(
      `Created Face ID request ${requestId} for user ${dto.userId}`,
    );
    return savedRequest;
  }

  /**
   * Find a Face ID request by request ID
   */
  async findByRequestId(requestId: string): Promise<FaceAuthRequest> {
    const request = await this.faceAuthRequestRepository.findOne({
      where: { requestId },
      relations: ['user'],
    });

    if (!request) {
      throw new NotFoundException(`Face ID request ${requestId} not found`);
    }

    return request;
  }

  /**
   * Validate if a Face ID request can be completed
   */
  async validateRequest(requestId: string): Promise<FaceAuthRequest> {
    const request = await this.findByRequestId(requestId);

    if (request.isExpired()) {
      await this.updateStatus(request.id, FaceAuthRequestStatus.EXPIRED);
      throw new BadRequestException(`Face ID request ${requestId} has expired`);
    }

    if (!request.canComplete()) {
      throw new BadRequestException(
        `Face ID request ${requestId} cannot be completed`,
      );
    }

    return request;
  }

  /**
   * Complete a Face ID authentication request
   */
  async completeRequest(
    dto: CompleteFaceAuthRequestDto,
  ): Promise<FaceAuthRequest> {
    const request = await this.validateRequest(dto.requestId);

    const newStatus = dto.success
      ? FaceAuthRequestStatus.COMPLETED
      : FaceAuthRequestStatus.FAILED;

    const updatedRequest = await this.faceAuthRequestRepository.save({
      ...request,
      status: newStatus,
      completedAt: new Date(),
      failureReason: dto.failureReason,
      metadata: {
        ...(request.metadata || {}),
        ...(dto.metadata || {}),
        completionTime: new Date().toISOString(),
      },
    });

    this.logger.log(
      `Face ID request ${dto.requestId} completed with status: ${newStatus}`,
    );

    return updatedRequest;
  }

  /**
   * Update request status
   */
  async updateStatus(
    requestId: number,
    status: FaceAuthRequestStatus,
    failureReason?: string,
  ): Promise<void> {
    const updateData: Partial<FaceAuthRequest> = {
      status,
      failureReason,
    };
    if (status !== FaceAuthRequestStatus.PENDING) {
      updateData.completedAt = new Date();
    }
    await this.faceAuthRequestRepository.update(requestId, updateData);

    this.logger.log(
      `Updated Face ID request ${requestId} status to: ${status}`,
    );
  }

  /**
   * Get pending requests for a user
   */
  async getPendingRequestsForUser(userId: number): Promise<FaceAuthRequest[]> {
    return this.faceAuthRequestRepository.find({
      where: {
        userId,
        status: FaceAuthRequestStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancel all pending requests for a user (useful when user logs in successfully)
   */
  async cancelPendingRequestsForUser(userId: number): Promise<void> {
    await this.faceAuthRequestRepository.update(
      {
        userId,
        status: FaceAuthRequestStatus.PENDING,
      },
      {
        status: FaceAuthRequestStatus.FAILED,
        failureReason: 'Cancelled due to successful login',
        completedAt: new Date(),
      },
    );

    this.logger.log(`Cancelled pending Face ID requests for user ${userId}`);
  }

  /**
   * Cleanup expired requests (call this periodically)
   */
  async cleanupExpiredRequests(): Promise<number> {
    const result = await this.faceAuthRequestRepository.update(
      {
        status: FaceAuthRequestStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      {
        status: FaceAuthRequestStatus.EXPIRED,
        completedAt: new Date(),
        failureReason: 'Request expired',
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired Face ID requests`);
    }

    return result.affected || 0;
  }

  /**
   * Get request statistics for monitoring
   */
  async getRequestStats(userId?: number): Promise<any> {
    const baseQuery =
      this.faceAuthRequestRepository.createQueryBuilder('request');

    if (userId) {
      baseQuery.where('request.userId = :userId', { userId });
    }

    const total = await baseQuery.getCount();

    const pending = await baseQuery
      .andWhere('request.status = :status', {
        status: FaceAuthRequestStatus.PENDING,
      })
      .getCount();

    const completed = await baseQuery
      .andWhere('request.status = :status', {
        status: FaceAuthRequestStatus.COMPLETED,
      })
      .getCount();

    const failed = await baseQuery
      .andWhere('request.status = :status', {
        status: FaceAuthRequestStatus.FAILED,
      })
      .getCount();

    const expired = await baseQuery
      .andWhere('request.status = :status', {
        status: FaceAuthRequestStatus.EXPIRED,
      })
      .getCount();

    return {
      total,
      pending,
      completed,
      failed,
      expired,
      successRate:
        total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%',
    };
  }
}
