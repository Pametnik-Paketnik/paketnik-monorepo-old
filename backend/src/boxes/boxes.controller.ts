import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { BoxesService } from './boxes.service';
import { CreateBoxDto } from './dto/create-box.dto';
import { UpdateBoxDto } from './dto/update-box.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Box } from './entities/box.entity';
import { OpenBoxDto } from './dto/open-box.dto';
import { UsersService } from '../users/users.service';
import { UnlockHistory } from './entities/unlock-history.entity';

interface RequestWithUser extends Request {
  user?: { userId: number };
}

@ApiTags('boxes')
@ApiBearerAuth('access-token')
@Controller('boxes')
@UseGuards(JwtAuthGuard)
export class BoxesController {
  constructor(
    private readonly boxesService: BoxesService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new box' })
  @ApiResponse({
    status: 201,
    description: 'The box has been successfully created.',
    type: Box,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Box with this ID already exists.' })
  create(@Body() createBoxDto: CreateBoxDto) {
    return this.boxesService.create(createBoxDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all boxes' })
  @ApiResponse({
    status: 200,
    description: 'Return all boxes.',
    type: [Box],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll() {
    return this.boxesService.findAll();
  }

  @Get('host/:hostId')
  @ApiOperation({ summary: 'Get all boxes belonging to a specific host' })
  @ApiResponse({
    status: 200,
    description: 'Return all boxes belonging to the specified host.',
    type: [Box],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Host not found or no boxes found.' })
  findByHostId(@Param('hostId') hostId: string) {
    return this.boxesService.findByHostId(+hostId);
  }

  @Get('opening-history')
  @ApiOperation({ summary: 'Get all box opening history' })
  @ApiResponse({
    status: 200,
    description: 'Return all opening history.',
    type: [UnlockHistory],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getAllOpeningHistory() {
    return this.boxesService.getOpeningHistory();
  }

  @Get('opening-history/box/:boxId')
  @ApiOperation({ summary: 'Get opening history for a specific box' })
  @ApiResponse({
    status: 200,
    description: 'Return opening history for the specified box.',
    type: [UnlockHistory],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getOpeningHistoryByBoxId(@Param('boxId') boxId: string) {
    return this.boxesService.getOpeningHistoryByBoxId(boxId);
  }

  @Get('opening-history/user/:userId')
  @ApiOperation({ summary: 'Get opening history for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'Return opening history for the specified user.',
    type: [UnlockHistory],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getOpeningHistoryByUserId(@Param('userId') userId: string) {
    return this.boxesService.getOpeningHistoryByUserId(+userId);
  }

  @Post('open')
  @ApiOperation({ summary: 'Open a box' })
  @ApiResponse({ status: 200, description: 'Box successfully opened.' })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async openBox(
    @Body() openBoxDto: OpenBoxDto,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    if (!req.user?.userId) throw new UnauthorizedException();
    const user = await this.usersService.findOne(req.user.userId);
    return this.boxesService.openBox(openBoxDto, user);
  }

  @Get(':boxId')
  @ApiOperation({ summary: 'Get a box by boxId' })
  @ApiResponse({
    status: 200,
    description: 'Return the box.',
    type: Box,
  })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findOne(@Param('boxId') boxId: string) {
    return this.boxesService.findOneByBoxId(boxId);
  }

  @Patch(':boxId')
  @ApiOperation({ summary: 'Update a box by boxId' })
  @ApiResponse({
    status: 200,
    description: 'The box has been successfully updated.',
    type: Box,
  })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Box with this ID already exists.' })
  update(@Param('boxId') boxId: string, @Body() updateBoxDto: UpdateBoxDto) {
    return this.boxesService.updateByBoxId(boxId, updateBoxDto);
  }

  @Delete(':boxId')
  @ApiOperation({ summary: 'Delete a box by boxId' })
  @ApiResponse({
    status: 200,
    description: 'The box has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  remove(@Param('boxId') boxId: string) {
    return this.boxesService.removeByBoxId(boxId);
  }
}
