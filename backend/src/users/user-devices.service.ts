import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDevice } from './entities/user-device.entity';
import { User } from './entities/user.entity';
import {
  RegisterDeviceDto,
  UpdateDeviceDto,
  DeviceResponseDto,
} from './dto/register-device.dto';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class UserDevicesService {
  constructor(
    @InjectRepository(UserDevice)
    private userDevicesRepository: Repository<UserDevice>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Register a new device for a user
   */
  async registerDevice(
    userId: number,
    registerDeviceDto: RegisterDeviceDto,
  ): Promise<DeviceResponseDto> {
    // Verify user exists
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate FCM token
    const isValidToken = await this.firebaseService.validateDeviceToken(
      registerDeviceDto.fcmToken,
    );
    if (!isValidToken) {
      throw new BadRequestException('Invalid FCM token');
    }

    // Check if token already exists for this user
    const existingDevice = await this.userDevicesRepository.findOne({
      where: {
        userId,
        fcmToken: registerDeviceDto.fcmToken,
      },
    });

    if (existingDevice) {
      // Update existing device instead of creating duplicate
      existingDevice.platform = registerDeviceDto.platform;
      existingDevice.deviceName = registerDeviceDto.deviceName;
      existingDevice.deviceId = registerDeviceDto.deviceId;
      existingDevice.appVersion = registerDeviceDto.appVersion;
      existingDevice.isActive = true;
      existingDevice.lastUsedAt = new Date();

      const updatedDevice =
        await this.userDevicesRepository.save(existingDevice);
      return this.mapToResponseDto(updatedDevice);
    }

    // Create new device
    const device = this.userDevicesRepository.create({
      userId,
      fcmToken: registerDeviceDto.fcmToken,
      platform: registerDeviceDto.platform,
      deviceName: registerDeviceDto.deviceName,
      deviceId: registerDeviceDto.deviceId,
      appVersion: registerDeviceDto.appVersion,
      lastUsedAt: new Date(),
    });

    const savedDevice = await this.userDevicesRepository.save(device);
    return this.mapToResponseDto(savedDevice);
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: number): Promise<DeviceResponseDto[]> {
    const devices = await this.userDevicesRepository.find({
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC', createdAt: 'DESC' },
    });

    return devices.map((device) => this.mapToResponseDto(device));
  }

  /**
   * Get all active FCM tokens for a user (for sending notifications)
   */
  async getUserFcmTokens(userId: number): Promise<string[]> {
    const devices = await this.userDevicesRepository.find({
      where: { userId, isActive: true },
      select: ['fcmToken'],
    });

    return devices.map((device) => device.fcmToken);
  }

  /**
   * Update device information
   */
  async updateDevice(
    userId: number,
    deviceId: number,
    updateDeviceDto: UpdateDeviceDto,
  ): Promise<DeviceResponseDto> {
    const device = await this.userDevicesRepository.findOne({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (updateDeviceDto.deviceName !== undefined) {
      device.deviceName = updateDeviceDto.deviceName;
    }
    if (updateDeviceDto.appVersion !== undefined) {
      device.appVersion = updateDeviceDto.appVersion;
    }
    if (updateDeviceDto.isActive !== undefined) {
      device.isActive = updateDeviceDto.isActive;
    }

    device.lastUsedAt = new Date();
    const updatedDevice = await this.userDevicesRepository.save(device);
    return this.mapToResponseDto(updatedDevice);
  }

  /**
   * Remove/deactivate a device
   */
  async removeDevice(userId: number, deviceId: number): Promise<void> {
    const device = await this.userDevicesRepository.findOne({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Soft delete - mark as inactive instead of deleting
    device.isActive = false;
    await this.userDevicesRepository.save(device);
  }

  /**
   * Update last used timestamp for a device (called when receiving notifications)
   */
  async updateLastUsed(fcmToken: string): Promise<void> {
    await this.userDevicesRepository.update(
      { fcmToken, isActive: true },
      { lastUsedAt: new Date() },
    );
  }

  /**
   * Clean up expired/invalid tokens
   */
  async cleanupInvalidTokens(): Promise<number> {
    const devices = await this.userDevicesRepository.find({
      where: { isActive: true },
    });

    let cleanedCount = 0;
    for (const device of devices) {
      const isValid = await this.firebaseService.validateDeviceToken(
        device.fcmToken,
      );
      if (!isValid) {
        device.isActive = false;
        await this.userDevicesRepository.save(device);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get devices by multiple user IDs (for bulk notifications)
   */
  async getDevicesByUserIds(userIds: number[]): Promise<Map<number, string[]>> {
    const devices = await this.userDevicesRepository
      .createQueryBuilder('device')
      .where('device.userId IN (:...userIds)', { userIds })
      .andWhere('device.isActive = :isActive', { isActive: true })
      .select(['device.userId', 'device.fcmToken'])
      .getMany();

    const deviceMap = new Map<number, string[]>();

    for (const device of devices) {
      const tokens = deviceMap.get(device.userId) || [];
      tokens.push(device.fcmToken);
      deviceMap.set(device.userId, tokens);
    }

    return deviceMap;
  }

  private mapToResponseDto(device: UserDevice): DeviceResponseDto {
    return {
      id: device.id,
      fcmToken: device.fcmToken,
      platform: device.platform,
      deviceName: device.deviceName,
      deviceId: device.deviceId,
      appVersion: device.appVersion,
      isActive: device.isActive,
      lastUsedAt: device.lastUsedAt,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }
}
