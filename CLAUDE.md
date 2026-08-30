# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MercuryMap is a React-based travel photo mapping application that allows users to upload and visualize travel photos on an interactive world map. The application supports both public and private photo maps with user authentication, plus LLM-backed recommendations and semantic photo search.

## Development Commands

### Frontend Development
```bash
cd frontend
npm install          # Install dependencies
npm start            # Start development server (http://localhost:3000)
npm run build        # Build for production
npm test             # Run tests
```

### Checks that CI runs
```bash
cd frontend
npx tsc --noEmit -p api/tsconfig.json          # Typecheck serverless functions
CI=true npx react-scripts test --watchAll=false # Tests
CI=true npx react-scripts build                 # Production build
node evals/run.mjs                              # LLM evals (from repo root; offline by default)
```

### Root Level Commands
```bash
npm install          # Install root dependencies (minimal - mainly Vercel Analytics)
node scripts/backfill-embeddings.mjs      # Backfill photo embeddings for semantic search
node scripts/cleanup-orphaned-photos.mjs  # Remove storage files with no photos row
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS (Create React App)
- **Backend**: Supabase (PostgreSQL database + authentication + file storage)
- **Serverless functions**: Vercel functions in `frontend/api/`
- **Maps**: Mapbox GL JS + React Map GL
- **Geocoding**: OpenCage (LocationSearch) and Mapbox Geocoding (MapSearch)
- **LLM**: Anthropic SDK, used by the recommendation endpoints
- **Deployment**: Vercel
- **State Management**: React Context API for authentication

### Project Structure
```
├── frontend/
│   ├── api/                        # Vercel serverless functions
│   │   ├── search.ts               # Semantic photo search
│   │   ├── similar.ts              # Similar-photo lookup (no UI caller yet)
│   │   ├── recommendations.ts      # LLM travel recommendations
│   │   ├── community-recommendations.ts
│   │   ├── _observability.ts       # Shared logging / token-cost helpers
│   │   └── tsconfig.json           # The ONLY tsconfig (see Type checking below)
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapSearch.tsx       # Mapbox geocoder search box
│   │   │   ├── LocationSearch.tsx  # OpenCage location autocomplete
│   │   │   ├── PhotoSearch.tsx     # Semantic photo search UI
│   │   │   ├── PhotoImage.tsx      # Image with loading/error states
│   │   │   ├── NavBar.tsx
│   │   │   ├── LandingMapPreview.tsx    # Decorative auto-panning globe (React.lazy)
│   │   │   ├── RecommendationsPanel.tsx
│   │   │   ├── CommunityRecommendationsPanel.tsx
│   │   │   └── ui/                 # Card, Spinner, SuggestionCard, AiDisclaimer, buttonStyles
│   │   ├── contexts/AuthContext.tsx
│   │   ├── lib/                    # supabase.ts, imageUrl.ts, photoDate.ts, geocoderError.ts
│   │   ├── pages/                  # Landing, Home, Login, PhotoUpload, NotFound
│   │   ├── services/               # photoService, searchService, recommendationService,
│   │   │                           # communityRecommendationService
│   │   └── test-utils/supabaseMock.ts
├── supabase/                       # Schema and migrations
│   ├── schema.sql                  # 1. Tables, RLS, auth. Required.
│   ├── policies.sql                # 2. Write policies for public-map uploads
│   ├── add_recommendations.sql     # 3.
│   ├── add_community_recommendations.sql  # 4.
│   ├── add_semantic_search.sql     # 5. pgvector + search_public_photos /
│   │                               #    similar_public_photos RPCs
│   ├── migrate_existing_photos.sql # one-off, legacy databases only
│   └── add_auth_to_existing.sql    # one-off, legacy databases only
├── evals/                          # LLM eval suite (cases, fixtures, prompts, run.mjs)
├── scripts/                        # backfill-embeddings.mjs, cleanup-orphaned-photos.mjs
└── .github/workflows/ci.yml        # Typecheck + tests + build + evals on every push
```

### Routing
`/` Landing · `/login` · `/app` private map · `/public` public map · `/upload` · `*` NotFound.
`/app` and `/public` are both `Home`, switched by the `showPublicMap` prop.

### Authentication Flow
- Supabase Auth handles user registration, login, and session management
- AuthContext provides authentication state throughout the app
- Row Level Security (RLS) policies protect user data
- Public photos are viewable by all users; private photos require authentication

### Database Schema
`README.md` is the authoritative setup guide — it carries the numbered migration
table, the pgvector/embedding backfill steps, and the API endpoint reference.
Prefer updating it over duplicating its detail here.

The main `photos` table includes:
- User association (`user_id` foreign key to `auth.users`)
- Geographic data (`latitude`, `longitude`, `country`)
- File storage (`file_path`, `file_url`)
- Metadata (`title`, `description`, `taken_date`)
- Row Level Security policies for data access control

### Key Components Integration
- **Home**: Central component handling both public (`/public`) and private (`/app`) map views. Renders the photo markers and the inline fullscreen photo modal directly — there is no separate carousel component.
- **MapSearch**: Mapbox Geocoding search box for moving the map viewport. It does not render photo markers, and there is no marker clustering anywhere in the app.
- **LocationSearch**: Uses OpenCage Geocoding for location autocomplete on the upload form.
- **PhotoUpload**: Location comes off `selectedLocation` at submit time; `formData` holds only the description and taken_date inputs.

## Environment Variables Required

### Frontend (frontend/.env.local)
Create React App only inlines `REACT_APP_`-prefixed variables. See `frontend/env.example`.
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_MAPBOX_TOKEN=your_mapbox_access_token
REACT_APP_OPENCAGE_API_KEY=your_opencage_api_key
```

### Serverless functions (set in the Vercel dashboard)
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # server-only, never expose to the client
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENCAGE_API_KEY=your_opencage_api_key
RATE_IN_PER_MTOK=...    # optional, token cost reporting in _observability.ts
RATE_OUT_PER_MTOK=...   # optional
```

## Development Notes

### Code Conventions
- React functional components with hooks
- Tailwind CSS for styling
- ESLint configuration extends `react-app`
- **Relative imports carry explicit file extensions** (`./ui/Spinner.tsx`, `../lib/supabase.ts`). Match this — it is what makes the CRA build work without a root tsconfig.
- The `Photo` interface lives in `lib/supabase.ts`; other types are defined next to the service that owns them.

### Type checking
There is deliberately **no `frontend/tsconfig.json`**, so `npm run build` does not typecheck application code — only `frontend/api/` is typechecked, via `api/tsconfig.json` in CI. Adding a root tsconfig breaks the CRA build because of the explicit `.tsx` import extensions above (TS2691). To check app code, lint it with the TypeScript ESLint parser rather than adding a tsconfig.

### Testing
- Uses React Testing Library (via react-scripts)
- Run tests with `npm test` in the frontend directory
- `src/test-utils/supabaseMock.ts` provides the shared Supabase mock

### Deployment
- Vercel handles automatic deployments from git; the linked project is at the repo root (`.vercel/project.json`)
- Environment variables must be configured in Vercel dashboard
- Build command: `npm run build` (in frontend directory)
