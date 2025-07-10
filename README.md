# MercuryMap - Interactive Travel Photo Mapping

A modern travel photo mapping application that lets you visualize your journeys on an interactive world map. Named after Mercury, the Roman god of travel, MercuryMap helps you explore destinations and connect with fellow travelers through shared experiences.

## 🚀 Features

- **Interactive World Map** - Powered by Mapbox with search, clustering, and location-based photo viewing
- **Photo Upload** - Drag & drop uploads with location autocomplete using OpenCage Geocoding
- **Location Search** - Find and zoom to countries, cities, and destinations
- **Photo Clustering** - Smart grouping of photos at the same location
- **Fullscreen Viewing** - Modal carousel for detailed photo viewing with navigation
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Modern UI** - Beautiful landing page with Tailwind CSS and Lucide icons

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database, Storage)
- **Maps**: Mapbox GL JS + React Map GL
- **Geocoding**: OpenCage Geocoding API
- **Deployment**: Vercel
- **UI**: Lucide React Icons + React Hot Toast
- **Analytics**: Vercel Analytics

## 📋 Prerequisites

- Node.js 18+ 
- Git
- Supabase account (free)
- Vercel account (free)

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
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/schema_no_auth.sql` (for open uploads)
   - Click "Run" to create the tables

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
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components (MapSearch, LocationSearch)
│   │   ├── lib/            # Supabase client and types
│   │   ├── pages/          # Page components (Landing, Home, PhotoUpload)
│   │   └── services/       # API services (photoService)
│   ├── public/             # Static assets
│   └── package.json
├── supabase/
│   ├── schema.sql          # Database schema with auth
│   └── schema_no_auth.sql  # Database schema without auth
└── README.md
```

## 🔧 Configuration

### Supabase Configuration

The app uses Supabase for:
- **Database**: PostgreSQL for photo storage
- **Storage**: File uploads for photos
- **Real-time**: Live updates

### Environment Variables

```env
# Frontend (.env.local)
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
REACT_APP_OPENCAGE_API_KEY=your_opencage_api_key

# Vercel (set in dashboard)
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
REACT_APP_OPENCAGE_API_KEY=your_opencage_api_key
```

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Schema Options
- **schema_no_auth.sql**: Open uploads without authentication
- **schema.sql**: Includes user authentication and Row Level Security

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

- **File validation** on uploads
- **CORS** configured for your domain
- **Optional authentication** with Row Level Security

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
- Grid layout
- Search functionality
- Responsive design
- Delete options

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
npm test
```

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