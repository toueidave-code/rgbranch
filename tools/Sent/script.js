// Tailwind CSS Configuration
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                theme: {
                   background: 'rgb(255, 255, 255)',
                   surface: 'rgb(247, 247, 247)',
                   border: 'rgb(230, 230, 230)',
                   'text-primary': 'rgb(5, 5, 5)',
                   'text-muted': 'rgb(107, 114, 128)',
                   accent: 'rgb(0, 122, 255)',
                   'accent-contrast': 'rgb(255, 255, 255)',
                   success: 'rgb(40, 167, 69)',
                   error: 'rgb(220, 53, 69)',
                   info: 'rgb(23, 162, 184)',
                   warning: 'rgb(255, 193, 7)',
                   'accent-rgb': '0, 122, 255',
                   'text-primary-rgb': '5, 5, 5',
                },
                darkTheme: {
                   background: 'rgb(20, 20, 20)',
                   surface: 'rgb(30, 30, 30)',
                   border: 'rgb(50, 50, 50)',
                   'text-primary': 'rgb(240, 240, 240)',
                   'text-muted': 'rgb(150, 150, 150)',
                   accent: 'rgb(0, 122, 255)',
                   'accent-contrast': 'rgb(255, 255, 255)',
                   success: 'rgb(40, 167, 69)',
                   error: 'rgb(220, 53, 69)',
                   info: 'rgb(23, 162, 184)',
                   warning: 'rgb(255, 193, 7)',
                   'accent-rgb': '0, 122, 255',
                   'text-primary-rgb': '240, 240, 240',
                },
            },
            fontFamily: {
                sans: ['Sora', 'sans-serif'],
            },
            transitionTimingFunction: {
                'custom-ease': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            },
            boxShadow: {
                'subtle': '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
                'subtle-dark': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.18)',
            }
        }
    }
};

// Firebase Configuration and API Keys
const FIREBASE_URL = "https://rain-gutter-2445d-default-rtdb.asia-southeast1.firebasedatabase.app";
const COLLECTION = "projectSent";
const API_KEY = "AIzaSyAAa9FqvM8LEY6u6REzBRUk3PYzrrrO8Hw"; // Firebase Realtime Database API Key

// Get Gemini API key from localStorage or prompt user
let geminiApiKey = localStorage.getItem('geminiApiKey');

// DOM Elements
const htmlElement = document.documentElement;
const dataTableBody = document.querySelector("#dataTable tbody");
const imageInput = document.getElementById('imageInput');
const extractButton = document.getElementById('extractButton');
const loadingSpinner = document.getElementById('loadingSpinner');
const previewModal = document.getElementById('previewModal');
const closeModalButton = document.getElementById('closeModalButton');
const previewTableBody = document.querySelector('#previewTable tbody');
const saveButton = document.getElementById('saveButton');
const fileLabel = document.querySelector('.file-label');
const uploadSection = document.querySelector('.upload-section');
const previewsContainer = document.getElementById('previewsContainer');
const themeToggleButton = document.getElementById('themeToggleBtn');
const themeToggleButtonDesktop = document.getElementById('themeToggleBtnDesktop');
const searchBar = document.getElementById('searchBar');

// Image Extractor Modal Elements
const imageExtractorModal = document.getElementById('imageExtractorModal');
const closeImageExtractorModalButton = document.getElementById('closeImageExtractorModalButton');
const imageExtractorBtn = document.getElementById('imageExtractorBtn');
const settingsBtn = document.getElementById('settingsBtn');

// CRUD Modal Elements
const viewModal = document.getElementById('viewModal');
const editModal = document.getElementById('editModal');
const deleteModal = document.getElementById('deleteModal');
const closeViewModalButton = document.getElementById('closeViewModalButton');
const closeEditModalButton = document.getElementById('closeEditModalButton');
const closeDeleteModalButton = document.getElementById('closeDeleteModalButton');
const saveEditButton = document.getElementById('saveEditButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');
const cancelDeleteButton = document.getElementById('cancelDeleteButton');
const closeViewButton = document.getElementById('closeViewButton');

// Current editing record key
let currentEditingKey = null;
let currentDeletingKey = null;

let pastedFiles = [];
let extractedDataForSaving = [];
let currentSortColumn = null;
let currentSortOrder = 'asc'; // 'asc' or 'desc'
let currentThunderbirdFilter = 'all'; // 'all', 'sent', 'not sent'
// ponytail: reduce DOM nodes with simple pagination/windowing
const PAGE_SIZE = 50;
let renderCursor = 0;
let sentAllRows = [];
let filteredRows = [];
// ponytail: reduce auto-refresh frequency to avoid excess network + rendering
const AUTO_REFRESH_INTERVAL_MS = 60000; // 60s
let autoRefreshIntervalId = null;

function startAutoRefresh() {
    if (autoRefreshIntervalId) {
        clearInterval(autoRefreshIntervalId);
    }
    autoRefreshIntervalId = setInterval(() => {
        loadData();
    }, AUTO_REFRESH_INTERVAL_MS);
}

// Sorting and filtering functions
function sortTable(column) {
    // Sort the filteredRows array instead of DOM nodes to avoid heavy DOM ops
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortOrder = 'asc';
    }
    updateSortIcons(column);

    if (column === 'colD' || column === 'thunderbirdDate') {
        filteredRows.sort((a, b) => {
            const aValue = column === 'colD' ? (a.colD || '') : (a.thunderbirdDate || '');
            const bValue = column === 'colD' ? (b.colD || '') : (b.thunderbirdDate || '');
            const dateA = parseDate(aValue);
            const dateB = parseDate(bValue);

            if (dateA === null && dateB === null) return 0;
            if (dateA === null) return currentSortOrder === 'asc' ? 1 : -1;
            if (dateB === null) return currentSortOrder === 'asc' ? -1 : 1;
            return currentSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }

    // reset render and show first page
    renderCursor = 0;
    dataTableBody.innerHTML = '';
    renderNextPage();
}

function filterThunderbirdSent() {
    // Cycle through filter states: all -> sent -> not sent -> all
    if (currentThunderbirdFilter === 'all') {
        currentThunderbirdFilter = 'sent';
    } else if (currentThunderbirdFilter === 'sent') {
        currentThunderbirdFilter = 'not sent';
    } else {
        currentThunderbirdFilter = 'all';
    }

    // Update filter icon
    updateFilterIcon();

    // Rebuild filteredRows from sentAllRows using current search and thunderbird filter
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    const query = (searchBar && searchBar.value) ? searchBar.value.toLowerCase() : '';
    filteredRows = sentAllRows.filter(row => {
        const projectNumber = (row.colA || '').toLowerCase();
        const projectName = (row.colB || '').toLowerCase();
        let matchesSearch = !query || projectNumber.includes(query) || projectName.includes(query);

        if (!matchesSearch) return false;

        if (currentThunderbirdFilter === 'sent') return (row.thunderbirdSent || '').includes('✅');
        if (currentThunderbirdFilter === 'not sent') return !(row.thunderbirdSent || '').includes('✅');
        return true;
    });

    // apply sort if any
    if (currentSortColumn) sortTable(currentSortColumn);

    // reset render and show first page
    renderCursor = 0;
    dataTableBody.innerHTML = '';
    renderNextPage();
}

function parseDate(dateString) {
    if (!dateString || dateString.trim() === '') return null;

    // Try different date formats
    const formats = [
        /^\d{4}\/\d{1,2}\/\d{1,2}/,  // YYYY/MM/DD
        /^\d{4}-\d{1,2}-\d{1,2}/,  // YYYY-MM-DD
        /^\d{1,2}\/\d{1,2}\/\d{4}/,  // MM/DD/YYYY
        /^\d{1,2}-\d{1,2}-\d{4}/,   // MM-DD-YYYY
    ];

    for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
            const dateStr = match[0];
            // Normalize to YYYY-MM-DD format
            const parts = dateStr.replace(/\//g, '-').split('-');
            if (parts.length === 3) {
                // Check if it's YYYY-MM-DD or MM-DD-YYYY
                if (parts[0].length === 4) {
                    return new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                    return new Date(parts[2], parts[0] - 1, parts[1]);
                }
            }
        }
    }

    // If no standard format, try creating date directly
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

// Rendering helpers for pagination
function renderNextPage() {
    if (!filteredRows || filteredRows.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="8" class="py-1 px-2 text-center text-theme-text-muted dark:text-darkTheme-text-muted text-xs">No data found</td>`;
        dataTableBody.appendChild(tr);
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    const start = renderCursor;
    const end = Math.min(renderCursor + PAGE_SIZE, filteredRows.length);
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
        const row = filteredRows[i];
        const tr = document.createElement('tr');
        tr.className = "hover:bg-theme-surface dark:hover:bg-darkTheme-surface";
        tr.dataset.projectNumber = row.colA || '';
        tr.dataset.projectName = row.colB || '';
        tr.dataset.key = row.key;
        tr.innerHTML = `
          <td class="py-1 px-2 border-b border-theme-border dark:border-darkTheme-border text-xs">${row.colA || ""}</td>
          <td class="py-1 px-2 border-b border-theme-border dark:border-darkTheme-border text-xs">${row.colB || ""}</td>
          <td class="py-1 px-2 border-b border-theme-border dark:border-darkTheme-border text-xs">${row.colC || ""}</td>
          <td class="py-1 px-2 border-b border-theme-border dark:border-darkTheme-border text-xs">${row.colD || ""}</td>
          <td class="py-1 px-2 border-b border-theme-border dark:border-darkTheme-border text-xs">${row.thunderbirdSent || ""}</td>
          <td class="py-1 px-2 border-b border-theme-border dark:border-darkTheme-border text-xs">${row.thunderbirdDate || ""}</td>
          <td class="py-1 px-2 border-b border-theme-border dark:border-darkTheme-border text-xs">${row.notes || ""}</td>
          <td class="py-1 px-2 border-b border-theme-border dark:border-darkTheme-border text-xs">
            <div class="flex gap-1">
              <button class="px-2 py-1 bg-theme-info text-white text-xs rounded hover:bg-opacity-80 transition-all" onclick="viewRow('${row.key}')" title="View">
                <i class="bi bi-eye text-sm"></i>
              </button>
              <button class="px-2 py-1 bg-theme-accent text-white text-xs rounded hover:bg-opacity-80 transition-all" onclick="editRow('${row.key}')" title="Edit">
                <i class="bi bi-pencil text-sm"></i>
              </button>
              <button class="px-2 py-1 bg-theme-error text-white text-xs rounded hover:bg-opacity-80 transition-all" onclick="deleteRow('${row.key}')" title="Delete">
                <i class="bi bi-trash text-sm"></i>
              </button>
            </div>
          </td>
        `;
        frag.appendChild(tr);
    }
    dataTableBody.appendChild(frag);
    renderCursor = end;

    if (!loadMoreBtn) createLoadMoreButton();
    loadMoreBtn.style.display = (renderCursor < filteredRows.length) ? '' : 'none';
}

function resetRender() {
    renderCursor = 0;
    dataTableBody.innerHTML = '';
    renderNextPage();
}

let loadMoreBtn = null;
function createLoadMoreButton() {
    if (loadMoreBtn) return;
    loadMoreBtn = document.createElement('button');
    loadMoreBtn.textContent = 'Load more';
    loadMoreBtn.className = 'mx-auto my-2 px-4 py-2 bg-theme-surface dark:bg-darkTheme-surface text-theme-text-primary rounded';
    loadMoreBtn.addEventListener('click', () => renderNextPage());
    const tableContainer = document.querySelector('#dataTable').parentNode;
    tableContainer.appendChild(loadMoreBtn);
}

function updateSortIcons(activeColumn) {
    // Reset all sort icons
    document.getElementById('colD-sort-icon').textContent = '';
    document.getElementById('thunderbirdDate-sort-icon').textContent = '';

    // Set active column icon
    const icon = currentSortOrder === 'asc' ? '↑' : '↓';
    document.getElementById(`${activeColumn}-sort-icon`).textContent = icon;
}

function updateFilterIcon() {
    const iconElement = document.getElementById('thunderbirdSent-filter-icon');
    if (currentThunderbirdFilter === 'all') {
        iconElement.textContent = '';
    } else if (currentThunderbirdFilter === 'sent') {
        iconElement.textContent = '✅';
    } else if (currentThunderbirdFilter === 'not sent') {
        iconElement.textContent = '❌';
    }
}

// Helper function to extract only the date portion (YYYY/MM/DD)
function getDateOnly(dateString) {
    if (!dateString) return "";
    const parts = dateString.split(' ')[0].split('-');
    if (parts.length === 3) {
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return dateString.split(' ')[0];
}

// Function to populate the main table (updated logic)
async function loadData() {
  try {
    // Try optimized query (last 200 by colD). If it returns nothing, fall back to full fetch.
    let data = null;
    try {
      const res = await fetch(`${FIREBASE_URL}/${COLLECTION}.json?auth=${API_KEY}&orderBy=%22colD%22&limitToLast=200`);
      if (res.ok) data = await res.json();
    } catch (e) { console.warn('Optimized fetch failed, will fallback', e); }

    // Fallback to full fetch if optimized returned no usable rows
    if (!data || Object.keys(data).length === 0) {
      try {
        const res2 = await fetch(`${FIREBASE_URL}/${COLLECTION}.json?auth=${API_KEY}`);
        if (res2.ok) data = await res2.json();
      } catch (e) { console.error('Fallback fetch failed', e); throw e; }
    }

    dataTableBody.innerHTML = "";
    let allRows = [];

    if (data) {
      allRows = Object.keys(data).map(key => ({
        ...data[key],
        key: key
      }));

      allRows.sort((a, b) => {
        const dateA = new Date(a.colD);
        const dateB = new Date(b.colD);
        return dateB - dateA;
      });

      // Store rows and use pagination/windowed rendering to limit DOM nodes
      sentAllRows = allRows;
      filteredRows = sentAllRows.slice();
      renderCursor = 0;
      dataTableBody.innerHTML = '';
      renderNextPage();
    } else {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="8" class="py-1 px-2 text-center text-theme-text-muted dark:text-darkTheme-text-muted text-xs">No data found</td>`;
      dataTableBody.appendChild(tr);
    }
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

// New: Function to populate the preview table
function populatePreviewTable(data) {
    previewTableBody.innerHTML = '';
    if (data.length === 0) {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `<td colspan="4" class="py-2 px-3 text-center text-theme-text-muted dark:text-darkTheme-text-muted text-sm">No data extracted.</td>`;
        previewTableBody.appendChild(noDataRow);
        return;
    }

    data.forEach(rowData => {
        const row = document.createElement('tr');
        row.className = "hover:bg-theme-surface dark:hover:bg-darkTheme-surface";
        row.innerHTML = `
            <td class="py-2 px-3 border-b border-theme-border dark:border-darkTheme-border text-sm">${rowData['No.'] || ''}</td>
            <td class="py-2 px-3 border-b border-theme-border dark:border-darkTheme-border text-sm">${rowData['Subject'] || ''}</td>
            <td class="py-2 px-3 border-b border-theme-border dark:border-darkTheme-border text-sm">${rowData['Correspondents'] || ''}</td>
            <td class="py-2 px-3 border-b border-theme-border dark:border-darkTheme-border text-sm">${rowData['Date'] || ''}</td>
        `;
        previewTableBody.appendChild(row);
    });
}

// New: Helper function to read file as Base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Function to check and get Gemini API key
async function getGeminiApiKey() {
    let apiKey = localStorage.getItem('geminiApiKey');
    
    if (!apiKey) {
        apiKey = prompt('Please enter your Gemini API key (get one from https://makersuite.google.com/app/apikey):');
        if (!apiKey) {
            alert('API key is required for image text extraction.');
            return null;
        }
        localStorage.setItem('geminiApiKey', apiKey);
    }
    
    return apiKey;
}

// Function to update API key
function updateGeminiApiKey() {
    const newApiKey = prompt('Enter your new Gemini API key:');
    if (newApiKey) {
        localStorage.setItem('geminiApiKey', newApiKey);
        geminiApiKey = newApiKey;
        alert('API key updated successfully!');
    }
}

// Main extraction function
async function performExtraction(files) {
    if (!files || files.length === 0) {
        alert("Please select one or more image files first or paste a screenshot.");
        return;
    }

    // Check for API key first
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
        return;
    }

    extractButton.disabled = true;
    extractButton.classList.add('is-loading');
    extractedDataForSaving = [];

    try {
        for (const file of files) {
            const base64ImageData = await readFileAsBase64(file);
            const prompt = `Extract all tabular data from this image. The data consists of rows, and each row has four columns: "No.", "Subject", "Correspondents", and "Date".
            For "No." and "Subject", please parse the first column in the image, where "No." is the leading number and "Subject" is the rest of the text on that line.
            For "Correspondents", extract the email addresses.
            For "Date", extract the time or date.
            Please return the data as a JSON array, where each element is an object with keys "No.", "Subject", "Correspondents", and "Date".
            Example format:
            [
              {
                "No.": "70074023",
                "Subject": "[南区納品] 茅ヶ崎市中島3環1棟",
                "Correspondents": "sekisan@touei.co.jp, A620@touei.co.jp",
                "Date": "10:10"
              }
            ]`;

            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: file.type,
                                    data: base64ImageData.split(',')[1]
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "No.": { "type": "STRING" },
                                "Subject": { "type": "STRING" },
                                "Correspondents": { "type": "STRING" },
                                "Date": { "type": "STRING" }
                            },
                            required: ["No.", "Subject", "Correspondents", "Date"]
                        }
                    }
                }
            };

            const dynamicApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(dynamicApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error for file ${file.name}: ${response.status} ${response.statusText} - ${errorData.error.message}`);
            }

            const result = await response.json();
            const jsonString = result.candidates[0].content.parts[0].text;
            const parsedData = JSON.parse(jsonString);

            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayFormatted = `${year}/${month}/${day}`;

            let filteredData = parsedData.filter(item => {
                return item['Subject'] && !item['Subject'].includes('【大工図納品】');
            });

            let cleanedData = filteredData.map(item => {
                const newSubject = (item['Subject'] || '').replace('【雨樋図納品】', '').trim();
                const newDate = (/^\d{1,2}:\d{2}$/.test(item['Date'])) ? `${todayFormatted} ${item['Date']}` : item['Date'];
                return {
                    'No.': item['No.'] || '',
                    'Subject': newSubject,
                    'Correspondents': item['Correspondents'] || '',
                    'Date': newDate
                };
            });
            
            extractedDataForSaving.push(...cleanedData);
        }

        populatePreviewTable(extractedDataForSaving);
        previewModal.classList.add('is-active');
        
        alert(`Successfully extracted data from ${files.length} image(s). Review the preview and click 'Save to Database'.`);

    } catch (error) {
        console.error("Error extracting text:", error);
        alert(`Extraction failed: ${error.message}`);
        extractedDataForSaving = [];
        previewModal.classList.remove('is-active');
    } finally {
        extractButton.disabled = false;
        extractButton.classList.remove('is-loading');
        imageInput.value = ''; // Clear file input
        pastedFiles = []; // Clear pasted files
        previewsContainer.innerHTML = ''; // Clear thumbnails
        updateFileLabel();
    }
}

// Updated: Function to save data to Firebase Realtime Database
async function saveData() {
    if (extractedDataForSaving.length === 0) {
        alert("No data to save.");
        return;
    }

    saveButton.disabled = true;

    try {
        const existingRes = await fetch(`${FIREBASE_URL}/${COLLECTION}.json?auth=${API_KEY}`);
        const existingData = await existingRes.json() || {};
        const existingProjectsMap = new Map();

        for (const key in existingData) {
            if (existingData[key].colA) {
                existingProjectsMap.set(existingData[key].colA, key);
            }
        }

        const updates = {};
        const newEntries = [];

        extractedDataForSaving.forEach(item => {
            const projectNumber = item['No.'];
            const existingKey = existingProjectsMap.get(projectNumber);
            const hasRevision = item['Subject'] && item['Subject'].includes('修正');

            if (existingKey) {
                // If the project number exists, update the record
                const updatePath = `${existingKey}`;
                updates[updatePath] = { ...existingData[existingKey] }; // Copy existing data
                updates[updatePath].thunderbirdSent = '✅';
                updates[updatePath].thunderbirdDate = item['Date'];
                
                if (hasRevision) {
                    updates[updatePath].notes = 'CHECKBACK';
                    updates[updatePath].colD = getDateOnly(item['Date']);
                }
            } else {
                // If the project number is new, create a new entry
                const firebaseFormat = {
                    colA: item['No.'],
                    colB: item['Subject'],
                    colC: item['Correspondents'],
                    colD: item['Date'],
                    notes: hasRevision ? 'CHECKBACK' : ''
                };
                newEntries.push(firebaseFormat);
            }
        });

        let updatedCount = 0;
        if (Object.keys(updates).length > 0) {
            await fetch(`${FIREBASE_URL}/${COLLECTION}.json?auth=${API_KEY}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });
            updatedCount = Object.keys(updates).length;
        }

        let newCount = 0;
        if (newEntries.length > 0) {
            const promises = newEntries.map(entry => 
                fetch(`${FIREBASE_URL}/${COLLECTION}.json?auth=${API_KEY}`, {
                    method: 'POST',
                    body: JSON.stringify(entry)
                })
            );
            await Promise.all(promises);
            newCount = newEntries.length;
        }

        const totalActions = updatedCount + newCount;
        if (totalActions > 0) {
             alert(`Successfully completed ${totalActions} actions. ${updatedCount} updated, ${newCount} new.`);
        } else {
             alert("No new or duplicate data was found. Nothing was saved or updated.");
        }

        loadData();
        extractedDataForSaving = [];
        previewModal.classList.remove('is-active');

    } catch (error) {
        console.error("Error saving data:", error);
        alert(`Failed to save data: ${error.message}`);
    } finally {
        saveButton.disabled = false;
    }
}

function addFileToPreview(file, source) {
    const container = document.createElement('div');
    container.className = 'thumbnail';
    container.dataset.source = source;
    container.dataset.fileName = file.name;
    container.dataset.fileSize = file.size;

    const img = document.createElement('img');
    const objUrl = URL.createObjectURL(file);
    img.src = objUrl;
    img.alt = file.name;
    img.loading = 'lazy'; // ponytail: lazy load previews to reduce memory/paint

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button';
    removeButton.innerHTML = 'x';
    removeButton.title = 'Remove image';
    removeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (source === 'pasted') {
            pastedFiles = pastedFiles.filter(pastedFile => pastedFile !== file);
        } else if (source === 'input' || source === 'dragged') {
            const dt = new DataTransfer();
            Array.from(imageInput.files)
                .filter(inputFile => inputFile !== file)
                .forEach(f => dt.items.add(f));
            imageInput.files = dt.files;
        }
        // Revoke object URL to free memory
        try { URL.revokeObjectURL(objUrl); } catch (e) {}
        container.remove();
        updateFileLabel();
    });

    container.appendChild(img);
    container.appendChild(removeButton);
    previewsContainer.appendChild(container);

    updateFileLabel();
}

function handleFiles(files, source) {
    // If the source is a direct file selection or a drag-drop, clear existing
    if (source === 'input' || source === 'dragged') {
        imageInput.value = '';
        pastedFiles = [];
        previewsContainer.innerHTML = '';
        const dt = new DataTransfer();
        Array.from(files).forEach(file => dt.items.add(file));
        imageInput.files = dt.files;
    } else if (source === 'pasted') {
        // If pasted, just add to the pasted files array
        Array.from(files).forEach(file => pastedFiles.push(file));
    }

    Array.from(files).forEach(file => addFileToPreview(file, source));
}

// --- New: Paste from clipboard functionality ---
document.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    const files = [];
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
                files.push(file);
            }
        }
    }
    if (files.length > 0) {
        handleFiles(files, 'pasted');
    }
    event.preventDefault(); // Prevents the image from being pasted directly into the page
});

// Function to filter the table
function filterTable() {
    // Use filteredRows rebuild to reduce DOM interaction
    applyFiltersAndRender();
}

// ============ CRUD FUNCTIONS ============

// VIEW FUNCTION
async function viewRow(key) {
    try {
        const res = await fetch(`${FIREBASE_URL}/${COLLECTION}/${key}.json?auth=${API_KEY}`);
        const rowData = await res.json();

        if (rowData) {
            document.getElementById('viewColA').textContent = rowData.colA || '';
            document.getElementById('viewColB').textContent = rowData.colB || '';
            document.getElementById('viewColC').textContent = rowData.colC || '';
            document.getElementById('viewColD').textContent = rowData.colD || '';
            document.getElementById('viewThunderbirdSent').textContent = rowData.thunderbirdSent || '';
            document.getElementById('viewThunderbirdDate').textContent = rowData.thunderbirdDate || '';
            document.getElementById('viewNotes').textContent = rowData.notes || '';
            
            viewModal.classList.add('is-active');
        }
    } catch (error) {
        console.error('Error loading record:', error);
        alert('Failed to load record: ' + error.message);
    }
}

// EDIT FUNCTION
async function editRow(key) {
    try {
        const res = await fetch(`${FIREBASE_URL}/${COLLECTION}/${key}.json?auth=${API_KEY}`);
        const rowData = await res.json();

        if (rowData) {
            document.getElementById('editColA').value = rowData.colA || '';
            document.getElementById('editColB').value = rowData.colB || '';
            document.getElementById('editColC').value = rowData.colC || '';
            document.getElementById('editColD').value = rowData.colD || '';
            document.getElementById('editThunderbirdSent').value = rowData.thunderbirdSent || '';
            document.getElementById('editThunderbirdDate').value = rowData.thunderbirdDate || '';
            document.getElementById('editNotes').value = rowData.notes || '';
            
            currentEditingKey = key;
            editModal.classList.add('is-active');
        }
    } catch (error) {
        console.error('Error loading record:', error);
        alert('Failed to load record: ' + error.message);
    }
}

// UPDATE FUNCTION
async function updateRow() {
    if (!currentEditingKey) {
        alert('No record selected for editing');
        return;
    }

    try {
        saveEditButton.disabled = true;

        const updatedData = {
            colA: document.getElementById('editColA').value,
            colB: document.getElementById('editColB').value,
            colC: document.getElementById('editColC').value,
            colD: document.getElementById('editColD').value,
            thunderbirdSent: document.getElementById('editThunderbirdSent').value,
            thunderbirdDate: document.getElementById('editThunderbirdDate').value,
            notes: document.getElementById('editNotes').value
        };

        const res = await fetch(`${FIREBASE_URL}/${COLLECTION}/${currentEditingKey}.json?auth=${API_KEY}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });

        if (!res.ok) throw new Error('Failed to update record');

        alert('Record updated successfully!');
        editModal.classList.remove('is-active');
        currentEditingKey = null;
        loadData();
    } catch (error) {
        console.error('Error updating record:', error);
        alert('Failed to update record: ' + error.message);
    } finally {
        saveEditButton.disabled = false;
    }
}

// DELETE FUNCTION
async function deleteRow(key) {
    try {
        currentDeletingKey = key;
        deleteModal.classList.add('is-active');
    } catch (error) {
        console.error('Error loading record:', error);
        alert('Failed to load record: ' + error.message);
    }
}

// CONFIRM DELETE FUNCTION
async function confirmDelete() {
    if (!currentDeletingKey) {
        alert('No record selected for deletion');
        return;
    }

    try {
        confirmDeleteButton.disabled = true;

        const res = await fetch(`${FIREBASE_URL}/${COLLECTION}/${currentDeletingKey}.json?auth=${API_KEY}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Failed to delete record');

        alert('Record deleted successfully!');
        deleteModal.classList.remove('is-active');
        currentDeletingKey = null;
        loadData();
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record: ' + error.message);
    } finally {
        confirmDeleteButton.disabled = false;
    }
}

// ============ END CRUD FUNCTIONS ============

// Event listeners for the new buttons
extractButton.addEventListener('click', () => {
    const filesToProcess = Array.from(imageInput.files).concat(pastedFiles);
    performExtraction(filesToProcess);
});

saveButton.addEventListener('click', saveData);
closeModalButton.addEventListener('click', () => {
    previewModal.classList.remove('is-active');
});

// Image Extractor Modal Event Listeners
imageExtractorBtn.addEventListener('click', () => {
    imageExtractorModal.classList.add('is-active');
});
closeImageExtractorModalButton.addEventListener('click', () => {
    imageExtractorModal.classList.remove('is-active');
    // Clear previews and reset state
    previewsContainer.innerHTML = '';
    pastedFiles = [];
    imageInput.value = '';
});

// Settings Button Event Listener
settingsBtn.addEventListener('click', updateGeminiApiKey);

// Event listeners for drag-and-drop
uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('border-theme-accent');
});
uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('border-theme-accent');
});
uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('border-theme-accent');
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
            handleFiles(imageFiles, 'dragged');
        } else {
            alert('Please drop one or more image files.');
        }
    }
});

imageInput.addEventListener('change', (e) => {
    handleFiles(e.target.files, 'input');
});

// Debounced search to avoid filtering on every keystroke
function debounce(fn, wait){ let t; return function(...a){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,a), wait); }; }
searchBar.addEventListener('input', debounce(filterTable, 200));

// Function to update the file label text based on selected/pasted files
function updateFileLabel() {
    const fileCount = imageInput.files.length + pastedFiles.length;
    if (fileCount > 0) {
        fileLabel.textContent = `${fileCount} image(s) ready`;
    } else {
        fileLabel.textContent = 'Choose Images';
    }
}

// Function to handle theme toggling
// ponytail: use shared theme util
// Ensure shared theme util is loaded
if (!window.PonytailTheme) {
    const _s = document.createElement('script');
    _s.src = '/tools/shared/theme.js';
    _s.defer = true;
    document.head.appendChild(_s);
}

// Use PonytailTheme.applyTheme in initialization and listeners

// Toggles between light and dark theme
// ponytail: toggleTheme replaced by shared util

// Refresh button functionality
document.getElementById('refreshBtn').addEventListener('click', function() {
    const icon = this.querySelector('i');
    icon.classList.add('animate-spin');
    setTimeout(async () => {
        icon.classList.remove('animate-spin');
        await loadData();
    }, 500);
});

// Close window button with confirmation
document.getElementById('closeWindowBtn').addEventListener('click', function() {
    try {
        window.close();
        if (!window.closed) {
            alert('This window cannot be closed programmatically. Please close it manually.');
        }
    } catch (error) {
        alert('An error occurred while trying to close the window: ' + error.message);
    }
});

// Event listeners for theme toggles
themeToggleButton.addEventListener('click', () => { if (window.PonytailTheme) PonytailTheme.toggleTheme(); });
themeToggleButtonDesktop.addEventListener('click', () => { if (window.PonytailTheme) PonytailTheme.toggleTheme(); });

document.addEventListener('DOMContentLoaded', function() {
    const preferredTheme = localStorage.getItem('tcdRaingutterTheme') ||
                         (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    (window.PonytailTheme || {}).applyTheme && (window.PonytailTheme.applyTheme(preferredTheme));

    loadData();
    startAutoRefresh();

    window.addEventListener('focus', () => {
        loadData();
    });
});

// Search functionality
document.getElementById('searchBar').addEventListener('paste', function(event) {
    let pasteData = (event.clipboardData || window.clipboardData).getData('text');
    this.value = pasteData.replace(/[^a-zA-Z0-9 ]/g, ''); 
});

// New: Enable pasting specifically in the searchBar
searchBar.addEventListener('paste', (event) => {
    // Allows the default paste behavior for text input
    // No code needed here, as we're not preventing the default action
});

// New: Enable 'Enter' key to trigger search in the searchBar
searchBar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        filterTable();
        // Optional: blur the input to hide the keyboard on mobile devices
        searchBar.blur();
    }
});

// ============ CRUD Modal Event Listeners ============

// View Modal Events
closeViewModalButton.addEventListener('click', () => {
    viewModal.classList.remove('is-active');
});
closeViewButton.addEventListener('click', () => {
    viewModal.classList.remove('is-active');
});

// Edit Modal Events
closeEditModalButton.addEventListener('click', () => {
    editModal.classList.remove('is-active');
    currentEditingKey = null;
});
cancelEditButton.addEventListener('click', () => {
    editModal.classList.remove('is-active');
    currentEditingKey = null;
});
saveEditButton.addEventListener('click', updateRow);

// Delete Modal Events
closeDeleteModalButton.addEventListener('click', () => {
    deleteModal.classList.remove('is-active');
    currentDeletingKey = null;
});
cancelDeleteButton.addEventListener('click', () => {
    deleteModal.classList.remove('is-active');
    currentDeletingKey = null;
});
confirmDeleteButton.addEventListener('click', confirmDelete);

// Close modals when clicking outside
[viewModal, editModal, deleteModal, imageExtractorModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('is-active');
            currentEditingKey = null;
            currentDeletingKey = null;
            if (modal === imageExtractorModal) {
                // Clear previews and reset state
                previewsContainer.innerHTML = '';
                pastedFiles = [];
                imageInput.value = '';
            }
        }
    });
});

// ============ END CRUD Modal Event Listeners ============
