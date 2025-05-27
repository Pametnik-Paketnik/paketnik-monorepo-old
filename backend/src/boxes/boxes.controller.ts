import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
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
} from '@nestjs/swagger';
import { Box } from './entities/box.entity';

@ApiTags('boxes')
@ApiBearerAuth('access-token')
@Controller('boxes')
@UseGuards(JwtAuthGuard)
export class BoxesController {
  constructor(private readonly boxesService: BoxesService) {}

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

  @Get(':id')
  @ApiOperation({ summary: 'Get a box by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the box.',
    type: Box,
  })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findOne(@Param('id') id: string) {
    return this.boxesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a box' })
  @ApiResponse({
    status: 200,
    description: 'The box has been successfully updated.',
    type: Box,
  })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Box with this ID already exists.' })
  update(@Param('id') id: string, @Body() updateBoxDto: UpdateBoxDto) {
    return this.boxesService.update(+id, updateBoxDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a box' })
  @ApiResponse({
    status: 200,
    description: 'The box has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Box not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  remove(@Param('id') id: string) {
    return this.boxesService.remove(+id);
  }
}
