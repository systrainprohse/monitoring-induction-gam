    <script>
        // ========== GLOBAL STATE & UTILITIES ==========
        const appState = {
            data: {},
            currentTheme: localStorage.getItem('theme') || 'light',
            cache: {
                key: 'induksi_data_cache',
                expiry: 30 * 60 * 1000 // 30 minutes
            },
            tables: {},
            lastUpdated: null,
            // Tambahan dari index.html untuk password
            targetPage: null,
            targetUrl: null
        };

        const API_INDUKSI_URL = 'https://script.google.com/macros/s/AKfycbzVdhjjZaNJqjVv6DaW5VIaGhJEmUxbs4kv8gb4U94Tu8KgZqinCGLJU3uqpQ8Xhws2dQ/execKfycbwCCaANsivS48PiOIMIMSexlnbM1-fc3mtuiCzFbrnjcGEw2IgipIqQrGxjPsDld7Ohkw/exec';

        const debounce = (func, wait) => { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; };

        function showErrorBanner(message) {
            const banner = document.getElementById('error-banner');
            const messageContent = document.getElementById('error-message-content');
            if (banner && messageContent) {
                messageContent.innerHTML = message;
                banner.classList.remove('hidden');
            }
        }

        function updateLastUpdatedTimestamp(timestamp) {
            const el = document.getElementById('last-updated');
            if (!el) return;
            if (timestamp) {
                appState.lastUpdated = timestamp;
                const date = new Date(timestamp);
                el.textContent = `Terakhir diperbarui: ${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID')}`;
            } else {
                el.textContent = 'Memperbarui data...';
            }
        }

        // ========== CACHING FUNCTIONS ==========
        function getCachedData() {
            const cachedItem = localStorage.getItem(appState.cache.key);
            if (!cachedItem) return null;
            try {
                const { data, timestamp } = JSON.parse(cachedItem);
                if (Date.now() - timestamp > appState.cache.expiry) {
                    localStorage.removeItem(appState.cache.key);
                    return null;
                }
                return { data, timestamp };
            } catch (error) {
                localStorage.removeItem(appState.cache.key);
                return null;
            }
        }

        function setCachedData(data) {
            const timestamp = Date.now();
            const itemToCache = { data, timestamp };
            try {
                localStorage.setItem(appState.cache.key, JSON.stringify(itemToCache));
                updateLastUpdatedTimestamp(timestamp);
            } catch (error) {
                console.error(`Error saving cache:`, error);
            }
        }

        // ========== DATA FETCHING (JSONP METHOD) ==========
        function fetchAllInduksiData() {
            return new Promise((resolve, reject) => {
                const callbackName = 'jsonp_callback_induksi_' + Math.round(100000 * Math.random());

                window[callbackName] = function (data) {
                    delete window[callbackName];
                    document.body.removeChild(script);

                    if (data.error) {
                        return reject(new Error(`API Error: ${data.error}. Details: ${data.details || ''}`));
                    }

                    resolve(data);
                };

                const script = document.createElement('script');
                script.src = `${API_INDUKSI_URL}?callback=${callbackName}`;

                script.onerror = function () {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    const error = new Error('Permintaan data gagal. Server tidak merespons atau terjadi kesalahan jaringan.');
                    showErrorBanner(`Gagal mengambil data dari server: ${error.message}`);
                    reject(error);
                };

                document.body.appendChild(script);
            });
        }

        // ========== UI UPDATE FUNCTIONS ==========
        function updateUI(data) {
            if (!data) return;
            appState.data = data;
            updateInduksiDashboard(data);
            initializeTables(data);
            document.querySelectorAll('.component-loading').forEach(el => el.classList.remove('component-loading'));
            const companyName = data.setting?.[0]?.namaPerusahaan;
            if (companyName) {
                const initial = companyName.charAt(0);
                document.getElementById('company-name-sidebar').innerHTML = `<span class="text-purple-600">${initial}</span>${companyName.slice(1)}`;
            }
        }

        function updateInduksiDashboard(data) {
            const settingData = data.setting || [];
            const newHireData = data.newHire || [];
            const pascaCutiData = data.pascaCuti || [];
            const temporaryData = data.temporary || [];
            const visitorData = data.visitor || [];
            const pendaftaranInduksiData = data.pendaftaranInduksi || [];
            const kodeAksesData = data.kodeAkses || [];

            const getRowDate = (row) => row.date || '';
            const todayStr = new Date().toLocaleDateString('en-CA');
            const mainCompany = settingData.length > 0 ? settingData[0].namaPerusahaan : "PT. GAM";
            const allInduksiData = [...newHireData, ...pascaCutiData, ...temporaryData];
            const induksiToday = allInduksiData.filter(d => getRowDate(d) === todayStr);
            const visitorsToday = visitorData.filter(d => getRowDate(d) === todayStr);

            updateCard('induksi-core', induksiToday.filter(d => d.perusahaan === mainCompany));
            updateCard('induksi-mitra', induksiToday.filter(d => d.perusahaan !== mainCompany));
            updateCard('induksi-visitor', visitorsToday);

            document.getElementById('status-new-hire').textContent = newHireData.filter(d => getRowDate(d) === todayStr).length;
            document.getElementById('status-cuti').textContent = pascaCutiData.filter(d => getRowDate(d) === todayStr).length;

            const todayScores = [...induksiToday, ...visitorsToday].map(d => parseFloat(d.score)).filter(s => !isNaN(s));
            updateScoreCard('skor-terendah', todayScores, Math.min);
            updateScoreCard('skor-tertinggi', todayScores, Math.max);
            updateScoreCard('skor-rata', todayScores, arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

            const todayAccessCode = kodeAksesData.find(k => getRowDate(k) === todayStr);
            document.getElementById('kode-akses-value').textContent = todayAccessCode ? todayAccessCode.kodeAkses : 'N/A';

            updateBreakdownCard('pendaftaran', pendaftaranInduksiData, 'perusahaan');
            const approvedData = allInduksiData.filter(d => d.status && String(d.status).toLowerCase() !== 'pending');
            updateBreakdownCard('approval', approvedData, 'perusahaan');
            updateBreakdownCard('temporary', temporaryData, 'perusahaan');
        }

        function updateCard(id, todayData) {
            document.getElementById(`${id}-today`).textContent = todayData.length;
            const detailEl = document.getElementById(`${id}-detail`);
            if (detailEl) detailEl.innerHTML = '';
        }

        function updateScoreCard(id, todayScores, aggregator) {
            const el = document.getElementById(id); if (!el) return;
            const value = todayScores.length > 0 ? aggregator(todayScores) : 0;
            const score = typeof value === 'number' ? value.toFixed(1) : 0;
            el.innerHTML = `<div><p class="text-xs capitalize">${id.replace('skor-', '')}</p><p class="text-xl font-bold">${score}</p></div>`;
            lucide.createIcons();
        }

        function updateBreakdownCard(id, data, companyField) {
            document.getElementById(`total-${id}`).textContent = data.length;
            const counts = data.reduce((acc, item) => {
                const companyName = item[companyField] || 'Lainnya';
                acc[companyName] = (acc[companyName] || 0) + 1;
                return acc;
            }, {});
            const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            document.getElementById(`${id}-breakdown`).querySelector('div').innerHTML = sortedCounts.map(([company, count]) => `<span class="mx-4 whitespace-nowrap">${company} (<span class="font-semibold">${count}</span>)</span>`).join('');
        }

        function updateClock() {
            const clockElement = document.getElementById('clock');
            if (clockElement) {
                const now = new Date();
                document.getElementById('day-name').textContent = now.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
                document.getElementById('date-number').textContent = now.getDate();
                document.getElementById('month-year').textContent = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                clockElement.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':');
            }
        }

        // ========== TABLE MANAGEMENT ==========
        class TableManager {
            constructor(tableId, data, headers, options = {}) {
                this.tableId = tableId;
                this.originalData = [...data];
                this.headers = headers;
                this.currentPage = 1;
                this.itemsPerPage = parseInt(options.itemsPerPage || 50);
                this.sortColumn = null;
                this.sortDirection = 'asc';
                this.searchTerm = '';
                this.filterValue = '';
                this.dateColumn = options.dateColumn;
                this.statusColumn = options.statusColumn;

                if (this.dateColumn) {
                    this.originalData.sort((a, b) => {
                        const dateA = new Date(a[this.dateColumn] || 0);
                        const dateB = new Date(b[this.dateColumn] || 0);
                        return dateB - dateA;
                    });
                }
                this.filteredData = [...this.originalData];
                this.init();
            }
            init() { this.setupControls(); this.render(); }
            setupControls() {
                const searchInput = document.getElementById(this.tableId.replace('-table-body', '-search'));
                if (searchInput) searchInput.addEventListener('input', debounce((e) => { this.searchTerm = e.target.value.toLowerCase(); this.applyFilters(); }, 300));
                const filterSelect = document.getElementById(this.tableId.replace('-table-body', '-filter'));
                if (filterSelect) filterSelect.addEventListener('change', (e) => { this.filterValue = e.target.value.toLowerCase(); this.applyFilters(); });
                const perPageSelect = document.getElementById(this.tableId.replace('-table-body', '-per-page'));
                if (perPageSelect) perPageSelect.addEventListener('change', (e) => { this.itemsPerPage = parseInt(e.target.value); this.currentPage = 1; this.render(); });
                const table = document.getElementById(this.tableId).closest('table');
                table.querySelectorAll('th.sortable').forEach(header => { header.addEventListener('click', () => { const column = header.dataset.column; if (this.sortColumn === column) { this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; } else { this.sortColumn = column; this.sortDirection = 'asc'; } this.updateSortIcons(header); this.applySort(); }); });
            }
            updateSortIcons(activeHeader) {
                const table = document.getElementById(this.tableId).closest('table');
                table.querySelectorAll('th.sortable').forEach(header => { header.classList.remove('sort-asc', 'sort-desc'); });
                activeHeader.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
            applyFilters() {
                this.filteredData = this.originalData.filter(item => {
                    if (this.searchTerm && !Object.values(item).some(value => String(value).toLowerCase().includes(this.searchTerm))) return false;
                    if (this.filterValue) {
                        const statusFields = this.statusColumn ? [this.statusColumn] : ['status', 'statusInduksi'];
                        if (!statusFields.some(field => item[field] && String(item[field]).toLowerCase().includes(this.filterValue))) return false;
                    }
                    return true;
                });
                this.currentPage = 1;
                this.applySort();
            }
            applySort() {
                if (!this.sortColumn) { this.render(); return; };
                this.filteredData.sort((a, b) => {
                    let aVal = a[this.sortColumn] || '', bVal = b[this.sortColumn] || '';
                    const aNum = parseFloat(aVal), bNum = parseFloat(bVal);
                    if (!isNaN(aNum) && !isNaN(bNum)) { aVal = aNum; bVal = bNum; } else { aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase(); }
                    if (this.sortDirection === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                    else return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                });
                this.render();
            }
            render() { this.renderTable(); this.renderPagination(); }
            renderTable() {
                const tbody = document.getElementById(this.tableId);
                if (!tbody) return;
                const start = (this.currentPage - 1) * this.itemsPerPage, end = start + this.itemsPerPage;
                const pageData = this.filteredData.slice(start, end);
                if (pageData.length === 0) { tbody.innerHTML = `<tr><td colspan="${this.headers.length + 1}" class="text-center py-4 text-gray-500">Tidak ada data.</td></tr>`; return; }
                tbody.innerHTML = pageData.map((row, index) => {
                    const filteredIndex = start + index;
                    let cells = this.headers.map(header => {
                        const value = row[header] || '-';
                        let cellClass = 'py-3 px-4';
                        const lowerCaseValue = String(value).toLowerCase();
                        if (header.toLowerCase().includes('status')) {
                            if (['ok', 'closed'].includes(lowerCaseValue)) cellClass += ' text-green-600 font-semibold';
                            else if (['hold', 'open'].includes(lowerCaseValue)) cellClass += ' text-orange-500 font-semibold';
                            else if (lowerCaseValue === 'need') cellClass += ' text-red-600 font-semibold';
                        }
                        else if (header.toLowerCase().includes('score')) { const score = parseFloat(value); if (!isNaN(score)) { if (score < 75) cellClass += ' text-red-600 font-bold'; else cellClass += ' text-green-600 font-bold'; } }
                        return `<td class="${cellClass}">${value}</td>`;
                    }).join('');
                    cells += `<td class="py-3 px-4"><button class="text-purple-600 hover:underline text-sm detail-btn" data-tbody-id="${this.tableId}" data-index="${filteredIndex}">Detail</button></td>`;
                    return `<tr class="border-b hover:bg-gray-50">${cells}</tr>`;
                }).join('');
            }
            renderPagination() {
                const paginationId = this.tableId.replace('-table-body', '-pagination');
                const paginationContainer = document.getElementById(paginationId);
                const summaryId = this.tableId.replace('-table-body', '-summary');
                const summaryContainer = document.getElementById(summaryId);
                if (!paginationContainer) return;
                const totalEntries = this.filteredData.length;
                const totalPages = Math.ceil(totalEntries / this.itemsPerPage);
                const startEntry = totalEntries > 0 ? (this.currentPage - 1) * this.itemsPerPage + 1 : 0;
                const endEntry = Math.min(startEntry + this.itemsPerPage - 1, totalEntries);
                if (summaryContainer) {
                    if (totalEntries > 0) { summaryContainer.textContent = `Menampilkan ${startEntry} sampai ${endEntry} dari ${totalEntries} data`; }
                    else { summaryContainer.textContent = 'Tidak ada data untuk ditampilkan'; }
                }
                if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }
                let html = `<button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">‹</button>`;
                for (let i = 1; i <= totalPages; i++) { html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`; }
                html += `<button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">›</button>`;
                paginationContainer.innerHTML = html;
                paginationContainer.addEventListener('click', (e) => { if (e.target.classList.contains('pagination-btn') && !e.target.disabled) { this.currentPage = parseInt(e.target.dataset.page); this.render(); } });
            }
            updateData(newData) { this.originalData = [...newData]; this.applyFilters(); }
        }

        function initializeTables(data) {
            appState.tables['newHire'] = new TableManager('new-hire-table-body', data.newHire || [],
                ['date', 'nik', 'nama', 'jabatan', 'perusahaan', 'status', 'score'],
                { dateColumn: 'date', statusColumn: 'status' }
            );

            appState.tables['pascaCuti'] = new TableManager('pasca-cuti-table-body', data.pascaCuti || [],
                ['date', 'nik', 'nama', 'jabatan', 'perusahaan', 'statusInduksi', 'score'],
                { dateColumn: 'date', statusColumn: 'statusInduksi' }
            );

            appState.tables['temporary'] = new TableManager('temporary-table-body', data.temporary || [],
                ['date', 'nik', 'nama', 'jabatan', 'perusahaan', 'status', 'score'],
                { dateColumn: 'date', statusColumn: 'status' }
            );

            appState.tables['visitor'] = new TableManager('visitor-table-body', data.visitor || [],
                ['date', 'nik', 'nama', 'jabatan', 'perusahaan', 'status', 'score'],
                { dateColumn: 'date', statusColumn: 'status' }
            );

            appState.tables['pendaftaranInduksi'] = new TableManager('absensi-table-body', data.pendaftaranInduksi || [],
                ['timestamp', 'nama', 'nikKtp', 'perusahaan', 'jenisInduksi'],
                { dateColumn: 'timestamp' }
            );
        }

        function showDetailsInModal(dataObject) {
            const modal = document.getElementById('detail-modal');
            const modalBody = document.getElementById('detail-modal-body');
            if (!modal || !modalBody) return;

            let contentHtml = '<dl class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">';
            for (const key in dataObject) {
                contentHtml += `<div class="bg-gray-50 px-3 py-2 rounded-md"><dt class="font-semibold text-gray-600">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</dt><dd class="text-gray-800">${dataObject[key] || '-'}</dd></div>`;
            }
            modalBody.innerHTML = contentHtml + '</dl>';
            modal.classList.remove('hidden');
        }

        // ========== THEME & NAVIGATION ==========
        function setupTabs(tabContainerId) {
            const tabContainer = document.getElementById(tabContainerId); if (!tabContainer) return;
            const tabLinks = tabContainer.querySelectorAll('.tab-link'), tabContents = tabContainer.closest('.bg-white').querySelectorAll('.tab-content');
            tabLinks.forEach(link => {
                link.addEventListener('click', e => {
                    e.preventDefault();
                    const tabId = link.dataset.tab;
                    tabLinks.forEach(l => { l.classList.remove('border-purple-500', 'text-purple-600'); l.classList.add('border-transparent', 'text-gray-500'); });
                    link.classList.add('border-purple-500', 'text-purple-600'); link.classList.remove('border-transparent', 'text-gray-500');
                    tabContents.forEach(content => content.classList.remove('active'));
                    document.getElementById(tabId + '-content')?.classList.add('active');
                });
            });
        }
        function toggleTheme() {
            appState.currentTheme = appState.currentTheme === "light" ? "dark" : "light";
            document.body.classList.remove("theme-light", "theme-dark");
            document.body.classList.add(`theme-${appState.currentTheme}`);
            localStorage.setItem("theme", appState.currentTheme);
            const themeToggleButton = document.getElementById("theme-toggle");
            if (themeToggleButton) {
                const newIconName = appState.currentTheme === "light" ? "moon" : "sun";
                themeToggleButton.innerHTML = `<i data-lucide="${newIconName}" class="w-5 h-5 text-gray-600"></i>`;
            }
            lucide.createIcons();
        }

        // ========== PASSWORD PROTECTION (Tambahan dari index.html) ==========
        const CORRECT_PASSWORD = "gamitas2025";
        function requestPasswordAndSwitchPage(pageId, externalUrl = null) {
            if (sessionStorage.getItem('gamitas_access_granted') === 'true') {
                if (externalUrl) { window.open(externalUrl, '_blank'); }
                // Since this is not an SPA, we don't switch pages, we just allow the link to work
            } else {
                showPasswordModal(pageId, externalUrl);
            }
        }
        function showPasswordModal(pageId, externalUrl = null) {
            appState.targetPage = pageId;
            appState.targetUrl = externalUrl;
            const modal = document.getElementById('password-modal');
            const passwordInput = document.getElementById('password-input');
            const passwordError = document.getElementById('password-error');
            passwordInput.value = '';
            passwordError.classList.add('hidden');
            modal.classList.remove('hidden');
            passwordInput.focus();
        }
        function handlePasswordSubmit(e) {
            e.preventDefault();
            const passwordInput = document.getElementById('password-input');
            const passwordError = document.getElementById('password-error');
            if (passwordInput.value === CORRECT_PASSWORD) {
                sessionStorage.setItem('gamitas_access_granted', 'true');
                document.getElementById('password-modal').classList.add('hidden');
                if (appState.targetUrl) {
                    window.open(appState.targetUrl, '_blank');
                }
                appState.targetPage = null;
                appState.targetUrl = null;
            } else {
                passwordError.classList.remove('hidden');
                passwordInput.value = '';
                passwordInput.focus();
            }
        }


        // ========== EVENT LISTENERS ==========
        function setupEventListeners() {
            // PERUBAHAN: Menambahkan fungsionalitas password ke sidebar
            document.querySelectorAll('.sidebar-link').forEach(link => {
                const pageId = link.dataset.page;
                const externalUrl = link.dataset.externalUrl;
                // Hanya link yang dilindungi yang perlu event listener khusus
                const isProtected = pageId === 'pelatihan' || pageId === 'laporan_insiden' || pageId === 'observasi';

                if (isProtected) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault(); // Mencegah navigasi langsung
                        requestPasswordAndSwitchPage(pageId, externalUrl);
                    });
                }
                // Link lain (seperti Dashboard) akan berfungsi sebagai link biasa (href)
            });

            // Tandai link Induksi sebagai aktif
            document.querySelector('.sidebar-link[data-page="induksi"]')?.classList.add('active');

            setupTabs('induksi-tabs');
            document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
            document.getElementById('refresh-button').addEventListener('click', forceRefreshData);

            document.getElementById('induksi-page').addEventListener('click', (e) => {
                const detailButton = e.target.closest('.detail-btn');
                if (detailButton) {
                    const tbodyId = detailButton.dataset.tbodyId;
                    const rowIndex = parseInt(detailButton.dataset.index);
                    const tableKeyMap = {
                        'new-hire-table-body': 'newHire',
                        'pasca-cuti-table-body': 'pascaCuti',
                        'temporary-table-body': 'temporary',
                        'visitor-table-body': 'visitor',
                        'absensi-table-body': 'pendaftaranInduksi'
                    };
                    const tableKey = tableKeyMap[tbodyId];
                    const tableManager = appState.tables[tableKey];
                    if (tableManager) {
                        const dataObject = tableManager.filteredData[rowIndex];
                        if (dataObject) showDetailsInModal(dataObject);
                    }
                }
            });

            document.body.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-close-btn') || e.target.closest('.modal-close-btn') || e.target.id === 'detail-modal' || e.target.id === 'add-data-modal' || e.target.id === 'password-modal') {
                    document.querySelectorAll('.fixed.inset-0').forEach(modal => modal.classList.add('hidden'));
                }
            });

            document.getElementById('add-new-hire-btn')?.addEventListener('click', () => document.getElementById('add-data-modal').classList.remove('hidden'));

            // Sidebar mobile toggle
            const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
            const sidebar = document.getElementById('sidebar');
            mobileMenuToggle.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('show'); });
            document.addEventListener('click', (e) => { if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) { sidebar.classList.remove('show'); } });

            // Event listener untuk form password
            document.getElementById('password-form')?.addEventListener('submit', handlePasswordSubmit);
        }

        async function forceRefreshData() {
            const refreshButton = document.getElementById('refresh-button');
            if (!refreshButton) return;
            const icon = refreshButton.firstElementChild;

            if (icon) icon.classList.add('animate-spin');
            refreshButton.disabled = true;

            updateLastUpdatedTimestamp(null);

            try {
                const freshData = await fetchAllInduksiData();
                console.log("Forced refresh successful. Updating UI and cache.");
                updateUI(freshData);
                setCachedData(freshData);
            } catch (error) {
                console.log("Forced refresh failed to retrieve new data.", error);
            } finally {
                if (icon) icon.classList.remove('animate-spin');
                refreshButton.disabled = false;
            }
        }

        // ========== MAIN INITIALIZATION ==========
        async function initializePage() {
            const cached = getCachedData();

            if (cached) {
                console.log("All data loaded from cache. Rendering initial UI.");
                updateUI(cached.data);
                updateLastUpdatedTimestamp(cached.timestamp);
                // Fetch new data in background
                forceRefreshData();
            } else {
                // No cache, so do a full fetch
                await forceRefreshData();
            }
        }


        document.addEventListener('DOMContentLoaded', async function () {
            document.body.classList.add(`theme-${appState.currentTheme}`);
            const themeToggleButton = document.getElementById("theme-toggle");
            if (themeToggleButton) {
                const iconName = appState.currentTheme === 'light' ? 'moon' : 'sun';
                themeToggleButton.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5 text-gray-600"></i>`;
            }

            lucide.createIcons();

            await initializePage();

            setupEventListeners();
            setInterval(updateClock, 1000);
            updateClock();
        });
    </script>