// Get DOM elements
const htmlElement = document.documentElement;
const topAreaInput = document.getElementById('topArea');
const riseInput = document.getElementById('rise');
const runInput = document.getElementById('run');
const calculateButton = document.getElementById('calculateButton');
const resultCard = document.getElementById('result');
const actualAreaDisplay = document.getElementById('actualArea');
const displayTopArea = document.getElementById('displayTopArea');
const displaySlope = document.getElementById('displaySlope');
const displayAngle = document.getElementById('displayAngle');
const errorMessageDiv = document.getElementById('errorMessage');
const themeToggleButton = document.getElementById('themeToggleBtn');
const themeToggleButtonDesktop = document.getElementById('themeToggleBtnDesktop');

/**
 * Displays an error message to the user with a fade-in effect.
 * @param {string} message - The error message to display.
 */
function showErrorMessage(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
    setTimeout(() => errorMessageDiv.classList.add('opacity-100'), 10);
}

/**
 * Hides the error message with a fade-out effect.
 */
function hideErrorMessage() {
    errorMessageDiv.classList.remove('opacity-100');
    setTimeout(() => errorMessageDiv.style.display = 'none', 300);
}

/**
 * Calculates the actual roof area based on top-view area and slope ratio.
 */
function calculateArea() {
    hideErrorMessage();

    const topArea = parseFloat(topAreaInput.value);
    const rise = parseFloat(riseInput.value);
    const run = parseFloat(runInput.value);
    
    // Input validation
    if (isNaN(topArea)) {
        showErrorMessage("ERROR: Please enter a valid top-view area");
        hideResultCard();
        return;
    }
    if (isNaN(rise) || isNaN(run) || run === 0) {
        showErrorMessage("ERROR: Please enter valid slope ratio values (run cannot be zero)");
        hideResultCard();
        return;
    }
    
    // Calculate incline angle and actual area
    const slope = rise / run;
    const angleRad = Math.atan(slope);
    const angleDeg = angleRad * (180 / Math.PI);
    const actualArea = (topArea / Math.cos(angleRad)).toFixed(2);
    
    // Update display elements
    actualAreaDisplay.textContent = actualArea + ' m²';
    displayTopArea.textContent = topArea + ' m²';
    displaySlope.textContent = rise + ':' + run;
    displayAngle.textContent = angleDeg.toFixed(2) + '°';
    
    // Show result card with animation
    showResultCard();
}

/**
 * Shows the result card with animation
 */
function showResultCard() {
    resultCard.style.display = 'block';
    setTimeout(() => {
        resultCard.classList.remove('opacity-0', 'translate-y-5');
        resultCard.classList.add('opacity-100', 'translate-y-0');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 10);
}

/**
 * Hides the result card with animation
 */
function hideResultCard() {
    resultCard.classList.remove('opacity-100', 'translate-y-0');
    resultCard.classList.add('opacity-0', 'translate-y-5');
    setTimeout(() => resultCard.style.display = 'none', 300);
}

/**
 * Applies the specified theme (light or dark) to the HTML document.
 * Stores the preference in localStorage.
 * @param {string} theme - 'light' or 'dark'.
 */
// ponytail: use shared theme util
if (!window.PonytailTheme) {
    const _s = document.createElement('script');
    _s.src = '/tools/shared/theme.js';
    _s.defer = true;
    document.head.appendChild(_s);
}

// Listen for theme changes to re-draw when needed
window.addEventListener('themeChanged', (e) => {
    // Re-draw canvas when theme changes if visible
    if (resultCard && resultCard.style.display !== 'none' && !isNaN(parseFloat(pointAInput.value))) {
        const pointA = parseFloat(pointAInput.value);
        const pointC = parseFloat(pointCInput.value);
        const totalLength = parseFloat(totalLengthInput.value);
        const lengthBC = parseFloat(lengthBCInput.value);
        const lengthAB = totalLength - lengthBC;
        const totalChange = pointC - pointA;
        const proportion = lengthAB / totalLength;
        const changeAB = totalChange * proportion;
        const pointB = pointA + changeAB;
        drawDiagram(pointA, pointB, pointC, totalLength, lengthBC);
    }
});

/**
 * Toggles between light and dark theme
 */
// ponytail: toggle replaced by shared util

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme based on localStorage or system preference
    const preferredTheme = localStorage.getItem('tcdRaingutterTheme') || 
                         (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    (window.PonytailTheme || {}).applyTheme && (window.PonytailTheme.applyTheme(preferredTheme));

    // Calculator button and input listeners
    calculateButton.addEventListener('click', calculateArea);
    topAreaInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateArea(); });
    riseInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateArea(); });
    runInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateArea(); });

    // Theme toggle listeners
    themeToggleButton.addEventListener('click', () => { if (window.PonytailTheme) PonytailTheme.toggleTheme(); });
    themeToggleButtonDesktop.addEventListener('click', () => { if (window.PonytailTheme) PonytailTheme.toggleTheme(); });

    // Refresh button functionality
    document.getElementById('refreshBtn').addEventListener('click', function() {
        const icon = this.querySelector('i');
        icon.classList.add('animate-spin');
        setTimeout(() => {
            icon.classList.remove('animate-spin');
            window.location.reload();
        }, 500);
    });

    // Close window button with confirmation
    document.getElementById('closeWindowBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to close this window?')) {
            try {
                window.close();
                if (!window.closed) {
                    alert('This window cannot be closed programmatically. Please close it manually.');
                }
            } catch (error) {
                alert('An error occurred while trying to close the window: ' + error.message);
            }
        }
    });
});
