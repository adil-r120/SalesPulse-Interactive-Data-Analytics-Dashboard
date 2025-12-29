/**
 * Google OAuth Configuration
 * 
 * To enable Google Sign-In with account picker:
 * 1. Get your Google Client ID from: https://console.cloud.google.com/
 * 2. Replace the empty string below with your Client ID
 * 3. Example: "123456789-abc123.apps.googleusercontent.com"
 */

export const GOOGLE_CLIENT_ID = "378268596238-dpdn5fau5973gsoqa1jci2pv09dsqj7i.apps.googleusercontent.com";

/**
 * If GOOGLE_CLIENT_ID is empty, the app will use simulated OAuth flow.
 * When you add a real Client ID, it will switch to proper Google Sign-In
 * with the account selection dialog.
 */
export const isGoogleOAuthEnabled = () => GOOGLE_CLIENT_ID.length > 0;
