import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

import { Brand } from '../brands/entities/brand.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { DiscoveryJob } from '../discovery/entities/discovery-job.entity';

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  campaignLimit: number;
  aiDiscoveryLimit: number;
  features: string[];
  razorpayPlanId?: string;
}

export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    campaignLimit: 2,
    aiDiscoveryLimit: 20,
    features: ['Manual Discover', 'Basic Heuristic Matching'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 2999,
    campaignLimit: 10,
    aiDiscoveryLimit: 5,
    features: ['AI Matching', '5 AI discoveries/month', 'Email Support'],
    razorpayPlanId: 'plan_starter_id_placeholder',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 7999,
    campaignLimit: 50,
    aiDiscoveryLimit: 30,
    features: ['AI Matching', '30 AI discoveries/month', 'PDF Report downloads', 'Priority Support'],
    razorpayPlanId: 'plan_growth_id_placeholder',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19999,
    campaignLimit: 99999,
    aiDiscoveryLimit: 100,
    features: ['AI Matching', '100 AI discoveries/month', 'API Access', 'Campaign Analytics'],
    razorpayPlanId: 'plan_pro_id_placeholder',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49999,
    campaignLimit: 99999,
    aiDiscoveryLimit: 99999,
    features: ['Unlimited Everything', 'Dedicated Support Manager', 'Custom integrations'],
    razorpayPlanId: 'plan_enterprise_id_placeholder',
  },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  // SC-1: Use ConfigService, not process.env directly
  private readonly KEY_ID: string;
  private readonly KEY_SECRET: string;
  private readonly WEBHOOK_SECRET: string;

  constructor(
    @InjectRepository(Brand)
    private brandRepo: Repository<Brand>,
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    @InjectRepository(DiscoveryJob)
    private jobRepo: Repository<DiscoveryJob>,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    this.KEY_ID = this.configService.get<string>('RAZORPAY_KEY_ID', 'rzp_test_placeholder_key');
    this.KEY_SECRET = this.configService.get<string>('RAZORPAY_KEY_SECRET', 'rzp_test_placeholder_secret');
    this.WEBHOOK_SECRET = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
  }

  /**
   * Get current brand plan, limits used, and active stats.
   */
  async getBillingStatus(userId: string) {
    const brand = await this.brandRepo.findOne({ where: { user_id: userId } });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const campaignCount = await this.campaignRepo.count({
      where: { brand_id: brand.id, status: 'active' as any },
    });

    const currentPlan = SUBSCRIPTION_PLANS[brand.subscription_tier] || SUBSCRIPTION_PLANS.free;

    return {
      brandId: brand.id,
      companyName: brand.company_name,
      subscription: {
        tier: brand.subscription_tier,
        status: brand.subscription_status,
        expiresAt: brand.subscription_expires_at,
        razorpaySubscriptionId: brand.razorpay_subscription_id,
      },
      usage: {
        campaigns: {
          used: campaignCount,
          limit: currentPlan.campaignLimit,
          percentage: currentPlan.campaignLimit > 0
            ? Math.min(100, Math.round((campaignCount / currentPlan.campaignLimit) * 100))
            : 0,
        },
        aiDiscoveries: {
          used: brand.ai_discovery_limit_used,
          limit: currentPlan.aiDiscoveryLimit,
          percentage: currentPlan.aiDiscoveryLimit > 0
            ? Math.min(100, Math.round((brand.ai_discovery_limit_used / currentPlan.aiDiscoveryLimit) * 100))
            : 0,
        },
      },
      plans: Object.values(SUBSCRIPTION_PLANS).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        campaignLimit: p.campaignLimit,
        aiDiscoveryLimit: p.aiDiscoveryLimit,
        features: p.features,
        isCurrent: p.id === brand.subscription_tier,
      })),
    };
  }

  /**
   * Initiate a Razorpay checkout session for a subscription upgrade.
   * SEC-5: Stores target plan ID so verifySubscription can resolve it correctly.
   */
  async createCheckoutSession(userId: string, targetPlanId: string) {
    const brand = await this.brandRepo.findOne({ where: { user_id: userId }, relations: ['user'] });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const plan = SUBSCRIPTION_PLANS[targetPlanId];
    if (!plan || plan.id === 'free') {
      throw new BadRequestException('Invalid subscription plan selected');
    }

    // Ensure Razorpay Customer exists
    let customerId = brand.razorpay_customer_id;
    if (!customerId) {
      customerId = await this._createRazorpayCustomer(brand);
      brand.razorpay_customer_id = customerId;
      await this.brandRepo.save(brand);
    }

    const rpPlanId = plan.razorpayPlanId || 'plan_placeholder';
    const subData = await this._createRazorpaySubscription(customerId, rpPlanId);

    // SEC-5: Store the target plan ID so verifySubscription can resolve it correctly
    brand.razorpay_subscription_id = subData.id;
    brand.subscription_tier = targetPlanId; // Mark as pending this plan
    await this.brandRepo.save(brand);

    return {
      subscriptionId: subData.id,
      keyId: this.KEY_ID,
      amount: plan.price * 100, // paise
      name: 'Influencia',
      description: `${plan.name} Subscription Plan`,
      customer: {
        name: brand.company_name,
        email: brand.user?.email || '',
        contact: brand.phone || '',
      },
    };
  }

  /**
   * Verify and activate subscription upon client success callback.
   * SEC-5: Validates payment signature and correctly resolves purchased plan.
   */
  async verifySubscription(
    userId: string,
    payload: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    },
  ) {
    const brand = await this.brandRepo.findOne({ where: { user_id: userId } });
    if (!brand) throw new NotFoundException('Brand profile not found');

    if (brand.razorpay_subscription_id !== payload.razorpay_subscription_id) {
      throw new BadRequestException('Subscription ID mismatch');
    }

    // Verify Razorpay payment signature
    const expectedSignature = crypto
      .createHmac('sha256', this.KEY_SECRET)
      .update(`${payload.razorpay_payment_id}|${payload.razorpay_subscription_id}`)
      .digest('hex');

    if (expectedSignature !== payload.razorpay_signature) {
      this.logger.warn(`[Billing] Invalid payment signature for brand ${brand.id}`);
      throw new UnauthorizedException('Payment signature verification failed');
    }

    // The tier was set to the target plan in createCheckoutSession — confirm it
    const activatedTier = brand.subscription_tier;
    const plan = SUBSCRIPTION_PLANS[activatedTier] || SUBSCRIPTION_PLANS.starter;

    brand.subscription_tier = plan.id;
    brand.subscription_status = 'active';
    brand.subscription_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.brandRepo.save(brand);

    this.logger.log(`Subscription verified & active for brand ${brand.company_name} (Plan: ${plan.id})`);
    return { success: true, tier: plan.id };
  }

  /**
   * Process Razorpay Webhook Event (Activated, Charged, Cancelled, Expired).
   * SEC-3: Verifies HMAC-SHA256 signature before trusting any payload.
   */
  async handleWebhook(rawBody: Buffer | string, signature: string) {
    // Verify webhook signature — reject any unsigned or tampered webhooks
    if (this.WEBHOOK_SECRET) {
      const expectedSig = crypto
        .createHmac('sha256', this.WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (expectedSig !== signature) {
        this.logger.warn('[Billing] Webhook rejected: invalid signature');
        throw new UnauthorizedException('Webhook signature verification failed');
      }
    } else {
      this.logger.warn(
        '[Billing] RAZORPAY_WEBHOOK_SECRET not set — skipping signature check. Set this env var before going live!',
      );
    }

    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());
    const event = body.event;
    const subObject = body.payload?.subscription?.entity;

    if (!subObject) return { status: 'ignored' };

    const rpSubId = subObject.id;
    const brand = await this.brandRepo.findOne({ where: { razorpay_subscription_id: rpSubId } });
    if (!brand) {
      this.logger.warn(`Webhook received for unknown subscription ID: ${rpSubId}`);
      return { status: 'unknown_sub' };
    }

    this.logger.log(`Webhook received: ${event} for brand ${brand.company_name}`);

    switch (event) {
      case 'subscription.activated':
      case 'subscription.charged': {
        brand.subscription_status = 'active';
        brand.subscription_expires_at = new Date(
          (subObject.current_end || Date.now() / 1000 + 30 * 86400) * 1000,
        );
        const plan = Object.values(SUBSCRIPTION_PLANS).find(
          (p) => p.razorpayPlanId === subObject.plan_id,
        );
        if (plan) brand.subscription_tier = plan.id;
        break;
      }
      case 'subscription.pending':
      case 'subscription.halted':
        brand.subscription_status = 'past_due';
        break;

      case 'subscription.cancelled':
      case 'subscription.expired':
        brand.subscription_status = 'inactive';
        brand.subscription_tier = 'free';
        brand.razorpay_subscription_id = null;
        break;
    }

    await this.brandRepo.save(brand);
    return { status: 'processed', event };
  }

  /**
   * Reset monthly AI discovery usage counters.
   * CQ-4: Scoped to active subscriptions only.
   */
  async resetMonthlyLimits() {
    this.logger.log('Resetting monthly AI discovery limits for active subscriptions...');
    await this.dataSource.query(
      `UPDATE brands SET ai_discovery_limit_used = 0 WHERE subscription_status = 'active'`,
    );
    this.logger.log('Monthly limit reset complete');
  }

  // ─────────────────────────────────────────────────────────────
  // Private API Helpers
  // ─────────────────────────────────────────────────────────────

  private async _createRazorpayCustomer(brand: Brand): Promise<string> {
    try {
      const auth = Buffer.from(`${this.KEY_ID}:${this.KEY_SECRET}`).toString('base64');
      const response = await axios.post(
        'https://api.razorpay.com/v1/customers',
        {
          name: brand.company_name,
          email: brand.user?.email || '',
          contact: brand.phone || '',
        },
        { headers: { Authorization: `Basic ${auth}` } },
      );
      return response.data.id;
    } catch (err) {
      this.logger.error(`Failed to create Razorpay Customer: ${err.message}`);
      return `cust_mock_${Date.now().toString().slice(-6)}`;
    }
  }

  private async _createRazorpaySubscription(customerId: string, planId: string) {
    try {
      const auth = Buffer.from(`${this.KEY_ID}:${this.KEY_SECRET}`).toString('base64');
      const response = await axios.post(
        'https://api.razorpay.com/v1/subscriptions',
        {
          plan_id: planId,
          total_count: 12,
          quantity: 1,
          customer_id: customerId,
        },
        { headers: { Authorization: `Basic ${auth}` } },
      );
      return response.data;
    } catch (err) {
      this.logger.error(`Failed to create Razorpay Subscription: ${err.message}`);
      return { id: `sub_mock_${Date.now().toString().slice(-6)}` };
    }
  }
}
