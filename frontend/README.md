# Influencia Frontend

Modern React frontend for the Influencia influencer marketing platform. A beautiful, responsive UI for connecting brands with creators.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

### For Creators
- **Dashboard** - Overview of campaigns, earnings, and performance
- **Profile Management** - Showcase your work and social media presence
- **Social Media Integration** - Connect Instagram, YouTube, TikTok accounts
- **Campaign Discovery** - Browse and apply to relevant brand campaigns
- **Collaboration Management** - Track ongoing and past collaborations
- **Analytics** - Detailed performance metrics and growth insights
- **Earnings Tracker** - Monitor payments and revenue

### For Brands
- **Campaign Creation** - Create targeted influencer campaigns
- **Creator Discovery** - Find perfect creators with AI-powered matching
- **Creator Analysis** - Deep-dive into creator metrics and audience
- **Collaboration Requests** - Send and manage partnership requests
- **Campaign Analytics** - Track campaign performance and ROI

### Platform Features
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Dark/Light Mode** - User-friendly theming
- **Real-time Updates** - Live data synchronization
- **Secure Authentication** - JWT-based auth with session management

## 🛠️ Tech Stack

- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Redux Toolkit** - State Management
- **React Router v6** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - HTTP Client
- **Recharts** - Data Visualization

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see [influencia-backend](https://github.com/suhelali14/influencia-backend))

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/suhelali14/influencia-frontend.git
   cd influencia-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API URL
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000/v1` |
| `VITE_AI_API_URL` | AI Service URL | `http://localhost:5001` |

## 📁 Project Structure

```
src/
├── api/              # API client and service functions
├── components/       # Reusable UI components
│   ├── Landing/      # Landing page components
│   ├── Layout/       # Layout components
│   ├── Social/       # Social media components
│   └── auth/         # Authentication components
├── pages/            # Page components
│   ├── Brand/        # Brand dashboard pages
│   ├── Creator/      # Creator dashboard pages
│   ├── Campaign/     # Campaign pages
│   └── Legal/        # Legal pages
├── store/            # Redux store and slices
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── config/           # Configuration files
└── types/            # TypeScript type definitions
```

## 🎨 Key Pages

### Public
- `/` - Landing page
- `/login` - User login
- `/register` - User registration
- `/privacy` - Privacy policy
- `/terms` - Terms of service

### Creator Dashboard
- `/creator/dashboard` - Creator home
- `/creator/profile` - Profile management
- `/creator/campaigns` - Browse campaigns
- `/creator/collaborations` - Manage collaborations
- `/creator/analytics` - Performance analytics
- `/creator/earnings` - Earnings tracker
- `/creator/social` - Social account connections

### Brand Dashboard
- `/brand/dashboard` - Brand home
- `/brand/campaigns` - Campaign management
- `/brand/create-campaign` - Create new campaign
- `/brand/discover` - Find creators
- `/brand/analytics` - Campaign analytics

## 🧪 Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run type-check
```

## 🐳 Docker

```bash
# Build image
docker build -t influencia-frontend .

# Run container
docker run -p 80:80 influencia-frontend
```

## 📱 Screenshots

### Landing Page
Modern landing page with hero section, features, and testimonials.

### Creator Dashboard
Comprehensive dashboard with analytics, campaigns, and earnings overview.

### Brand Campaign Creation
Intuitive campaign creation flow with targeting options.

## 🤝 Related Repositories

- [influencia-backend](https://github.com/suhelali14/influencia-backend) - NestJS Backend API
- [influencia-ai](https://github.com/suhelali14/influencia-ai) - AI Recommendation Service

## 📄 License

MIT License
