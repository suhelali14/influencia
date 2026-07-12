import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Tenant } from './entities/tenant.entity';
import { Brand } from '../brands/entities/brand.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { RateLimitMiddleware, AuthRateLimitMiddleware } from './middleware/rate-limit.middleware';
import { PlanLimitsGuard } from './guards/plan-limits.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Brand, Campaign]),
    RedisModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    RateLimitMiddleware,
    AuthRateLimitMiddleware,
    PlanLimitsGuard,
  ],
  exports: [TypeOrmModule, RedisModule, RateLimitMiddleware, AuthRateLimitMiddleware, PlanLimitsGuard],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply request logger to all routes
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
    
    // Apply rate limiting to all routes
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');
    
    // Apply stricter rate limiting to auth routes
    consumer
      .apply(AuthRateLimitMiddleware)
      .forRoutes('auth/login', 'auth/register');
  }
}
