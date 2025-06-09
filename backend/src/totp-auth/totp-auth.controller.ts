import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TotpAuthService } from './totp-auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifyTotpDto } from './dto/verify-totp.dto';
import { SetupTotpResponseDto } from './dto/setup-totp-response.dto';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('TOTP Authentication')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('2fa/totp')
export class TotpAuthController {
  constructor(private readonly totpAuthService: TotpAuthService) {}

  @Post('setup')
  @ApiOperation({ summary: 'Setup TOTP 2FA for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'TOTP setup successful. Returns secret and QR code URI.',
    type: SetupTotpResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async setupTotp(@Req() req: RequestWithUser): Promise<SetupTotpResponseDto> {
    return await this.totpAuthService.setupTotp(req.user.userId);
  }

  @Post('verify-setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP setup with the first code' })
  @ApiResponse({
    status: 200,
    description: 'TOTP 2FA has been successfully enabled',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'TOTP 2FA has been successfully enabled',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid TOTP code or setup not initiated',
  })
  async verifyTotpSetup(
    @Req() req: RequestWithUser,
    @Body() verifyTotpDto: VerifyTotpDto,
  ): Promise<{ success: boolean; message: string }> {
    return await this.totpAuthService.verifyTotpSetup(
      req.user.userId,
      verifyTotpDto.code,
    );
  }

  @Get('status')
  @ApiOperation({ summary: 'Get TOTP 2FA status for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns whether TOTP 2FA is enabled',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  async getTotpAuthStatus(
    @Req() req: RequestWithUser,
  ): Promise<{ enabled: boolean }> {
    return await this.totpAuthService.getTotpAuthStatus(req.user.userId);
  }

  @Delete('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable TOTP 2FA for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'TOTP 2FA has been disabled',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'TOTP 2FA has been disabled' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async disableTotp(
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    return await this.totpAuthService.disableTotp(req.user.userId);
  }
}
