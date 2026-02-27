document.addEventListener('DOMContentLoaded', () => {
    // Auth State
    let authToken = localStorage.getItem('medsaathi_token');
    let currentUser = localStorage.getItem('medsaathi_user');

    // Nav Elements
    const navAnalyze = document.getElementById('nav-analyze');
    const navPrescription = document.getElementById('nav-prescription');
    const navTrends = document.getElementById('nav-trends');
    const navHistory = document.getElementById('nav-history');
    const navSettings = document.getElementById('nav-settings');
    const navFollowup = document.getElementById('nav-followup');
    const navPortal = document.getElementById('nav-portal');

    // Section Elements
    const uploadSection = document.getElementById('uploadSection');
    const processingSection = document.getElementById('processingSection');
    const resultsSection = document.getElementById('resultsSection');
    const historySection = document.getElementById('historySection');
    const settingsSection = document.getElementById('settingsSection');
    const followupSection = document.getElementById('followupSection');

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
    let isRegistering = false;
    let trendsChart = null;

    const trendsSection = document.getElementById('trendsSection');

    // Auth UI Elements
    const authContainer = document.getElementById('authContainer');
    const loginModalBtn = document.getElementById('loginModalBtn');
    const loggedInUser = document.getElementById('loggedInUser');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const systemModeText = document.getElementById('systemModeText');

    const authModalOverlay = document.getElementById('authModalOverlay');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const authForm = document.getElementById('authForm');
    const authUsername = document.getElementById('authUsername');
    const authPassword = document.getElementById('authPassword');
    const authTitle = document.getElementById('authModalTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authToggleLink = document.getElementById('authToggleLink');
    const authToggleText = document.getElementById('authToggleText');

    // --- Auth Logic ---
    function updateAuthState() {
        if (authToken && currentUser) {
            loginModalBtn.classList.add('hidden');
            loggedInUser.classList.remove('hidden');
            usernameDisplay.innerText = currentUser;
            systemModeText.innerText = "Logged In (Saving to Cloud)";
            systemModeText.style.color = "var(--primary-color)";
            navTrends.classList.remove('hidden');

            if (currentUser.startsWith("PAT-")) {
                navFollowup.classList.remove('hidden');
            } else {
                navFollowup.classList.add('hidden');
            }
        } else {
            loginModalBtn.classList.remove('hidden');
            loggedInUser.classList.add('hidden');
            systemModeText.innerText = "Guest Mode (No Data Saved)";
            systemModeText.style.color = "var(--text-muted)";
            navTrends.classList.add('hidden');
            navFollowup.classList.add('hidden');
        }
    }

    loginModalBtn.addEventListener('click', () => {
        isRegistering = false;
        authTitle.innerText = "Login";
        authSubmitBtn.innerText = "Login";
        authToggleText.innerText = "Need an account?";
        authToggleLink.innerText = "Register here";
        authModalOverlay.classList.remove('hidden');
    });

    closeAuthModal.addEventListener('click', () => authModalOverlay.classList.add('hidden'));

    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isRegistering = !isRegistering;
        if (isRegistering) {
            authTitle.innerText = "Register";
            authSubmitBtn.innerText = "Create Account";
            authToggleText.innerText = "Already have an account?";
            authToggleLink.innerText = "Login here";
        } else {
            authTitle.innerText = "Login";
            authSubmitBtn.innerText = "Login";
            authToggleText.innerText = "Need an account?";
            authToggleLink.innerText = "Register here";
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = authUsername.value;
        const password = authPassword.value;
        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Authentication failed");
            }

            const data = await response.json();
            localStorage.setItem('medsaathi_token', data.access_token);
            localStorage.setItem('medsaathi_user', data.user.username);
            authToken = data.access_token;
            currentUser = data.user.username;

            updateAuthState();
            authModalOverlay.classList.add('hidden');
            authForm.reset();
            alert(`Welcome, ${currentUser}!`);

        } catch (error) {
            alert(error.message);
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('medsaathi_token');
        localStorage.removeItem('medsaathi_user');
        authToken = null;
        currentUser = null;
        updateAuthState();
        showSection('upload', 'analyze');
    });

    // Run auth check on load
    updateAuthState();

    // --- Navigation Logic ---
    function showSection(sectionId, mode = null) {
        // Hide all
        [uploadSection, processingSection, resultsSection, historySection, settingsSection, trendsSection, followupSection].forEach(s => s.classList.add('hidden'));
        // Remove active class from nav
        [navAnalyze, navPrescription, navHistory, navSettings, navTrends, navFollowup].forEach(n => n.classList.remove('active'));

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
        } else if (sectionId === 'trends') {
            trendsSection.classList.remove('hidden');
            navTrends.classList.add('active');
            pageTitle.innerText = "Health Trends";
            pageSubtitle.innerText = "Track your historical lab metrics.";
            fetchTrends();
        } else if (sectionId === 'followup') {
            followupSection.classList.remove('hidden');
            navFollowup.classList.add('active');
            pageTitle.innerText = "Follow-up Dashboard";
            pageSubtitle.innerText = "Live post-surgery recovery metrics and automated triage alerts.";
            fetchFollowupDashboard();
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
    navTrends.addEventListener('click', () => showSection('trends'));
    navFollowup.addEventListener('click', () => showSection('followup'));
    navHistory.addEventListener('click', () => showSection('history'));
    navSettings.addEventListener('click', () => showSection('settings'));

    if (navPortal) {
        navPortal.addEventListener('click', () => {
            window.location.href = '/portal/';
        });
    }

    const historyList = document.getElementById('historyList');
    const settingsForm = document.getElementById('settingsForm');
    const followupList = document.getElementById('followupList');
    const refreshFollowupBtn = document.getElementById('refreshFollowupBtn');
    const triggerDemoCheckinBtn = document.getElementById('triggerDemoCheckinBtn');

    if (refreshFollowupBtn) refreshFollowupBtn.addEventListener('click', fetchFollowupDashboard);
    if (triggerDemoCheckinBtn) triggerDemoCheckinBtn.addEventListener('click', async () => {
        triggerDemoCheckinBtn.disabled = true;
        triggerDemoCheckinBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Triggering...';
        try {
            const formData = new URLSearchParams();
            formData.append('patient_phone', '+12015550123'); // Demo patient
            await fetch('/api/followup/test-trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });
            setTimeout(fetchFollowupDashboard, 1000);
        } catch (e) {
            console.error(e);
        } finally {
            triggerDemoCheckinBtn.disabled = false;
            triggerDemoCheckinBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Stimulate Check-in (Demo)';
        }
    });

    // --- Follow-up Dashboard Logic ---
    async function fetchFollowupDashboard() {
        if (!followupList) return;
        followupList.innerHTML = '<div style="padding: 2rem; text-align: center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p>Loading active patient data...</p></div>';
        try {
            const response = await fetch('/api/followup/dashboard');
            const data = await response.json();
            renderFollowupDashboard(data);
        } catch (error) {
            console.error('Followup Error:', error);
            followupList.innerHTML = '<div style="padding: 2rem; text-align: center; color: red;">Failed to load patient data. Check console.</div>';
        }
    }

    function renderFollowupDashboard(checkins) {
        if (checkins.length === 0) {
            followupList.innerHTML = '<div style="padding: 2rem; text-align: center;"><p class="text-muted">No active patients monitored currently.</p></div>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 1rem;">Patient</th>
                        <th style="padding: 1rem;">Date</th>
                        <th style="padding: 1rem;">Patient Reply (AI Assessed)</th>
                        <th style="padding: 1rem;">Pain Level</th>
                        <th style="padding: 1rem;">Symptoms Flagged</th>
                        <th style="padding: 1rem;">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        checkins.forEach(c => {
            const date = new Date(c.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const isAlert = c.requires_alert;
            const bgClass = isAlert ? 'background-color: #fef2f2;' : '';
            const statusBadge = isAlert
                ? '<span class="badge" style="background-color: #ef4444; color: white;"><i class="fa-solid fa-triangle-exclamation"></i> Action Required</span>'
                : '<span class="badge" style="background-color: #10b981; color: white;"><i class="fa-solid fa-check"></i> Normal</span>';
            const painColor = c.pain_level >= 7 ? '#ef4444' : (c.pain_level >= 4 ? '#f59e0b' : '#10b981');

            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; ${bgClass}">
                    <td style="padding: 1rem;">
                        <strong>${c.patient_name}</strong><br>
                        <span style="font-size: 0.8rem; color: #64748b;">${c.phone_number}</span>
                    </td>
                    <td style="padding: 1rem; color: #64748b; font-size: 0.9rem;">${date}</td>
                    <td style="padding: 1rem; max-width: 300px;">
                        <span style="display: block; font-style: italic; margin-bottom: 0.5rem;">"${c.patient_response}"</span>
                    </td>
                    <td style="padding: 1rem;">
                        <span style="font-weight: bold; font-size: 1.1rem; color: ${painColor}">${c.pain_level}/10</span>
                    </td>
                    <td style="padding: 1rem;">
                        ${c.symptoms_flagged !== 'None' ? `<span style="color: #ef4444; font-weight: 500;">${c.symptoms_flagged}</span>` : '<span style="color: #94a3b8;">None</span>'}
                    </td>
                    <td style="padding: 1rem;">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        followupList.innerHTML = html;
    }

    // --- History Logic ---
    async function fetchHistory() {
        historyList.innerHTML = '<p class="text-muted">Loading history...</p>';
        try {
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
            const response = await fetch('/api/history', { headers });
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

            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
            const response = await fetch(endpoint, { method: 'POST', body: formData, headers });
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

    // --- Wow Factor 1: Trends Fetching ---
    async function fetchTrends() {
        const chartsContainer = document.getElementById('chartsContainer');
        chartsContainer.innerHTML = '<p class="text-muted">Loading trends...</p>';
        try {
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
            const response = await fetch('/api/trends', { headers });

            if (!response.ok) throw new Error("Failed to load trends");
            const data = await response.json();

            chartsContainer.innerHTML = '';

            if (Object.keys(data).length === 0) {
                chartsContainer.innerHTML = '<p class="text-muted">No historical data available to plot trends yet. Upload some lab reports!</p>';
                return;
            }

            let canvasIndex = 0;
            for (const [metric, info] of Object.entries(data)) {
                if (info.values.length < 2) continue; // Skip if less than 2 points

                const wrapper = document.createElement('div');
                wrapper.innerHTML = `
                    <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                        <h3 style="margin-top:0; color:var(--primary-color)">${metric} Trends (${info.unit})</h3>
                        <canvas id="chart_${canvasIndex}" width="400" height="200"></canvas>
                    </div>
                `;
                chartsContainer.appendChild(wrapper);

                const ctx = document.getElementById(`chart_${canvasIndex}`).getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: info.dates.map(d => new Date(d).toLocaleDateString()),
                        datasets: [{
                            label: metric,
                            data: info.values,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4,
                            pointBackgroundColor: '#10b981'
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: { y: { beginAtZero: false } }
                    }
                });
                canvasIndex++;
            }
            if (canvasIndex === 0) {
                chartsContainer.innerHTML = '<p class="text-muted">Not enough data points to plot line graphs yet. Upload more reports over time.</p>';
            }
        } catch (error) {
            chartsContainer.innerHTML = `<p class="text-danger">${error.message}</p>`;
        }
    }

    // Initial load
    showSection('upload', 'analyze');
});
