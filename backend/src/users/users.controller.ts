import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Post,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  HttpException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserDevicesService } from './user-devices.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import {
  RegisterDeviceDto,
  DeviceResponseDto,
  UpdateDeviceDto,
} from './dto/register-device.dto';
import { User } from './entities/user.entity';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: number };
}

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userDevicesService: UserDevicesService,
  ) {}

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => this.mapToResponseDto(user));
  }

  // Device Management Endpoints - Must come BEFORE :id routes to avoid conflicts

  @Post('devices')
  @ApiOperation({ summary: 'Register a new device for the current user' })
  @ApiResponse({
    status: 201,
    description: 'Device registered successfully',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid FCM token or bad request',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async registerDevice(
    @Body() registerDeviceDto: RegisterDeviceDto,
    @Req() req: RequestWithUser,
  ): Promise<DeviceResponseDto> {
    return this.userDevicesService.registerDevice(
      req.user.userId,
      registerDeviceDto,
    );
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get all devices for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user devices',
    type: [DeviceResponseDto],
  })
  async getUserDevices(
    @Req() req: RequestWithUser,
  ): Promise<DeviceResponseDto[]> {
    return this.userDevicesService.getUserDevices(req.user.userId);
  }

  @Patch('devices/:deviceId')
  @ApiOperation({ summary: 'Update device information' })
  @ApiResponse({
    status: 200,
    description: 'Device updated successfully',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async updateDevice(
    @Param('deviceId') deviceId: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
    @Req() req: RequestWithUser,
  ): Promise<DeviceResponseDto> {
    return this.userDevicesService.updateDevice(
      req.user.userId,
      +deviceId,
      updateDeviceDto,
    );
  }

  @Delete('devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove/deactivate a device' })
  @ApiResponse({
    status: 204,
    description: 'Device removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async removeDevice(
    @Param('deviceId') deviceId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.userDevicesService.removeDevice(req.user.userId, +deviceId);
  }

  // User-specific routes with :id parameter - Must come AFTER specific routes

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(+id);
    return this.mapToResponseDto(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to update',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(+id, updateUserDto);
    return this.mapToResponseDto(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    if (req.user.userId !== +id) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    await this.usersService.remove(+id);
  }

  private mapToResponseDto(user: User): UserResponseDto {
    const responseDto = new UserResponseDto();
    responseDto.id = user.id;
    responseDto.name = user.name;
    responseDto.surname = user.surname;
    responseDto.email = user.email;
    responseDto.userType = user.userType;
    responseDto.createdAt = user.createdAt;
    responseDto.updatedAt = user.updatedAt;
    return responseDto;
  }
}
