if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

(function() {
    // Constants
    const MAX_INTERACTIVE_CANVAS_WIDTH = 800;
    const MAX_INTERACTIVE_CANVAS_HEIGHT = 600;
    const COMPILED_ITEM_IMAGE_HEIGHT_STANDARD = 2000;
    const COMPILED_ITEM_IMAGE_HEIGHT_EXCEL = 250;
    const COMPILED_TITLE_AREA_HEIGHT = 80;
    const COMPILED_PADDING = 30;
    const COMPILED_FONT_SIZE = 35;
    const COMPILED_RECT_LINE_WIDTH = 4;
    const ROW_SPACING = 20;
    const CATEGORY_NAMES = ["3D", "2D", "SHINSEIZU", "EXCEL"];
    const DISPLAY_ORDER_COMPILED = ["3D", "2D", "SHINSEIZU", "EXCEL"];
    
    // DOM Elements
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    let hiddenFileInput;
    const clearButton = document.getElementById('clearButton');
    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');
    const placeholderText = document.getElementById('placeholderText');
    const imageCanvasContainer = document.getElementById('imageCanvasContainer');
    const categoryButtons = document.querySelectorAll('.category-button');
    const currentCategoryInfoSpan = document.getElementById('currentCategoryInfo');
    const finishButton = document.getElementById('finishButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsPlaceholder = document.getElementById('resultsPlaceholder');
    const themeToggleButton = document.getElementById('themeToggleBtn');
    const clockToggleButton = document.getElementById('clockToggleButton');
    const clockIcon = document.getElementById('clockIcon');
    const clockTimeText = document.getElementById('clockTimeText');
    const htmlElement = document.documentElement;
    const clearConfirmationModal = document.getElementById('clearConfirmationModal');
    const confirmClearButton = document.getElementById('confirmClearButton');
    const cancelClearButton = document.getElementById('cancelClearButton');
    const modalCategoryNameSpan = document.getElementById('modalCategoryName');
    const fitZoomButton = document.getElementById('fitZoomButton');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const saveForLaterButton = document.getElementById('saveForLaterButton');
    const saveStatusMessage = document.getElementById('saveStatusMessage');
    const saveResultsContainer = document.getElementById('saveResultsContainer');
    const saveResultsToggleBtn = document.getElementById('saveResultsToggleBtn');
    const saveCountBadge = document.getElementById('saveCountBadge');

    // Hamburger Menu Elements
    const hamburgerButton = document.getElementById('hamburgerButton');
    const sideMenu = document.getElementById('sideMenu');
    const closeMenuButton = document.getElementById('closeMenuButton');
    const menuOverlay = document.getElementById('menuOverlay');

    // App State
    let appState = {};
    CATEGORY_NAMES.forEach(cat => {
        appState[cat] = { img: null, history: [[]], historyIndex: 0, loadedDot: null, zoom: 1, panX: 0, panY: 0 };
    });
    let currentCategory = "EXCEL";
    let isDrawing = false;
    let isPotentialClick = false;
    let startX, startY, currentX, currentY;
    let drawInitiatingButton = 0;
    const CLICK_DRAG_THRESHOLD = 5;
    const AUTO_SQUARE_SIZE_CANVAS = 30;
    let currentImageDisplayInfo = { drawX: 0, drawY: 0, drawWidth: 0, drawHeight: 0, scale: 0 };
    let currentPdfExtractedInfo = "";
    let clockIntervalId = null;
    let isClockActive = false;
    let isPanning = false;
    let lastPanX, lastPanY;

    // Save System Global Variables
    let saveResults = []; // Array to track multiple save results

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function dataURLtoBlob(dataurl) {
        if (!dataurl || !dataurl.startsWith('data:image')) { throw new Error("Invalid Data URL provided for blob conversion."); }
        const parts = dataurl.split(','); if (parts.length < 2) { throw new Error("Malformed Data URL."); }
        const mimeMatch = parts[0].match(/:(.*?);/); const mime = mimeMatch && mimeMatch[1] ? mimeMatch[1] : 'image/png';
        let bstr; try { bstr = atob(parts[1]); } catch (e) { throw new Error("Failed to decode base64 string."); }
        let n = bstr.length; const u8arr = new Uint8Array(n); while (n--) { u8arr[n] = bstr.charCodeAt(n); } return new Blob([u8arr], { type: mime });
    }

    function setButtonFeedback(button, message, isSuccess, duration = 2000, originalContentHTML) {
        const oldContent = originalContentHTML || button.innerHTML;
        button.innerHTML = message;
        const originalClasses = Array.from(button.classList);
        button.className = '';
        originalClasses.forEach(c => {
            if(!c.startsWith('bg-') && !c.startsWith('hover:bg-') && !c.startsWith('text-')) {
                button.classList.add(c);
            }
        });

        if (isSuccess === true) {
            button.classList.add('bg-green-500', 'text-white');
        } else if (isSuccess === false) {
            button.classList.add('bg-red-500', 'text-white');
        }
        button.disabled = true;
        setTimeout(() => {
            button.innerHTML = oldContent;
            button.className = originalClasses.join(' ');
            button.disabled = false;
        }, duration);
    }

    function setActiveCategoryButtonUI() {
        categoryButtons.forEach(b => {
            const categoryName = b.dataset.category;
            const isActive = categoryName === currentCategory;

            b.classList.toggle('text-theme-text-primary', isActive);
            b.classList.toggle('dark:text-darkTheme-text-primary', isActive);
            b.classList.toggle('font-bold', isActive);

            b.classList.toggle('text-theme-text-muted', !isActive);
            b.classList.toggle('dark:text-darkTheme-text-muted', !isActive);
            b.classList.toggle('font-normal', !isActive);

            let dot = b.querySelector('.loaded-dot');
            if (appState[categoryName] && appState[categoryName].img) {
                if (!dot) {
                    dot = document.createElement('span');
                    dot.className = 'loaded-dot';
                    dot.title = "Image loaded";
                    b.appendChild(dot);
                }
            } else {
                if (dot) dot.remove();
            }
        });

        if(currentCategoryInfoSpan) currentCategoryInfoSpan.textContent = currentCategory;
        if(placeholderText && (!appState[currentCategory] || !appState[currentCategory].img)) {
            if (currentCategory === "SHINSEIZU") {
                 placeholderText.innerHTML = `<i class="bi bi-cloud-arrow-up text-4xl md:text-5xl mb-3"></i><span class="font-semibold text-base">Paste or Drop file for SHINSEIZU</span><span class="text-sm">(Click to upload disabled)</span>`;
            } else {
                placeholderText.innerHTML = `<i class="bi bi-cloud-arrow-up text-4xl md:text-5xl mb-3"></i><span class="font-semibold text-base">Drop a PDF or Image file</span><span class="text-sm">or click here to browse</span>`;
            }
        }
        updateUndoRedoButtonStates();
        updateFinishButtonState();
    }

    function showPlaceholderStateUI() {
        canvas.width = 1; canvas.height = 1; // Clear canvas
        if(placeholderText) placeholderText.style.display = 'flex';

        if(imageCanvasContainer) {
            if (currentCategory === "SHINSEIZU") {
                imageCanvasContainer.style.cursor = 'default';
                imageCanvasContainer.title = 'Paste or drop PDF for SHINSEIZU. Click to upload is disabled.';
            } else {
                imageCanvasContainer.style.cursor = 'pointer';
                imageCanvasContainer.title = 'Click to upload, paste, or drop an image/PDF';
            }
        }
        updateUndoRedoButtonStates();
        updateFinishButtonState();
    }

    // ========================================================================
    // SAVE SYSTEM FUNCTIONS
    // ========================================================================

    // Main Save Function
    function saveWorkState() {
        try {
            // Check if there's any content to save
            const hasContent = CATEGORY_NAMES.some(cat => appState[cat] && appState[cat].img) || currentPdfExtractedInfo;
            if (!hasContent) {
                showSaveStatusMessage('No content to save.', 'error');
                return;
            }

            const saveData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                currentCategory: currentCategory,
                pdfExtractedInfo: currentPdfExtractedInfo,
                categories: {}
            };

            // Generate content hash for duplicate detection
            const contentHash = generateContentHash();

            // Save state for each category
            CATEGORY_NAMES.forEach(cat => {
                const categoryState = appState[cat];
                if (categoryState && categoryState.img) {
                    // Convert image to base64
                    const canvas = document.createElement('canvas');
                    canvas.width = categoryState.img.naturalWidth;
                    canvas.height = categoryState.img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(categoryState.img, 0, 0);
                    const imageDataUrl = canvas.toDataURL('image/png');

                    saveData.categories[cat] = {
                        imageDataUrl: imageDataUrl,
                        history: categoryState.history,
                        historyIndex: categoryState.historyIndex,
                        zoom: categoryState.zoom,
                        panX: categoryState.panX,
                        panY: categoryState.panY
                    };
                } else {
                    saveData.categories[cat] = {
                        imageDataUrl: null,
                        history: [[]],
                        historyIndex: 0,
                        zoom: 1,
                        panX: 0,
                        panY: 0
                    };
                }
            });

            // Check if this content already exists
            const existingSave = findSaveByContentHash(contentHash);
            if (existingSave) {
                // Replace existing save
                updateSaveResult(existingSave.id, saveData);
                showSaveStatusMessage('Existing save updated!', 'success');
            } else {
                // Add new save
                addSaveResult(saveData, contentHash);
                showSaveStatusMessage('Work saved successfully!', 'success');
            }

            // Show the results container
            showSaveResultsContainer();

        } catch (error) {
            console.error('Error saving work state:', error);
            showSaveStatusMessage('Failed to save work. Please try again.', 'error');
        }
    }

    // Generate content hash for duplicate detection
    function generateContentHash() {
        let hashContent = '';

        // Include PDF info
        if (currentPdfExtractedInfo) {
            hashContent += currentPdfExtractedInfo;
        }

        // Include 3D rectangle counts and colors
        if (appState['3D'] && appState['3D'].history && appState['3D'].history[appState['3D'].historyIndex]) {
            const rects = appState['3D'].history[appState['3D'].historyIndex];
            rects.forEach(rect => {
                hashContent += rect.color + rect.x + rect.y + rect.width + rect.height;
            });
        }

        // Include Excel data if exists
        if (appState['EXCEL'] && appState['EXCEL'].excelData) {
            hashContent += JSON.stringify(appState['EXCEL'].excelData);
        }

        // Create simple hash
        let hash = 0;
        for (let i = 0; i < hashContent.length; i++) {
            const char = hashContent.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    // Find existing save by content hash
    function findSaveByContentHash(contentHash) {
        return saveResults.find(save => save.contentHash === contentHash);
    }

    // Add new save result
    function addSaveResult(saveData, contentHash) {
        const saveId = 'save_' + Date.now();
        const saveResult = {
            id: saveId,
            data: saveData,
            contentHash: contentHash,
            timestamp: saveData.timestamp
        };

        saveResults.push(saveResult);

        // Create and add the UI box
        createSaveResultBox(saveResult);

        // Update save count badge
        updateSaveCountBadge();
    }

    // Update existing save result
    function updateSaveResult(saveId, saveData) {
        const saveIndex = saveResults.findIndex(save => save.id === saveId);
        if (saveIndex !== -1) {
            saveResults[saveIndex].data = saveData;
            saveResults[saveIndex].timestamp = saveData.timestamp;

            // Update the UI box
            updateSaveResultBox(saveId, saveData);
        }
    }

    // Create save result box UI
    async function createSaveResultBox(saveResult) {
        const savedInfo = formatSavedInformation(saveResult.data);
        const compiledImageData = await generateCompiledPreview(saveResult.data);

        const boxId = saveResult.id;
        const box = document.createElement('div');
        box.id = boxId;
        box.className = 'save-result-box bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl p-4 opacity-0 scale-95 transition-all duration-200';

        const timeString = new Date(saveResult.timestamp).toLocaleString();

        box.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${timeString}</span>
                <button class="close-save-btn text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <i class="bi bi-x-lg text-xs"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="save-info-box bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200" title="Click to copy saved information">
                    <h5 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                        <i class="bi bi-info-circle-fill mr-1 text-blue-500"></i>
                        Information
                    </h5>
                    <div class="save-info-content text-xs text-gray-600 dark:text-gray-400 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">${savedInfo}</div>
                </div>
                <div class="save-image-box bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200" title="Click to copy compiled image">
                    <h5 class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                        <i class="bi bi-image-fill mr-1 text-green-500"></i>
                        Image
                    </h5>
                    <div class="save-image-content border border-gray-200 dark:border-gray-600 rounded overflow-hidden bg-white max-h-32 flex items-center justify-center">
                        ${compiledImageData ? `<img src="${compiledImageData}" alt="Compiled preview" class="w-full h-auto object-contain">` :
                          `<div class="text-center text-gray-400 dark:text-gray-500 p-2"><i class="bi bi-image text-lg"></i><p class="text-xs mt-1">No image</p></div>`}
                    </div>
                </div>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">Click boxes to copy</div>
        `;

        // Add event listeners
        const closeBtn = box.querySelector('.close-save-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeSaveResult(boxId);
        });

        const infoBox = box.querySelector('.save-info-box');
        infoBox.addEventListener('click', async () => {
            try {
                if (savedInfo) {
                    await navigator.clipboard.writeText(savedInfo);

                    // Visual feedback
                    infoBox.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                    infoBox.style.borderColor = 'rgb(59, 130, 246)';

                    setTimeout(() => {
                        infoBox.style.backgroundColor = '';
                        infoBox.style.borderColor = '';
                    }, 1000);

                    showSaveStatusMessage('Information copied to clipboard!', 'success');
                } else {
                    showSaveStatusMessage('No information to copy.', 'error');
                }
            } catch (err) {
                console.error('Failed to copy info:', err);
                showSaveStatusMessage('Failed to copy information.', 'error');
            }
        });

        const imageBox = box.querySelector('.save-image-box');
        imageBox.addEventListener('click', async () => {
            try {
                if (compiledImageData) {
                    const blob = dataURLtoBlob(compiledImageData);
                    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);

                    // Visual feedback
                    imageBox.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
                    imageBox.style.borderColor = 'rgb(34, 197, 94)';

                    setTimeout(() => {
                        imageBox.style.backgroundColor = '';
                        imageBox.style.borderColor = '';
                    }, 1000);

                    showSaveStatusMessage('Image copied to clipboard!', 'success');
                } else {
                    showSaveStatusMessage('No image to copy.', 'error');
                }
            } catch (err) {
                console.error('Failed to copy image from save box:', err);
                showSaveStatusMessage('Failed to copy image.', 'error');
            }
        });

        // Store data on the box for updating
        box.saveData = saveResult.data;
        box.compiledImageData = compiledImageData;

        saveResultsContainer.appendChild(box);

        // Animate in
        setTimeout(() => {
            box.classList.remove('opacity-0', 'scale-95');
            box.classList.add('opacity-100', 'scale-100');
        }, 100);
    }

    // Update save result box UI
    async function updateSaveResultBox(boxId, saveData) {
        const box = document.getElementById(boxId);
        if (box) {
            const savedInfo = formatSavedInformation(saveData);
            const compiledImageData = await generateCompiledPreview(saveData);

            // Update info content
            const infoContent = box.querySelector('.save-info-content');
            if (infoContent) {
                infoContent.textContent = savedInfo;
            }

            // Update image content
            const imageContent = box.querySelector('.save-image-content');
            if (imageContent) {
                imageContent.innerHTML = compiledImageData ?
                    `<img src="${compiledImageData}" alt="Compiled preview" class="w-full h-auto object-contain">` :
                    `<div class="text-center text-gray-400 dark:text-gray-500 p-2"><i class="bi bi-image text-lg"></i><p class="text-xs mt-1">No image</p></div>`;
            }

            // Update timestamp
            const timeString = new Date(saveData.timestamp).toLocaleString();
            const timestampLabel = box.querySelector('.text-sm.font-semibold');
            if (timestampLabel) {
                timestampLabel.textContent = timeString;
            }

            // Update stored data
            box.saveData = saveData;
            box.compiledImageData = compiledImageData;

            // Flash animation to indicate update
            box.style.borderColor = 'rgb(59, 130, 246)';
            setTimeout(() => {
                box.style.borderColor = '';
            }, 1000);
        }
    }

    // Remove save result
    function removeSaveResult(boxId) {
        const box = document.getElementById(boxId);
        if (box) {
            // Animate out
            box.classList.remove('opacity-100', 'scale-100');
            box.classList.add('opacity-0', 'scale-95');

            setTimeout(() => {
                box.remove();

                // Remove from save results array
                saveResults = saveResults.filter(save => save.id !== boxId);

                // Update save count badge
                updateSaveCountBadge();

                // Hide container if no more saves
                if (saveResults.length === 0) {
                    hideSaveResultsContainer();
                }
            }, 200);
        }
    }

    // Toggle button functions
    function toggleSaveResultsContainer() {
        if (saveResultsContainer) {
            if (saveResultsContainer.classList.contains('hidden')) {
                showSaveResultsContainer();
            } else {
                hideSaveResultsContainer();
            }
        }
    }

    function showSaveResultsContainer() {
        if (saveResultsContainer && saveResultsToggleBtn) {
            saveResultsContainer.classList.remove('hidden');

            // Move toggle button to the left side of the container
            saveResultsToggleBtn.classList.add('showing-container');
            saveResultsToggleBtn.style.borderRadius = '0.5rem 0 0 0.5rem';
            saveResultsToggleBtn.classList.add('rounded-r-0');

            // Update button icon and title
            const icon = saveResultsToggleBtn.querySelector('i');
            if (icon) {
                icon.className = 'bi bi-x-lg text-lg';
            }
            saveResultsToggleBtn.title = 'Hide saved results';
        }
    }

    function hideSaveResultsContainer() {
        if (saveResultsContainer && saveResultsToggleBtn) {
            saveResultsContainer.classList.add('hidden');

            // Reset toggle button to its original position
            saveResultsToggleBtn.classList.remove('showing-container');
            saveResultsToggleBtn.style.borderRadius = '';
            saveResultsToggleBtn.classList.remove('rounded-r-0');

            // Update button icon and title
            const icon = saveResultsToggleBtn.querySelector('i');
            if (icon) {
                icon.className = 'bi bi-saved-fill text-lg';
            }
            saveResultsToggleBtn.title = 'Show saved results';
        }
    }

    function updateSaveCountBadge() {
        if (saveCountBadge && saveResultsToggleBtn) {
            const count = saveResults.length;
            if (count > 0) {
                saveCountBadge.textContent = count > 99 ? '99+' : count.toString();
                saveCountBadge.classList.remove('hidden');
            } else {
                saveCountBadge.classList.add('hidden');
            }
        }
    }

    // Utility Functions
    function showSaveStatusMessage(message, type) {
        if (!saveStatusMessage) return;

        saveStatusMessage.textContent = message;
        saveStatusMessage.classList.remove('hidden', 'text-green-600', 'text-red-600', 'text-yellow-600',
                                       'dark:text-green-400', 'dark:text-red-400', 'dark:text-yellow-400');
        saveStatusMessage.classList.add('text-theme-text-muted', 'dark:text-darkTheme-text-muted');

        switch (type) {
            case 'success':
                saveStatusMessage.classList.remove('text-theme-text-muted', 'dark:text-darkTheme-text-muted');
                saveStatusMessage.classList.add('text-green-600', 'dark:text-green-400');
                break;
            case 'error':
                saveStatusMessage.classList.remove('text-theme-text-muted', 'dark:text-darkTheme-text-muted');
                saveStatusMessage.classList.add('text-red-600', 'dark:text-red-400');
                break;
            case 'warning':
                saveStatusMessage.classList.remove('text-theme-text-muted', 'dark:text-darkTheme-text-muted');
                saveStatusMessage.classList.add('text-yellow-600', 'dark:text-yellow-400');
                break;
        }

        // Auto-hide after 3 seconds
        setTimeout(() => {
            saveStatusMessage.classList.add('hidden');
        }, 3000);
    }

    function formatSavedInformation(saveData) {
        let combinedInfoText = "";

        // Start with PDF extracted info if exists (matches the actual combinedInfoText logic)
        if (saveData.pdfExtractedInfo) {
            combinedInfoText += saveData.pdfExtractedInfo.trim();
        }

        // Calculate drain counts from 3D category (matching the actual combinedInfoText logic)
        const category3D = saveData.categories['3D'];
        let rectangles3D = [];
        if (category3D && category3D.history && category3D.historyIndex < category3D.history.length) {
            rectangles3D = category3D.history[category3D.historyIndex] || [];
        }
        let sideDrainCount = 0, verticalDrainCount = 0;
        rectangles3D.forEach(rect => {
            if (rect.color === "blue") sideDrainCount++;
            else if (rect.color === "red") verticalDrainCount++;
        });
        const drainTexts = [];
        if (sideDrainCount > 0) drainTexts.push(`${sideDrainCount} side drain`);
        if (verticalDrainCount > 0) drainTexts.push(`${verticalDrainCount} vertical drain`);

        // Add drain counts with newline separator if we have any
        if (drainTexts.length > 0) {
            if (combinedInfoText) combinedInfoText += "\n";
            combinedInfoText += drainTexts.join('\n');
        }

        return combinedInfoText;
    }

    function generateCompiledPreview(saveData) {
        return new Promise((resolve) => {
            try {
                // Use similar logic to handleFinishCompilation but for saved data
                const compiledTopRowOrder = ["3D", "2D", "SHINSEIZU"];
                const compiledExcelCategory = "EXCEL";
                let allPreparedItemsMap = {};
                let hasAnyImageForLayout = false;

                // Recreate images from saved data
                const savedImages = {};
                CATEGORY_NAMES.forEach(categoryName => {
                    const categoryData = saveData.categories[categoryName];
                    if (categoryData && categoryData.imageDataUrl) {
                        const img = new Image();
                        img.src = categoryData.imageDataUrl;
                        savedImages[categoryName] = {
                            img: img,
                            history: categoryData.history || [[]]
                        };
                        hasAnyImageForLayout = true;
                    }
                });

                // Check if there are any images to load, if not proceed directly
                const imageCategories = Object.keys(savedImages);
                if (imageCategories.length === 0) {
                    resolve(null);
                    return;
                }

                // Wait for all images to load
                let loadedCount = 0;
                const checkAllLoaded = () => {
                    if (loadedCount === imageCategories.length) {
                        compileFinalImage();
                    }
                };

                imageCategories.forEach(categoryName => {
                    const img = savedImages[categoryName].img;
                    if (img.complete) {
                        loadedCount++;
                        checkAllLoaded();
                    } else {
                        img.onload = () => {
                            loadedCount++;
                            checkAllLoaded();
                        };
                        img.onerror = () => {
                            console.warn(`Failed to load image for category: ${categoryName}`);
                            loadedCount++;
                            checkAllLoaded();
                        };
                    }
                });

                function compileFinalImage() {
                    try {
                        // Create item canvases (similar to createItemCanvasForCompilation)
                        Object.keys(savedImages).forEach(categoryName => {
                            const originalImage = savedImages[categoryName].img;
                            const categoryData = saveData.categories[categoryName];
                            const rectangles = categoryData && categoryData.history && categoryData.historyIndex < categoryData.history.length
                                ? categoryData.history[categoryData.historyIndex] || []
                                : [];
                            allPreparedItemsMap[categoryName] = createItemCanvasForCompilation(
                                categoryName,
                                originalImage,
                                rectangles
                            );
                        });

                        if (!hasAnyImageForLayout && !saveData.pdfExtractedInfo) {
                            resolve(null);
                            return;
                        }

                        let finalImageDataUrl = "";
                        let finalCanvasWidthForDisplay = 100;
                        let finalCanvasHeightForDisplay = 100;

                        if (hasAnyImageForLayout) {
                            let topRowItemsToDraw = [];
                            let totalTopRowWidth = 0;
                            let actualTopRowHeight = 0;
                            compiledTopRowOrder.forEach(catName => {
                                const itemData = allPreparedItemsMap[catName];
                                if(itemData && itemData.canvas){
                                    topRowItemsToDraw.push(itemData);
                                    totalTopRowWidth += itemData.width;
                                    actualTopRowHeight = Math.max(actualTopRowHeight, itemData.height);
                                }
                            });
                            let excelItemToDraw = allPreparedItemsMap[compiledExcelCategory];
                            let excelCanvasWidth = excelItemToDraw && excelItemToDraw.canvas ? excelItemToDraw.width : 0;
                            let excelCanvasHeight = excelItemToDraw && excelItemToDraw.canvas ? excelItemToDraw.height : 0;

                            finalCanvasWidthForDisplay = Math.max(totalTopRowWidth, excelCanvasWidth, 1);
                            let tempFinalCanvasHeight = 0;
                            if (topRowItemsToDraw.length > 0) {
                                tempFinalCanvasHeight = actualTopRowHeight;
                            }
                            if (excelItemToDraw && excelItemToDraw.canvas) {
                                if (topRowItemsToDraw.length > 0) {
                                    tempFinalCanvasHeight += ROW_SPACING;
                                }
                                tempFinalCanvasHeight += excelCanvasHeight;
                            }
                            finalCanvasHeightForDisplay = Math.max(tempFinalCanvasHeight, 1);

                            const finalCanvas = document.createElement('canvas');
                            finalCanvas.width = finalCanvasWidthForDisplay;
                            finalCanvas.height = finalCanvasHeightForDisplay;
                            const finalCtx = finalCanvas.getContext('2d');
                            finalCtx.fillStyle = '#FFF';
                            finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

                            if (topRowItemsToDraw.length > 0) {
                                let currentXOffsetForTopRow = (finalCanvas.width - totalTopRowWidth) / 2;
                                topRowItemsToDraw.forEach(item => {
                                    const yOffset = (actualTopRowHeight - item.height) / 2;
                                    finalCtx.drawImage(item.canvas, currentXOffsetForTopRow, yOffset);
                                    currentXOffsetForTopRow += item.width;
                                });
                            }
                            if (excelItemToDraw && excelItemToDraw.canvas) {
                                let excelStartX = (finalCanvas.width - excelItemToDraw.width) / 2;
                                let excelStartY = 0;
                                if (topRowItemsToDraw.length > 0) {
                                    excelStartY = actualTopRowHeight + ROW_SPACING;
                                }
                                finalCtx.drawImage(excelItemToDraw.canvas, excelStartX, excelStartY);
                            }

                            finalImageDataUrl = finalCanvas.toDataURL('image/png');
                        }

                        resolve(finalImageDataUrl);
                    } catch (error) {
                        console.error('Error in compileFinalImage:', error);
                        resolve(null);
                    }
                }
            } catch (error) {
                console.error('Error generating compiled preview:', error);
                resolve(null);
            }
        });
    }

    function drawInteractiveCanvas() {
        if (!canvas || !ctx) return;
        const isDarkMode = htmlElement.classList.contains('dark');
        const canvasBgColor = isDarkMode ? 'rgb(20, 20, 20)' : 'rgb(247, 247, 247)';

        const categoryState = appState[currentCategory];
        if (!categoryState || !categoryState.img) {
            showPlaceholderStateUI();
            return;
        }
        if(imageCanvasContainer) {
            imageCanvasContainer.style.cursor = 'crosshair';
            if (currentCategory === "SHINSEIZU") {
                imageCanvasContainer.title = 'Draw on the SHINSEIZU image. Left-click for Red, Right-click for Blue. (Upload via click disabled for this category)';
            } else {
                imageCanvasContainer.title = 'Draw on the image. Left-click for Red, Right-click for Blue.';
            }
        }
        if(placeholderText) placeholderText.style.display = 'none';

        const currentImage = categoryState.img;
        if (!currentImage.naturalWidth || !currentImage.naturalHeight) {
            showPlaceholderStateUI();
            return;
        }

        const containerWidth = imageCanvasContainer.clientWidth;
        const containerHeight = imageCanvasContainer.clientHeight;

        canvas.width = containerWidth;
        canvas.height = containerHeight;
        ctx.fillStyle = canvasBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const initialScale = Math.min(
            containerWidth / currentImage.naturalWidth,
            containerHeight / currentImage.naturalHeight
        );

        const currentZoom = categoryState.zoom;
        const currentPanX = categoryState.panX;
        const currentPanY = categoryState.panY;

        const scaledImageWidth = currentImage.naturalWidth * initialScale * currentZoom;
        const scaledImageHeight = currentImage.naturalHeight * initialScale * currentZoom;

        currentImageDisplayInfo.drawX = (canvas.width - scaledImageWidth) / 2 + currentPanX;
        currentImageDisplayInfo.drawY = (canvas.height - scaledImageHeight) / 2 + currentPanY;
        currentImageDisplayInfo.drawWidth = scaledImageWidth;
        currentImageDisplayInfo.drawHeight = scaledImageHeight;
        currentImageDisplayInfo.scale = initialScale * currentZoom;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(
            currentImage,
            currentImageDisplayInfo.drawX,
            currentImageDisplayInfo.drawY,
            currentImageDisplayInfo.drawWidth,
            currentImageDisplayInfo.drawHeight
        );
        const currentRectsToDraw = categoryState.history[categoryState.historyIndex] || [];
        currentRectsToDraw.forEach(rect => {
            ctx.strokeStyle = rect.color;
            ctx.lineWidth = 2.5 / currentZoom;
            ctx.strokeRect(
                (rect.x * currentImageDisplayInfo.scale) + currentImageDisplayInfo.drawX,
                (rect.y * currentImageDisplayInfo.scale) + currentImageDisplayInfo.drawY,
                rect.width * currentImageDisplayInfo.scale,
                rect.height * currentImageDisplayInfo.scale
            );
        });
        if (isDrawing && !isPotentialClick) {
            const previewColor = (drawInitiatingButton === 2) ? "blue" : "red";
            ctx.strokeStyle = previewColor;
            ctx.lineWidth = 2.5 / currentZoom;
            const previewRectXOnCanvas = Math.min(startX, currentX) + currentImageDisplayInfo.drawX;
            const previewRectYOnCanvas = Math.min(startY, currentY) + currentImageDisplayInfo.drawY;
            const previewRectWidthOnCanvas = Math.abs(currentX - startX);
            const previewRectHeightOnCanvas = Math.abs(currentY - startY);
            ctx.strokeRect(
                previewRectXOnCanvas,
                previewRectYOnCanvas,
                previewRectWidthOnCanvas,
                previewRectHeightOnCanvas
            );
        }
        updateUndoRedoButtonStates();
    }

    function addShapeToHistory(shape) {
        const categoryState = appState[currentCategory];
        if (categoryState.historyIndex < categoryState.history.length - 1) {
            categoryState.history = categoryState.history.slice(0, categoryState.historyIndex + 1);
        }
        const previousRects = categoryState.history[categoryState.historyIndex] || [];
        const newRectsState = [...previousRects, shape];
        categoryState.history.push(newRectsState);
        categoryState.historyIndex++;
        updateFinishButtonState();
    }

    function handleImageUpload(file, targetCategory = currentCategory) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            if (targetCategory === currentCategory) showPlaceholderStateUI();
            if(hiddenFileInput && targetCategory === currentCategory) hiddenFileInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                appState[targetCategory].img = img;
                appState[targetCategory].history = [[]];
                appState[targetCategory].historyIndex = 0;
                appState[targetCategory].zoom = 1;
                appState[targetCategory].panX = 0;
                appState[targetCategory].panY = 0;
                setActiveCategoryButtonUI();
                if (targetCategory === currentCategory) drawInteractiveCanvas();
                updateFinishButtonState();
            };
            img.onerror = () => {
                alert('Failed to load image.');
                appState[targetCategory].img = null;
                appState[targetCategory].history = [[]];
                appState[targetCategory].historyIndex = 0;
                appState[targetCategory].zoom = 1;
                appState[targetCategory].panX = 0;
                appState[targetCategory].panY = 0;
                setActiveCategoryButtonUI();
                if (targetCategory === currentCategory) {
                    showPlaceholderStateUI();
                    if(hiddenFileInput) hiddenFileInput.value = '';
                }
                updateFinishButtonState();
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            alert('Error reading file.');
            if (targetCategory === currentCategory) {
                showPlaceholderStateUI();
                if(hiddenFileInput) hiddenFileInput.value = '';
            }
            updateFinishButtonState();
        };
        reader.readAsDataURL(file);
    }

    async function processPdfFile(pdfFile) {
            const displayName = pdfFile.name.replace('材料出荷依頼書.pdf', '').trim();
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = `${displayName}`;
}


        currentPdfExtractedInfo = "";
        if (!window.pdfjsLib || !pdfjsLib.GlobalWorkerOptions.workerSrc) {
            alert("PDF.js library not configured. Please ensure it's loaded correctly.");
            drawInteractiveCanvas();
            return;
        }
        placeholderText.innerHTML = `<i class="bi bi-arrow-repeat animate-spin mr-2"></i> <span class="text-base">Processing PDF...</span>`;
        finishButton.disabled = true;
        const fileReader = new FileReader();
    fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        try {
            await handlePdfData(typedarray, pdfFile.name);
        } catch (error) {
            console.error("Error handling PDF data:", error);
            alert("Failed to load/process PDF: " + error.message);
            drawInteractiveCanvas();
        } finally {
            updateFinishButtonState();
            if (hiddenFileInput) hiddenFileInput.value = '';
        }
    };
    fileReader.readAsArrayBuffer(pdfFile);
}

async function handlePdfData(data, fileName) {
    currentPdfExtractedInfo = "";
    if (!window.pdfjsLib || !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        alert("PDF.js library not configured. Please ensure it's loaded correctly.");
        drawInteractiveCanvas();
        return;
    }
    placeholderText.innerHTML = `<i class="bi bi-arrow-repeat animate-spin mr-2"></i> <span class="text-base">Processing PDF...</span>`;
    finishButton.disabled = true;

    try {
        const pdfDoc = await pdfjsLib.getDocument({ data: data }).promise;
        if (pdfDoc.numPages > 0) {
            try {
                const firstPage = await pdfDoc.getPage(1);
                const viewport = firstPage.getViewport({ scale: 1.0 });
                const textContent = await firstPage.getTextContent();
                let r1FilteredItems = [], r2FilteredItems = [];
                const targetRegion1 = { x: 20, y: 160, width: 150, height: 35 };
                const targetRegion2 = { x: 300, y: 160, width: 200, height: 35 };

                textContent.items.forEach(item => {
                    const tx = item.transform;
                    const itemBoxTopLeftX = tx[4];
                    const itemBoxBottomLeftY = tx[5];
                    const itemBoxTopLeftY = viewport.height - (itemBoxBottomLeftY + item.height);

                    if (itemBoxTopLeftX < targetRegion1.x + targetRegion1.width && itemBoxTopLeftX + item.width > targetRegion1.x &&
                        itemBoxTopLeftY < targetRegion1.y + targetRegion1.height && itemBoxTopLeftY + item.height > targetRegion1.y) {
                        r1FilteredItems.push(item);
                    }
                    if (itemBoxTopLeftX < targetRegion2.x + targetRegion2.width && itemBoxTopLeftX + item.width > targetRegion2.x &&
                        itemBoxTopLeftY < targetRegion2.y + targetRegion2.height && itemBoxTopLeftY + item.height > targetRegion2.y) {
                        r2FilteredItems.push(item);
                    }
                });

                const sortPdfTextItems = (items) => items.sort((a, b) => {
                    const yDiff = b.transform[5] - a.transform[5];
                    if (Math.abs(yDiff) < Math.min(a.height, b.height) / 2) return a.transform[4] - b.transform[4];
                    return yDiff;
                }).map(item => item.str.trim());

                const sortedRegion1TextsArray = sortPdfTextItems(r1FilteredItems);
                const sortedRegion2TextsArray = sortPdfTextItems(r2FilteredItems);
                let text1 = sortedRegion1TextsArray.join(" ");
                let text2 = sortedRegion2TextsArray.join(" ");
                if (text1 && text2) currentPdfExtractedInfo = text1 + "  " + text2;
                else if (text1) currentPdfExtractedInfo = text1;
                else if (text2) currentPdfExtractedInfo = text2;
                else currentPdfExtractedInfo = "";
                if (currentPdfExtractedInfo.trim() === "  ") currentPdfExtractedInfo = "";
            } catch (textError) {
                console.error("Error extracting text from PDF page 1:", textError);
                currentPdfExtractedInfo = "";
            }
        }

        const pageAssignments = [
            { pageNum: 1, category: "EXCEL", cropDetailsConfig: { x: 13, y: 758, width: 800, height: 80, refWidth: 826, refHeight: 1169, conditionalY: 745 } },
            { pageNum: 2, category: "2D", cropDetailsConfig: null },
            { pageNum: 3, category: "3D", cropDetailsConfig: null },
            { pageNum: 4, category: "SHINSEIZU", cropDetailsConfig: null }
        ];
        let successfullyProcessedCount = 0;
        let firstProcessedCategory = null;
        for (const assignment of pageAssignments) {
            if (assignment.pageNum <= pdfDoc.numPages) {
                try {
                    placeholderText.innerHTML = `<i class="bi bi-arrow-repeat animate-spin mr-2"></i> <span class="text-base">Processing PDF Page ${assignment.pageNum} for ${assignment.category}...</span>`;
                    const page = await pdfDoc.getPage(assignment.pageNum);
                    const viewportRenderScale = 2.0;
                    const viewport = page.getViewport({ scale: viewportRenderScale });
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = viewport.width; tempCanvas.height = viewport.height;
                    if (tempCanvas.width === 0 || tempCanvas.height === 0) throw new Error(`tempCanvas for page ${assignment.pageNum} is 0x0 BEFORE render.`);
                    await page.render({ canvasContext: tempCtx, viewport: viewport }).promise;
                    if (tempCanvas.width === 0 || tempCanvas.height === 0) throw new Error(`Rendered tempCanvas for page ${assignment.pageNum} is 0x0 AFTER render.`);
                    let finalImageCanvasForAssignment = tempCanvas;
                    let imageDataUrl;
                    if (assignment.category === "EXCEL" && assignment.cropDetailsConfig) {
                        const baseCrop = assignment.cropDetailsConfig;
                        let cropYToUse = baseCrop.y;
                        if (fileName && isNaN(parseInt(fileName[0]))) cropYToUse = baseCrop.conditionalY;
                        const scaleXFromUserRefToActualRender = tempCanvas.width / baseCrop.refWidth;
                        const scaleYFromUserRefToActualRender = tempCanvas.height / baseCrop.refHeight;
                        const sx = Math.round(baseCrop.x * scaleXFromUserRefToActualRender);
                        const sy = Math.round(cropYToUse * scaleYFromUserRefToActualRender);
                        const sWidth = Math.round(baseCrop.width * scaleXFromUserRefToActualRender);
                        const sHeight = Math.round(baseCrop.height * scaleYFromUserRefToActualRender);
                        const outputCropWidth = baseCrop.width; const outputCropHeight = baseCrop.height;
                        if (sWidth > 0 && sHeight > 0 && sx >= 0 && sy >= 0 && (sx + sWidth) <= tempCanvas.width && (sy + sHeight) <= tempCanvas.height) {
                            const cropCanvas = document.createElement('canvas');
                            cropCanvas.width = outputCropWidth; cropCanvas.height = outputCropHeight;
                            const cropCtx = cropCanvas.getContext('2d');
                            cropCtx.drawImage(tempCanvas, sx, sy, sWidth, sHeight, 0, 0, outputCropWidth, outputCropHeight);
                            finalImageCanvasForAssignment = cropCanvas;
                        } else console.warn(`[PDF CROP] EXCEL - Crop area for page ${assignment.pageNum} invalid/out of bounds. Using full page instead.`);
                    }
                    if (finalImageCanvasForAssignment.width === 0 || finalImageCanvasForAssignment.height === 0) throw new Error(`Final canvas for ${assignment.category} is 0x0. Skip this page.`);
                    imageDataUrl = finalImageCanvasForAssignment.toDataURL('image/png');
                    if (!imageDataUrl || imageDataUrl === "data:,") throw new Error(`Generated empty imageDataUrl for ${assignment.category}.`);
                    const img = new Image();
                    const imageLoadPromise = new Promise((resolve, reject) => {
                        img.onload = () => {
                            appState[assignment.category].img = img;
                            appState[assignment.category].history = [
                                []
                            ];
                            appState[assignment.category].historyIndex = 0;
                            appState[assignment.category].zoom = 1;
                            appState[assignment.category].panX = 0;
                            appState[assignment.category].panY = 0;
                            successfullyProcessedCount++;
                            if (!firstProcessedCategory) firstProcessedCategory = assignment.category;
                            resolve();
                        };
                        img.onerror = () => {
                            reject(new Error(`Image load error for ${assignment.category}`));
                        };
                    });
                    img.src = imageDataUrl;
                    await imageLoadPromise;
                } catch (pageError) {
                    console.error(`[PDF PROC] Error processing page ${assignment.pageNum} for category ${assignment.category}:`, pageError.message);
                }
            }
        }
        setActiveCategoryButtonUI();
        if (successfullyProcessedCount > 0) {
            if (firstProcessedCategory) switchCategory(firstProcessedCategory);
            else drawInteractiveCanvas();
        } else if (pdfDoc.numPages > 0) {
            alert("No relevant pages could be processed from the PDF. Check console for details.");
            drawInteractiveCanvas();
        } else {
            alert("The PDF file contains no pages.");
            drawInteractiveCanvas();
        }
    } catch (error) {
        console.error("Error parsing PDF:", error);
        alert("Failed to load/parse PDF: " + error.message);
        drawInteractiveCanvas();
    } finally {
        if (appState[currentCategory] && appState[currentCategory].img) {
            if (placeholderText) placeholderText.style.display = 'none';
        } else if (placeholderText) {
            if (currentCategory === "SHINSEIZU") {
                placeholderText.innerHTML = `<i class="bi bi-cloud-arrow-up text-4xl md:text-5xl mb-3"></i><span class="font-semibold text-base">Paste or Drop file for SHINSEIZU</span><span class="text-sm">(Click to upload disabled)</span>`;
            } else {
                placeholderText.innerHTML = `<i class="bi bi-cloud-arrow-up text-4xl md:text-5xl mb-3"></i><span class="font-semibold text-base">Drop a PDF or Image file</span><span class="text-sm">or click here to browse</span>`;
            }
        }
        updateFinishButtonState();
    }
}

    function switchCategory(newCategory) {
        if (!CATEGORY_NAMES.includes(newCategory)) return;
        currentCategory = newCategory;
        setActiveCategoryButtonUI();
        if(hiddenFileInput) hiddenFileInput.value = '';
        imageCanvasContainer.classList.add('opacity-0');
        setTimeout(() => {
            drawInteractiveCanvas();
            imageCanvasContainer.classList.remove('opacity-0');
        }, 150);
    }

    function handleUndo() { const cs = appState[currentCategory]; if (cs.historyIndex > 0) { cs.historyIndex--; drawInteractiveCanvas(); } updateUndoRedoButtonStates(); }
    function handleRedo() { const cs = appState[currentCategory]; if (cs.historyIndex < cs.history.length - 1) { cs.historyIndex++; drawInteractiveCanvas(); } updateUndoRedoButtonStates(); }

    function updateUndoRedoButtonStates() {
        const categoryState = appState[currentCategory];
        const canUndo = categoryState && categoryState.historyIndex > 0;
        const canRedo = categoryState && categoryState.historyIndex < categoryState.history.length - 1;

        if (undoButton) {
            undoButton.disabled = !canUndo;
            undoButton.classList.toggle('opacity-40', !canUndo);
            undoButton.classList.toggle('cursor-not-allowed', !canUndo);
        }
        if (redoButton) {
            redoButton.disabled = !canRedo;
            redoButton.classList.toggle('opacity-40', !canRedo);
            redoButton.classList.toggle('cursor-not-allowed', !canRedo);
        }
    }

    function updateFinishButtonState() {
        let hasAnyContent = !!currentPdfExtractedInfo;
        if (!hasAnyContent) {
            for (const cat of CATEGORY_NAMES) {
                if (appState[cat] && appState[cat].img) {
                    hasAnyContent = true;
                    break;
                }
            }
        }
        if (finishButton) {
            finishButton.disabled = !hasAnyContent;
            finishButton.classList.toggle('opacity-50', !hasAnyContent);
            finishButton.classList.toggle('cursor-not-allowed', !hasAnyContent);
            if(hasAnyContent && finishButton.innerHTML.includes('spinner-border')){
                 // Do nothing here, handleFinishCompilation will restore text
            } else if (!hasAnyContent && finishButton.innerHTML.includes('spinner-border')) {
                finishButton.innerHTML = finishButton.dataset.originalHtml || '<i class="bi bi-check-circle-fill"></i> Compile & Finish';
            }
        }
    }

    function createItemCanvasForCompilation(categoryName, originalImage, rectangles) {
        const targetImageHeight = (categoryName === "EXCEL") ? COMPILED_ITEM_IMAGE_HEIGHT_EXCEL : COMPILED_ITEM_IMAGE_HEIGHT_STANDARD;
        const imageDrawX = COMPILED_PADDING;
        const imageDrawY = COMPILED_PADDING + COMPILED_TITLE_AREA_HEIGHT;

        if (!originalImage || originalImage.naturalHeight === 0 || originalImage.naturalWidth === 0) {
            const placeholderWidth = Math.max(150, (targetImageHeight * 0.75) + 2 * COMPILED_PADDING);
            const placeholderHeight = targetImageHeight + COMPILED_TITLE_AREA_HEIGHT + 2 * COMPILED_PADDING;
            const itemCanvas = document.createElement('canvas');
            itemCanvas.width = Math.round(placeholderWidth);
            itemCanvas.height = Math.round(placeholderHeight);
            const itemCtx = itemCanvas.getContext('2d');
            itemCtx.fillStyle = '#FFF';
            itemCtx.fillRect(0,0,itemCanvas.width, itemCanvas.height);
            itemCtx.fillStyle = '#A0A0A0';
            const placeholderFontSize = Math.min(COMPILED_FONT_SIZE*0.4, COMPILED_TITLE_AREA_HEIGHT*0.5, 24);
            itemCtx.font = `italic ${placeholderFontSize}px ${getComputedStyle(document.body).fontFamily}`;
            itemCtx.textAlign = 'center';
            itemCtx.textBaseline = 'middle';
            const textCenterX = imageDrawX + (itemCanvas.width - 2 * COMPILED_PADDING) / 2;
            const textCenterY = imageDrawY + (itemCanvas.height - COMPILED_TITLE_AREA_HEIGHT - 2 * COMPILED_PADDING) / 2;
            itemCtx.fillText(`(No image for`, textCenterX, textCenterY - placeholderFontSize * 0.7);
            itemCtx.fillText(`${categoryName})`, textCenterX, textCenterY + placeholderFontSize * 0.7);
            const titleColor = '#212529';
            itemCtx.fillStyle = titleColor;
            itemCtx.font = `bold ${COMPILED_FONT_SIZE}px ${getComputedStyle(document.body).fontFamily}`;
            itemCtx.textAlign = 'center';
            itemCtx.textBaseline = 'top';
            itemCtx.fillText(categoryName, itemCanvas.width / 2, COMPILED_PADDING + (COMPILED_FONT_SIZE * 0.1));
            return { canvas: itemCanvas, width: itemCanvas.width, height: itemCanvas.height, categoryName: categoryName };
        }

        const imageScaleRatio = targetImageHeight / originalImage.naturalHeight;
        const scaledImageWidth = originalImage.naturalWidth * imageScaleRatio;
        const scaledImageHeight = targetImageHeight;
        const itemCanvasWidth = Math.round(scaledImageWidth + 2 * COMPILED_PADDING);
        const itemCanvasHeight = Math.round(scaledImageHeight + COMPILED_TITLE_AREA_HEIGHT + 2 * COMPILED_PADDING);
        const itemCanvas = document.createElement('canvas');
        itemCanvas.width = itemCanvasWidth;
        itemCanvas.height = itemCanvasHeight;
        const itemCtx = itemCanvas.getContext('2d');
        itemCtx.fillStyle = '#FFF';
        itemCtx.fillRect(0, 0, itemCanvas.width, itemCanvas.height);
        const titleColor = '#212529';
        itemCtx.fillStyle = titleColor;
        itemCtx.font = `bold ${COMPILED_FONT_SIZE}px ${getComputedStyle(document.body).fontFamily}`;
        itemCtx.textAlign = 'center';
        itemCtx.textBaseline = 'top';
        itemCtx.fillText(categoryName, itemCanvas.width / 2, COMPILED_PADDING + (COMPILED_FONT_SIZE * 0.1));
        itemCtx.imageSmoothingEnabled = true;
        itemCtx.imageSmoothingQuality = "high";
        itemCtx.drawImage(originalImage, imageDrawX, imageDrawY, Math.round(scaledImageWidth), Math.round(scaledImageHeight));
        const rectScaleToOutput = scaledImageWidth / originalImage.naturalWidth;
        (rectangles || []).forEach(rect => {
            itemCtx.strokeStyle = rect.color;
            itemCtx.lineWidth = COMPILED_RECT_LINE_WIDTH;
            itemCtx.strokeRect(
                Math.round((rect.x * rectScaleToOutput) + imageDrawX),
                Math.round((rect.y * rectScaleToOutput) + imageDrawY),
                Math.round(rect.width * rectScaleToOutput),
                Math.round(rect.height * rectScaleToOutput)
            );
        });
        return { canvas: itemCanvas, width: itemCanvasWidth, height: itemCanvasHeight, categoryName: categoryName };
    }

    function handleFinishCompilation(finishButtonOriginalHTMLArgument) {
        finishButton.disabled = true;
        finishButton.innerHTML = '<span class="spinner-border spinner-border-sm animate-spin mr-2" role="status" aria-hidden="true" style="width: 1em; height: 1em; border-width: .2em;"></span>Compiling...';
        resultsContainer.innerHTML = '';
        resultsPlaceholder.style.display = 'none';
        setTimeout(() => {
            const compiledTopRowOrder = ["3D", "2D", "SHINSEIZU"];
            const compiledExcelCategory = "EXCEL";
            let allPreparedItemsMap = {};
            let hasAnyImageForLayout = false;
            CATEGORY_NAMES.forEach(categoryName => {
                const categoryData = appState[categoryName];
                const currentRects = categoryData ? (categoryData.history[categoryData.historyIndex] || []) : [];
                allPreparedItemsMap[categoryName] = createItemCanvasForCompilation(
                    categoryName,
                    categoryData ? categoryData.img : null,
                    currentRects
                );
                if (categoryData && categoryData.img) {
                    hasAnyImageForLayout = true;
                }
            });
            if (!hasAnyImageForLayout && !currentPdfExtractedInfo) {
                resultsPlaceholder.innerHTML = `<i class="bi bi-info-circle text-2xl mr-2"></i>No images or PDF info available for compilation.`;
                resultsPlaceholder.style.display = 'flex';
                finishButton.innerHTML = finishButtonOriginalHTMLArgument;
                updateFinishButtonState();
                return;
            }

            const resultWrapper = document.createElement('div');
            resultWrapper.className = 'final-result-wrapper mt-4 flex flex-col items-center gap-3 w-full';

            let finalImageDataUrl = "";
            let finalCanvasWidthForDisplay = 100;
            let finalCanvasHeightForDisplay = 100;

            if (hasAnyImageForLayout) {
                let topRowItemsToDraw = [];
                let totalTopRowWidth = 0;
                let actualTopRowHeight = 0;
                compiledTopRowOrder.forEach(catName => {
                    const itemData = allPreparedItemsMap[catName];
                    if(itemData && itemData.canvas){
                        topRowItemsToDraw.push(itemData);
                        totalTopRowWidth += itemData.width;
                        actualTopRowHeight = Math.max(actualTopRowHeight, itemData.height);
                    }
                });
                let excelItemToDraw = allPreparedItemsMap[compiledExcelCategory];
                let excelCanvasWidth = excelItemToDraw && excelItemToDraw.canvas ? excelItemToDraw.width : 0;
                let excelCanvasHeight = excelItemToDraw && excelItemToDraw.canvas ? excelItemToDraw.height : 0;

                finalCanvasWidthForDisplay = Math.max(totalTopRowWidth, excelCanvasWidth, 1);
                let tempFinalCanvasHeight = 0;
                if (topRowItemsToDraw.length > 0) {
                    tempFinalCanvasHeight = actualTopRowHeight;
                }
                if (excelItemToDraw && excelItemToDraw.canvas) {
                    if (topRowItemsToDraw.length > 0) {
                        tempFinalCanvasHeight += ROW_SPACING;
                    }
                    tempFinalCanvasHeight += excelCanvasHeight;
                }
                finalCanvasHeightForDisplay = Math.max(tempFinalCanvasHeight, 1);

                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = finalCanvasWidthForDisplay;
                finalCanvas.height = finalCanvasHeightForDisplay;
                const finalCtx = finalCanvas.getContext('2d');
                finalCtx.fillStyle = '#FFF';
                finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                if (topRowItemsToDraw.length > 0) {
                    let currentXOffsetForTopRow = (finalCanvas.width - totalTopRowWidth) / 2;
                    topRowItemsToDraw.forEach(item => {
                        const yOffset = (actualTopRowHeight - item.height) / 2;
                        finalCtx.drawImage(item.canvas, currentXOffsetForTopRow, yOffset);
                        currentXOffsetForTopRow += item.width;
                    });
                }
                if (excelItemToDraw && excelItemToDraw.canvas) {
                    let excelStartX = (finalCanvas.width - excelItemToDraw.width) / 2;
                    let excelStartY = 0;
                    if (topRowItemsToDraw.length > 0) {
                        excelStartY = actualTopRowHeight + ROW_SPACING;
                    }
                    finalCtx.drawImage(excelItemToDraw.canvas, excelStartX, excelStartY);
                }

                const finalImageElement = document.createElement('img');
                finalImageDataUrl = finalCanvas.toDataURL('image/png');
                finalImageElement.src = finalImageDataUrl;
                finalImageElement.alt = "Compiled result";
                finalImageElement.title = `Compiled Image (${finalCanvas.width}x${finalCanvas.height}px)`;
                finalImageElement.className = 'max-w-full h-auto block mx-auto my-4 border border-theme-border dark:border-darkTheme-border rounded-md';
                resultWrapper.appendChild(finalImageElement);

                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'flex flex-col sm:flex-row gap-3 mt-3 items-center justify-center';

                const copyFinalButton = document.createElement('button');
                const copyCompiledBtnOriginalHTML = `<i class="bi bi-clipboard-check"></i> Copy Combined Image`;
                copyFinalButton.innerHTML = copyCompiledBtnOriginalHTML;
                copyFinalButton.className = 'control-button bg-theme-accent text-theme-accent-contrast dark:bg-darkTheme-accent dark:text-darkTheme-accent-contrast px-4 py-2 rounded-md text-sm font-semibold';
                copyFinalButton.addEventListener('click', async () => {
                    try {
                        const blob = dataURLtoBlob(finalImageDataUrl);
                        await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
                        setButtonFeedback(copyFinalButton, '<i class="bi bi-check-lg"></i> Copied!', true, 2000, copyCompiledBtnOriginalHTML);
                    } catch (err) {
                        alert('Failed to copy. Please check console for permissions or errors.');
                        setButtonFeedback(copyFinalButton, '<i class="bi bi-x-lg"></i> Copy Failed', false, 3000, copyCompiledBtnOriginalHTML);
                    }
                });
                buttonContainer.appendChild(copyFinalButton);

                const saveImageButton = document.createElement('button');
                const saveImageBtnOriginalHTML = `<i class="bi bi-download"></i> Save Image (DRAIN.png)`;
                saveImageButton.innerHTML = saveImageBtnOriginalHTML;
                saveImageButton.className = 'control-button bg-theme-surface dark:bg-darkTheme-surface text-theme-text-primary dark:text-darkTheme-text-primary border border-theme-border dark:border-darkTheme-border px-4 py-2 rounded-md text-sm font-semibold';
                saveImageButton.addEventListener('click', () => {
                    try {
                        const link = document.createElement('a');
                        link.href = finalImageDataUrl;
                        link.download = 'DRAIN.png';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setButtonFeedback(saveImageButton, '<i class="bi bi-check-lg"></i> Saved!', true, 2000, saveImageBtnOriginalHTML);
                    } catch (err) {
                        console.error('Failed to save image:', err);
                        alert('Failed to save image. Check console.');
                        setButtonFeedback(saveImageButton, '<i class="bi bi-x-lg"></i> Save Failed', false, 3000, saveImageBtnOriginalHTML);
                    }
                });
                buttonContainer.appendChild(saveImageButton);
                resultWrapper.appendChild(buttonContainer);
            }

            let combinedInfoText = "";
            if (currentPdfExtractedInfo) combinedInfoText += currentPdfExtractedInfo.trim();

            const category3DState = appState["3D"];
            let rectangles3D = [];
            if (category3DState && category3DState.history && category3DState.historyIndex < category3DState.history.length) {
                rectangles3D = category3DState.history[category3DState.historyIndex] || [];
            }
            let sideDrainCount = 0, verticalDrainCount = 0;
            rectangles3D.forEach(rect => {
                if (rect.color === "blue") sideDrainCount++;
                else if (rect.color === "red") verticalDrainCount++;
            });
            const drainTexts = [];
            if (sideDrainCount > 0) drainTexts.push(`${sideDrainCount} side drain`);
            if (verticalDrainCount > 0) drainTexts.push(`${verticalDrainCount} vertical drain`);

            if (drainTexts.length > 0) {
                if (combinedInfoText) combinedInfoText += "\n";
                combinedInfoText += drainTexts.join('\n');
            }

            if (combinedInfoText) {
                const infoAndCountsDiv = document.createElement('div');
                infoAndCountsDiv.className = 'combined-info-display p-3 my-2 bg-theme-background dark:bg-darkTheme-background border border-theme-border dark:border-darkTheme-border rounded-lg text-sm text-theme-text-muted dark:text-darkTheme-text-muted text-center whitespace-pre-wrap w-full max-w-lg';
                infoAndCountsDiv.textContent = combinedInfoText;
                resultWrapper.appendChild(infoAndCountsDiv);

                const copyInfoAndCountsBtn = document.createElement('button');
                const copyInfoAndCountsBtnOriginalHTML = `<i class="bi bi-clipboard"></i> Copy Info & Counts`;
                copyInfoAndCountsBtn.innerHTML = copyInfoAndCountsBtnOriginalHTML;
                copyInfoAndCountsBtn.className = 'control-button bg-theme-surface dark:bg-darkTheme-surface text-theme-text-primary dark:text-darkTheme-text-primary border border-theme-border dark:border-darkTheme-border mt-2 px-4 py-2 rounded-md text-sm font-semibold';
                copyInfoAndCountsBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(combinedInfoText);
                        setButtonFeedback(copyInfoAndCountsBtn, 'Info Copied!', true, 1500, copyInfoAndCountsBtnOriginalHTML);
                    } catch (err) {
                        alert('Failed to copy info & counts.');
                        setButtonFeedback(copyInfoAndCountsBtn, 'Copy Failed', false, 3000, copyInfoAndCountsBtnOriginalHTML);
                    }
                });
                resultWrapper.appendChild(copyInfoAndCountsBtn);
            }

            if (resultWrapper.hasChildNodes()) {
                resultsContainer.appendChild(resultWrapper);
            } else {
                 resultsPlaceholder.innerHTML = `<i class="bi bi-info-circle text-2xl mr-2"></i>Nothing to display or compile.`;
                 resultsPlaceholder.style.display = 'flex';
            }

            finishButton.innerHTML = finishButtonOriginalHTMLArgument;
            updateFinishButtonState();
        }, 50);
    }

    function applyTheme(theme) {
        htmlElement.classList.remove('light', 'dark');
        htmlElement.classList.add(theme);
        localStorage.setItem('imageCompilerTheme', theme);

        if (themeToggleButton) {
            const moonIcon = themeToggleButton.querySelector('.icon-moon');
            const sunIcon = themeToggleButton.querySelector('.icon-sun');
            if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'none' : 'block';
            if (sunIcon) sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
        }

        setActiveCategoryButtonUI();
        drawInteractiveCanvas();
    }

    function createHiddenFileInput() {
        hiddenFileInput = document.createElement('input');
        hiddenFileInput.type = 'file';
        hiddenFileInput.accept = 'image/*,.pdf';
        hiddenFileInput.style.display = 'none';
        document.body.appendChild(hiddenFileInput);

        hiddenFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                if (file.type === "application/pdf") processPdfFile(file);
                else if (file.type.startsWith('image/')) handleImageUpload(file);
                else alert("Unsupported file type. Please upload an image or PDF.");
            }
            event.target.value = null;
        });
    }

    function fitZoomToCanvas() {
        const categoryState = appState[currentCategory];
        const currentImage = categoryState.img;
        if (!currentImage) return;

        categoryState.zoom = 1;
        categoryState.panX = 0;
        categoryState.panY = 0;

        drawInteractiveCanvas();
    }

    function initEventListeners() {
        createHiddenFileInput();

        // Hamburger Menu Logic
        if (hamburgerButton && sideMenu && closeMenuButton && menuOverlay) {
            hamburgerButton.addEventListener('click', () => {
                sideMenu.classList.remove('-translate-x-full');
                menuOverlay.classList.remove('hidden');
                setTimeout(() => menuOverlay.classList.remove('opacity-0'), 10);
            });

            const closeMenu = () => {
                sideMenu.classList.add('-translate-x-full');
                menuOverlay.classList.add('opacity-0');
                setTimeout(() => menuOverlay.classList.add('hidden'), 300);
            };

            closeMenuButton.addEventListener('click', closeMenu);
            menuOverlay.addEventListener('click', closeMenu);
        }


        categoryButtons.forEach((button, index) => {
            button.addEventListener('click', (event) => {
                const category = event.target.closest('.category-button')?.dataset.category;
                if(category) switchCategory(category);
            });
        });

        document.addEventListener('paste', (event) => {
            const items = (event.clipboardData || event.originalEvent.clipboardData).items;
            for (let item of items) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    handleImageUpload(item.getAsFile());
                    event.preventDefault();
                    return;
                }
            }
        });

        if (imageCanvasContainer) {
            imageCanvasContainer.addEventListener('click', (event) => {
                if (hiddenFileInput &&
                    currentCategory !== "SHINSEIZU" &&
                    (!appState[currentCategory] || !appState[currentCategory].img) &&
                    !isPanning
                   ) {
                    hiddenFileInput.click();
                }
            });

            imageCanvasContainer.addEventListener('dragover', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    imageCanvasContainer.classList.add('dragover-active');
                });

                imageCanvasContainer.addEventListener('dragleave', e => {
                    e.stopPropagation();
                    imageCanvasContainer.classList.remove('dragover-active');
                });

                imageCanvasContainer.addEventListener('drop', e => {
                            e.preventDefault();
                            e.stopPropagation();
                            imageCanvasContainer.classList.remove('dragover-active');

                            const files = e.dataTransfer.files;

                            if (files.length > 0) {
                                // Handle the first dropped PDF in the current tab
                                const firstFile = files[0];
                                if (firstFile.type === "application/pdf") {
                                    processPdfFile(firstFile);
                                } else if (firstFile.type.startsWith('image/')) {
                                    handleImageUpload(firstFile);
                                } else {
                                    alert('Unsupported file type. Please drop a PDF or an image.');
                                }
                                
                                // Open new tabs for any additional PDFs
                                if (files.length > 1) {
                                    for (let i = 1; i < files.length; i++) {
                                        const file = files[i];
                                        if (file.type === "application/pdf") {
                                            const reader = new FileReader();
                                            reader.onload = function(event) {
                                                const fileData = event.target.result;
                                                const sessionKey = 'pdfData_' + Date.now();
                                                sessionStorage.setItem(sessionKey, JSON.stringify({ data: fileData, name: file.name }));
                                                window.open(`index.html?sessionKey=${sessionKey}`, '_blank');
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }
                                }
                            }
                        });
        }

        canvas.addEventListener('contextmenu', event => event.preventDefault());
       const scale = 0.8; // Set this to the same value as in your CSS file

    canvas.addEventListener('mousedown', (event) => {
        if (!appState[currentCategory]?.img || currentImageDisplayInfo.scale === 0) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left) / scale;
        const mouseY = (event.clientY - rect.top) / scale;

        if (mouseX >= currentImageDisplayInfo.drawX && mouseX <= (currentImageDisplayInfo.drawX + currentImageDisplayInfo.drawWidth) &&
            mouseY >= currentImageDisplayInfo.drawY && mouseY <= (currentImageDisplayInfo.drawY + currentImageDisplayInfo.drawHeight)) {
            if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
                event.preventDefault();
                isPanning = true;
                lastPanX = mouseX;
                lastPanY = mouseY;
                canvas.style.cursor = 'grabbing';
            } else {
                startX = (mouseX - currentImageDisplayInfo.drawX);
                startY = (mouseY - currentImageDisplayInfo.drawY);
                currentX = startX;
                currentY = startY;
                isDrawing = true;
                isPotentialClick = true;
                drawInitiatingButton = event.button;
                canvas.style.cursor = 'crosshair';
            }
        } else {
            isDrawing = false;
            isPotentialClick = false;
            isPanning = false;
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left) / scale;
        const mouseY = (event.clientY - rect.top) / scale;

        if (isDrawing) {
            currentX = (mouseX - currentImageDisplayInfo.drawX);
            currentY = (mouseY - currentImageDisplayInfo.drawY);
            drawInteractiveCanvas();
        } else if (isPanning) {
            const dx = mouseX - lastPanX;
            const dy = mouseY - lastPanY;
            appState[currentCategory].panX += dx;
            appState[currentCategory].panY += dy;
            lastPanX = mouseX;
            lastPanY = mouseY;
            drawInteractiveCanvas();
        }
        if (appState[currentCategory]?.img && !isDrawing && !isPanning) {
            if (mouseX >= currentImageDisplayInfo.drawX && mouseX <= (currentImageDisplayInfo.drawX + currentImageDisplayInfo.drawWidth) &&
                mouseY >= currentImageDisplayInfo.drawY && mouseY <= (currentImageDisplayInfo.drawY + currentImageDisplayInfo.drawHeight)) {
                canvas.style.cursor = 'crosshair';
            } else {
                canvas.style.cursor = 'default';
            }
        }
         if (isDrawing) {
        // Calculate the distance of the drag
        const dragDistance = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));

        // Check if the drag distance exceeds the click threshold
        if (isPotentialClick && dragDistance > CLICK_DRAG_THRESHOLD) {
            isPotentialClick = false; // It's a drag, not a click
        }
        
        currentX = (mouseX - currentImageDisplayInfo.drawX);
        currentY = (mouseY - currentImageDisplayInfo.drawY);
        drawInteractiveCanvas();
    } 
    });

        canvas.addEventListener('mouseup', (event) => {
            if (isPanning) {
                isPanning = false;
                canvas.style.cursor = 'crosshair';
                drawInteractiveCanvas();
                return;
            }

            if (!isDrawing || !appState[currentCategory]?.img || currentImageDisplayInfo.scale === 0) {
                isDrawing = false; isPotentialClick = false;
                if(isDrawing) drawInteractiveCanvas();
                return;
            }
            let newShapeData = null;
            const shapeColor = (drawInitiatingButton === 2) ? "blue" : "red";

            if (isPotentialClick) {
                const clickXOnOriginalImg = startX / currentImageDisplayInfo.scale;
                const clickYOnOriginalImg = startY / currentImageDisplayInfo.scale;

                const currentImage = appState[currentCategory].img;
                const containerWidth = imageCanvasContainer.clientWidth;
                const containerHeight = imageCanvasContainer.clientHeight;
                const initialFitScale = Math.min(containerWidth / currentImage.naturalWidth, containerHeight / currentImage.naturalHeight);

                const fixedSquareSizeInOriginalImg = AUTO_SQUARE_SIZE_CANVAS / initialFitScale;

                const rectXOnOriginalImg = clickXOnOriginalImg - (fixedSquareSizeInOriginalImg / 2);
                const rectYOnOriginalImg = clickYOnOriginalImg - (fixedSquareSizeInOriginalImg / 2);

                const originalImgWidth = appState[currentCategory].img.naturalWidth;
                const originalImgHeight = appState[currentCategory].img.naturalHeight;

                const clippedX = Math.max(0, rectXOnOriginalImg);
                const clippedY = Math.max(0, rectYOnOriginalImg);
                const clippedWidth = Math.min(originalImgWidth, rectXOnOriginalImg + fixedSquareSizeInOriginalImg) - clippedX;
                const clippedHeight = Math.min(originalImgHeight, rectYOnOriginalImg + fixedSquareSizeInOriginalImg) - clippedY;

                if (clippedWidth > 0.5 && clippedHeight > 0.5) {
                    newShapeData = {
                        x: clippedX,
                        y: clippedY,
                        width: clippedWidth,
                        height: clippedHeight,
                        color: shapeColor,
                        type: 'rect'
                    };
                }
            } else {
                const imgRelRectX1 = Math.min(startX, currentX);
                const imgRelRectY1 = Math.min(startY, currentY);
                const imgRelRectWidth = Math.abs(startX - currentX);
                const imgRelRectHeight = Math.abs(startY - currentY);

                if (imgRelRectWidth > 0 && imgRelRectHeight > 0) {
                    const xOnOriginalImg = imgRelRectX1 / currentImageDisplayInfo.scale;
                    const yOnOriginalImg = imgRelRectY1 / currentImageDisplayInfo.scale;
                    const wOnOriginalImg = imgRelRectWidth / currentImageDisplayInfo.scale;
                    const hOnOriginalImg = imgRelRectHeight / currentImageDisplayInfo.scale;
                    if (wOnOriginalImg > 0.5 && hOnOriginalImg > 0.5) {
                        newShapeData = {
                            x: xOnOriginalImg,
                            y: yOnOriginalImg,
                            width: wOnOriginalImg,
                            height: hOnOriginalImg,
                            color: shapeColor,
                            type: 'rect'
                        };
                    }
                }
            }
            if (newShapeData) addShapeToHistory(newShapeData);
            isDrawing = false; isPotentialClick = false;
            drawInteractiveCanvas();
        });

        canvas.addEventListener('mouseleave', () => {
             if (isDrawing) {
                 isDrawing = false;
                 isPotentialClick = false;
                 drawInteractiveCanvas();
             }
             if (isPanning) {
                 isPanning = false;
                 canvas.style.cursor = 'default';
                 drawInteractiveCanvas();
             }
         });

        canvas.addEventListener('wheel', (event) => {
            if (!event.ctrlKey) return;
            event.preventDefault();

            const categoryState = appState[currentCategory];
            const currentImage = categoryState.img;
            if (!currentImage) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const oldOverallScale = currentImageDisplayInfo.scale;

            const mouseXInOriginalImage = (mouseX - currentImageDisplayInfo.drawX) / oldOverallScale;
            const mouseYInOriginalImage = (mouseY - currentImageDisplayInfo.drawY) / oldOverallScale;

            let newZoom = categoryState.zoom;
            const zoomFactor = 1.1;
            if (event.deltaY < 0) {
                newZoom *= zoomFactor;
            } else {
                newZoom /= zoomFactor;
            }
            newZoom = Math.max(0.1, Math.min(newZoom, 5));

            categoryState.zoom = newZoom;

            const containerWidth = imageCanvasContainer.clientWidth;
            const containerHeight = imageCanvasContainer.clientHeight;
            const initialScaleForNewDraw = Math.min(containerWidth / currentImage.naturalWidth, containerHeight / currentImage.naturalHeight);

            const newOverallScale = initialScaleForNewDraw * newZoom;

            const newScaledImageWidth = currentImage.naturalWidth * newOverallScale;
            const newScaledImageHeight = currentImage.naturalHeight * newOverallScale;

            categoryState.panX = mouseX - (mouseXInOriginalImage * newOverallScale) - (canvas.width - newScaledImageWidth) / 2;
            categoryState.panY = mouseY - (mouseYInOriginalImage * newOverallScale) - (canvas.height - newScaledImageHeight) / 2;

            drawInteractiveCanvas();
        });


        if(undoButton) undoButton.addEventListener('click', handleUndo);
        if(redoButton) redoButton.addEventListener('click', handleRedo);
        if(fitZoomButton) fitZoomButton.addEventListener('click', fitZoomToCanvas);

        document.addEventListener('keydown', (event) => {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'BUTTON') && !canvas.contains(activeElement) && !clearConfirmationModal.contains(activeElement)) if (event.key === 'Enter' || event.key === ' ') return;
            if (event.ctrlKey || event.metaKey) {
                if (event.key === 'z' || event.key === 'Z') { event.preventDefault(); if (event.shiftKey) handleRedo(); else handleUndo(); }
                else if (event.key === 'y' || event.key === 'Y') { event.preventDefault(); handleRedo(); }
            }
        });

        clearButton.addEventListener('click', () => {
            if (modalCategoryNameSpan) modalCategoryNameSpan.textContent = currentCategory;
            clearConfirmationModal.classList.remove('hidden');
            setTimeout(() => {
                 clearConfirmationModal.classList.remove('opacity-0');
                 clearConfirmationModal.querySelector('div').classList.remove('scale-95');
                 clearConfirmationModal.classList.add('opacity-100');
                 clearConfirmationModal.querySelector('div').classList.add('scale-100');
                 cancelClearButton.focus();
            }, 20);
        });

        cancelClearButton.addEventListener('click', () => {
            clearConfirmationModal.classList.remove('opacity-100');
            clearConfirmationModal.querySelector('div').classList.remove('scale-100');
             clearConfirmationModal.classList.add('opacity-0');
            clearConfirmationModal.querySelector('div').classList.add('scale-95');
            setTimeout(() => {
                clearConfirmationModal.classList.add('hidden');
                clearButton.focus();
            }, 300);
        });

        confirmClearButton.addEventListener('click', () => {
            if (appState[currentCategory]) {
                appState[currentCategory].history = [[]];
                appState[currentCategory].historyIndex = 0;
                appState[currentCategory].img = null;
                appState[currentCategory].zoom = 1;
                appState[currentCategory].panX = 0;
                appState[currentCategory].panY = 0;
                setActiveCategoryButtonUI();
                drawInteractiveCanvas();
            }
            clearConfirmationModal.classList.remove('opacity-100');
            clearConfirmationModal.querySelector('div').classList.remove('scale-100');
             clearConfirmationModal.classList.add('opacity-0');
            clearConfirmationModal.querySelector('div').classList.add('scale-95');
            setTimeout(() => {
                clearConfirmationModal.classList.add('hidden');
                clearButton.focus();
            }, 300);
            updateFinishButtonState();
        });
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !clearConfirmationModal.classList.contains('hidden')) cancelClearButton.click(); });
        clearConfirmationModal.addEventListener('click', (event) => { if (event.target === clearConfirmationModal) cancelClearButton.click(); });

        const finishButtonOriginalHTML = finishButton ? finishButton.innerHTML.trim() : "Compile & Finish";
        if (finishButton) finishButton.dataset.originalHtml = finishButtonOriginalHTML;
        if(finishButton) finishButton.addEventListener('click', () => handleFinishCompilation(finishButton.dataset.originalHtml));

        // Save for Later button event listener
        if (saveForLaterButton) {
            saveForLaterButton.addEventListener('click', saveWorkState);
        }

        // Save results toggle button functionality
        if (saveResultsToggleBtn) {
            saveResultsToggleBtn.addEventListener('click', toggleSaveResultsContainer);
        }

        // Close overlay on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && saveResultsContainer && !saveResultsContainer.classList.contains('hidden')) {
                hideSaveResultsContainer();
            }
        });

        if (themeToggleButton) {
            themeToggleButton.addEventListener('click', () => {
                const currentTheme = htmlElement.classList.contains('dark') ? 'dark' : 'light';
                applyTheme(currentTheme === 'light' ? 'dark' : 'light');
            });
        }

        if (clockToggleButton && clockTimeText && clockIcon) {
            clockToggleButton.addEventListener('click', () => {
                isClockActive = !isClockActive;
                if (isClockActive) {
                    clockToggleButton.classList.remove('w-10');
                    clockToggleButton.classList.add('w-48', 'sm:w-52', 'px-3');
                    clockIcon.classList.remove('opacity-100', 'scale-100');
                    clockIcon.classList.add('opacity-0', 'scale-90', 'absolute');

                    setTimeout(() => {
                        clockTimeText.classList.remove('opacity-0', 'scale-90');
                        clockTimeText.classList.add('opacity-100', 'scale-100');
                    }, 150);

                    updateClock();
                    if (clockIntervalId) clearInterval(clockIntervalId);
                    clockIntervalId = setInterval(updateClock, 1000);
                    clockToggleButton.title = "Hide Clock";
                } else {
                    clockToggleButton.classList.remove('w-48', 'sm:w-52', 'px-3');
                    clockToggleButton.classList.add('w-10');
                    clockTimeText.classList.remove('opacity-100', 'scale-100');
                    clockTimeText.classList.add('opacity-0', 'scale-90');

                    setTimeout(() => {
                        clockIcon.classList.remove('opacity-0', 'scale-90', 'absolute');
                        clockIcon.classList.add('opacity-100', 'scale-100');
                    }, 150);

                    if (clockIntervalId) { clearInterval(clockIntervalId); clockIntervalId = null; }
                    clockToggleButton.title = "Show Clock";
                }
            });
        }

        const debouncedResizeHandler = debounce(() => {
            setActiveCategoryButtonUI();
            drawInteractiveCanvas();
        }, 150);
        window.addEventListener('resize', debouncedResizeHandler);
    }

    function formatDateTime(date) {
        const M = String(date.getMonth() + 1).padStart(2, '0'); const D = String(date.getDate()).padStart(2, '0'); const Y = date.getFullYear();
        const h = String(date.getHours()).padStart(2, '0'); const m = String(date.getMinutes()).padStart(2, '0'); const s = String(date.getSeconds()).padStart(2, '0');
        return `${M}/${D}/${Y} ${h}:${m}:${s}`;
    }

    function updateClock() { if (clockTimeText) clockTimeText.textContent = formatDateTime(new Date()); }

    function initApp() {
                    initEventListeners();
                    const urlParams = new URLSearchParams(window.location.search);
                    const sessionKey = urlParams.get('sessionKey');

                    if (sessionKey) {
                        // New tab opened with a sessionStorage key
                        const storedData = sessionStorage.getItem(sessionKey);
                        if (storedData) {
                            const { data, name } = JSON.parse(storedData);
                            
                            // Convert the Data URL back to a Blob
                            const byteString = atob(data.split(',')[1]);
                            const mimeString = data.split(',')[0].split(':')[1].split(';')[0];
                            const ab = new ArrayBuffer(byteString.length);
                            const ia = new Uint8Array(ab);
                            for (let i = 0; i < byteString.length; i++) {
                                ia[i] = byteString.charCodeAt(i);
                            }
                            const blob = new Blob([ab], { type: mimeString });
                            const file = new File([blob], name, { type: mimeString });
                            
                            processPdfFile(file);
                            
                            // Clean up sessionStorage to prevent issues on refresh
                            sessionStorage.removeItem(sessionKey);
                        }
                    } else {
                        // Default app initialization
                        switchCategory(currentCategory);
                        showPlaceholderStateUI();
                    }

                    const preferredTheme = localStorage.getItem('imageCompilerTheme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                    applyTheme(preferredTheme);
                    updateUndoRedoButtonStates();
                    updateFinishButtonState();
                }

    document.addEventListener('DOMContentLoaded', initApp);
})();
// Duplicate window button functionality
document.getElementById('duplicateWindowBtn').addEventListener('click', function() {
    // Add visual feedback
    const icon = this.querySelector('i');
    icon.classList.add('animate-pulse');
    
    // Open new window with current URL
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
    
    // Remove animation after 1 second
    setTimeout(() => {
        icon.classList.remove('animate-pulse');
    }, 1000);

})(); // Close the main IIFE