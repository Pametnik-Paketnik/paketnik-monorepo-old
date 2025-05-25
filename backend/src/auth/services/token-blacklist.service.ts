import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService {
  private blacklistedTokens = new Set<string>();

  addToken(token: string): void {
    this.blacklistedTokens.add(token);
  }

  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  // Optional: Clean up expired tokens periodically
  removeExpiredTokens(): void {
    // Implementation depends on your JWT expiration strategy
    // For now, you can leave this empty or implement token cleanup logic
  }
}