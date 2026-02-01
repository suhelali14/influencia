# Backend Implementation Guide - Creator Endpoints

## Overview
This guide provides step-by-step instructions to implement the backend endpoints needed for the creator-side features.

## 📋 Endpoints to Implement

### 1. Creator Stats Endpoint
**Endpoint:** `GET /api/v1/creators/me/stats`
**Controller:** `backend/src/creators/creators.controller.ts`
**Service:** `backend/src/creators/creators.service.ts`

#### Controller Method
```typescript
@Get('me/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('creator')
async getMyStats(@CurrentUser() user: User) {
  return this.creatorsService.getCreatorStats(user.id);
}
```

#### Service Method
```typescript
async getCreatorStats(userId: string) {
  const creator = await this.creatorsRepository.findOne({
    where: { user_id: userId },
    relations: ['user'],
  });

  if (!creator) {
    throw new NotFoundException('Creator not found');
  }

  // Get collaboration statistics
  const collaborations = await this.collaborationsRepository.find({
    where: { creator_id: creator.id },
  });

  const totalCollaborations = collaborations.length;
  const activeCollaborations = collaborations.filter(c => c.status === 'accepted').length;
  const completedCollaborations = collaborations.filter(c => c.status === 'completed').length;
  const pendingRequests = collaborations.filter(c => c.status === 'pending').length;

  // Calculate total earnings
  const totalEarnings = completedCollaborations.reduce((sum, c) => {
    return sum + (c.final_budget || c.proposed_budget || 0);
  }, 0);

  // Calculate engagement rate
  const socialAccounts = await this.socialAccountsRepository.find({
    where: { creator_id: creator.id },
  });

  let totalReach = 0;
  let totalEngagement = 0;
  
  socialAccounts.forEach(account => {
    const metrics = account.metrics || {};
    totalReach += metrics.followers || 0;
    const followers = metrics.followers || 0;
    const avgLikes = metrics.avg_likes || 0;
    const avgComments = metrics.avg_comments || 0;
    totalEngagement += followers > 0 ? ((avgLikes + avgComments) / followers) * 100 : 0;
  });

  const engagementRate = socialAccounts.length > 0 
    ? totalEngagement / socialAccounts.length 
    : 0;

  return {
    totalCollaborations,
    activeCollaborations,
    completedCollaborations,
    totalEarnings,
    averageRating: creator.rating || 0,
    totalReach,
    engagementRate: Math.round(engagementRate * 10) / 10,
    pendingRequests,
  };
}
```

---

### 2. Collaborations List Endpoint
**Endpoint:** `GET /api/v1/creators/me/collaborations`
**Query Params:** `limit`, `recent`

#### Controller Method
```typescript
@Get('me/collaborations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('creator')
async getMyCollaborations(
  @CurrentUser() user: User,
  @Query('limit') limit: string = '100',
  @Query('recent') recent: string = 'false',
) {
  return this.creatorsService.getCreatorCollaborations(
    user.id,
    parseInt(limit),
    recent === 'true'
  );
}
```

#### Service Method
```typescript
async getCreatorCollaborations(
  userId: string,
  limit: number = 100,
  recent: boolean = false,
) {
  const creator = await this.creatorsRepository.findOne({
    where: { user_id: userId },
  });

  if (!creator) {
    throw new NotFoundException('Creator not found');
  }

  const queryBuilder = this.collaborationsRepository
    .createQueryBuilder('collab')
    .leftJoinAndSelect('collab.campaign', 'campaign')
    .leftJoinAndSelect('campaign.brand', 'brand')
    .leftJoinAndSelect('brand.user', 'brand_user')
    .where('collab.creator_id = :creatorId', { creatorId: creator.id })
    .orderBy('collab.created_at', 'DESC')
    .take(limit);

  const collaborations = await queryBuilder.getMany();

  // For each collaboration, get AI analysis if available
  const enrichedCollaborations = await Promise.all(
    collaborations.map(async (collab) => {
      // Get AI analysis from ai_reports table
      const aiReport = await this.aiReportsRepository.findOne({
        where: {
          campaign_id: collab.campaign_id,
          creator_id: creator.id,
        },
        order: { created_at: 'DESC' },
      });

      return {
        ...collab,
        ai_match_score: aiReport?.ml_match_score || null,
        ai_recommendations: aiReport 
          ? [
              aiReport.strengths?.[0],
              aiReport.recommendations?.[0],
            ].filter(Boolean)
          : [],
        campaign: {
          id: collab.campaign.id,
          title: collab.campaign.title,
          description: collab.campaign.description,
          platform: collab.campaign.platform,
          category: collab.campaign.category,
          budget: collab.campaign.budget,
          start_date: collab.campaign.start_date,
          end_date: collab.campaign.end_date,
          brand: {
            company_name: collab.campaign.brand.company_name,
            website: collab.campaign.brand.website,
          },
        },
      };
    })
  );

  return enrichedCollaborations;
}
```

---

### 3. Collaboration Detail Endpoint
**Endpoint:** `GET /api/v1/creators/collaborations/:id`

#### Controller Method
```typescript
@Get('collaborations/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('creator')
async getCollaborationDetail(
  @CurrentUser() user: User,
  @Param('id') collaborationId: string,
) {
  return this.creatorsService.getCollaborationDetail(user.id, collaborationId);
}
```

#### Service Method
```typescript
async getCollaborationDetail(userId: string, collaborationId: string) {
  const creator = await this.creatorsRepository.findOne({
    where: { user_id: userId },
  });

  if (!creator) {
    throw new NotFoundException('Creator not found');
  }

  const collaboration = await this.collaborationsRepository.findOne({
    where: { 
      id: collaborationId,
      creator_id: creator.id,
    },
    relations: ['campaign', 'campaign.brand', 'campaign.brand.user'],
  });

  if (!collaboration) {
    throw new NotFoundException('Collaboration not found');
  }

  // Get full AI analysis from matching service
  const aiAnalysis = await this.matchingService.getAIAnalysis(
    collaboration.campaign_id,
    creator.id,
  );

  return {
    ...collaboration,
    campaign: {
      ...collaboration.campaign,
      brand: {
        company_name: collaboration.campaign.brand.company_name,
        website: collaboration.campaign.brand.website,
        description: collaboration.campaign.brand.description,
      },
    },
    aiAnalysis: aiAnalysis ? {
      mlMatchScore: aiAnalysis.ml_match_score,
      estimatedRoi: aiAnalysis.estimated_roi,
      successProbability: aiAnalysis.success_probability,
      riskAssessment: {
        overall: aiAnalysis.risk_level,
        factors: aiAnalysis.risk_factors || [],
      },
      strengths: aiAnalysis.strengths || [],
      concerns: aiAnalysis.concerns || [],
      recommendations: aiAnalysis.recommendations || [],
      aiSummary: aiAnalysis.ai_summary || '',
    } : null,
  };
}
```

---

### 4. Recommended Campaigns Endpoint (AI-Powered)
**Endpoint:** `GET /api/v1/creators/me/recommended-campaigns`

#### Controller Method
```typescript
@Get('me/recommended-campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('creator')
async getRecommendedCampaigns(@CurrentUser() user: User) {
  return this.creatorsService.getRecommendedCampaigns(user.id);
}
```

#### Service Method
```typescript
async getRecommendedCampaigns(userId: string) {
  const creator = await this.creatorsRepository.findOne({
    where: { user_id: userId },
    relations: ['social_accounts'],
  });

  if (!creator) {
    throw new NotFoundException('Creator not found');
  }

  // Get all active campaigns (not yet collaborated with)
  const activeCampaigns = await this.campaignsRepository
    .createQueryBuilder('campaign')
    .leftJoinAndSelect('campaign.brand', 'brand')
    .leftJoin(
      'collaborations',
      'collab',
      'collab.campaign_id = campaign.id AND collab.creator_id = :creatorId',
      { creatorId: creator.id }
    )
    .where('campaign.status = :status', { status: 'active' })
    .andWhere('campaign.end_date > :now', { now: new Date() })
    .andWhere('collab.id IS NULL') // Not already collaborated
    .getMany();

  if (activeCampaigns.length === 0) {
    return [];
  }

  // Calculate AI match scores for all campaigns
  const campaignScores = await Promise.all(
    activeCampaigns.map(async (campaign) => {
      try {
        // Call Python AI service to get match score and analysis
        const analysis = await this.aiPythonService.getAnalysis(creator, campaign);

        return {
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          platform: campaign.platform,
          category: campaign.category,
          budget: campaign.budget,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          brand: {
            company_name: campaign.brand.company_name,
            website: campaign.brand.website,
          },
          aiMatchScore: analysis.ml_match_score,
          estimatedRoi: analysis.estimated_roi,
          successProbability: analysis.success_probability,
          matchReasons: analysis.strengths?.slice(0, 4) || [],
          requirements: campaign.requirements,
          location: campaign.location || 'Remote',
        };
      } catch (error) {
        this.logger.error(`Failed to analyze campaign ${campaign.id}:`, error);
        return null;
      }
    })
  );

  // Filter out failed analyses and low scores
  const validCampaigns = campaignScores
    .filter(c => c !== null && c.aiMatchScore >= 70)
    .sort((a, b) => b.aiMatchScore - a.aiMatchScore)
    .slice(0, 20); // Top 20 matches

  return validCampaigns;
}
```

---

### 5. Accept Collaboration Endpoint
**Endpoint:** `POST /api/v1/creators/collaborations/:id/accept`

#### Controller Method
```typescript
@Post('collaborations/:id/accept')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('creator')
async acceptCollaboration(
  @CurrentUser() user: User,
  @Param('id') collaborationId: string,
  @Body() body: { counter_offer?: number },
) {
  return this.creatorsService.acceptCollaboration(
    user.id,
    collaborationId,
    body.counter_offer,
  );
}
```

#### Service Method
```typescript
async acceptCollaboration(
  userId: string,
  collaborationId: string,
  counterOffer?: number,
) {
  const creator = await this.creatorsRepository.findOne({
    where: { user_id: userId },
  });

  if (!creator) {
    throw new NotFoundException('Creator not found');
  }

  const collaboration = await this.collaborationsRepository.findOne({
    where: { 
      id: collaborationId,
      creator_id: creator.id,
      status: 'pending',
    },
    relations: ['campaign', 'campaign.brand', 'campaign.brand.user'],
  });

  if (!collaboration) {
    throw new NotFoundException('Collaboration not found or not pending');
  }

  // Update collaboration status
  collaboration.status = counterOffer ? 'negotiating' : 'accepted';
  collaboration.counter_offer = counterOffer || null;
  collaboration.accepted_at = new Date();
  
  await this.collaborationsRepository.save(collaboration);

  // TODO: Send notification to brand
  // await this.notificationsService.notifyBrand(...)

  // TODO: Send email to brand
  // await this.emailService.sendCollaborationAccepted(...)

  this.logger.log(`Collaboration ${collaborationId} accepted by creator ${creator.id}`);

  return {
    success: true,
    collaboration,
    message: counterOffer 
      ? 'Counter offer submitted. Waiting for brand response.'
      : 'Collaboration accepted! You can now start working with the brand.',
  };
}
```

---

### 6. Reject Collaboration Endpoint
**Endpoint:** `POST /api/v1/creators/collaborations/:id/reject`

#### Controller Method
```typescript
@Post('collaborations/:id/reject')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('creator')
async rejectCollaboration(
  @CurrentUser() user: User,
  @Param('id') collaborationId: string,
  @Body() body: { reason: string },
) {
  if (!body.reason || body.reason.trim().length === 0) {
    throw new BadRequestException('Reason is required');
  }

  return this.creatorsService.rejectCollaboration(
    user.id,
    collaborationId,
    body.reason,
  );
}
```

#### Service Method
```typescript
async rejectCollaboration(
  userId: string,
  collaborationId: string,
  reason: string,
) {
  const creator = await this.creatorsRepository.findOne({
    where: { user_id: userId },
  });

  if (!creator) {
    throw new NotFoundException('Creator not found');
  }

  const collaboration = await this.collaborationsRepository.findOne({
    where: { 
      id: collaborationId,
      creator_id: creator.id,
      status: 'pending',
    },
    relations: ['campaign', 'campaign.brand', 'campaign.brand.user'],
  });

  if (!collaboration) {
    throw new NotFoundException('Collaboration not found or not pending');
  }

  // Update collaboration status
  collaboration.status = 'rejected';
  collaboration.rejection_reason = reason;
  collaboration.rejected_at = new Date();
  
  await this.collaborationsRepository.save(collaboration);

  // TODO: Send notification to brand
  // await this.notificationsService.notifyBrand(...)

  // TODO: Send email to brand with reason
  // await this.emailService.sendCollaborationRejected(...)

  this.logger.log(`Collaboration ${collaborationId} rejected by creator ${creator.id}`);

  return {
    success: true,
    message: 'Collaboration declined. The brand has been notified.',
  };
}
```

---

## 🗃️ Database Schema Updates

### Add Columns to `collaborations` Table

```sql
-- Add counter offer support
ALTER TABLE collaborations 
ADD COLUMN counter_offer INTEGER,
ADD COLUMN negotiating_notes TEXT,
ADD COLUMN accepted_at TIMESTAMP,
ADD COLUMN rejected_at TIMESTAMP,
ADD COLUMN rejection_reason TEXT;

-- Add final budget (after negotiation)
ALTER TABLE collaborations 
ADD COLUMN final_budget INTEGER;

-- Add indexes for performance
CREATE INDEX idx_collaborations_creator_status 
ON collaborations(creator_id, status);

CREATE INDEX idx_collaborations_created_at 
ON collaborations(created_at DESC);
```

---

## 📦 Required Dependencies

### Inject Services in CreatorsService Constructor

```typescript
constructor(
  @InjectRepository(Creator)
  private creatorsRepository: Repository<Creator>,
  
  @InjectRepository(Collaboration)
  private collaborationsRepository: Repository<Collaboration>,
  
  @InjectRepository(Campaign)
  private campaignsRepository: Repository<Campaign>,
  
  @InjectRepository(AIReport)
  private aiReportsRepository: Repository<AIReport>,
  
  @InjectRepository(SocialAccount)
  private socialAccountsRepository: Repository<SocialAccount>,
  
  private readonly matchingService: MatchingService,
  private readonly aiPythonService: AIPythonService,
) {}
```

---

## 🔐 Security Considerations

### Guards Already Applied
- `JwtAuthGuard` - Ensures user is authenticated
- `RolesGuard` - Ensures user has 'creator' role
- `@CurrentUser()` decorator - Gets authenticated user

### Additional Validations
- Always verify creator belongs to authenticated user
- Check collaboration status before accepting/rejecting
- Validate counter offer is positive number
- Sanitize rejection reason input
- Rate limit recommendation requests (expensive AI calls)

---

## 🚀 Testing the Endpoints

### Using cURL

#### Get Creator Stats
```bash
curl -X GET http://localhost:3000/api/v1/creators/me/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Collaborations
```bash
curl -X GET "http://localhost:3000/api/v1/creators/me/collaborations?limit=10&recent=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Recommended Campaigns
```bash
curl -X GET http://localhost:3000/api/v1/creators/me/recommended-campaigns \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Accept Collaboration
```bash
curl -X POST http://localhost:3000/api/v1/creators/collaborations/COLLAB_ID/accept \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"counter_offer": 6000}'
```

#### Reject Collaboration
```bash
curl -X POST http://localhost:3000/api/v1/creators/collaborations/COLLAB_ID/reject \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Budget does not align with my rates"}'
```

---

## 📊 Performance Optimization

### Caching Recommendations
Recommendations are expensive (AI calculations). Cache them:

```typescript
// In service
private readonly recommendationsCache = new Map<string, {
  data: any[];
  timestamp: number;
}>();

private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

async getRecommendedCampaigns(userId: string) {
  // Check cache first
  const cached = this.recommendationsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    return cached.data;
  }

  // Calculate fresh recommendations
  const recommendations = await this.calculateRecommendations(userId);
  
  // Store in cache
  this.recommendationsCache.set(userId, {
    data: recommendations,
    timestamp: Date.now(),
  });

  return recommendations;
}
```

### Database Query Optimization
- Use query builder for complex joins
- Add indexes on frequently queried columns
- Limit result sets (pagination)
- Use `select` to fetch only needed columns

---

## 🐛 Error Handling

### Common Errors to Handle
- Creator not found (404)
- Collaboration not found (404)
- Collaboration not in pending status (400)
- AI service unavailable (503) - use fallback
- Invalid counter offer (400)
- Missing rejection reason (400)

### Example Error Response
```json
{
  "statusCode": 400,
  "message": "Collaboration is not in pending status",
  "error": "Bad Request"
}
```

---

## 📝 Logging

Add comprehensive logging:

```typescript
this.logger.log(`Getting stats for creator ${creator.id}`);
this.logger.log(`Found ${collaborations.length} collaborations`);
this.logger.log(`Calculating recommendations for creator ${creator.id}`);
this.logger.log(`Analyzing ${activeCampaigns.length} campaigns`);
this.logger.log(`Returning ${validCampaigns.length} recommendations`);
this.logger.error(`Failed to analyze campaign:`, error);
```

---

## ✅ Implementation Checklist

- [ ] Add methods to `creators.controller.ts`
- [ ] Add methods to `creators.service.ts`
- [ ] Inject required repositories and services
- [ ] Run database migrations for new columns
- [ ] Add indexes for performance
- [ ] Test each endpoint with cURL
- [ ] Add error handling for edge cases
- [ ] Implement caching for recommendations
- [ ] Add logging throughout
- [ ] Test with frontend UI
- [ ] Verify AI service integration
- [ ] Test accept/reject workflow
- [ ] Verify notifications (TODO)
- [ ] Verify emails (TODO)

---

## 🎯 Priority Order

1. **High Priority (Core Functionality)**
   - Get creator stats
   - Get collaborations list
   - Get collaboration detail
   - Accept collaboration
   - Reject collaboration

2. **Medium Priority (AI Features)**
   - Get recommended campaigns
   - Calculate match scores
   - Enrich collaborations with AI data

3. **Low Priority (Enhancements)**
   - Caching optimization
   - Notification system
   - Email system
   - Counter offer negotiation flow

---

**Next Steps:**
1. Start with creator stats endpoint (easiest)
2. Then collaborations list (reuses stats logic)
3. Then accept/reject (critical workflow)
4. Finally recommended campaigns (complex AI integration)

**Estimated Implementation Time:**
- Basic endpoints (1-3): 2-3 hours
- Accept/reject flow (5-6): 1-2 hours
- Recommended campaigns (4): 2-3 hours
- Testing and refinement: 1-2 hours
- **Total: 6-10 hours**
