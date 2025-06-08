import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { User } from '../users/entities/user.entity';
import { SetupTotpResponseDto } from './dto/setup-totp-response.dto';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async setupTotp(userId: number): Promise<SetupTotpResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate a new secret
    const secret: string = authenticator.generateSecret();

    // Save the secret to the user (but don't enable 2FA yet)
    user.totpSecret = secret;
    await this.usersRepository.save(user);

    // Create the OTP Auth URL for QR code
    const appName: string =
      this.configService.get<string>('APP_NAME') ?? 'Paketnik App';
    const qrCodeUri = authenticator.keyuri(user.email, appName, secret);

    return {
      secret,
      qrCodeUri,
      manualEntryKey: secret,
    };
  }

  async verifyTotpSetup(
    userId: number,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.totpSecret) {
      throw new BadRequestException('TOTP setup not initiated');
    }

    // Verify the code
    const isValid = authenticator.check(code, user.totpSecret);

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    // Enable 2FA for the user
    user.twoFactorEnabled = true;
    await this.usersRepository.save(user);

    return {
      success: true,
      message: '2FA has been successfully enabled',
    };
  }

  async verifyTotpCode(userId: number, code: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.totpSecret || !user.twoFactorEnabled) {
      return false;
    }

    return authenticator.check(code, user.totpSecret);
  }

  async disableTotp(
    userId: number,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Disable 2FA and clear the secret
    user.twoFactorEnabled = false;
    user.totpSecret = null;
    await this.usersRepository.save(user);

    return {
      success: true,
      message: '2FA has been disabled',
    };
  }

  async getTwoFactorStatus(userId: number): Promise<{ enabled: boolean }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'twoFactorEnabled'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { enabled: user.twoFactorEnabled };
  }
}
