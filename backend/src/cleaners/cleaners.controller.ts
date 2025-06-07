import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CleanersService } from './cleaners.service';
import { CreateCleanerDto } from './dto/create-cleaner.dto';
import { UpdateCleanerDto } from './dto/update-cleaner.dto';
import { User } from '../users/entities/user.entity';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: number };
}

@ApiTags('cleaners')
@ApiBearerAuth('access-token')
@Controller('cleaners')
@UseGuards(JwtAuthGuard)
export class CleanersController {
  constructor(private readonly cleanersService: CleanersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new cleaner',
    description:
      'Hosts can create cleaner accounts to manage their cleaning staff',
  })
  @ApiResponse({
    status: 201,
    description: 'Cleaner created successfully',
    schema: {
      example: {
        id: 4,
        username: 'cleaner_maria',
        userType: 'CLEANER',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Only hosts can create cleaner accounts',
  })
  @ApiResponse({
    status: 409,
    description: 'Username already exists',
  })
  async createCleaner(
    @Req() req: RequestWithUser,
    @Body() createCleanerDto: CreateCleanerDto,
  ): Promise<User> {
    return this.cleanersService.createCleaner(
      req.user.userId,
      createCleanerDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all cleaners for the authenticated host',
    description: 'Hosts can view all their cleaners',
  })
  @ApiResponse({
    status: 200,
    description: 'List of cleaners retrieved successfully',
    schema: {
      example: [
        {
          id: 4,
          username: 'cleaner_maria',
          userType: 'CLEANER',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        },
        {
          id: 5,
          username: 'cleaner_john',
          userType: 'CLEANER',
          createdAt: '2024-01-16T09:15:00Z',
          updatedAt: '2024-01-16T09:15:00Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Only hosts can view their cleaners',
  })
  async getCleaners(@Req() req: RequestWithUser): Promise<User[]> {
    return this.cleanersService.getCleanersForHost(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific cleaner by ID',
    description: 'Hosts can view details of a specific cleaner',
  })
  @ApiParam({
    name: 'id',
    description: 'Cleaner ID',
    example: 4,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleaner details retrieved successfully',
    schema: {
      example: {
        id: 4,
        username: 'cleaner_maria',
        userType: 'CLEANER',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Cleaner not found or not belongs to you',
  })
  async getCleaner(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<User> {
    return this.cleanersService.getCleanerById(req.user.userId, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update cleaner information',
    description: 'Hosts can update their cleaner details',
  })
  @ApiParam({
    name: 'id',
    description: 'Cleaner ID',
    example: 4,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleaner updated successfully',
    schema: {
      example: {
        id: 4,
        username: 'cleaner_maria_updated',
        userType: 'CLEANER',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T14:20:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Cleaner not found or not belongs to you',
  })
  @ApiResponse({
    status: 409,
    description: 'Username already exists',
  })
  async updateCleaner(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCleanerDto: UpdateCleanerDto,
  ): Promise<User> {
    return this.cleanersService.updateCleaner(
      req.user.userId,
      id,
      updateCleanerDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a cleaner',
    description: 'Hosts can delete cleaner accounts',
  })
  @ApiParam({
    name: 'id',
    description: 'Cleaner ID',
    example: 4,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleaner deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Cleaner not found or not belongs to you',
  })
  async deleteCleaner(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.cleanersService.deleteCleaner(req.user.userId, id);
    return { message: 'Cleaner deleted successfully' };
  }
}
