// Google Fit REST API Integration for RunTrack

import { getAccessToken } from './auth.js';

// Constants
const GOOGLE_FIT_API_BASE = 'https://www.googleapis.com/fitness/v1/users/me';
const APP_DATA_STREAM_ID = 'derived:com.google.distance.delta:runtrack-app';

// 1. syncToGoogleFit(runData) - Main sync function
export async function syncToGoogleFit(runData) {
    try {
        console.log('Starting Google Fit sync for run:', runData);
        
        // Get access token
        const accessToken = await getAccessToken();
        console.log('Access token obtained successfully');
        
        // Ensure data source exists
        await createDataSource(accessToken);
        console.log('Data source verified/created');
        
        // Convert run data to required format
        const startTimeMs = runData.startTimeMs || Date.now() - (runData.durationMs || 0);
        const endTimeMs = runData.endTimeMs || Date.now();
        const distanceMeters = runData.distanceMeters || (runData.distance * 1000); // Convert km to meters
        
        // Post session
        await postSession(accessToken, {
            startTimeMs,
            endTimeMs,
            durationMs: endTimeMs - startTimeMs
        });
        console.log('Session posted successfully');
        
        // Post distance data
        await postDistanceDataset(accessToken, distanceMeters, startTimeMs, endTimeMs);
        console.log('Distance data posted successfully');
        
        return { success: true };
        
    } catch (error) {
        console.error('Error syncing to Google Fit:', error);
        throw new Error(`Google Fit sync failed: ${error.message}`);
    }
}

// 2. createDataSource(accessToken) - Create data source if needed
async function createDataSource(accessToken) {
    try {
        const dataSourcePayload = {
            dataTypeName: 'com.google.distance.delta',
            type: 'derived',
            application: {
                name: 'RunTrack',
                version: '1.0',
                detailsUrl: 'https://example.com/runtrack'
            },
            dataStreamId: APP_DATA_STREAM_ID,
            device: {
                uid: 'runtrack_web',
                type: 'phone',
                manufacturer: 'RunTrack',
                model: 'Web App',
                version: '1.0'
            }
        };

        const response = await fetch(`${GOOGLE_FIT_API_BASE}/dataSources`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataSourcePayload)
        });

        if (response.status === 409) {
            // Data source already exists - this is expected
            console.log('Data source already exists');
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to create data source: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Data source created:', result.dataStreamId);
        
    } catch (error) {
        if (error.message.includes('409')) {
            // Ignore conflict errors - data source exists
            console.log('Data source already exists (409 conflict)');
            return;
        }
        throw error;
    }
}

// 3. postDistanceDataset(accessToken, distanceMeters, startMs, endMs) - Post distance data
async function postDistanceDataset(accessToken, distanceMeters, startMs, endMs) {
    try {
        const datasetPayload = {
            dataSourceId: APP_DATA_STREAM_ID,
            maxEndTimeNs: endMs * 1000000, // Convert to nanoseconds
            minStartTimeNs: startMs * 1000000, // Convert to nanoseconds
            point: [{
                dataTypeName: 'com.google.distance.delta',
                startTimeNanos: startMs * 1000000,
                endTimeNanos: endMs * 1000000,
                value: [{
                    fpVal: distanceMeters // Distance in meters
                }]
            }]
        };

        const response = await fetch(`${GOOGLE_FIT_API_BASE}/dataSources/${encodeURIComponent(APP_DATA_STREAM_ID)}/datasets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datasetPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to post distance dataset: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Distance dataset posted successfully:', result);
        
    } catch (error) {
        console.error('Error posting distance dataset:', error);
        throw error;
    }
}

// 4. postSession(accessToken, runData) - Post fitness session
async function postSession(accessToken, runData) {
    try {
        const sessionId = `runtrack_session_${runData.startTimeMs}_${Date.now()}`;
        
        const sessionPayload = {
            id: sessionId,
            name: 'RunTrack Run',
            description: 'Running session tracked with RunTrack',
            startTimeMillis: runData.startTimeMs,
            endTimeMillis: runData.endTimeMs,
            application: {
                name: 'RunTrack',
                version: '1.0'
            },
            activityType: 8, // Running (Google Fit activity type)
            activeTimeMillis: runData.durationMs,
            modifiedTimeMillis: Date.now()
        };

        const response = await fetch(`${GOOGLE_FIT_API_BASE}/sessions/${sessionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to post session: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Session posted successfully:', result.id);
        
    } catch (error) {
        console.error('Error posting session:', error);
        throw error;
    }
}

// Utility function to convert run data from app format to Google Fit format
export function convertRunDataForGoogleFit(run) {
    const startTime = new Date(run.date).getTime();
    const endTime = startTime + (run.duration * 1000); // duration is in seconds
    
    return {
        distanceMeters: Math.round(run.distance * 1000), // Convert km to meters
        durationMs: run.duration * 1000, // Convert seconds to milliseconds
        startTimeMs: startTime,
        endTimeMs: endTime
    };
}

// Main function to sync a run from the app
export async function syncRunToGoogleFit(run) {
    try {
        console.log('Converting run data for Google Fit:', run);
        
        const googleFitData = convertRunDataForGoogleFit(run);
        const result = await syncToGoogleFit(googleFitData);
        
        console.log('Run successfully synced to Google Fit');
        return result;
        
    } catch (error) {
        console.error('Failed to sync run to Google Fit:', error);
        throw error;
    }
}

// Check if Google Fit is available and authenticated
export async function isGoogleFitAvailable() {
    try {
        const token = await getAccessToken();
        return !!token;
    } catch (error) {
        console.warn('Google Fit not available:', error.message);
        return false;
    }
}

// Get recent sessions from Google Fit (optional function for future use)
export async function getRecentSessions(accessToken, limit = 10) {
    try {
        const response = await fetch(`${GOOGLE_FIT_API_BASE}/sessions?startTime=${Date.now() - 7 * 24 * 60 * 60 * 1000}&endTime=${Date.now()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get sessions: ${response.status}`);
        }
        
        const result = await response.json();
        return result.session || [];
        
    } catch (error) {
        console.error('Error getting recent sessions:', error);
        throw error;
    }
}

// Export the main sync function for use in app.js
export default {
    syncToGoogleFit,
    syncRunToGoogleFit,
    convertRunDataForGoogleFit,
    isGoogleFitAvailable,
    getRecentSessions
};
