# MercuryMap - Interactive Travel Photo Mapping

A modern travel photo mapping application that lets you visualize your journeys on an interactive world map. Named after Mercury, the Roman god of travel, MercuryMap helps you explore destinations and connect with fellow travelers through shared experiences.

## 🚀 Features

- **Interactive World Map** - Powered by Mapbox with search, clustering, and location-based photo viewing
- **User Authentication** - Sign up/sign in to access private photo maps
- **Public & Private Maps** - View public photos or your private collection
- **Photo Upload** - Drag & drop uploads with location autocomplete using OpenCage Geocoding
- **Location Search** - Find and zoom to countries, cities, and destinations
- **Photo Clustering** - Smart grouping of photos at the same location
- **Fullscreen Viewing** - Modal carousel for detailed photo viewing with navigation
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Modern UI** - Beautiful landing page with Tailwind CSS and Lucide icons

### AI features

- **Trip recommendations** - Claude reads your photo history and suggests 3-5 new destinations, each with real map coordinates and a one-sentence reason. A separate community endpoint does the same for the public map.
- **Natural-language photo search** - Type "espania" or "photos from Japan in 2023" and Claude parses it into keywords plus structured country/date filters; PostgreSQL full-text search does the retrieval.
- **Similar photos** - pgvector cosine similarity over offline-generated embeddings, so "more like this" needs no query-time model.
- **Evaluated in CI** - A 20-case evaluation harness with deterministic validators and an LLM judge runs offline on every push. See [`evals/README.md`](evals/README.md).

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage) + pgvector
- **Serverless API**: Vercel Functions (`frontend/api/`)
- **AI**: Anthropic Claude — Opus 5 for recommendations, Haiku 4.5 for the search parser
- **Embeddings**: `Xenova/all-MiniLM-L6-v2` (384-dim), generated offline
- **Maps**: Mapbox GL JS + React Map GL
- **Geocoding**: OpenCage Geocoding API
- **Deployment**: Vercel
- **UI**: Lucide React Icons + React Hot Toast
- **Analytics**: Vercel Analytics

## 📋 Prerequisites

- Node.js 18+ (CI runs Node 22)
- Git
- Supabase account (free)
- Vercel account (free)
- Mapbox access token (free tier)
- OpenCage Geocoding API key (free tier)
- Anthropic API key — required only for the AI endpoints and the live eval pass

## 🚀 Quick Start

### 1. Set up Supabase

1. **Create a Supabase project**:
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose your organization
   - Enter project name: `mercury-map`
   - Set database password
   - Choose region
   - Click "Create new project"

2. **Set up the database**:

   Go to SQL Editor in your Supabase dashboard and run these in order. Every
   migration is guarded (`IF NOT EXISTS` / `CREATE OR REPLACE`), so re-running
   one is a no-op.

   | Order | File | Purpose |
   | --- | --- | --- |
   | 1 | `supabase/schema.sql` | Tables, RLS, auth. Required. |
   | 2 | `supabase/policies.sql` | Write policies for public-map uploads |
   | 3 | `supabase/add_recommendations.sql` | Storage for personal trip recommendations |
   | 4 | `supabase/add_community_recommendations.sql` | Storage for the community variant |
   | 5 | `supabase/add_semantic_search.sql` | pgvector, `tsv`/`embedding` columns, search RPCs |

   `supabase/migrate_existing_photos.sql` and `supabase/add_auth_to_existing.sql`
   are one-off scripts for databases created before those features existed; a
   fresh project does not need them.

   After step 5, `/api/search` works immediately — the `tsv` column is
   `GENERATED ALWAYS` and backfills itself. `/api/similar` additionally needs
   embeddings, which are generated offline:

   ```bash
   node --env-file=frontend/.env.local scripts/backfill-embeddings.mjs --dry-run
   node --env-file=frontend/.env.local scripts/backfill-embeddings.mjs
   ```

   The real run requires `SUPABASE_SERVICE_ROLE_KEY` in the environment.

3. **Create Storage bucket**:
   - Go to Storage in your Supabase dashboard
   - Click "Create a new bucket"
   - Name: `photos`
   - Make it public
   - Click "Create bucket"

4. **Get your credentials**:
   - Go to Settings > API
   - Copy your Project URL and anon public key

### 2. Set up the Frontend

1. **Clone and install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp env.example .env.local
   ```

3. **Update environment variables**:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_MAPBOX_TOKEN=your_mapbox_token
   REACT_APP_OPENCAGE_API_KEY=your_opencage_api_key

   # Server-side only. Never prefixed with REACT_APP_, or CRA would inline
   # them into the browser bundle. Used by the serverless functions, the
   # maintenance scripts, and the live eval pass.
   ANTHROPIC_API_KEY=your_anthropic_api_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Start development server**:
   ```bash
   npm start
   ```

### 3. Deploy to Vercel

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

## 📁 Project Structure

```
mercury-map/
├── frontend/
│   ├── api/                     # Vercel serverless functions
│   │   ├── recommendations.ts           # Personal trip suggestions (Opus 5)
│   │   ├── community-recommendations.ts # Public-map suggestions (Opus 5)
│   │   ├── search.ts                    # NL query parser (Haiku) + FTS retrieval
│   │   ├── similar.ts                   # pgvector similarity
│   │   ├── _observability.ts            # Shared request/usage telemetry
│   │   └── tsconfig.json                # Scoped to api/ — see note below
│   ├── src/
│   │   ├── components/      # MapSearch, LocationSearch, PhotoSearch, panels, ui/
│   │   ├── contexts/        # AuthContext
│   │   ├── lib/             # Supabase client, types, date/url helpers
│   │   ├── pages/           # Landing, Home, Login, PhotoUpload, NotFound
│   │   └── services/        # photoService, searchService, recommendation services
│   ├── public/
│   └── package.json
├── evals/                   # LLM evaluation harness (see evals/README.md)
│   ├── cases/               # 20 graded cases
│   ├── fixtures/            # Offline response + judge fixtures
│   ├── prompts/             # Checked-in copies of the shipped system prompts
│   ├── validators.mjs       # Deterministic contract checks
│   ├── prompt-sync.mjs      # Guards eval prompts against endpoint drift
│   └── run.mjs              # Runner (offline by default, --live opts in)
├── scripts/
│   ├── backfill-embeddings.mjs      # Generates photos.embedding offline
│   └── cleanup-orphaned-photos.mjs  # Finds storage files with no DB row
├── supabase/                # Schema + ordered migrations
└── .github/workflows/ci.yml # Typecheck, test, build, evals
```

> **Note on `frontend/api/tsconfig.json`:** it is scoped to `api/` on purpose.
> This codebase imports with explicit `.ts`/`.tsx` extensions, which TypeScript
> rejects (TS2691) once a tsconfig exists at the project root. Keeping the
> config inside `api/` typechecks the serverless functions without breaking the
> CRA build.

## 🔧 Configuration

### Supabase Configuration

The app uses Supabase for:
- **Database**: PostgreSQL for photo storage
- **Storage**: File uploads for photos
- **Real-time**: Live updates

### Environment Variables

Two groups, and the distinction matters. Anything prefixed `REACT_APP_` is
inlined into the browser bundle by Create React App and is therefore public.
Server-side secrets must **not** carry that prefix.

```env
# Client — shipped to the browser. Safe: anon key is RLS-protected by design.
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
REACT_APP_OPENCAGE_API_KEY=your_opencage_api_key

# Server — serverless functions and scripts only. Never exposed to the client.
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Set both groups in the Vercel dashboard for deployed environments. Which
endpoint needs what:

| Endpoint | Requires |
| --- | --- |
| `/api/recommendations` | `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `/api/community-recommendations` | `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `/api/search` | `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `/api/similar` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

The public endpoints use the service role key deliberately, and pair it with an
explicit `user_id IS NULL` predicate inside the RPC — RLS cannot be the only
guard when the caller bypasses it.

## 🗄 Database Schema

### Photos Table
```sql
CREATE TABLE photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  country TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  taken_date DATE,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

`add_semantic_search.sql` adds two more columns to this table:

```sql
-- 384 dims = all-MiniLM-L6-v2's output size. Populated offline by
-- scripts/backfill-embeddings.mjs; NULL until then.
embedding vector(384)

-- Generated, so Postgres keeps it in sync and no insert path can forget it.
-- Weights: title (A) > country (B) > description (C), which ts_rank reads.
tsv tsvector GENERATED ALWAYS AS (...) STORED
```

Both are excluded from the app's photo queries — `photoService` names its
columns explicitly rather than using `select('*')`, so a 384-float vector never
rides along on a map load.

## 🤖 AI endpoints

### How search actually works

`/api/search` is **keyword full-text search with an LLM query parser in front** —
not vector search. The split is deliberate:

```
"photos from Spain in 2023"
        │
        ▼
  Claude Haiku 4.5          ← sees ONLY the query string, never your photos
        │
        ▼
  { keywords: ["Spain", "photos"],
    country: "Spain", date_from: "2023-01-01", date_to: "2023-12-31" }
        │
        ▼
  search_public_photos()    ← Postgres FTS over tsv, ts_rank ordering,
        │                     filters as SQL predicates, user_id IS NULL
        ▼
  up to 24 ranked photos
```

Embeddings are **not** used here. Comparing a user's sentence to stored vectors
would mean loading the ~90MB MiniLM model into a serverless function on every
cold start. Instead one cheap Haiku call expands intent into keywords and
synonyms, and Postgres does retrieval — which also buys country and date
filters that pure vector search cannot express.

The practical consequence: search matches **text you typed** (title, country,
description), never the image itself. A sunset photo titled `IMG_4821` with no
description cannot be found by searching "sunset".

`/api/similar` is the part that uses pgvector. Both vectors are already stored,
so it needs no query-time model at all — just a cosine-distance lookup over the
HNSW index. It returns nothing (not an error) for photos with no embedding yet.

### Recommendations

`/api/recommendations` and `/api/community-recommendations` send photo history
to Claude Opus 5 under a structured-output schema and return 3-5 destinations
with coordinates. Coordinates matter: the app drops a real map pin at whatever
the model returns, which is why the eval suite verifies them against a geocoder
rather than trusting them.

## 🧪 Evaluations

The AI output is covered by a 20-case evaluation harness that runs offline in CI
on every push — no API key, no network, no spend:

```bash
node evals/run.mjs                                        # offline, free
node --env-file=frontend/.env.local evals/run.mjs --live  # paid, ~$0.16
```

It combines deterministic contract checks (schema, suggestion count, coordinate
validity, coordinate/place agreement, duplicates, history repeats) with an
LLM judge for the qualities that require reading. Two deliberately-bad fixtures
act as sentinels: if they ever *pass*, the validators have stopped working.

`prompt-sync.mjs` compares the checked-in eval prompts byte-for-byte against the
`SYSTEM_PROMPT` constants shipped in the endpoints, so an eval can never
silently grade a prompt the app no longer sends.

Full documentation — scoring rubric, validator list, cost model, and known
limitations — is in **[`evals/README.md`](evals/README.md)**.

## 🔧 Maintenance scripts

```bash
# Generate embeddings for photos that lack them (needed by /api/similar)
node --env-file=frontend/.env.local scripts/backfill-embeddings.mjs [--dry-run]

# List storage files with no matching DB row; --delete is the only destructive flag
SUPABASE_SERVICE_ROLE_KEY=... node --env-file=frontend/.env.local \
  scripts/cleanup-orphaned-photos.mjs [--delete]
```

Both refuse to run destructively on the anon key on purpose: under RLS the anon
key sees only public rows, so every private photo would be misreported as an
orphan.

## 🚀 Deployment

### Vercel Deployment

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

### Custom Domain (Optional)

1. Go to your Vercel project settings
2. Add your custom domain
3. Update DNS records as instructed

## 🔒 Security

- **User authentication** with Supabase Auth
- **Row Level Security** for private photo access
- **File validation** on uploads
- **CORS** configured for your domain
- **Private maps** for authenticated users

## 📱 Features

### Photo Management
- Drag & drop uploads with location autocomplete
- Image preview and metadata editing
- Fullscreen viewing with carousel navigation
- Location-based photo grouping

### Map Features
- Interactive Mapbox integration
- Location search and zoom functionality
- Photo clustering for multiple photos at same location
- Responsive sidebar for photo viewing
- Interactive world map
- Photo markers
- Popup details
- Country filtering

### Gallery
- Grid layout with "show all" state held in the URL
- Natural-language search over public photos (`/public`)
- Responsive design

## 🛠 Development

### Local Development

1. **Start the development server**:
   ```bash
   cd frontend
   npm start
   ```

2. **Access the app**: http://localhost:3000

### Building for Production

```bash
npm run build
```

### Testing

```bash
cd frontend && npm test
```

### CI

`.github/workflows/ci.yml` runs on every push and pull request, in this order:

| Step | Command |
| --- | --- |
| Typecheck serverless functions | `npx tsc --noEmit -p api/tsconfig.json` |
| Tests | `CI=true npx react-scripts test --watchAll=false` |
| Production build | `CI=true npx react-scripts build` |
| LLM evaluations | `node evals/run.mjs` |

The eval step is offline and fails the build on a regression, a prompt-sync
drift, or a known-bad sentinel that unexpectedly passes.

> Because the eval harness reads repo files by path, verify it against a **fresh
> clone** rather than your working tree before merging changes to it:
> ```bash
> git clone --depth 1 file://$PWD /tmp/citest && (cd /tmp/citest && node evals/run.mjs)
> ```
> A local pass can otherwise hide a dependency on a file that was never committed.

## 🔧 Troubleshooting

### Common Issues

1. **Supabase connection errors**:
   - Check your environment variables
   - Verify your Supabase project is active

2. **Upload failures**:
   - Ensure storage bucket is public
   - Check file size limits

3. **Authentication issues**:
   - Verify email confirmation
   - Check Supabase auth settings

### Support

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [React Documentation](https://reactjs.org/docs)

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**Happy coding! 🌍📸** 