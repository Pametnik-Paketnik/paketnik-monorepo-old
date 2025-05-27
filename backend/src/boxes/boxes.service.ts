import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBoxDto } from './dto/create-box.dto';
import { UpdateBoxDto } from './dto/update-box.dto';
import { Box } from './entities/box.entity';

@Injectable()
export class BoxesService {
  constructor(
    @InjectRepository(Box)
    private boxesRepository: Repository<Box>,
  ) {}

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

    const box = this.boxesRepository.create(createBoxDto);
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

  async remove(id: number): Promise<void> {
    const box = await this.findOne(id);
    await this.boxesRepository.remove(box);
  }
}
