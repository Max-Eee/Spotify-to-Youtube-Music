# <i>**`Spotify to Spotify to Youtube Music`** Playlist Migration Tool</i>

A comprehensive **`web application`** for seamlessly transferring your Spotify playlists to YouTube Music using OAuth authentication.

<samp>

> [!IMPORTANT]
> **OAuth Setup Required**: You'll need to create OAuth applications for both Spotify and Google (YouTube) to use this application.
> Follow the [OAuth Setup Guide](#-oauth-setup-guide) below for detailed instructions.

## ✨ Key Features

- **`Automatic Playlist Discovery`**: View all your Spotify playlists instantly
- **`One-Click Transfer`**: Transfer entire playlists with a single click
- **`Smart Track Matching`**: Intelligent search algorithm to find songs on YouTube Music
- **`OAuth Authentication`**: Secure login with Spotify and YouTube Music accounts
- **`Transfer Summary`**: Detailed statistics showing successful transfers and missing tracks
- **`YouTube Search Integration`**: Direct search links for songs that couldn't be found automatically

## 🚀 OAuth Setup Guide

### 1️⃣ Spotify OAuth Setup

1. **Visit Spotify Developer Dashboard**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Log in with your Spotify account

2. **Create an App**
   - Click **"Create App"**
   - Fill in the details:
     - **App Name**: StoY (or any name)
     - **App Description**: Transfer playlists to YouTube Music
     - **Redirect URI**: `http://127.0.0.1:8080/callback/spotify`
     - Check the Terms of Service agreement
   - Click **"Save"**

3. **Get Credentials**
   - Click on your newly created app
   - Click **"Settings"** button
   - Copy the **Client ID** and **Client Secret**
   - Save these for your `.env` file

### 2️⃣ Google/YouTube OAuth Setup

1. **Visit Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Enter project name: **StoY**
   - Click **"Create"**

3. **Enable YouTube Data API v3** ⚠️ IMPORTANT
   - In the left sidebar, go to **"APIs & Services"** → **"Library"**
   - Search for **"YouTube Data API v3"**
   - Click on it and press **"Enable"**
   - 🔗 [Direct Link to YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)

4. **Create OAuth Credentials**
   - Go to **"APIs & Services"** → **"Credentials"**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - If prompted, configure the OAuth consent screen:
     - Choose **"External"** user type
     - Fill in app name: **StoY**
     - Add your email as developer contact
     - Add scopes: `../auth/youtube`
     - Save and continue

5. **Configure OAuth Client**
   - Application type: **"Web application"**
   - Name: **StoY**
   - Authorized redirect URIs:
     - Add: `http://127.0.0.1:8080/callback/youtube`
   - Click **"Create""

6. **Get Credentials**
   - Copy the **Client ID** (this is your `GOOGLE_CLIENT_ID`)
   - Copy the **Client Secret** (this is your `GOOGLE_CLIENT_SECRET`)
   - Save these for your `.env` file

> [!NOTE]
> **Google OAuth Consent Screen**: If you see a warning about unverified apps, you can continue safely since you're the developer. For personal use, you don't need to verify the app.

## 🛠️ Installation Options

You have two options to run this application:
- **[Docker Installation (Recommended)](#-docker-installation-recommended)** - Easiest setup with Docker Compose
- **[Local Development Installation](#-local-development-installation)** - Manual setup for development

## 🐳 Docker Installation (Recommended)

### Prerequisites
- Docker installed ([Download Docker](https://www.docker.com/products/docker-desktop))
- Docker Compose installed (included with Docker Desktop)
- OAuth credentials from [OAuth Setup Guide](#-oauth-setup-guide)

### Step-by-Step Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Max-Eee/Spotify-to-Youtube-Music
   cd Spotify-to-Youtube-Music
   ```

2. **Configure environment variables**
   
   The `.env` file is already included in the repository. Simply edit it with your credentials:
   ```env
   # Spotify OAuth (from https://developer.spotify.com/dashboard/)
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/callback/spotify

   # Google OAuth (from https://console.cloud.google.com/)
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   YOUTUBE_REDIRECT_URI=http://127.0.0.1:8080/callback/youtube

   # Flask Secret (random string)
   FLASK_SECRET_KEY=your_random_secret_key_change_this
   
   # Frontend URL
   FRONTEND_URL=http://127.0.0.1:3000
   ```

3. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Visit [http://127.0.0.1:3000](http://127.0.0.1:3000) and start transferring your playlists!**

## 💻 Local Development Installation

### Prerequisites
- Python 3.8+ ([Download Python](https://www.python.org/downloads/))
- Node.js 16+ ([Download Node.js](https://nodejs.org/))
- OAuth credentials from [OAuth Setup Guide](#-oauth-setup-guide)

### Backend Setup

1. **Clone and navigate to backend**
   ```bash
   git clone https://github.com/Max-Eee/Spotify-to-Youtube-Music
   cd Spotify-to-Youtube-Music/backend
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   
   Edit the `.env` file in the root directory with your credentials (same format as Docker setup)

4. **Run the Flask server**
   ```bash
   python main.py
   ```
   Server runs on [http://127.0.0.1:8080](http://127.0.0.1:8080)

### Frontend Setup

1. **Navigate to frontend**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev -- --port 3000
   ```
   Frontend runs on [http://127.0.0.1:3000](http://127.0.0.1:3000)

## 📖 How to Use

### Step 1: Connect Your Accounts
1. Click **"Connect to Spotify"** and authorize the app
2. Click **"Connect to YouTube Music"** and authorize the app

### Step 2: Transfer Playlists
1. Your Spotify playlists will appear automatically
2. Hover over a playlist and click **"Transfer"**
3. Wait for the transfer to complete

### Step 3: View Results
- **Success**: See transfer summary with track counts
- **Partial Success**: View missing tracks with YouTube search links
- Click search links to manually add missing songs

## 🔧 Technical Stack

**Frontend**
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- ShadCN UI components
- React Router for navigation

**Backend**
- Flask (Python) REST API
- YTMusicAPI for YouTube Music
- Google OAuth2 for authentication
- Flask-CORS for cross-origin requests

**Infrastructure**
- Docker & Docker Compose
- Nginx for frontend serving

## 📁 Project Structure

```
Spotify-to-Youtube-Music/
├── backend/
│   ├── main.py              # Flask application entry point
│   ├── auth.py              # OAuth authentication logic
│   ├── spotify.py           # Spotify API integration
│   ├── ytm.py               # YouTube Music API integration
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile          # Backend Docker configuration
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── playlist-transfer.tsx  # Main transfer page
│   │   │   └── auth-callback.tsx      # OAuth callback handler
│   │   ├── components/
│   │   │   ├── ui/                    # Reusable UI components
│   │   │   └── theme-provider.tsx     # Dark mode support
│   │   └── main.tsx                   # Application entry point
│   ├── Dockerfile                     # Frontend Docker configuration
│   ├── nginx.conf                     # Nginx configuration
│   └── package.json                   # Node.js dependencies
├── docker-compose.yml                 # Docker Compose configuration
├── .env.example                       # Environment variables template
└── README.md                          # This file
```

## 🐛 Troubleshooting

### Common Issues

**OAuth Redirect Errors**
- Ensure redirect URIs in `.env` match exactly what's in Spotify/Google dashboards
- Check for typos: `http://127.0.0.1:8080/callback/spotify` (no trailing slash)
- Make sure you've added both redirect URIs to your OAuth apps:
  - Spotify: `http://127.0.0.1:8080/callback/spotify`
  - YouTube: `http://127.0.0.1:8080/callback/youtube`

**YouTube API Quota Exceeded**
- Google provides 10,000 quota units per day for free
- Each playlist transfer uses approximately 50-100 units
- Wait 24 hours for quota reset or request quota increase

**"Not Found" Errors for Songs**
- Some songs may not be available on YouTube Music
- Use the search links provided to manually find alternatives
- Regional availability may affect results

**Docker Port Conflicts**
- If ports 3000 or 8080 are in use, edit `docker-compose.yml`:
  ```yaml
  ports:
    - "3001:80"   # Change frontend port
    - "8081:8080" # Change backend port
  ```


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

If you encounter any issues or have questions:
- Open an [issue](https://github.com/Max-Eee/Spotify-to-Youtube-Music/issues)
- Check existing issues for solutions
- Star ⭐ the repository if you find it useful!
</samp>
