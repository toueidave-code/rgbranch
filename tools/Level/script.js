// Get DOM elements
const htmlElement = document.documentElement;
const pointAInput = document.getElementById('pointA');
const pointCInput = document.getElementById('pointC');
const totalLengthInput = document.getElementById('totalLength');
const lengthBCInput = document.getElementById('lengthBC');
const calculateButton = document.getElementById('calculateButton');
const resultCard = document.getElementById('resultCard');
const resultDisplay = document.getElementById('resultDisplay');
const formulaText = document.getElementById('formula');
const messageBox = document.getElementById('messageBox');
const themeToggleButtonDesktop = document.getElementById('themeToggleBtnDesktop');
const canvas = document.getElementById('diagramCanvas');
const ctx = canvas.getContext('2d');

// Function to show a message box (error or success)
function showMessageBox(message, type = 'error') {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    if (type === 'error') {
        messageBox.className = 'message-box bg-theme-error dark:bg-darkTheme-error text-white';
    } else {
        messageBox.className = 'message-box bg-theme-success dark:bg-darkTheme-success text-white';
    }
    setTimeout(() => {
        messageBox.classList.add('opacity-100');
    }, 10);
    setTimeout(() => {
        messageBox.classList.remove('opacity-100');
        setTimeout(() => messageBox.style.display = 'none', 300);
    }, 3000);
}

/**
 * Clears the canvas and resets drawing properties.
 */
function clearCanvas() {
    // Reset any transforms (important when canvas is DPI-scaled)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // Font will be set per-draw in CSS pixels
}

/**
 * Resize canvas to match CSS size and devicePixelRatio for crisp drawing.
 * ponytail: DPR scaling, good enough for diagrams; upgrade if needing zoom.
 */
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    // Use clientWidth/clientHeight for CSS pixel sizes
    const cssWidth = Math.max(300, canvas.clientWidth || 600);
    const cssHeight = Math.max(180, canvas.clientHeight || 300);
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    // Scale the coordinate system so drawing uses CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// redraw on resize to keep diagram consistent
window.addEventListener('resize', () => {
    resizeCanvas();
    // If a result is currently shown, recalc and redraw
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
 * Draws the full diagram based on the calculated values.
 */
function drawDiagram(pointA, pointB, pointC, totalLength, lengthBC) {
    clearCanvas();
    resizeCanvas();

    // Use CSS pixel dimensions for layout
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 300;

    // Define colors from the theme with sensible fallbacks
    const style = getComputedStyle(document.documentElement);
    const accentColor = style.getPropertyValue('--theme-accent') || '#0ea5a3';
    const textColor = style.getPropertyValue('--theme-text-primary') || '#111827';
    const danger = 'rgb(220, 53, 69)';
    const info = 'rgb(0, 122, 255)';

    // Layout
    const padding = 30;
    const xA = padding;
    const xC = width - padding;
    const lengthAB = Math.max(0, totalLength - lengthBC);
    const xB = xA + (lengthAB / (totalLength || 1)) * (xC - xA);

    const allPoints = [pointA, pointB, pointC].filter(p => !isNaN(p));
    if (allPoints.length === 0) return;

    const maxLevel = Math.max(...allPoints);
    const minLevel = Math.min(...allPoints);
    const totalVerticalChange = maxLevel - minLevel || 1;
    const scaleY = (height - padding * 2) / totalVerticalChange;

    // y-coordinates in CSS pixels
    const yA = height - padding - (pointA - minLevel) * scaleY;
    const yC = height - padding - (pointC - minLevel) * scaleY;
    const yB = height - padding - (pointB - minLevel) * scaleY;

    // helpers
    function drawArrow(x1, y1, x2, y2, color) {
        const headSize = 6;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    // draw sloped A-C
    ctx.lineWidth = 2;
    ctx.strokeStyle = accentColor || textColor;
    ctx.beginPath();
    ctx.moveTo(xA, yA);
    ctx.lineTo(xC, yC);
    ctx.stroke();

    // vertical dashed guides
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = textColor;
    ctx.beginPath();
    ctx.moveTo(xA, yA);
    ctx.lineTo(xA, height - padding + 6);
    ctx.moveTo(xB, yB);
    ctx.lineTo(xB, height - padding + 6);
    ctx.moveTo(xC, yC);
    ctx.lineTo(xC, height - padding + 6);
    ctx.stroke();
    ctx.setLineDash([]);

    // points
    ctx.fillStyle = accentColor || textColor;
    const pointRadius = 4;
    ctx.beginPath(); ctx.arc(xA, yA, pointRadius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(xB, yB, pointRadius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(xC, yC, pointRadius, 0, Math.PI * 2); ctx.fill();

    // labels
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.font = '14px Sora, sans-serif';
    ctx.fillText('A', xA, yA - 10);
    ctx.fillText(`${pointA.toFixed(0)} mm`, xA, yA + 20);
    ctx.fillText('B', xB, yB - 10);
    ctx.fillText(`${pointB.toFixed(3)} mm`, xB, yB + 20);
    ctx.fillText('C', xC, yC - 10);
    ctx.fillText(`${pointC.toFixed(0)} mm`, xC, yC + 20);

    // baseline and ticks
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding - 6, height - padding);
    ctx.lineTo(width - padding + 6, height - padding);
    ctx.stroke();

    // dimension arrows
    // total length
    drawArrow(xA, padding, xC, padding, danger);
    ctx.fillStyle = danger;
    ctx.font = '13px Sora, sans-serif';
    ctx.fillText(`TOTAL: ${totalLength.toFixed(0)} mm`, (xA + xC) / 2, padding - 8);

    // B-C
    drawArrow(xB, padding + 22, xC, padding + 22, info);
    ctx.fillStyle = info;
    ctx.fillText(`B-C: ${lengthBC.toFixed(0)} mm`, (xB + xC) / 2, padding + 38);
}

// Function to perform the calculation
function calculateMissingLevel() {
    // Parse input values as numbers
    const pointA = parseFloat(pointAInput.value);
    const pointC = parseFloat(pointCInput.value);
    const totalLength = parseFloat(totalLengthInput.value);
    const lengthBC = parseFloat(lengthBCInput.value);

    // Validate inputs
    if (isNaN(pointA) || isNaN(pointC) || isNaN(totalLength) || isNaN(lengthBC)) {
        showMessageBox('Please fill in all fields with valid numbers.', 'error');
        hideResultCard();
        return;
    }
    if (totalLength <= 0 || lengthBC <= 0) {
        showMessageBox('Total Length and Length from B to C must be positive values.', 'error');
        hideResultCard();
        return;
    }
    if (lengthBC > totalLength) {
        showMessageBox('Length from B to C cannot be greater than the Total Length.', 'error');
        hideResultCard();
        return;
    }

    // Calculate the length from Point A to Point B
    const lengthAB = totalLength - lengthBC;

    // Calculate the total rise/fall between Point A and Point C
    const totalChange = pointC - pointA;

    // Calculate the proportion of the total length that is A to B
    const proportion = lengthAB / totalLength;

    // Calculate the change in level from A to B
    const changeAB = totalChange * proportion;

    // Calculate the missing level at Point B
    const pointB = pointA + changeAB;

    // Display the result
    resultDisplay.textContent = `${pointB.toFixed(3)} mm`;
    formulaText.textContent = `Point B = Point A + ((Total Length - Length B-C) / Total Length) * (Point C - Point A)`;
    
    drawDiagram(pointA, pointB, pointC, totalLength, lengthBC);

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

window.addEventListener('themeChanged', (e) => {
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

    // Ensure canvas is sized correctly before any drawing
    try { resizeCanvas(); } catch (e) { /* ignore if resizeCanvas not yet defined */ }

    // Calculator button and input listeners
    calculateButton.addEventListener('click', calculateMissingLevel);
    pointAInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateMissingLevel(); });
    pointCInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateMissingLevel(); });
    totalLengthInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateMissingLevel(); });
    lengthBCInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateMissingLevel(); });

    // Theme toggle listener
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
