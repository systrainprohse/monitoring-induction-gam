document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const accessRadios = document.querySelectorAll('input[name="access"]');
    // Menggunakan ID yang lebih spesifik untuk menargetkan elemen dengan andal
    const credentialFields = [
        document.getElementById('username-group'),
        document.getElementById('password-group')
    ];

    // Function to toggle visibility of credential fields based on access type
    const toggleCredentialFields = () => {
        // Saring elemen yang null untuk mencegah error jika elemen tidak ditemukan
        const validFields = credentialFields.filter(field => field);
        const accessType = document.querySelector('input[name="access"]:checked').value;
        if (accessType === 'mitra') {
            validFields.forEach(field => field.classList.add('hidden'));
            // Menonaktifkan validasi browser saat kolom disembunyikan
            if (usernameInput) usernameInput.required = false;
            if (passwordInput) passwordInput.required = false;
        } else {
            validFields.forEach(field => field.classList.remove('hidden'));
            // Mengaktifkan kembali validasi browser saat kolom ditampilkan
            if (usernameInput) usernameInput.required = true;
            if (passwordInput) passwordInput.required = true;
        }
    };

    // Add event listeners to radio buttons to toggle fields on change
    accessRadios.forEach(radio => {
        radio.addEventListener('change', toggleCredentialFields);
    });

    // Run once on page load to set the initial state
    toggleCredentialFields();

    // --- Fitur Tambahan: Tampilkan/Sembunyikan Password ---
    const togglePassword = document.getElementById('toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            // Ganti tipe input password
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            // Ganti ikon mata
            togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // --- Fitur Tambahan: Link Lupa Password ---
    const forgotPasswordLink = document.querySelector('.login-footer a');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Fitur "Lupa Password" sedang dalam pengembangan. Silakan hubungi administrator.');
        });
    }

    /**
     * Menangani proses setelah login berhasil.
     * @param {string} role - Peran pengguna ('gam' atau 'mitra').
     */
    function proceedToApp(role) {
        const successMessage = document.getElementById('success-message');

        localStorage.setItem('userRole', role);

        // Tampilkan pesan sukses
        if (successMessage) {
            successMessage.style.display = 'flex';
        }

        // Tunda pengalihan agar pengguna bisa melihat pesan
        setTimeout(() => {
            window.location.href = 'induksi.html';
        }, 1500); // Tunda 1.5 detik
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const accessType = document.querySelector('input[name="access"]:checked').value;
            const loginButton = loginForm.querySelector('.login-button');

            errorMessage.style.display = 'none';
            errorMessage.textContent = '';

            // Nonaktifkan tombol dan tampilkan status loading
            loginButton.disabled = true;
            loginButton.classList.add('loading');

            if (accessType === 'mitra') {
                // Untuk Mitra, langsung login tanpa validasi
                proceedToApp('mitra');
            } else {
                // Untuk GAM, lakukan validasi
                const username = usernameInput.value.trim();
                const password = passwordInput.value.trim();

                if (username === '' || password === '') {
                    errorMessage.textContent = 'Username dan Password tidak boleh kosong.';
                    errorMessage.style.display = 'block';
                    loginButton.disabled = false;
                    loginButton.classList.remove('loading');
                    return;
                }

                if (username === 'admin' && password === 'admin123') { // Placeholder authentication
                    proceedToApp('gam');
                } else {
                    errorMessage.textContent = 'Username atau Password salah.';
                    errorMessage.style.display = 'block';
                    loginButton.disabled = false;
                    loginButton.classList.remove('loading');
                }
            }
        });
    }

    // --- Calendar Widget Logic (with Events) ---
    const monthYearDisplay = document.getElementById('month-year');
    const calendarDays = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const modal = document.getElementById('modal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDate = document.getElementById('modalDate');
    const modalRoom = document.getElementById('modalRoom');
    const modalPIC = document.getElementById('modalPIC');
    const extraEventsContainer = document.querySelector('.extra-calendar-events');


    let currentDate = new Date();
    let allEvents = []; // To store fetched events
    let eventsByDate = {}; // To store events grouped by date

    // --- Utility Functions for Calendar ---
    function formatTanggal(str) {
        if (!str) return "";
        const parts = str.split('/');
        return parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : str;
    }

    function getTanggalRange(start, end) {
        const out = [];
        let cur = new Date(start);
        const last = new Date(end);
        while (cur <= last) {
            out.push(cur.toISOString().slice(0, 10));
            cur.setDate(cur.getDate() + 1);
        }
        return out;
    }

    function getColorForKey(key) {
        const palette = ["#7c3aed", "#16a34a", "#f59e0b", "#db2777", "#0891b2", "#5d4037", "#455a64", "#d946ef", "#0288d1"];
        const hash = [...(key || "")].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        return palette[hash % palette.length];
    }

    // --- Data Fetching for Calendar ---
    const SHEET_SOURCES = {
        jadwal_training: { id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM", sheet: "jadwal_training" }
    };

    async function fetchCalendarEvents() {
        try {
            const { id, sheet } = SHEET_SOURCES.jadwal_training;
            const res = await fetch(`https://opensheet.elk.sh/${id}/${sheet}`);
            if (!res.ok) throw new Error('Gagal mengambil data jadwal');
            const data = await res.json();
            allEvents = data.map(ev => ({ ...ev, tanggal_mulai: formatTanggal(ev.tanggal_mulai), tanggal_selesai: formatTanggal(ev.tanggal_selesai) }));
            processEventsForCalendar();
            renderCalendar();
        } catch (err) {
            console.error("Gagal memuat event kalender:", err);
        }
    }

    function processEventsForCalendar() {
        eventsByDate = {};
        allEvents.forEach(ev => {
            getTanggalRange(ev.tanggal_mulai, ev.tanggal_selesai).forEach(date => {
                (eventsByDate[date] ||= []).push(ev);
            });
        });
    }

    function showModal(items) {
        if (!modal || !items || items.length === 0) return;

        // Reset content
        modalTitle.textContent = '';
        modalDate.textContent = '';
        modalRoom.textContent = '';
        modalPIC.textContent = '';
        extraEventsContainer.innerHTML = '';

        if (items.length === 1) {
            const ev = items[0];
            modalTitle.textContent = ev.nama_kegiatan;
            modalDate.textContent = `${ev.tanggal_mulai} s.d. ${ev.tanggal_selesai}`;
            modalRoom.textContent = ev.ruangan || 'N/A';
            modalPIC.textContent = ev.pic || 'N/A';
        } else {
            modalTitle.textContent = `Ada ${items.length} kegiatan`;
            items.forEach(ev => {
                const p = document.createElement("p");
                p.innerHTML = `
                    <strong>${ev.nama_kegiatan}</strong><br>
                    Tanggal: ${ev.tanggal_mulai} s.d. ${ev.tanggal_selesai}<br>
                    Ruangan: ${ev.ruangan || 'N/A'}<br>
                    PIC: ${ev.pic || 'N/A'}
                `;
                extraEventsContainer.appendChild(p);
            });
        }
        modal.style.display = "flex";
    }

    function renderCalendar() {
        if (!monthYearDisplay || !calendarDays) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYearDisplay.textContent = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        calendarDays.innerHTML = '';

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);

        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day other-month';
            calendarDays.appendChild(emptyCell);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'day';
            const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            const dateNumber = document.createElement('div');
            dateNumber.className = 'date-number';
            dateNumber.textContent = i;
            dayCell.appendChild(dateNumber);

            if (isoDate === todayISO) {
                dayCell.classList.add('today');
            }

            if (eventsByDate[isoDate]) {
                dayCell.classList.add('has-event');
                const eventsContainer = document.createElement('div');
                eventsContainer.className = 'events-container';
                eventsByDate[isoDate].forEach(ev => {
                    const eventLabel = document.createElement('div');
                    eventLabel.className = 'event-label';
                    eventLabel.textContent = ev.nama_kegiatan;
                    eventLabel.style.backgroundColor = getColorForKey(ev.nama_kegiatan);
                    eventLabel.title = ev.nama_kegiatan;
                    eventsContainer.appendChild(eventLabel);
                });
                dayCell.style.cursor = 'pointer';
                dayCell.addEventListener('click', () => showModal(eventsByDate[isoDate]));
                dayCell.appendChild(eventsContainer);
            }
            calendarDays.appendChild(dayCell);
        }
    }

    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    fetchCalendarEvents();
});