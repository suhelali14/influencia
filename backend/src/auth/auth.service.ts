import { Injectable, UnauthorizedException, ConflictException, Inject, forwardRef, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { BrandInvite } from './entities/brand-invite.entity';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreatorsService } from '../creators/creators.service';
import { BrandsService } from '../brands/brands.service';
import { SessionService, SessionData } from '../common/redis/session.service';

export interface AuthResponse {
  user: User;
  access_token: string;
  session_id: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BrandInvite)
    private readonly brandInviteRepository: Repository<BrandInvite>,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => CreatorsService))
    private readonly creatorsService: CreatorsService,
    @Inject(forwardRef(() => BrandsService))
    private readonly brandsService: BrandsService,
    private readonly sessionService: SessionService,
  ) {}

  async register(
    registerDto: RegisterDto,
    requestInfo?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    if (registerDto.role !== 'creator') {
      throw new BadRequestException(
        'Self-registration is only allowed for Creators. Brands and Agencies must be invited by an administrator or request access.'
      );
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const password_hash = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password_hash,
      status: 'active',
      is_verified: false,
    });

    await this.userRepository.save(user);

    // Automatically create creator or brand profile based on role
    try {
      if (registerDto.role === 'creator') {
        await this.creatorsService.create(user.id, {
          bio: `Hi, I'm ${registerDto.first_name || 'a creator'}!`,
          phone: registerDto.phone || '',
          location: '',
          categories: [],
          languages: ['en'],
        });
      } else if (registerDto.role === 'brand_admin') {
        await this.brandsService.create(user.id, {
          company_name: registerDto.first_name || 'My Brand',
          industry: '',
          description: '',
          website: '',
        });
      }
    } catch (error) {
      // Log error but don't fail registration if profile creation fails
      this.logger.error('Failed to create profile:', error);
    }

    const access_token = this.generateToken(user);
    
    // Create session in Redis
    const session = await this.sessionService.createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      userAgent: requestInfo?.userAgent,
      ipAddress: requestInfo?.ipAddress,
    });

    const { password_hash: _, ...userWithoutPassword } = user;

    return { 
      user: userWithoutPassword as User, 
      access_token,
      session_id: session.sessionId,
    };
  }

  async login(
    loginDto: LoginDto,
    requestInfo?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    // Generic error — do NOT distinguish between "no account" and "wrong password"
    // Revealing which emails are registered is an enumeration vulnerability.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    const access_token = this.generateToken(user);

    // Create session in Redis
    const session = await this.sessionService.createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      userAgent: requestInfo?.userAgent,
      ipAddress: requestInfo?.ipAddress,
    });

    const { password_hash: _, ...userWithoutPassword } = user;

    this.logger.log(`User ${user.email} logged in with session ${session.sessionId.substring(0, 16)}...`);

    return { 
      user: userWithoutPassword as User, 
      access_token,
      session_id: session.sessionId,
    };
  }

  async logout(sessionId: string): Promise<{ success: boolean }> {
    await this.sessionService.destroySession(sessionId);
    return { success: true };
  }

  async logoutAllDevices(userId: string): Promise<{ success: boolean; count: number }> {
    const count = await this.sessionService.destroyAllUserSessions(userId);
    return { success: true, count };
  }

  async getActiveSessions(userId: string) {
    return this.sessionService.getUserSessionsWithDetails(userId);
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    };

    return this.jwtService.sign(payload);
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password_hash, ...userWithoutPassword } = user;

    return userWithoutPassword as User;
  }

  async requestBrandInvite(data: {
    email: string;
    company_name: string;
    first_name?: string;
    last_name?: string;
  }): Promise<BrandInvite> {
    const existingInvite = await this.brandInviteRepository.findOne({
      where: { email: data.email },
    });

    if (existingInvite) {
      throw new ConflictException('An invite request for this email already exists.');
    }

    const invite = this.brandInviteRepository.create({
      ...data,
      token: uuidv4(),
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return this.brandInviteRepository.save(invite);
  }

  async onboardBrand(data: {
    email: string;
    company_name: string;
    first_name: string;
    last_name: string;
  }): Promise<{ user: User; tempPassword: string }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    // Generate a secure random temporary password (not hardcoded)
    const tempPassword = crypto.randomBytes(12).toString('base64url') + '!Aa1';
    const password_hash = await bcrypt.hash(tempPassword, 10);

    const user = this.userRepository.create({
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      password_hash,
      role: 'brand_admin',
      status: 'active',
      is_verified: true,
      email_verified: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Create Brand profile
    try {
      await this.brandsService.create(savedUser.id, {
        company_name: data.company_name,
        industry: 'General',
        description: 'Onboarded Brand Partner',
        website: '',
      });
    } catch (error) {
      this.logger.error('Failed to create onboarded brand profile:', error);
    }

    // Update invite status if there was one
    try {
      const invite = await this.brandInviteRepository.findOne({
        where: { email: data.email },
      });
      if (invite) {
        invite.status = 'accepted';
        await this.brandInviteRepository.save(invite);
      }
    } catch (error) {
      this.logger.warn('Failed to update brand invite status:', error);
    }

    // Premium simulated email logs
    this.logger.log(`
============================================================
📧 SIMULATED ONBOARDING EMAIL SENT
============================================================
To: ${data.email}
Subject: Welcome to Influencia - Brand Account Setup

Hi ${data.first_name},
Your brand account for "${data.company_name}" has been successfully onboarded and verified by our admin team!

You can now log in to the platform:
URL: http://localhost:5173/login
Email: ${data.email}
Temporary Password: ${tempPassword}

Please change your password immediately after logging in.
============================================================
    `);

    const { password_hash: _, ...userWithoutPassword } = savedUser;
    return {
      user: userWithoutPassword as User,
      tempPassword,
    };
  }

  async verifyUser(userId: string, isVerified: boolean): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.is_verified = isVerified;
    const savedUser = await this.userRepository.save(user);

    const { password_hash: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword as User;
  }

  async getInvites(): Promise<BrandInvite[]> {
    return this.brandInviteRepository.find({
      order: { created_at: 'DESC' },
    });
  }
}

