import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly tokenBlacklistService?: TokenBlacklistService) {
    // Add ? to make optional
    super();
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token =
      typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined;

    // Check if token is blacklisted (only if service is available)
    if (
      token &&
      this.tokenBlacklistService &&
      this.tokenBlacklistService.isTokenBlacklisted(token)
    ) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    return user as TUser;
  }
}
