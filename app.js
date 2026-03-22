// RunTrack GPS App - Complete JavaScript Implementation

import { initGoogleAuth } from './auth.js';
import { syncToGoogleFit } from './googlefit.js';

class RunTrack {
    constructor() {
        // State variables
        this.running = false;
        this.elapsed = 0; // seconds
        this.timerInterval = null;
        this.watchId = null;
        this.lastPosition = null;
        this.totalDistance = 0; // km
        this.gpsPoints = 0;
        this.runs = [];
        this.simulationInterval = null;
        this.gpsAccuracy = null;
        this.isOnline = navigator.onLine;
        this.pendingSyncRuns = [];
        
        // DOM elements
        this.elements = {
            startStopBtn: document.getElementById('start-stop-btn'),
            saveSyncBtn: document.getElementById('save-sync-btn'),
            timerDisplay: document.getElementById('timer-display'),
            distanceValue: document.getElementById('distance-value'),
            paceValue: document.getElementById('pace-value'),
            speedValue: document.getElementById('speed-value'),
            gpsPointsValue: document.getElementById('gps-points-value'),
            gpsIndicator: document.getElementById('gps-indicator'),
            gpsStatusText: document.getElementById('gps-status-text'),
            runsList: document.getElementById('runs-list')
        };
        
        this.init();
    }
    
    init() {
        // Load saved runs from localStorage
        this.loadRuns();
        this.loadPendingSyncRuns();
        
        // Initialize Google Auth
        initGoogleAuth().catch(error => {
            console.warn('Failed to initialize Google Auth:', error);
        });
        
        // Create debug panel
        this.createDebugPanel();
        
        // Create toast container
        this.createToastContainer();
        
        // Set up event listeners
        this.elements.startStopBtn.addEventListener('click', () => this.toggleRun());
        this.elements.saveSyncBtn.addEventListener('click', () => this.saveRun());
        
        // Set up online/offline listeners
        window.addEventListener('online', () => this.handleOnlineChange(true));
        window.addEventListener('offline', () => this.handleOnlineChange(false));
        
        // Add test function to window
        window.testGoogleFit = this.testGoogleFit.bind(this);
        
        // Initial render
        this.renderHistory();
        this.updateGPSStatus('searching');
    }
    
    // 1. toggleRun() - starts or stops the run
    toggleRun() {
        if (this.running) {
            this.stopRun();
        } else {
            this.startRun();
        }
    }
    
    // 2. startRun() - resets stats, starts timer, starts GPS watch
    startRun() {
        this.running = true;
        this.elapsed = 0;
        this.totalDistance = 0;
        this.gpsPoints = 0;
        this.lastPosition = null;
        
        // Update UI
        this.elements.startStopBtn.textContent = 'STOP';
        this.elements.startStopBtn.classList.add('stop');
        this.elements.saveSyncBtn.disabled = true;
        
        // Start timer
        this.timerInterval = setInterval(() => this.updateTimer(), 100);
        
        // Start GPS
        this.startGPS();
        
        // Update status
        this.updateGPSStatus('connected');
    }
    
    // 3. stopRun() - clears timer interval, clears GPS watch, enables save button
    stopRun() {
        this.running = false;
        
        // Update UI
        this.elements.startStopBtn.textContent = 'START';
        this.elements.startStopBtn.classList.remove('stop');
        this.elements.saveSyncBtn.disabled = this.totalDistance < 0.1; // Enable if meaningful distance
        
        // Clear timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Stop GPS
        this.stopGPS();
        
        // Update status
        this.updateGPSStatus('disconnected');
    }
    
    // 4. startGPS() - calls navigator.geolocation.watchPosition with high accuracy
    startGPS() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported, using simulation');
            this.simulateGPS();
            return;
        }
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handleGPSUpdate(position),
            (error) => this.handleGPSError(error),
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
    
    // Handle GPS errors
    handleGPSError(error) {
        console.warn('GPS error:', error);
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                this.showToast('GPS permission denied. Using simulation mode.', 'warning');
                this.simulateGPS();
                break;
            case error.POSITION_UNAVAILABLE:
                this.showToast('GPS unavailable. Using simulation mode.', 'warning');
                this.simulateGPS();
                break;
            case error.TIMEOUT:
                this.showToast('GPS timeout. Using simulation mode.', 'warning');
                this.simulateGPS();
                break;
            default:
                this.showToast('GPS error. Using simulation mode.', 'warning');
                this.simulateGPS();
                break;
        }
        
        this.updateGPSStatus('error');
    }
    
    // 5. handleGPSUpdate(position) - calculates distance and updates stats
    handleGPSUpdate(position) {
        const { latitude, longitude, accuracy } = position.coords;
        const currentPosition = { lat: latitude, lng: longitude };
        
        // Update GPS accuracy
        this.gpsAccuracy = accuracy;
        this.updateDebugPanel();
        
        // Calculate distance from last position
        let distance = 0;
        if (this.lastPosition) {
            distance = this.haversine(
                this.lastPosition.lat,
                this.lastPosition.lng,
                currentPosition.lat,
                currentPosition.lng
            );
            
            // Only add distance if movement is significant (minimum 2 meters)
            if (distance >= 0.002) { // 0.002 km = 2 meters
                this.totalDistance += distance;
            }
        }
        
        this.lastPosition = currentPosition;
        this.gpsPoints++;
        
        // Calculate speed (km/h)
        const speed = this.elapsed > 0 ? (this.totalDistance / this.elapsed) * 3600 : 0;
        
        // Update UI
        this.updateStats(speed);
        this.updateGPSStatus('connected');
        this.updateDebugPanel();
    }
    
    // 6. haversine() - returns distance in km
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    // 7. stopGPS() - clears geolocation watch
    stopGPS() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
    }
    
    // 8. simulateGPS() - fallback if GPS unavailable
    simulateGPS() {
        this.updateGPSStatus('simulated');
        
        this.simulationInterval = setInterval(() => {
            if (!this.running) return;
            
            // Add random distance (0.005-0.015 km every 2 seconds)
            const distance = 0.01 + (Math.random() - 0.5) * 0.01;
            this.totalDistance += distance;
            this.gpsPoints++;
            
            // Calculate speed
            const speed = this.elapsed > 0 ? (this.totalDistance / this.elapsed) * 3600 : 0;
            
            // Update UI
            this.updateStats(speed);
        }, 2000);
    }
    
    // 9. updateTimer() - formats elapsed into HH:MM:SS and updates DOM
    updateTimer() {
        this.elapsed += 0.1; // Increment by 100ms
        
        const hours = Math.floor(this.elapsed / 3600);
        const minutes = Math.floor((this.elapsed % 3600) / 60);
        const seconds = Math.floor(this.elapsed % 60);
        
        const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.elements.timerDisplay.textContent = formatted;
    }
    
    // 10. updateStats(speed) - updates distance, pace, speed in DOM
    updateStats(speed) {
        // Distance
        this.elements.distanceValue.textContent = this.totalDistance.toFixed(2);
        
        // Pace (min/km)
        const pace = this.formatPace(this.totalDistance, this.elapsed);
        this.elements.paceValue.textContent = pace;
        
        // Speed (km/h)
        this.elements.speedValue.textContent = speed.toFixed(1);
        
        // GPS Points
        this.elements.gpsPointsValue.textContent = this.gpsPoints.toString();
    }
    
    // 11. saveRun() - saves run object to runs[], resets stats, syncs to Google Fit
    async saveRun() {
        if (this.totalDistance < 0.1) {
            this.showToast('Run too short to save (minimum 0.1 km)', 'error');
            return;
        }
        
        const run = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            duration: this.elapsed,
            distance: this.totalDistance,
            pace: this.formatPace(this.totalDistance, this.elapsed),
            speed: (this.totalDistance / this.elapsed) * 3600,
            gpsPoints: this.gpsPoints,
            synced: false
        };
        
        // Add to runs array
        this.runs.unshift(run);
        
        // Keep only last 20 runs
        if (this.runs.length > 20) {
            this.runs = this.runs.slice(0, 20);
        }
        
        // Save to localStorage
        this.saveRuns();
        
        // Handle sync based on online status
        if (!this.isOnline) {
            this.showToast('Will sync to Google Fit when online', 'info');
            this.pendingSyncRuns.push(run.id);
            this.savePendingSyncRuns();
        } else {
            // Try to sync to Google Fit
            await this.syncRunToGoogleFit(run);
        }
        
        // Reset stats
        this.resetStats();
        
        // Update UI
        this.renderHistory();
        this.elements.saveSyncBtn.disabled = true;
    }
    
    // Separate sync function for better error handling
    async syncRunToGoogleFit(run) {
        try {
            this.updateGPSStatus('syncing');
            this.elements.gpsStatusText.textContent = 'Syncing to Google Fit...';
            
            const runData = {
                distanceMeters: this.totalDistance * 1000,
                durationMs: this.elapsed * 1000,
                startTimeMs: Date.now() - (this.elapsed * 1000),
                endTimeMs: Date.now()
            };
            
            await syncToGoogleFit(runData);
            
            // Mark as synced
            run.synced = true;
            this.saveRuns();
            
            // Update status
            this.updateGPSStatus('connected');
            this.elements.gpsStatusText.textContent = 'Synced!';
            this.showToast('Run synced to Google Fit!', 'success');
            
            // Clear status after 3 seconds
            setTimeout(() => {
                if (!this.running) {
                    this.updateGPSStatus('disconnected');
                }
            }, 3000);
            
        } catch (error) {
            console.warn('Google Fit sync failed:', error);
            this.updateGPSStatus('error');
            this.elements.gpsStatusText.textContent = 'Sync Failed';
            
            // Handle specific errors
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                this.showToast('Please re-authenticate with Google', 'error');
                // Could trigger re-auth flow here
            } else if (error.message.includes('popup')) {
                this.showToast('Please allow popups for Google Fit sync', 'error');
            } else {
                this.showToast('Google Fit sync failed. Run saved locally.', 'warning');
            }
            
            // Add to pending sync for retry later
            this.pendingSyncRuns.push(run.id);
            this.savePendingSyncRuns();
            
            // Clear status after 3 seconds
            setTimeout(() => {
                if (!this.running) {
                    this.updateGPSStatus('disconnected');
                }
            }, 3000);
        }
    }
    
    // 12. renderHistory() - renders last 5 runs in history section
    renderHistory() {
        const recentRuns = this.runs.slice(0, 5);
        
        if (recentRuns.length === 0) {
            this.elements.runsList.innerHTML = '<div class="no-runs">No runs recorded yet</div>';
            return;
        }
        
        this.elements.runsList.innerHTML = recentRuns.map(run => {
            const date = new Date(run.date);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="run-item">
                    <div class="run-info">
                        <div class="run-date">${dateStr} at ${timeStr}</div>
                        <div class="run-stats">
                            ${run.distance.toFixed(2)} km • ${run.pace} min/km • ${Math.floor(run.duration / 60)} min
                        </div>
                    </div>
                    <div class="run-badge">
                        ${run.synced ? '<span class="synced-badge">Synced</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 13. formatPace() - returns "M:SS" pace string
    formatPace(distKm, elapsedSec) {
        if (distKm === 0 || elapsedSec === 0) return '--:--';
        
        const paceSeconds = elapsedSec / distKm;
        const minutes = Math.floor(paceSeconds / 60);
        const seconds = Math.floor(paceSeconds % 60);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Helper functions
    resetStats() {
        this.elapsed = 0;
        this.totalDistance = 0;
        this.gpsPoints = 0;
        this.lastPosition = null;
        
        // Reset UI
        this.elements.timerDisplay.textContent = '00:00:00';
        this.elements.distanceValue.textContent = '0.00';
        this.elements.paceValue.textContent = '--:--';
        this.elements.speedValue.textContent = '0.0';
        this.elements.gpsPointsValue.textContent = '0';
    }
    
    updateGPSStatus(status) {
        const dot = this.elements.gpsIndicator.querySelector('.gps-dot');
        
        switch (status) {
            case 'connected':
                dot.classList.remove('searching');
                if (this.gpsAccuracy) {
                    this.elements.gpsStatusText.textContent = `GPS Connected (${this.gpsAccuracy.toFixed(0)}m)`;
                } else {
                    this.elements.gpsStatusText.textContent = 'GPS Connected';
                }
                break;
            case 'searching':
                dot.classList.add('searching');
                this.elements.gpsStatusText.textContent = 'Searching GPS...';
                break;
            case 'error':
                dot.classList.add('searching');
                this.elements.gpsStatusText.textContent = 'GPS Error';
                break;
            case 'simulated':
                dot.classList.remove('searching');
                this.elements.gpsStatusText.textContent = 'GPS Simulated';
                break;
            case 'disconnected':
                dot.classList.add('searching');
                this.elements.gpsStatusText.textContent = 'GPS Off';
                break;
            case 'syncing':
                dot.classList.remove('searching');
                // Keep the text as set by the calling function
                break;
        }
    }
    
    // Storage functions
    loadRuns() {
        const saved = localStorage.getItem('runtrack_runs');
        if (saved) {
            this.runs = JSON.parse(saved);
        }
    }
    
    saveRuns() {
        localStorage.setItem('runtrack_runs', JSON.stringify(this.runs));
    }
    
    loadPendingSyncRuns() {
        const saved = localStorage.getItem('runtrack_pending_sync');
        if (saved) {
            this.pendingSyncRuns = JSON.parse(saved);
        }
    }
    
    savePendingSyncRuns() {
        localStorage.setItem('runtrack_pending_sync', JSON.stringify(this.pendingSyncRuns));
    }
    
    // Online/Offline handling
    handleOnlineChange(isOnline) {
        this.isOnline = isOnline;
        if (isOnline && this.pendingSyncRuns.length > 0) {
            this.syncPendingRuns();
        }
    }
    
    async syncPendingRuns() {
        const runIds = [...this.pendingSyncRuns];
        this.pendingSyncRuns = [];
        this.savePendingSyncRuns();
        
        for (const runId of runIds) {
            const run = this.runs.find(r => r.id === runId);
            if (run && !run.synced) {
                try {
                    await this.syncRunToGoogleFit(run);
                    this.showToast('Pending run synced to Google Fit', 'success');
                } catch (error) {
                    console.warn('Failed to sync pending run:', error);
                    this.pendingSyncRuns.push(runId);
                }
            }
        }
        this.savePendingSyncRuns();
    }
    
    // Test function for Chrome DevTools
    async testGoogleFit() {
        try {
            const fakeRun = { 
                distanceMeters: 5000, 
                durationMs: 1800000, 
                startTimeMs: Date.now() - 1800000, 
                endTimeMs: Date.now() 
            };
            await syncToGoogleFit(fakeRun);
            console.log('Test sync complete');
            this.showToast('Test sync to Google Fit completed!', 'success');
        } catch (error) {
            console.error('Test sync failed:', error);
            this.showToast('Test sync failed', 'error');
        }
    }
    
    // Toast notification system
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        const colors = {
            success: '#00C853',
            error: '#FF3B30',
            warning: '#FF9500',
            info: '#007AFF'
        };
        
        toast.style.cssText = `
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            max-width: 300px;
        `;
        
        toast.textContent = message;
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto dismiss after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    // Debug panel
    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9998;
            max-width: 300px;
            display: none;
        `;
        
        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">DEBUG PANEL</div>
            <div id="debug-coords">GPS: --</div>
            <div id="debug-accuracy">Accuracy: --</div>
            <div id="debug-distance">Last Distance: --</div>
            <div id="debug-status">API Status: --</div>
            <div style="margin-top: 10px; font-size: 10px; opacity: 0.7;">
                Press Ctrl+D to toggle
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Toggle with Ctrl+D
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    updateDebugPanel() {
        if (!document.getElementById('debug-panel')) return;
        
        const coords = this.lastPosition ? 
            `${this.lastPosition.lat.toFixed(6)}, ${this.lastPosition.lng.toFixed(6)}` : '--';
        const accuracy = this.gpsAccuracy ? `${this.gpsAccuracy.toFixed(1)}m` : '--';
        const lastDistance = this.lastPosition && this.totalDistance > 0 ? 
            `${(this.totalDistance * 1000).toFixed(1)}m` : '--';
        
        document.getElementById('debug-coords').textContent = `GPS: ${coords}`;
        document.getElementById('debug-accuracy').textContent = `Accuracy: ${accuracy}`;
        document.getElementById('debug-distance').textContent = `Last Distance: ${lastDistance}`;
        document.getElementById('debug-status').textContent = `API Status: ${this.isOnline ? 'Online' : 'Offline'}`;
    }
    
    // Google Fit integration (for googlefit.js to call)
    syncToGoogleFit(run) {
        if (window.googleFit && window.googleFit.isApiConnected()) {
            const activity = {
                type: 'Running',
                date: run.date,
                distance: run.distance,
                duration: run.duration,
                calories: Math.round(run.duration * 0.1 * run.distance), // Rough estimate
                notes: `RunTrack run - Pace: ${run.pace}`,
                source: 'runtrack'
            };
            
            window.googleFit.syncActivity(activity).then(() => {
                run.synced = true;
                this.saveRuns();
                this.renderHistory();
            }).catch(error => {
                console.warn('Failed to sync to Google Fit:', error);
            });
        }
    }
    
    // Export functions for googlefit.js
    exportRunForGoogleFit(runId) {
        const run = this.runs.find(r => r.id === runId);
        if (run) {
            return {
                type: 'Running',
                date: run.date,
                distance: run.distance,
                duration: run.duration,
                calories: Math.round(run.duration * 0.1 * run.distance),
                notes: `RunTrack run - Pace: ${run.pace}`,
                source: 'runtrack'
            };
        }
        return null;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.runtrack = new RunTrack();
});

// Export functions for googlefit.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        syncToGoogleFit: (run) => window.runtrack.syncToGoogleFit(run),
        exportRunForGoogleFit: (runId) => window.runtrack.exportRunForGoogleFit(runId)
    };
}
