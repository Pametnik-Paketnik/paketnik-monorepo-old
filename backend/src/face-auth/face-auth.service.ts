import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterResponseDto } from './dto/register-response.dto';
import { VerifyResponseDto } from './dto/verify-response.dto';
import { StatusResponseDto } from './dto/status-response.dto';
import { DeleteResponseDto } from './dto/delete-response.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FaceAuthService {
  private readonly logger = new Logger(FaceAuthService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Register a user's face by forwarding images to the face-auth-service
   */
  async registerFace(
    userId: string,
    files: Express.Multer.File[],
  ): Promise<RegisterResponseDto> {
    try {
      this.logger.log(
        `Registering face for user ${userId} with ${files.length} images`,
      );

      // Create FormData to send files
      const formData = new FormData();

      for (const file of files) {
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('files', blob, file.originalname);
      }

      // Make request to face-auth-service
      const response = await firstValueFrom(
        this.httpService.post('/register', formData, {
          headers: {
            'X-User-ID': userId,
            'Content-Type': 'multipart/form-data',
          },
        }),
      );

      this.logger.log(`Face registration successful for user ${userId}`);
      return response.data as RegisterResponseDto;
    } catch (error) {
      return this.handleError('registerFace', error, userId);
    }
  }

  /**
   * Verify a user's face by forwarding image to the face-auth-service
   */
  async verifyFace(
    userId: string,
    file: Express.Multer.File,
  ): Promise<VerifyResponseDto> {
    try {
      this.logger.log(`Verifying face for user ${userId}`);

      // Create FormData to send file
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('file', blob, file.originalname);

      // Make request to face-auth-service
      const response = await firstValueFrom(
        this.httpService.post('/verify', formData, {
          headers: {
            'X-User-ID': userId,
            'Content-Type': 'multipart/form-data',
          },
        }),
      );

      this.logger.log(
        `Face verification result for user ${userId}: ${(response.data as VerifyResponseDto).authenticated}`,
      );
      return response.data as VerifyResponseDto;
    } catch (error) {
      return this.handleError('verifyFace', error, userId);
    }
  }

  /**
   * Check training status for a user
   */
  async getStatus(userId: string): Promise<StatusResponseDto> {
    try {
      this.logger.log(`Checking status for user ${userId}`);

      const response = await firstValueFrom(
        this.httpService.get('/status', {
          headers: {
            'X-User-ID': userId,
          },
        }),
      );

      const statusData = response.data as StatusResponseDto;

      // If training is completed and user hasn't been enabled yet, enable face auth
      if (
        statusData.status === 'training_completed' &&
        statusData.model_ready
      ) {
        await this.enableFaceAuthForUser(parseInt(userId));
      }

      return statusData;
    } catch (error) {
      return this.handleError('getStatus', error, userId);
    }
  }

  /**
   * Enable face authentication for a user
   */
  async enableFaceAuthForUser(userId: number): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });

      if (user && !user.faceEnabled) {
        user.faceEnabled = true;
        await this.usersRepository.save(user);
        this.logger.log(`Face authentication enabled for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to enable face auth for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Delete a user's face model and data
   */
  async deleteFaceData(userId: string): Promise<DeleteResponseDto> {
    try {
      this.logger.log(`Deleting face data for user ${userId}`);

      const response = await firstValueFrom(
        this.httpService.delete('/delete', {
          headers: {
            'X-User-ID': userId,
          },
        }),
      );

      // Disable face authentication for the user
      await this.disableFaceAuthForUser(parseInt(userId));

      this.logger.log(
        `Face data deletion result for user ${userId}: ${(response.data as DeleteResponseDto).status}`,
      );
      return response.data as DeleteResponseDto;
    } catch (error) {
      return this.handleError('deleteFaceData', error, userId);
    }
  }

  /**
   * Disable face authentication for a user
   */
  async disableFaceAuthForUser(userId: number): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });

      if (user && user.faceEnabled) {
        user.faceEnabled = false;
        await this.usersRepository.save(user);
        this.logger.log(`Face authentication disabled for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to disable face auth for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Handle errors from face-auth-service
   */
  private handleError(
    operation: string,
    error: unknown,
    userId?: string,
  ): never {
    const context = userId ? `for user ${userId}` : '';

    if (error instanceof AxiosError) {
      const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        (error.response?.data as { detail?: string })?.detail || error.message;

      this.logger.error(
        `${operation} failed ${context}: ${status} - ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Map face-auth-service errors to appropriate HTTP status codes
      switch (status) {
        case 400:
          throw new HttpException(message, HttpStatus.BAD_REQUEST);
        case 404:
          throw new HttpException(message, HttpStatus.NOT_FOUND);
        case 409:
          throw new HttpException(message, HttpStatus.CONFLICT);
        case 500:
          throw new HttpException(
            'Face authentication service error',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        default:
          throw new HttpException(message, status);
      }
    }

    this.logger.error(
      `${operation} failed ${context}:`,
      error instanceof Error ? error.stack : String(error),
    );
    throw new HttpException(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
