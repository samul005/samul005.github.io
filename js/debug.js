console.log('Debug module loaded.');

// Debug helper
window.debugLog = function(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
};

// Error tracking
window.addEventListener('error', function(e) {
    console.error('[Error]', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
    });
});

// Click tracking for debugging
document.addEventListener('click', function(e) {
    const target = e.target;
    if (target.matches('.play-btn, .btn-difficulty')) {
        console.log('Button clicked:', {
            mode: target.closest('.mode-card')?.dataset.mode,
            difficulty: target.dataset.difficulty,
            class: target.className
        });
    }
});

// Add GameModeManager check
setInterval(() => {
    if (!window.gameModeManager) {
        console.warn('GameModeManager not found!');
    }
}, 1000);

// Test initialization
window.debugLog('Debug system initialized');