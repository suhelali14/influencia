import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

/**
 * Get the real client IP address.
 *
 * SECURITY: We only trust X-Forwarded-For if it arrives via a known
 * reverse-proxy (Render / nginx injects it reliably). We take the LAST
 * IP in the chain — that is the IP the proxy itself saw, which an
 * external client cannot spoof.
 *
 * If you add a new proxy layer in future, adjust this logic.
 */
function getClientIp(req: Request): string {
  // req.ip is set by Express when 'trust proxy' is configured (main.ts sets it).
  // It already handles X-Forwarded-For correctly via Express semantics.
  if (req.ip) return req.ip;

  // Fallback: take the last entry of X-Forwarded-For (the one added by our proxy)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = (Array.isArray(xForwardedFor) ? xForwardedFor.join(',') : xForwardedFor)
      .split(',')
      .map((s) => s.trim());
    // Last IP is the one our trusted proxy saw — cannot be spoofed by client
    return ips[ips.length - 1] || 'unknown';
  }

  return req.socket?.remoteAddress || 'unknown';
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly config: RateLimitConfig = {
    windowMs: 60 * 1000,   // 1 minute
    maxRequests: 100,       // 100 requests per minute per IP
    message: 'Too many requests, please try again later.',
  };

  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = getClientIp(req);
    const key = `ratelimit:${ip}`;

    try {
      const current = await this.redisService.incr(key);

      if (current === 1) {
        // Set expiry on the first hit in this window
        await this.redisService.expire(key, Math.ceil(this.config.windowMs / 1000));
      }

      const ttl = await this.redisService.ttl(key);

      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - current));
      res.setHeader('X-RateLimit-Reset', Date.now() + ttl * 1000);

      if (current > this.config.maxRequests) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: this.config.message,
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // If Redis is unavailable, fail open (allow the request)
      next();
    }
  }
}

/**
 * Stricter rate limiter for auth endpoints (login / register).
 * 10 attempts per 15 minutes per IP — blocks brute force attacks.
 */
@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly config: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,           // 10 login attempts per 15 minutes
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  };

  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = getClientIp(req);
    const key = `ratelimit:auth:${ip}`;

    try {
      const current = await this.redisService.incr(key);

      if (current === 1) {
        await this.redisService.expire(key, Math.ceil(this.config.windowMs / 1000));
      }

      const ttl = await this.redisService.ttl(key);

      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - current));

      if (current > this.config.maxRequests) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: this.config.message,
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      next();
    }
  }
}
