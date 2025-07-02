# photoLog - Log your travels with photos

A modern photo map application built with React, Supabase, and Vercel.

## 🚀 Features

- **Interactive World Map** - Click on countries to view photos
- **Photo Upload** - Drag & drop photo uploads with Supabase Storage
- **User Authentication** - Built-in Supabase auth with email/password
- **Real-time Updates** - Live photo updates across all users
- **Responsive Design** - Works on desktop and mobile
- **Modern Stack** - React, TypeScript, Tailwind CSS

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database, Auth, Storage)
- **Deployment**: Vercel
- **Maps**: Leaflet + React Leaflet
- **UI**: Lucide React Icons + React Hot Toast

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
   - Enter project name: `photo-map`
   - Set database password
   - Choose region
   - Click "Create new project"

2. **Set up the database**:
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/schema.sql`
   - Click "Run" to create the tables and policies

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
   cd supabase-vercel/frontend
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env.local
   ```

3. **Update environment variables**:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**:
   ```bash
   npm start
   ```

### 3. Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set environment variables in Vercel**:
   - Go to your Vercel project dashboard
   - Settings > Environment Variables
   - Add:
     - `REACT_APP_SUPABASE_URL`
     - `REACT_APP_SUPABASE_ANON_KEY`

## 📁 Project Structure

```
supabase-vercel/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts
│   │   ├── lib/            # Supabase client
│   │   ├── pages/          # Page components
│   │   └── services/       # API services
│   ├── public/             # Static assets
│   └── package.json
├── supabase/
│   └── schema.sql          # Database schema
└── vercel.json            # Vercel configuration
```

## 🔧 Configuration

### Supabase Configuration

The app uses Supabase for:
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: Email/password auth
- **Storage**: File uploads for photos
- **Real-time**: Live updates

### Environment Variables

```env
# Frontend (.env.local)
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Vercel (set in dashboard)
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
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
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security Policies
- Users can view all photos
- Users can only insert/update/delete their own photos

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

- **Row Level Security** enabled on all tables
- **Authentication** required for photo uploads
- **File validation** on uploads
- **CORS** configured for your domain

## 📱 Features

### Authentication
- Email/password registration
- Email verification
- Password reset
- Session management

### Photo Management
- Drag & drop uploads
- Image preview
- Metadata editing
- Delete photos (owner only)

### Map Features
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