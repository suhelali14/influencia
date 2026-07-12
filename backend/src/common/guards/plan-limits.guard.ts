import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';

import { Brand } from '../../brands/entities/brand.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { SUBSCRIPTION_PLANS } from '../../billing/billing.service';

/**
 * PlanLimitsGuard
 * =================
 * Enforces SaaS subscription limits on campaign creation, AI discovery searches, and premium metrics.
 * Throws a HTTP 402 Payment Required if a limit is exceeded, prompting the user to upgrade.
 */
@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    @InjectRepository(Brand)
    private brandRepo: Repository<Brand>,
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'brand_admin') {
      // Pass-through for non-brand admins (creators, system, admin)
      return true;
    }

    const brand = await this.brandRepo.findOne({ where: { user_id: user.userId } });
    if (!brand) {
      throw new ForbiddenException('Brand profile missing. Complete setup first.');
    }

    const tier = brand.subscription_tier || 'free';
    const status = brand.subscription_status || 'inactive';
    const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free;

    // Past due accounts are blocked from premium actions
    if (status === 'past_due' && tier !== 'free') {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: 'Your subscription payment is past due. Please update billing info.',
          error: 'Payment Required',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const path = request.route.path;
    const method = request.method;

    // ── Enforce Campaign Limits ──────────────────────────────────────
    if (path.includes('/campaigns') && method === 'POST') {
      const activeCampaigns = await this.campaignRepo.count({
        where: { brand_id: brand.id, status: 'active' as any },
      });

      if (activeCampaigns >= plan.campaignLimit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: `Active campaigns limit reached (${activeCampaigns}/${plan.campaignLimit}) for ${plan.name} plan. Please upgrade to create more campaigns.`,
            error: 'CampaignLimitExceeded',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    // ── Enforce AI Discovery Limits ──────────────────────────────────
    if (path.includes('/discovery/campaign') && path.includes('/search') && method === 'POST') {
      if (brand.ai_discovery_limit_used >= plan.aiDiscoveryLimit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: `AI Internet discovery limit reached (${brand.ai_discovery_limit_used}/${plan.aiDiscoveryLimit}) for this cycle. Please upgrade your plan.`,
            error: 'DiscoveryLimitExceeded',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    // ── Enforce Premium Features (PDF / Analytics / Compare / Budget) ──
    if ((path.includes('/compare') || path.includes('/download-report')) && method === 'GET') {
      const allowedTiers = ['growth', 'pro', 'enterprise'];
      if (!allowedTiers.includes(tier)) {
        const featureName = path.includes('/compare') ? 'Side-by-side comparison' : 'PDF Report download';
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: `${featureName} features are only available on the Growth plan or higher.`,
            error: 'FeatureNotAllowed',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    if (path.includes('/budget-recommendation') || path.includes('/budget-recalculate')) {
      const allowedTiers = ['growth', 'pro', 'enterprise'];
      if (!allowedTiers.includes(tier)) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: `AI Budget recommendation and ROI sandbox are only available on the Growth plan or higher.`,
            error: 'FeatureNotAllowed',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    return true;
  }
}
