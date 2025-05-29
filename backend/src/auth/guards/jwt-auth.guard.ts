import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenBlacklistService } from '../services/token-blacklist.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly tokenBlacklistService?: TokenBlacklistService) {
    // Add ? to make optional
    super();
  }

  handleRequest(err: any, user: any, info: any, context: any) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const token = authHeader?.split(' ')[1];

    // Check if token is blacklisted (only if service is available)
    if (
      token &&
      this.tokenBlacklistService &&
      this.tokenBlacklistService.isTokenBlacklisted(token)
    ) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
