// Test script for width-dependent button movement
// Copy and paste this into the browser console when the application is running

// Test 1: Check if functions exist
console.log('=== Testing Function Existence ===');
console.log('calculateRectangleContentWidth:', typeof calculateRectangleContentWidth);
console.log('calculateButtonMovementPercentage:', typeof calculateButtonMovementPercentage);
console.log('updateButtonPositionBasedOnContent:', typeof updateButtonPositionBasedOnContent);

// Test 2: Test width calculation with no rectangles
console.log('\n=== Testing Width Calculation ===');
if (typeof calculateRectangleContentWidth === 'function') {
    const emptyWidth = calculateRectangleContentWidth();
    console.log('Empty 3D category width:', emptyWidth);
}

// Test 3: Test movement percentage calculation
if (typeof calculateButtonMovementPercentage === 'function') {
    const emptyPercentage = calculateButtonMovementPercentage();
    console.log('Empty movement percentage:', emptyPercentage);
}

// Test 4: Check button element
console.log('\n=== Testing Button Element ===');
const button = document.getElementById('saveResultsToggleBtn');
console.log('Button element found:', !!button);
console.log('Button current transform:', button ? button.style.transform : 'N/A');

// Test 5: Test container visibility
const container = document.getElementById('saveResultsContainer');
console.log('Save results container found:', !!container);
console.log('Container is hidden:', container ? container.classList.contains('hidden') : 'N/A');

console.log('\n=== Manual Testing Instructions ===');
console.log('1. Upload an image to the 3D category');
console.log('2. Click the save button to show save results container (with no rectangles)');
console.log('3. Observe button shakes UP AND DOWN at original position (no movement)');
console.log('4. Draw some rectangles in 3D category');
console.log('5. Button should stop shaking and move to left edge of container based on content');
console.log('6. Add more rectangles - button should move further left');
console.log('7. Hide container - button should return to original position');
console.log('8. Delete all rectangles and show container again - button should shake at original position');

// Test 6: Create test rectangles if 3D category exists
if (typeof appState !== 'undefined' && appState['3D']) {
    console.log('\n=== Creating Test Rectangles ===');
    // Add some test rectangles to see movement
    const testRects = [
        {x: 100, y: 100, width: 200, height: 50, color: 'blue', type: 'rect'},
        {x: 200, y: 200, width: 300, height: 75, color: 'red', type: 'rect'},
        {x: 300, y: 300, width: 150, height: 60, type: 'rect'}
    ];

    // Only add if there's no existing rectangles
    if (!appState['3D'].history || !appState['3D'].history[appState['3D'].historyIndex] || appState['3D'].history[appState['3D'].historyIndex].length === 0) {
        appState['3D'].history = [testRects];
        appState['3D'].historyIndex = 0;
        console.log('Added test rectangles');

        // Test width calculation with test rectangles
        const testWidth = calculateRectangleContentWidth();
        console.log('Test rectangles total width:', testWidth);

        const testPercentage = calculateButtonMovementPercentage();
        console.log('Test movement percentage:', testPercentage);
    } else {
        console.log('3D category already has rectangles, skipping test setup');
    }
} else {
    console.log('appState not available for testing');
}

// Test shake animation
console.log('\n=== Test 8: Shake Animation Testing ===');
const testButton = document.getElementById('saveResultsToggleBtn');
console.log('Button has shake-empty class:', testButton ? testButton.classList.contains('shake-empty') : 'N/A');

if (testButton && typeof updateButtonPositionBasedOnContent === 'function') {
    console.log('To test shake animation manually:');
    console.log('1. Clear all rectangles from 3D category');
    console.log('2. Show save results container');
    console.log('3. Button should shake UP AND DOWN at original position for 0.8 seconds');
    console.log('4. Button should NOT move horizontally when empty');
}