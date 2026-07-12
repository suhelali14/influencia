import {
  Controller, Post, Get, Body, UseGuards, Request,
  Headers, Ip, Delete, Param, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestInviteDto } from './dto/request-invite.dto';
import { OnboardBrandDto } from './dto/onboard-brand.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HybridAuthGuard } from './guards/hybrid-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new creator account' })
  @ApiResponse({ status: 201, description: 'User registered successfully. Returns access_token and session_id' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    return this.authService.register(registerDto, { userAgent, ipAddress });
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful. Returns access_token and session_id' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    return this.authService.login(loginDto, { userAgent, ipAddress });
  }

  @Post('logout')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-ID', description: 'Session ID for session-based auth', required: false })
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Request() req) {
    if (req.user.sessionId) {
      return this.authService.logout(req.user.sessionId);
    }
    return { success: true, message: 'No session to invalidate (using JWT)' };
  }

  @Post('logout-all')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-ID', description: 'Session ID for session-based auth', required: false })
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@Request() req) {
    return this.authService.logoutAllDevices(req.user.userId);
  }

  @Get('sessions')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-ID', description: 'Session ID for session-based auth', required: false })
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved' })
  async getSessions(@Request() req) {
    const sessions = await this.authService.getActiveSessions(req.user.userId);
    // Mask session IDs for security (only show first 16 chars)
    return sessions.map((s) => ({
      ...s,
      sessionId: s.sessionId.substring(0, 16) + '...',
      isCurrent: req.user.sessionId === s.sessionId,
    }));
  }

  @Delete('sessions/:sessionId')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-ID', description: 'Session ID for session-based auth', required: false })
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async revokeSession(@Request() req, @Param('sessionId') sessionId: string) {
    // Only allow revoking own sessions
    const sessions = await this.authService.getActiveSessions(req.user.userId);
    const targetSession = sessions.find((s) => s.sessionId.startsWith(sessionId.replace('...', '')));
    if (targetSession) {
      return this.authService.logout(targetSession.sessionId);
    }
    return { success: false, message: 'Session not found' };
  }

  @Get('profile')
  @UseGuards(HybridAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-ID', description: 'Session ID for session-based auth', required: false })
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  // ─── Brand Invite Request (public — anyone can request access) ───────────
  @Post('request-invite')
  @ApiOperation({ summary: 'Request onboarding invite for Brands' })
  @ApiResponse({ status: 201, description: 'Invite request submitted' })
  async requestInvite(@Body() body: RequestInviteDto) {
    return this.authService.requestBrandInvite(body);
  }

  // ─── Admin-only endpoints ─────────────────────────────────────────────────
  // These require a valid JWT AND admin role — they are NOT public.

  @Post('onboard-brand')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Onboard a Brand partner account' })
  @ApiResponse({ status: 201, description: 'Brand onboarded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async onboardBrand(@Request() req, @Body() body: OnboardBrandDto) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.authService.onboardBrand(body);
  }

  @Post('verify-creator/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Verify or unverify a creator account' })
  @ApiResponse({ status: 200, description: 'Creator verification status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async verifyCreator(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { isVerified: boolean },
  ) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.authService.verifyUser(id, body.isVerified);
  }

  @Get('invites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Get list of all Brand invite requests' })
  @ApiResponse({ status: 200, description: 'Invite list retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getInvites(@Request() req) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.authService.getInvites();
  }
}
