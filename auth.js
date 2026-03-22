// Google OAuth 2.0 Authentication for RunTrack using Google Identity Services

// Configuration
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
const SCOPES = "https://www.googleapis.com/auth/fitness.activity.write";

// Module-level variables
let tokenClient = null;
let accessToken = null;
let tokenExpiry = null;

// 1. initGoogleAuth() - initializes the token client
function initGoogleAuth() {
    return new Promise((resolve, reject) => {
        // Load Google Identity Services library
        if (typeof google === 'undefined' || !google.accounts) {
            // Load the GIS library if not already loaded
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => {
                initializeTokenClient();
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
            document.head.appendChild(script);
        } else {
            initializeTokenClient();
            resolve();
        }
    });
}

function initializeTokenClient() {
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    // Set expiry time (tokens typically expire in 1 hour)
                    tokenExpiry = Date.now() + (tokenResponse.expires_in * 1000);
                    console.log('Google OAuth token obtained successfully');
                } else {
                    console.error('Failed to obtain Google OAuth token:', tokenResponse);
                    accessToken = null;
                    tokenExpiry = null;
                }
            },
            error_callback: (error) => {
                console.error('Google OAuth error:', error);
                accessToken = null;
                tokenExpiry = null;
            }
        });
    } catch (error) {
        console.error('Error initializing Google token client:', error);
        tokenClient = null;
    }
}

// 2. getAccessToken() - returns Promise with access token
function getAccessToken() {
    return new Promise((resolve, reject) => {
        // Check if we have a valid token
        if (isAuthenticated()) {
            resolve(accessToken);
            return;
        }

        // Check if token client is initialized
        if (!tokenClient) {
            reject(new Error('Google Auth not initialized. Call initGoogleAuth() first.'));
            return;
        }

        // Request new token
        try {
            tokenClient.requestAccessToken();
            
            // Wait for the token to be obtained (callback will set accessToken)
            const checkToken = setInterval(() => {
                if (accessToken) {
                    clearInterval(checkToken);
                    resolve(accessToken);
                } else if (Date.now() - tokenExpiry > 5000) { // Timeout after 5 seconds
                    clearInterval(checkToken);
                    reject(new Error('Timeout waiting for Google OAuth token'));
                }
            }, 100);
        } catch (error) {
            reject(error);
        }
    });
}

// 3. isAuthenticated() - returns true if we have a valid non-expired token
function isAuthenticated() {
    return accessToken && tokenExpiry && Date.now() < tokenExpiry;
}

// 4. signOut() - revokes the token
function signOut() {
    return new Promise((resolve, reject) => {
        if (!accessToken) {
            resolve(); // Nothing to sign out from
            return;
        }

        // Revoke the token
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            google.accounts.oauth2.revoke(accessToken, () => {
                console.log('Google OAuth token revoked successfully');
                clearToken();
                resolve();
            });
        } else {
            // Fallback: just clear the token
            clearToken();
            resolve();
        }
    });
}

function clearToken() {
    accessToken = null;
    tokenExpiry = null;
}

// Utility function to check if token is about to expire (within 5 minutes)
function isTokenExpiringSoon() {
    return tokenExpiry && (Date.now() > (tokenExpiry - 5 * 60 * 1000));
}

// Auto-refresh token if it's expiring soon
async function ensureValidToken() {
    if (!isAuthenticated() || isTokenExpiringSoon()) {
        try {
            await getAccessToken();
        } catch (error) {
            console.warn('Failed to refresh Google OAuth token:', error);
            throw error;
        }
    }
    return accessToken;
}

// Export functions for use in other modules
export {
    initGoogleAuth,
    getAccessToken,
    isAuthenticated,
    signOut,
    ensureValidToken,
    isTokenExpiringSoon
};

// For backward compatibility if needed
if (typeof window !== 'undefined') {
    window.googleAuth = {
        initGoogleAuth,
        getAccessToken,
        isAuthenticated,
        signOut,
        ensureValidToken,
        isTokenExpiringSoon
    };
}

// Also provide CommonJS export for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initGoogleAuth,
        getAccessToken,
        isAuthenticated,
        signOut,
        ensureValidToken,
        isTokenExpiringSoon
    };
}
