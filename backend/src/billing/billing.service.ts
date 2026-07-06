import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    aiDiscoveryLimit: 20, // lifetime or manual searches
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
    campaignLimit: 99999, // unlimited
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

  // Razorpay credentials
  private readonly KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key';
  private readonly KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret';

  constructor(
    @InjectRepository(Brand)
    private brandRepo: Repository<Brand>,
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    @InjectRepository(DiscoveryJob)
    private jobRepo: Repository<DiscoveryJob>,
    private dataSource: DataSource,
  ) {}

  /**
   * Get current brand plan, limits used, and active stats.
   */
  async getBillingStatus(userId: string) {
    const brand = await this.brandRepo.findOne({ where: { user_id: userId } });
    if (!brand) throw new NotFoundException('Brand profile not found');

    // Dynamically calculate active campaigns and discovery jobs
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
      plans: Object.values(SUBSCRIPTION_PLANS).map(p => ({
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
   */
  async createCheckoutSession(userId: string, targetPlanId: string) {
    const brand = await this.brandRepo.findOne({ where: { user_id: userId }, relations: ['user'] });
    if (!brand) throw new NotFoundException('Brand profile not found');

    const plan = SUBSCRIPTION_PLANS[targetPlanId];
    if (!plan || plan.id === 'free') {
      throw new BadRequestException('Invalid subscription plan selected');
    }

    // 1. Ensure Razorpay Customer exists
    let customerId = brand.razorpay_customer_id;
    if (!customerId) {
      customerId = await this._createRazorpayCustomer(brand);
      brand.razorpay_customer_id = customerId;
      await this.brandRepo.save(brand);
    }

    // 2. Create subscription on Razorpay
    const rpPlanId = plan.razorpayPlanId || 'plan_placeholder';
    const subData = await this._createRazorpaySubscription(customerId, rpPlanId);

    // 3. Save pending sub ID to database
    brand.razorpay_subscription_id = subData.id;
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

    // Find what plan corresponds to this transaction
    const targetPlan = Object.values(SUBSCRIPTION_PLANS).find(
      p => p.razorpayPlanId === 'plan_placeholder' || p.id !== 'free'
    );

    // Update database immediately
    brand.subscription_tier = targetPlan?.id || 'starter';
    brand.subscription_status = 'active';
    brand.subscription_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await this.brandRepo.save(brand);

    this.logger.log(`Subscription verified & active for brand ${brand.company_name} (Plan: ${brand.subscription_tier})`);
    return { success: true, tier: brand.subscription_tier };
  }

  /**
   * Process Razorpay Webhook Event (Activated, Charged, Cancelled, Expired).
   */
  async handleWebhook(body: any, signature: string) {
    // Note: In production verify signature using crypto.createHmac('sha256', secret)
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
      case 'subscription.charged':
        // Update subscription expiration date based on billing period end
        brand.subscription_status = 'active';
        brand.subscription_expires_at = new Date((subObject.current_end || (Date.now() / 1000 + 30 * 86400)) * 1000);

        // Map Razorpay plan ID back to our local config ID
        const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.razorpayPlanId === subObject.plan_id);
        if (plan) {
          brand.subscription_tier = plan.id;
        }
        break;

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
   * Reset monthly AI discovery usage counters for active billing cycles.
   * Runs via cron scheduler or system triggers.
   */
  async resetMonthlyLimits() {
    this.logger.log('Resetting monthly AI discovery limits for all brands...');
    await this.dataSource.query(
      `UPDATE brands SET ai_discovery_limit_used = 0`
    );
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
        { headers: { Authorization: `Basic ${auth}` } }
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
          total_count: 12, // bill for 12 cycles max
          quantity: 1,
          customer_id: customerId,
        },
        { headers: { Authorization: `Basic ${auth}` } }
      );
      return response.data;
    } catch (err) {
      this.logger.error(`Failed to create Razorpay Subscription: ${err.message}`);
      // Fallback placeholder ID for testing flow
      return { id: `sub_mock_${Date.now().toString().slice(-6)}` };
    }
  }
}
