# Wedding Album Web App

A real-time shared photo and video album for wedding celebrations. Guests scan a QR code to upload memories instantly, creating a collective digital scrapbook that everyone can access and contribute to.

## How It Works

1. **Guest Access**: Scan QR code or visit the web app to join the wedding album
2. **Upload**: Take photos/videos and upload them directly from mobile
3. **Real-time Updates**: New uploads appear instantly for all guests
4. **Shared Memories**: Create lasting memories that everyone can enjoy

## Features

- **QR Code Access**: Easy guest entry via scannable QR codes
- **Mobile Optimized**: Full responsive design for iOS/Android
- **Real-time Sync**: Live updates without page refresh
- **Media Management**: Organize photos and videos in chronological order
- **Privacy Controls**: Optional guest permissions and access levels
- **Gallery Views**: Grid, carousel, timeline, and list views

## Tech Stack

### Frontend
- **Next.js 16** - React framework with SSR/SSG
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Zod** - Type validation

### Backend
- **Next.js API Routes** - REST APIs
- **WebSockets (Socket.io)** - Real-time updates
- **MongoDB Atlas** - Optional database (falls back to a zero-config local JSON store)
- **S3-compatible storage** - Optional cloud media storage (Cloudflare R2, Backblaze B2; falls back to local disk)

### DevOps
- **Vercel** - Deployment and hosting
- **Vercel Analytics** - Performance monitoring
- **Sentry** - Error tracking

## Animation Philosophy

This project leverages three design skills to create an exceptional user experience:

### Emil Design Eng
- Eye-tracking optimized animations
- Smooth scrolling behaviors
- Strategic micro-interactions
- Performance-focused motion

### Impeccable Design
- Deterministic detector rules (59)
- Anti-AI design slop prevention
- Industry-specific anti-patterns
- Design system generation

### Design Taste Frontend
- Adjustable VARIANCE/MOTION/DENSITY dials
- Strict pre-flight checks
- Canonical GSAP code skeletons
- Redesign audit protocol

## Development Workflow

### Planning Phase
Use `/gstack office-hours` to define the wedding album concept and feature requirements.

### Design Phase
- `/impeccable init` - Establish design context
- `/design-taste-frontend` - Generate UI variants with proper taste
- `/emil-design-eng` - Optimize animations for user engagement

### Implementation
- Follow gstack workflow: Think → Plan → Build → Review → Test → Ship
- Use `/review` for code quality and design consistency
- `/qa` for comprehensive testing
- `/ship` for deployment readiness

## Project Structure

```
C:\Projects\wedding-album
├── docs/
│   ├── architecture.md          # System architecture
│   ├── api-spec.md              # API documentation
│   └── design-system.md         # Design tokens and components
├── public/
│   ├── qr-code.svg             # Wedding QR code
│   └── images/                 # Static assets
├── src/
│   ├── app/                    # Next.js routes
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── upload/page.tsx      # Upload interface
│   │   └── album/[id]/page.tsx  # Specific album view
│   ├── components/             # React components
│   │   ├── UploadZone.tsx      # Drag & drop area
│   │   ├── MediaGallery.tsx    # Photo/video display
│   │   ├── RealTimeIndicator.tsx # Connection status
│   │   └── QRScanner.tsx       # QR code scanner
│   └── lib/                    # Utilities and hooks
│       ├── auth.ts              # Authentication helpers
│       ├── realtime.ts          # WebSocket connections
│       └── storage.ts           # File upload handling
└── package.json
└── README.md
```

## Key Components

### Upload Interface
- Drag & drop zone with animated feedback
- Progress indicators with smooth transitions
- Real-time upload status tracking
- Error handling with clear messages

### Media Gallery
- Multiple view modes (grid, carousel, timeline)
- Infinite scroll with lazy loading
- Filtering and search capabilities
- Lightbox view with controls

### Real-time Features
- Live cursor presence indicators
- Notification system for new uploads
- Conflict resolution for duplicate uploads
- Automatic gallery organization

## Animation Highlights

### Guest Flow
1. QR code scan animation - Smooth zoom-in with particle effects
2. Upload area hover states - Elastic scaling and color transitions
3. Upload progress - Wave animation with momentum
4. Success feedback - Confetti celebration animation

### Gallery Interaction
1. Image transition - Crossfade with blur effects
2. Load animations - Staggered reveal with easing
3. Swipe gestures - Natural momentum scrolling
4. Modal openings - Scale transformation with backdrop blur

## Getting Started

### Prerequisites
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
```

The app runs out of the box with zero configuration: albums live in
data/db.json and uploads on local disk. To use MongoDB Atlas and cloud
storage, add MONGODB_URI and the S3_* variables to .env.local (see
.env.example).

### Development
```bash
# Start development server
npm run dev

# Open in browser
open http://localhost:3000
```

### Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

## Testing

### Unit Tests
```bash
# Run Jest
npm test
```

### E2E Tests
```bash
# Run Playwright
npm run test:e2e
```

### Integration Tests
```bash
# Run with test runner
npm run test:integration
```

## Deployment

### Vercel
```bash
# Deploy to Vercel
npm run deploy
```

### Environment Variables
```env
# Database (optional; unset = local JSON store)
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/wedding-album

# Media storage (optional; unset = local disk). Any S3-compatible bucket.
S3_BUCKET=wedding-album
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Analytics
NEXT_PUBLIC_ANALYTICS_ID=...

# Sentry
NEXT_PUBLIC_SENTRY_DSN=...
```

## Code Quality

### Linting
```bash
# ESLint
npm run lint

# Prettier
npm run format
```

### Type Checking
```bash
# TypeScript
npm run typecheck
```

## Performance

### Optimization
- Image optimization with Next.js Image component
- Code splitting with dynamic imports
- Tree shaking for unused code
- Service worker for offline support

### Monitoring
- Vercel Analytics for performance metrics
- Sentry for error tracking
- Custom performance dashboards

## Future Enhancements

1. **AI Photo Organization**: Automatic tagging and categorization
2. **Virtual Tour**: Interactive 3D gallery experience
3. **Guest Profiles**: Personalized memory collections
4. **Print Export**: High-quality photo book generation
5. **Social Integration**: Auto-post to social media

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style
4. Write tests for new features
5. Update documentation
6. Submit a pull request

This project uses a comprehensive workflow that combines design excellence, technical rigor, and creative problem-solving. The use of multiple design skills ensures a polished, professional user experience that stands out from generic AI-generated interfaces.
