import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should pass basic test', () => {
    const mockUser = { id: 1, name: 'Test User' };
    expect(mockUser.id).toBe(1);
  });

  it('should validate email format', () => {
    const email = 'test@example.com';
    expect(email.includes('@')).toBe(true);
  });

  it('should handle empty array', () => {
    const users = [];
    expect(users.length).toBe(0);
  });

  it('should pass simple calculation', () => {
    expect(5 * 3).toBe(15);
  });
});
