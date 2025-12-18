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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Sora, sans-serif'; // Increased font size
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
}

/**
 * Draws the full diagram based on the calculated values.
 */
function drawDiagram(pointA, pointB, pointC, totalLength, lengthBC) {
    clearCanvas();
    
    // Define colors from the theme
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent');
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-text-primary');

    // Set up padding and scaling
    const padding = 30; // Increased padding
    const xA = padding;
    const xC = canvas.width - padding;
    const xB = xA + (totalLength - lengthBC) * (xC - xA) / totalLength;

    const allPoints = [pointA, pointB, pointC].filter(p => !isNaN(p));
    if (allPoints.length === 0) return; // Don't draw if no valid points

    const maxLevel = Math.max(...allPoints);
    const minLevel = Math.min(...allPoints);
    const totalVerticalChange = maxLevel - minLevel;
    const scaleY = (canvas.height - padding * 2) / (totalVerticalChange === 0 ? 1 : totalVerticalChange);

    // Calculate y-coordinates (inverted for canvas, lower levels have higher y values)
    const yA = canvas.height - padding - (pointA - minLevel) * scaleY;
    const yC = canvas.height - padding - (pointC - minLevel) * scaleY;
    const yB = canvas.height - padding - (pointB - minLevel) * scaleY;

    // --- Drawing lines ---
    ctx.lineWidth = 2;
    
    // Draw the sloped line A-C
    ctx.strokeStyle = textColor;
    ctx.beginPath();
    ctx.moveTo(xA, yA);
    ctx.lineTo(xC, yC);
    ctx.stroke();

    // Draw the vertical lines at A, B, and C
    ctx.setLineDash([5, 5]); // Dashed lines for vertical height
    ctx.strokeStyle = textColor;
    ctx.beginPath();
    ctx.moveTo(xA, yA);
    ctx.lineTo(xA, canvas.height - padding);
    ctx.moveTo(xB, yB);
    ctx.lineTo(xB, canvas.height - padding);
    ctx.moveTo(xC, yC);
    ctx.lineTo(xC, canvas.height - padding);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // --- Drawing labels ---
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';

    // Labels for points and levels (A, B, C)
    ctx.font = '16px Sora, sans-serif';
    ctx.fillText(`A`, xA, yA - 10);
    ctx.fillText(`${pointA.toFixed(0)}mm`, xA, yA + 20);
    
    ctx.fillText(`B`, xB, yB - 10);
    ctx.fillText(`${pointB.toFixed(3)}mm`, xB, yB + 20);
    
    ctx.fillText(`C`, xC, yC - 10);
    ctx.fillText(`${pointC.toFixed(0)}mm`, xC, yC + 20);

    // Dimension lines and labels for length
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // TOTAL LENGTH (red)
    ctx.strokeStyle = 'rgb(220, 53, 69)';
    ctx.moveTo(xA, padding);
    ctx.lineTo(xC, padding);
    ctx.stroke();
    ctx.fillStyle = 'rgb(220, 53, 69)';
    ctx.font = '14px Sora, sans-serif';
    ctx.fillText(`TOTAL LENGTH: ${totalLength.toFixed(0)}mm`, (xA + xC) / 2, padding - 10);
    
    // B-C (blue)
    ctx.strokeStyle = 'rgb(0, 122, 255)';
    ctx.moveTo(xB, padding + 20);
    ctx.lineTo(xC, padding + 20);
    ctx.stroke();
    ctx.fillStyle = 'rgb(0, 122, 255)';
    ctx.fillText(`B - C: ${lengthBC.toFixed(0)}mm`, (xB + xC) / 2, padding + 10);
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
function applyTheme(theme) {
    htmlElement.classList.remove('light', 'dark');
    htmlElement.classList.add(theme);
    localStorage.setItem('tcdRaingutterTheme', theme);

    // Update theme toggle icon visibility
    const moonIcons = document.querySelectorAll('.icon-moon');
    const sunIcons = document.querySelectorAll('.icon-sun');
    
    moonIcons.forEach(icon => {
        icon.style.display = theme === 'dark' ? 'none' : 'block';
    });
    
    sunIcons.forEach(icon => {
        icon.style.display = theme === 'dark' ? 'block' : 'none';
    });

    // Re-draw the canvas with the new theme colors if it's visible
    if (resultCard.style.display !== 'none' && !isNaN(parseFloat(pointAInput.value))) {
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
}

/**
 * Toggles between light and dark theme
 */
function toggleTheme() {
    const currentTheme = htmlElement.classList.contains('dark') ? 'dark' : 'light';
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme based on localStorage or system preference
    const preferredTheme = localStorage.getItem('tcdRaingutterTheme') || 
                         (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferredTheme);

    // Calculator button and input listeners
    calculateButton.addEventListener('click', calculateMissingLevel);
    pointAInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateMissingLevel(); });
    pointCInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateMissingLevel(); });
    totalLengthInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateMissingLevel(); });
    lengthBCInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') calculateMissingLevel(); });

    // Theme toggle listener
    themeToggleButtonDesktop.addEventListener('click', toggleTheme);

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
