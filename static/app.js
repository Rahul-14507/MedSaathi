document.addEventListener('DOMContentLoaded', () => {
    // Nav Elements
    const navAnalyze = document.getElementById('nav-analyze');
    const navPrescription = document.getElementById('nav-prescription');
    const navHistory = document.getElementById('nav-history');
    const navSettings = document.getElementById('nav-settings');

    // Section Elements
    const uploadSection = document.getElementById('uploadSection');
    const processingSection = document.getElementById('processingSection');
    const resultsSection = document.getElementById('resultsSection');
    const historySection = document.getElementById('historySection');
    const settingsSection = document.getElementById('settingsSection');

    // UI Elements
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const languageSelectorContainer = document.getElementById('languageSelectorContainer');
    const languageSelect = document.getElementById('languageSelect');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const resetBtn = document.getElementById('resetBtn');

    // Result containers
    const labReportResults = document.getElementById('labReportResults');
    const prescriptionResults = document.getElementById('prescriptionResults');

    // Lab Report Elements
    const aiReportContent = document.getElementById('aiReportContent');
    const flagsContainer = document.getElementById('flagsContainer');
    const tablesContainer = document.getElementById('tablesContainer');

    // Prescription Elements
    const audioPlayer = document.getElementById('audioPlayer');
    const translatedTextContent = document.getElementById('translatedTextContent');
    const ocrTextContent = document.getElementById('ocrTextContent');

    // State
    let currentMode = 'analyze'; // 'analyze' or 'prescription'

    // --- Navigation Logic ---
    function showSection(sectionId, mode = null) {
        // Hide all
        [uploadSection, processingSection, resultsSection, historySection, settingsSection].forEach(s => s.classList.add('hidden'));
        // Remove active class from nav
        [navAnalyze, navPrescription, navHistory, navSettings].forEach(n => n.classList.remove('active'));

        if (mode) currentMode = mode;

        // Show targets
        if (sectionId === 'upload') {
            uploadSection.classList.remove('hidden');
            if (currentMode === 'analyze') {
                navAnalyze.classList.add('active');
                pageTitle.innerText = "Lab Report Intelligence";
                pageSubtitle.innerText = "Upload your lab report for instant analysis and AI-powered insights.";
                languageSelectorContainer.classList.add('hidden');
            } else if (currentMode === 'prescription') {
                navPrescription.classList.add('active');
                pageTitle.innerText = "Vernacular Prescription Parser";
                pageSubtitle.innerText = "Upload a handwritten prescription to get simplified vernacular instructions and audio.";
                languageSelectorContainer.classList.remove('hidden');
            }
        } else if (sectionId === 'history') {
            historySection.classList.remove('hidden');
            navHistory.classList.add('active');
            pageTitle.innerText = "History";
            pageSubtitle.innerText = "View previously analyzed reports and prescriptions.";
            fetchHistory();
        } else if (sectionId === 'settings') {
            settingsSection.classList.remove('hidden');
            navSettings.classList.add('active');
            pageTitle.innerText = "Settings";
            pageSubtitle.innerText = "Manage your application preferences.";
            fetchSettings();
        }
    }

    navAnalyze.addEventListener('click', () => showSection('upload', 'analyze'));
    navPrescription.addEventListener('click', () => showSection('upload', 'prescription'));
    navHistory.addEventListener('click', () => showSection('history'));
    navSettings.addEventListener('click', () => showSection('settings'));

    const historyList = document.getElementById('historyList');
    const settingsForm = document.getElementById('settingsForm');

    // --- History Logic ---
    async function fetchHistory() {
        historyList.innerHTML = '<p class="text-muted">Loading history...</p>';
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            renderHistory(data);
        } catch (error) {
            console.error('History Error:', error);
            historyList.innerHTML = '<p class="text-danger">Failed to load history.</p>';
        }
    }

    function renderHistory(history) {
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<p class="text-muted">No analysis history found.</p>';
            return;
        }

        history.forEach(item => {
            const date = new Date(item.timestamp).toLocaleString();
            const el = document.createElement('div');
            el.className = 'history-item';
            el.style = 'padding: 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
            el.innerHTML = `
                <div>
                    <div style="font-weight:600">${item.filename} <span class="badge" style="background:#e2e8f0; color:#475569; margin-left:8px">${item.type === 'prescription' ? 'Prescription' : 'Report'}</span></div>
                    <div style="font-size:0.875rem; color:var(--text-muted)">${date}</div>
                </div>
                ${item.type === 'prescription' ?
                    `<div class="badge" style="background: var(--bg-color); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem;">${item.language}</div>` :
                    `<div class="badge" style="background: var(--bg-color); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem;">${item.flags ? item.flags.length : 0} Flags</div>`
                }
            `;
            el.onclick = () => {
                showSection('none'); // Hide others
                resultsSection.classList.remove('hidden');

                if (item.type === 'prescription') {
                    renderPrescriptionResults(item);
                } else {
                    renderAnalyzeResults(item);
                }
            };
            historyList.appendChild(el);
        });
    }

    // --- Settings Logic ---
    async function fetchSettings() {
        try {
            const response = await fetch('/api/settings');
            const settings = await response.json();
            settingsForm.elements['theme'].value = settings.theme || 'light';
            settingsForm.elements['notifications'].checked = settings.notifications !== false;
        } catch (error) {
            console.error('Settings Fetch Error:', error);
        }
    }

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = {
            theme: settingsForm.elements['theme'].value,
            notifications: settingsForm.elements['notifications'].checked
        };

        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (response.ok) alert('Settings saved successfully!');
        } catch (error) {
            console.error('Settings Save Error:', error);
            alert('Failed to save settings.');
        }
    });

    // --- Drag and Drop Events ---
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    resetBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        fileInput.value = '';
    });

    async function handleFile(file) {
        uploadSection.classList.add('hidden');
        processingSection.classList.remove('hidden');

        try {
            const formData = new FormData();
            formData.append('file', file);

            let endpoint = '/api/analyze';
            if (currentMode === 'prescription') {
                endpoint = '/api/parse-prescription';
                formData.append('language', languageSelect.value);
            }

            const response = await fetch(endpoint, { method: 'POST', body: formData });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Analysis failed');
            }
            const data = await response.json();

            if (currentMode === 'prescription') {
                renderPrescriptionResults(data);
            } else {
                renderAnalyzeResults(data);
            }

        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
            processingSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
        }
    }

    function renderPrescriptionResults(data) {
        processingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        labReportResults.classList.add('hidden');
        prescriptionResults.classList.remove('hidden');

        ocrTextContent.textContent = data.ocr_text || 'No text extracted.';
        translatedTextContent.innerHTML = `<p>${(data.translated_text || '').replace(/\n/g, '<br>')}</p>`;

        if (data.audio_base64) {
            const audioSrc = `data:audio/mp3;base64,${data.audio_base64}`;
            audioPlayer.src = audioSrc;
            audioPlayer.parentElement.classList.remove('hidden');
        } else {
            audioPlayer.parentElement.classList.add('hidden');
        }
    }

    function renderAnalyzeResults(data) {
        processingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        prescriptionResults.classList.add('hidden');
        labReportResults.classList.remove('hidden');

        if (data.ai_report) {
            aiReportContent.innerHTML = `<div class="prose">${marked.parse(data.ai_report)}</div>`;
        }

        flagsContainer.innerHTML = '';
        if (data.flags && data.flags.length > 0) {
            data.flags.forEach(flag => {
                const flagClass = flag.status === 'HIGH' ? 'flag-high' : 'flag-low';
                const icon = flag.status === 'HIGH' ? 'fa-arrow-up' : 'fa-arrow-down';
                const el = document.createElement('div');
                el.className = `flag-item ${flagClass}`;
                el.innerHTML = `
                    <div class="flag-header">
                        <span class="flag-title">${flag.item} <i class="fa-solid ${icon}"></i></span>
                        <span class="flag-value">${flag.value} <span style="font-size:0.875rem;font-weight:normal">${flag.unit}</span></span>
                    </div>
                    <div class="flag-meta">Normal Range: ${flag.range[0]} - ${flag.range[1]} ${flag.unit}</div>
                    <div class="text-sm" style="color: inherit; opacity: 0.9">${flag.description}</div>
                `;
                flagsContainer.appendChild(el);
            });
        } else {
            const el = document.createElement('div');
            el.className = 'flag-item flag-normal';
            el.innerHTML = `<div class="flag-header"><span class="flag-title">All clear! <i class="fa-solid fa-check"></i></span></div>
                <div class="text-sm" style="color: inherit; opacity: 0.9">No monitored values are outside the normal range.</div>`;
            flagsContainer.appendChild(el);
        }

        tablesContainer.innerHTML = '';
        if (data.extracted_data && data.extracted_data.tables && data.extracted_data.tables.length > 0) {
            data.extracted_data.tables.forEach((table, idx) => {
                const container = document.createElement('div');
                container.className = 'data-table-container';
                let html = `<table>`;
                if (table.length > 0) {
                    html += `<thead><tr>`;
                    table[0].forEach(cell => { html += `<th>${cell}</th>`; });
                    html += `</tr></thead><tbody>`;
                    for (let i = 1; i < table.length; i++) {
                        html += `<tr>`;
                        table[i].forEach(cell => { html += `<td>${cell}</td>`; });
                        html += `</tr>`;
                    }
                    html += `</tbody>`;
                }
                html += `</table>`;
                container.innerHTML = html;
                tablesContainer.appendChild(container);
            });
        } else {
            tablesContainer.innerHTML = '<p class="text-muted">No structured tables extracted.</p>';
        }
    }

    // Initial load
    showSection('upload', 'analyze');
});
