# Contributing to SafarCollab

Thank you for your interest in contributing to SafarCollab! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and professional
- Welcome newcomers and encourage diverse perspectives
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose
- Git

### Setup Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/influencia.git
   cd influencia
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit .env files with your local configuration
   ```

4. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis rabbitmq minio
   ```

5. **Run database migrations**
   ```bash
   cd backend
   npm run migration:run
   ```

6. **Start development servers**
   ```bash
   # In root directory
   npm run dev
   # Or separately:
   npm run dev:backend   # Runs on http://localhost:3000
   npm run dev:frontend  # Runs on http://localhost:5173
   ```

## Development Workflow

### Branch Naming Convention

- `feature/` - New features
  - Example: `feature/instagram-oauth`
- `bugfix/` - Bug fixes
  - Example: `bugfix/payment-escrow-error`
- `hotfix/` - Critical production fixes
  - Example: `hotfix/security-patch`
- `refactor/` - Code refactoring
  - Example: `refactor/matching-engine`
- `docs/` - Documentation updates
  - Example: `docs/api-endpoint-specs`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add JWT refresh token mechanism

Implemented refresh token rotation for enhanced security.
Access tokens expire in 7 days, refresh tokens in 30 days.

Closes #123
```

```
fix(payments): resolve escrow release timing issue

Fixed race condition where escrow could be released before
content verification completed.

Fixes #456
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation

3. **Run tests and linting**
   ```bash
   npm run test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Use the PR template
   - Link related issues
   - Add screenshots for UI changes
   - Request reviewers

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #(issue number)

## Changes Made
- Change 1
- Change 2

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
```

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use functional components in React
- Prefer async/await over promises
- Use meaningful variable names

**Example:**
```typescript
// Good
async function fetchCreatorPosts(creatorId: string): Promise<Post[]> {
  const posts = await postRepository.find({ creatorId });
  return posts;
}

// Avoid
async function get(id: string) {
  return await repo.find({ creatorId: id });
}
```

### React Components

- Use TypeScript interfaces for props
- Destructure props
- Use hooks appropriately
- Extract complex logic to custom hooks

**Example:**
```typescript
interface CreatorDashboardProps {
  creatorId: string;
  onUpdate: (data: Creator) => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  creatorId,
  onUpdate
}) => {
  const { data, loading, error } = useCreator(creatorId);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="dashboard">
      {/* Component content */}
    </div>
  );
};
```

### NestJS Services

- Use dependency injection
- Handle errors appropriately
- Add proper logging
- Write unit tests

**Example:**
```typescript
@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    private matchingService: MatchingService,
    private logger: Logger
  ) {}

  async createCampaign(dto: CreateCampaignDto, userId: string): Promise<Campaign> {
    try {
      const campaign = this.campaignRepository.create({
        ...dto,
        created_by_user_id: userId
      });
      
      const saved = await this.campaignRepository.save(campaign);
      
      // Queue matching job
      await this.matchingService.queueMatchCalculation(saved.id);
      
      this.logger.log(`Campaign created: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create campaign: ${error.message}`);
      throw new InternalServerErrorException('Campaign creation failed');
    }
  }
}
```

## Testing Guidelines

### Unit Tests

- Test file naming: `*.spec.ts`
- Aim for >80% code coverage
- Test edge cases and error scenarios
- Mock external dependencies

**Example:**
```typescript
describe('MatchingService', () => {
  let service: MatchingService;
  let campaignRepository: Repository<Campaign>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MatchingService,
        {
          provide: getRepositoryToken(Campaign),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  describe('calculateMatchScore', () => {
    it('should return score between 0 and 100', async () => {
      const score = await service.calculateMatchScore(campaignId, creatorId);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should throw error for invalid campaign', async () => {
      await expect(
        service.calculateMatchScore('invalid', creatorId)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Integration Tests

- Test full request/response cycles
- Use test database
- Clean up after tests

**Example:**
```typescript
describe('CampaignsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = response.body.access_token;
  });

  it('/campaigns (POST) should create campaign', () => {
    return request(app.getHttpServer())
      .post('/campaigns')
      .set('Authorization', `Bearer ${authToken}`)
      .send(createCampaignDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.title).toEqual(createCampaignDto.title);
      });
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Explain non-obvious code

**Example:**
```typescript
/**
 * Calculates the match score between a campaign and creator
 * 
 * @param campaignId - UUID of the campaign
 * @param creatorId - UUID of the creator
 * @returns Match score between 0-100 with detailed breakdown
 * @throws NotFoundException if campaign or creator not found
 * 
 * @example
 * ```typescript
 * const score = await calculateMatchScore(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   '987fcdeb-51a2-43f7-8b6c-123456789abc'
 * );
 * console.log(score.total_score); // 87.5
 * ```
 */
async calculateMatchScore(
  campaignId: string,
  creatorId: string
): Promise<MatchScore> {
  // Implementation
}
```

### API Documentation

- Update OpenAPI spec for new endpoints
- Include request/response examples
- Document error codes

## Database Migrations

### Creating Migrations

```bash
cd backend
npm run migration:create -- MigrationName
```

### Migration Guidelines

- One migration per logical change
- Include both `up` and `down` methods
- Test migrations on sample data
- Never modify existing migrations (create new ones)

**Example:**
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKycStatusToCreators1699123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE creators 
      ADD COLUMN kyc_status VARCHAR(50) DEFAULT 'pending'
      CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected'))
    `);
    
    await queryRunner.query(`
      CREATE INDEX idx_creators_kyc_status ON creators(kyc_status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_creators_kyc_status`);
    await queryRunner.query(`ALTER TABLE creators DROP COLUMN kyc_status`);
  }
}
```

## Review Process

### Code Review Checklist

**Reviewer:**
- [ ] Code follows style guidelines
- [ ] Logic is sound and efficient
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] No performance issues
- [ ] Error handling is appropriate

**Author:**
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Rebased on latest main
- [ ] Conflicts resolved

### Review Response Time

- Critical fixes: 2 hours
- Regular PRs: 24 hours
- Documentation: 48 hours

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release branch: `release/v1.2.0`
4. Run full test suite
5. Deploy to staging
6. QA testing
7. Merge to main
8. Tag release: `git tag v1.2.0`
9. Deploy to production
10. Monitor for issues

## Questions?

- Check existing documentation in `/docs`
- Search existing issues
- Ask in team Slack channel
- Email: dev@safarcollab.com

## License

By contributing, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to SafarCollab! 🚀
