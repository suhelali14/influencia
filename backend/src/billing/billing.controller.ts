import { Controller, Get, Post, Body, UseGuards, Request, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Get current brand plan subscription usage metrics.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription details & limits usage' })
  async getStatus(@Request() req: any) {
    return this.billingService.getBillingStatus(req.user.userId);
  }

  /**
   * Trigger subscription checkout session.
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate checkout session for a subscription upgrade' })
  async subscribe(
    @Request() req: any,
    @Body() body: { planId: string },
  ) {
    return this.billingService.createCheckoutSession(req.user.userId, body.planId);
  }

  /**
   * Client-side signature verification & activation.
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify signature and activate subscription' })
  async verify(
    @Request() req: any,
    @Body() body: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    },
  ) {
    return this.billingService.verifySubscription(req.user.userId, body);
  }

  /**
   * Cancel active subscription.
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel the active SaaS subscription' })
  async cancel(@Request() req: any) {
    return this.billingService.cancelSubscription(req.user.userId);
  }

  /**
   * Razorpay Webhook Receiver (public — no JWT guard).
   * SEC-3: Uses raw body for HMAC signature verification.
   * NestJS must be bootstrapped with rawBody: true in main.ts.
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Receive Razorpay status change webhooks' })
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
  ) {
    // Use raw body (Buffer) for HMAC verification so JSON formatting doesn't affect the hash
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify((req as any).body));
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
