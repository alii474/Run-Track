# RunTrack - Fitness Tracking Web App

A simple, responsive fitness tracking web application built with vanilla HTML, CSS, and JavaScript. No frameworks or npm packages required.

## Features

- **User Authentication**: Sign up and sign in functionality with local storage
- **Activity Tracking**: Track steps, distance, and calories burned
- **Dashboard**: View today's fitness statistics at a glance
- **Activity History**: View and manage your fitness activities
- **Google Fit Integration**: Connect to Google Fit to sync fitness data (requires API credentials)
- **Responsive Design**: Works on desktop and mobile devices
- **Local Storage**: All data is stored locally in the browser

## Project Structure

```
runtrack-app/
├── index.html          # Main HTML file
├── style.css           # CSS styling
├── app.js             # Main application logic
├── auth.js            # Authentication module
├── googlefit.js       # Google Fit integration
└── README.md          # This file
```

## Getting Started

1. **Clone or download** this project to your local machine
2. **Set up Google Cloud Console** (see section below for Google Fit integration)
3. **Run the app locally** (see section below)
4. **Open the app** and start tracking your runs!

## Running the App Locally

### Option 1: VS Code Live Server (Recommended)
1. Open the project folder in VS Code
2. Install the "Live Server" extension from the marketplace
3. Right-click on `index.html` and select "Open with Live Server"
4. The app will open at `http://localhost:5500`

### Option 2: Using Node.js Serve
1. Make sure you have Node.js installed
2. Open a terminal in the project directory
3. Run: `npx serve . -p 3000`
4. Open your browser and navigate to `http://localhost:3000`

### Option 3: Python Simple Server
1. Make sure you have Python installed
2. Open a terminal in the project directory
3. Run: `python -m http.server 3000` (Python 3) or `python -m SimpleHTTPServer 3000` (Python 2)
4. Open your browser and navigate to `http://localhost:3000`

**Note**: Make sure to use `http://localhost:3000` (or your chosen port) as the authorized JavaScript origin in your Google Cloud Console setup.

## Usage

### Basic Usage
1. Create an account using the Sign Up button
2. Sign in with your credentials
3. View your dashboard to see fitness statistics
4. Add activities manually or sync with Google Fit

## Google Cloud Console Setup

To enable Google Fit integration, follow these exact steps:

### 1. Create Google Cloud Project
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account
3. Click the project dropdown at the top and select "NEW PROJECT"
4. Enter "RunTrack" as the project name
5. Click "CREATE"

### 2. Enable Required APIs
1. In the navigation menu, go to **APIs & Services > Library**
2. Search and enable these APIs:
   - **Fitness API**
   - **Google Identity Services API**
3. Wait for each API to finish enabling (may take a few minutes)

### 3. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** and click "CREATE"
3. Fill in required fields:
   - App name: "RunTrack"
   - User support email: your email address
   - Developer contact: your email address
4. Click "SAVE AND CONTINUE"
5. On the "Scopes" screen, click "ADD OR REMOVE SCOPES"
6. Search and add: `.../auth/fitness.activity.write`
7. Click "UPDATE" then "SAVE AND CONTINUE"
8. On the "Test users" screen, click "ADD USERS"
9. Add your Google email address as a test user
10. Click "SAVE AND CONTINUE"
11. Review and click "BACK TO DASHBOARD"

### 4. Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **+ CREATE CREDENTIALS**
3. Select **OAuth 2.0 Client ID**
4. Configure the client:
   - **Application type**: Web application
   - **Name**: RunTrack Web Client
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - Your deployed URL (if applicable)
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000`
   - Your deployed URL (if applicable)
7. Click **CREATE**
8. **Copy the Client ID** - you'll need this for the next step

### 5. Update Application Code
1. Open `auth.js` in your project
2. Replace `"YOUR_GOOGLE_CLIENT_ID"` with the Client ID you copied
3. Save the file

### 6. Test the Setup
Your Google Fit integration is now configured! The app will be able to authenticate users and sync runs to Google Fit.

**Note**: During development, you'll need to use a test user account (the email you added in step 3). The app will only work for test users until you publish your app and Google reviews it.

## File Descriptions

### `index.html`
- Main HTML structure for the application
- Contains navigation, dashboard, activities, and profile sections
- Includes all script references

### `style.css`
- Complete CSS styling for the application
- Responsive design that works on mobile and desktop
- Modern gradient design with hover effects
- Form styling and modal components

### `app.js`
- Main application class `RunTrackApp`
- Handles navigation, data management, and UI updates
- Manages activities and user data
- Provides notification system

### `auth.js`
- Authentication class `Auth`
- Handles user registration, login, and logout
- Password hashing and verification
- Modal-based UI for login/signup forms
- Profile management

### `googlefit.js`
- Google Fit integration class `GoogleFit`
- Connects to Google Fit API
- Fetches steps, distance, and calories data
- Syncs data with the application
- Requires Google API credentials

## Data Storage

All user data is stored locally in the browser using `localStorage`:
- User accounts and credentials
- Activity history
- User preferences
- Authentication tokens

## API Integration

### Google Fit API
The application integrates with the Google Fit API to:
- Read fitness data (steps, distance, calories)
- Sync today's activities
- Provide real-time fitness statistics

**Required Scopes:**
- `fitness.activity.read`
- `fitness.body.read`
- `fitness.location.read`

## Browser Compatibility

This application works in all modern browsers that support:
- ES6 JavaScript features
- Local Storage API
- CSS Grid and Flexbox
- Fetch API (for Google Fit integration)

## Security Notes

- Passwords are hashed using a simple algorithm (for demonstration only)
- In production, use proper password hashing (bcrypt, etc.)
- Google Fit integration requires proper OAuth setup
- All data is stored locally and not transmitted to external servers

## Customization

### Adding New Features
1. Create new sections in `index.html`
2. Add corresponding styles in `style.css`
3. Implement functionality in `app.js` or create new modules

### Styling
- Modify colors and gradients in `style.css`
- Update font families and sizes
- Adjust responsive breakpoints

### Data Sources
- Add new fitness tracking integrations
- Extend the activity data structure
- Implement data export/import features

## Troubleshooting

### Common Issues
1. **Google Fit not connecting**: Ensure API credentials are properly configured
2. **Data not saving**: Check if localStorage is enabled in your browser
3. **Responsive issues**: Test on different screen sizes

### Development Tips
- Use browser developer tools to debug
- Check console for error messages
- Test localStorage functionality

## Deployment

### Netlify Deployment

#### 1. Push to GitHub
1. Create a new repository on GitHub
2. Push your RunTrack code to the repository
3. Ensure all files are committed and pushed

#### 2. Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Connect your GitHub account
4. Select the RunTrack repository
5. Deploy with default settings
6. Copy your Netlify URL (e.g., `https://runtrack-xyz.netlify.app`)

#### 3. Update Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Credentials**
3. Find your OAuth 2.0 Client ID
4. Under **Authorized JavaScript origins**, add your Netlify URL
5. Save changes

#### 4. Test Live Deployment
1. Open your Netlify URL on mobile phone
2. Test GPS tracking in real-world conditions
3. Verify Google Fit sync functionality
4. Check responsive design on different screen sizes

### Final Deployment Checklist

- [ ] GPS updates within 5 seconds of start
- [ ] Timer increments every second smoothly  
- [ ] Distance matches ~phone native within 5%
- [ ] Start/stop button responds instantly
- [ ] Google Fit shows activity after save
- [ ] No console errors in Chrome mobile emulation
- [ ] HTTPS properly configured for production
- [ ] CSP headers allow Google APIs
- [ ] Mobile GPS permissions working correctly
- [ ] Offline mode functions properly
- [ ] Toast notifications display correctly on mobile

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this application.

---

**Note**: This is a demonstration project. For production use, implement proper security measures, error handling, and backend services.
