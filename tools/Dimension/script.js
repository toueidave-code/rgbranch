document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const htmlElement = document.documentElement;
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const imagePreviews = document.getElementById('image-previews');
    const extractButton = document.getElementById('extract-button');
    const numbersList = document.getElementById('numbers-list');
    const clearButton = document.getElementById('clear-button');
    const copyButton = document.getElementById('copy-button');
    const appMessage = document.getElementById('app-message');

    // Theme Toggle Elements
    const themeToggleButton = document.getElementById('themeToggleBtn');
    const themeToggleButtonDesktop = document.getElementById('themeToggleBtnDesktop');
    const moonIcons = document.querySelectorAll('.icon-moon');
    const sunIcons = document.querySelectorAll('.icon-sun');

    let uploadedFiles = [];

    // --- Event Listeners ---
    dropArea.addEventListener('drop', handleDrop);
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover-active');
    });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover-active'));
    dropArea.addEventListener('dragenter', () => dropArea.classList.add('dragover-active'));

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    extractButton.addEventListener('click', extractNumbersFromImages);
    clearButton.addEventListener('click', clearAll);
    copyButton.addEventListener('click', copyNumbersToClipboard);
    document.body.addEventListener('paste', handlePaste);

    // Theme Toggle Event Listeners
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
    if (themeToggleButtonDesktop) {
        themeToggleButtonDesktop.addEventListener('click', toggleTheme);
    }

    // --- Functions ---
    function toggleTheme() {
        const currentTheme = htmlElement.classList.contains('dark') ? 'dark' : 'light';
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    }

    function applyTheme(theme) {
        htmlElement.classList.remove('light', 'dark');
        htmlElement.classList.add(theme);
        localStorage.setItem('tcdRaingutterTheme', theme);

        // Update all theme toggle icons
        moonIcons.forEach(icon => {
            icon.style.display = theme === 'dark' ? 'none' : 'block';
        });
        sunIcons.forEach(icon => {
            icon.style.display = theme === 'dark' ? 'block' : 'none';
        });
    }

    function handleDrop(e) {
        e.preventDefault();
        dropArea.classList.remove('dragover-active');
        handleFiles(e.dataTransfer.files);
    }

    function handlePaste(e) {
        e.preventDefault(); 
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    handleFiles([file]);
                    showMessageBox("Pasted image detected!");
                    return;
                }
            }
        }
    }

    function handleFiles(files) {
        const newImageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (newImageFiles.length === 0) {
            showMessageBox("Please upload image files (e.g., JPG, PNG).");
            return;
        }

        newImageFiles.forEach(file => {
            const isDuplicate = uploadedFiles.some(existingFile => 
                existingFile.name === file.name && existingFile.size === file.size
            );

            if (!isDuplicate) {
                uploadedFiles.push(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgDiv = document.createElement('div');
                    imgDiv.classList.add('image-preview');
                    imgDiv.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                    imagePreviews.appendChild(imgDiv);
                };
                reader.readAsDataURL(file);
            }
        });
        updateButtonStates();
    }

    function updateButtonStates() {
        extractButton.disabled = uploadedFiles.length === 0;
        clearButton.disabled = uploadedFiles.length === 0;
        const hasNumbers = Array.from(numbersList.children).some(li => !li.classList.contains('no-numbers') && !li.classList.contains('error-item'));
        copyButton.disabled = !hasNumbers;
    }

    async function extractNumbersFromImages() {
        if (uploadedFiles.length === 0) {
            showMessageBox("Please upload images first.");
            return;
        }

        numbersList.innerHTML = '';
        addListItem("Processing images...", "no-numbers");
        extractButton.disabled = true;
        copyButton.disabled = true;

        for (const file of uploadedFiles) {
            try {
                const base64Image = await readFileAsBase64(file);

                // Replace these placeholders with up to 5 API keys when you're ready.
                // Example: ['KEY1', 'KEY2', 'KEY3', 'KEY4', 'KEY5']
                const GEMINI_API_KEYS = [
                    '',
                    '',
                    '',
                    '',
                    ''
                ];

                const requestBody = {
                    contents: [
                        {
                            parts: [
                                { text: "Extract all numerical values from this image. Only provide the numbers, separated by commas. Do not include any other text." },
                                { inlineData: { mimeType: file.type, data: base64Image.split(',')[1] } }
                            ]
                        }
                    ]
                };

                async function callGeminiWithKeyRotation(body) {
                    // If no keys provided, return a descriptive error so caller can handle it
                    if (!Array.isArray(GEMINI_API_KEYS) || GEMINI_API_KEYS.length === 0 || GEMINI_API_KEYS.every(k => !k)) {
                        return { error: 'no_keys_configured' };
                    }

                    for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
                        const key = GEMINI_API_KEYS[i];
                        if (!key) continue; // skip empty slots

                        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

                        try {
                            const resp = await fetch(endpoint, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body)
                            });

                            if (resp.ok) {
                                const json = await resp.json();
                                return { success: true, data: json, usedKeyIndex: i };
                            }

                            // Try to parse error details
                            let errData = null;
                            try { errData = await resp.json(); } catch (e) { errData = null; }
                            const errMsg = errData && (errData.error && errData.error.message) ? errData.error.message : (errData && errData.message) || '';

                            // If the error indicates quota/rate limiting, try the next key
                            if (resp.status === 429 || /quota|limit|exceeded|rate limit/i.test(errMsg)) {
                                console.warn(`Key index ${i} appears rate-limited or over quota. Trying next key.`, errMsg);
                                continue;
                            }

                            // For other non-recoverable errors, return the parsed error
                            return { error: 'api_error', status: resp.status, data: errData };

                        } catch (networkError) {
                            // Network or fetch failure: try next key
                            console.warn(`Network/error with key index ${i}, trying next key.`, networkError);
                            continue;
                        }
                    }

                    // All keys exhausted or empty
                    return { error: 'all_keys_exhausted' };
                }

                const result = await callGeminiWithKeyRotation(requestBody);

                if (result && result.error) {
                    if (result.error === 'no_keys_configured') {
                        console.error('No Gemini API keys configured. Please add keys to the GEMINI_API_KEYS array.');
                        addListItem(`Error processing ${file.name}: No API keys configured.`, 'error-item');
                        continue;
                    }
                    if (result.error === 'all_keys_exhausted') {
                        console.error('All API keys exhausted or rate-limited.');
                        addListItem(`Error processing ${file.name}: All API keys exhausted or rate-limited.`, 'error-item');
                        continue;
                    }
                    // Generic API error
                    console.error('Gemini API returned an error:', result);
                    addListItem(`Error processing ${file.name}: ${result.data && result.data.error ? result.data.error.message : 'Unknown API error'}`, 'error-item');
                    continue;
                }

                const data = result.data;
                console.log('Gemini API Response:', data);

                let extractedText = '';
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                    extractedText = data.candidates[0].content.parts
                                    .map(part => part.text)
                                    .join(' ')
                                    .trim();
                }

                const numbers = extractedText.match(/\b\d+(\.\d+)?\b/g);
                
                if (numbers && numbers.length > 0) {
                    numbers.forEach(num => addListItem(num));
                } else {
                    addListItem(`No numbers found in ${file.name}.`, "no-numbers");
                }

            } catch (error) {
                console.error('Error during number extraction:', error);
                addListItem(`Failed to extract from ${file.name}: ${error.message}`, 'error-item');
            }
        }
        removeListItem("Processing images...", "no-numbers");
        extractButton.disabled = false;
        updateButtonStates();
        if (numbersList.children.length === 0) {
            addListItem("No numbers extracted from any image.", "no-numbers");
        }
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    function addListItem(text, className = '') {
        const li = document.createElement('li');
        li.textContent = text;
        if (className) {
            li.classList.add(className);
        }
        numbersList.appendChild(li);
    }
    
    function removeListItem(text, className) {
        const items = numbersList.querySelectorAll(`li.${className}`);
        items.forEach(item => {
            if (item.textContent === text) {
                item.remove();
            }
        });
    }

    function copyNumbersToClipboard() {
        const allListItems = Array.from(numbersList.children);
        const numbersToCopy = allListItems
            .filter(li => !li.classList.contains('no-numbers') && !li.classList.contains('error-item'))
            .map(li => li.textContent)
            .join('\n');

        if (numbersToCopy.length > 0) {
            const tempTextArea = document.createElement('textarea');
            tempTextArea.value = numbersToCopy;
            document.body.appendChild(tempTextArea);
            tempTextArea.select();
            
            try {
                document.execCommand('copy');
                showMessageBox('Numbers copied to clipboard!');
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy All Numbers';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                showMessageBox('Failed to copy numbers to clipboard.');
            } finally {
                document.body.removeChild(tempTextArea);
            }
        } else {
            showMessageBox('No numbers to copy.');
        }
    }

    function clearAll() {
        uploadedFiles = [];
        imagePreviews.innerHTML = '';
        numbersList.innerHTML = '<li class="p-3 text-theme-text-muted dark:text-darkTheme-text-muted text-center italic">Upload images and click "Extract Numbers"</li>';
        fileInput.value = '';
        updateButtonStates();
        showMessageBox('All cleared!');
    }

    function showMessageBox(message, duration = 3000) {
        appMessage.textContent = message;
        appMessage.classList.remove('hidden', 'opacity-0');
        appMessage.classList.add('opacity-100');

        setTimeout(() => {
            appMessage.classList.remove('opacity-100');
            appMessage.classList.add('opacity-0');
            setTimeout(() => {
                appMessage.classList.add('hidden');
            }, 300);
        }, duration);
    }

    // Initial state and theme load
    updateButtonStates();
    copyButton.disabled = true;
    
    const preferredTheme = localStorage.getItem('tcdRaingutterTheme') || 
                         (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferredTheme);
});

// Refresh button functionality
document.getElementById('refreshBtn').addEventListener('click', function() {
    const icon = this.querySelector('i');
    icon.classList.add('animate-spin');
    setTimeout(() => {
        icon.classList.remove('animate-spin');
    }, 1000);
    window.location.reload();
});

// Close window button with confirmation
document.getElementById('closeWindowBtn').addEventListener('click', function() {
    const userConfirmed = confirm('Are you sure you want to close this window?');
    if (userConfirmed) {
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