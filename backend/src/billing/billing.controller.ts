import { Controller, Get, Post, Body, UseGuards, Request, Headers } from '@nestjs/common';
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
   * Razorpay Webhook Receiver. Must be open (public, no JwtGuard).
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Receive Razorpay status change webhooks' })
  async webhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.billingService.handleWebhook(body, signature);
  }
}
