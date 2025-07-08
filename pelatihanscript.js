window.addEventListener('DOMContentLoaded', () => {
  // 1. CONFIG
  const SHEET_SOURCES = {
    monitoring_pelatihan: {
      id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM",
      sheet: "monitoring"
    },
    pendaftaran_training: {
      id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM",
      sheet: "training_register"
    },
    jadwal_training: {
      id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM",
      sheet: "jadwal_training"
    }
  };

  const kolomTampilkan = {
    monitoring_pelatihan: ["tanggal", "perusahaan", "skor_rata2"],
    pendaftaran_training: ["TRAINING", "PERUSAHAAN", "TANGGAL", "DEPT", "NAMA"],
    jadwal_training: ["tanggal_mulai", "tanggal_selesai", "nama_kegiatan", "ruangan", "jumlah_peserta", "pic"]
  };

  const sheetDataCache = {}; // Cache untuk menyimpan data yang sudah diambil

  // 2. ELEMENT REFERENCES
  const calendarDays = document.getElementById("calendarDays");
  const monthYear = document.getElementById("monthYear");
  const modal = document.getElementById("modal");
  const closeModal = document.getElementById("closeModal");
  const filterPIC = document.getElementById("filterPIC");
  const filterRoom = document.getElementById("filterRoom");
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");

  // Loader elements (assuming they exist in your HTML)
  const loader = document.getElementById('loader');

  // 3. STATE
  let currentDate = new Date();
  let allEvents = []; // Data untuk kalender
  let eventsByDate = {};
  let selectedPIC = "";
  let selectedRoom = "";

  // Fungsi untuk menampilkan dan menyembunyikan loader
  function showLoader() {
    if (loader) loader.style.display = "block";
  }

  function hideLoader() {
    if (loader) loader.style.display = "none";
  }

  // 4. MODAL HANDLERS
  if (closeModal) {
    closeModal.addEventListener("click", () => {
      console.log("Modal closed.");
      if (modal) modal.style.display = "none";
    });
  }
  if (modal) {
    window.addEventListener("click", e => {
      if (e.target === modal) {
        console.log("Clicked outside modal, closing.");
        modal.style.display = "none";
      }
    });
  }

  function showModal(items) {
    console.log("Showing modal with items:", items);
    const modalContent = modal?.querySelector(".modal-content");
    if (!modalContent) {
      console.error("Modal content element not found.");
      return;
    }

    const titleEl = document.getElementById("modalTitle");
    const dateEl = document.getElementById("modalDate");
    const roomEl = document.getElementById("modalRoom");
    const partEl = document.getElementById("modalParticipants");
    const picEl = document.getElementById("modalPIC");
    const extra = modalContent.querySelector(".extra"); // Gunakan modalContent

    if (extra) extra.remove();

    if (items.length === 1) {
      const ev = items[0];
      if (titleEl) titleEl.textContent = ev.nama_kegiatan;
      if (dateEl) dateEl.textContent = `${ev.tanggal_mulai} s.d. ${ev.tanggal_selesai}`;
      if (roomEl) roomEl.textContent = ev.ruangan;
      if (partEl) partEl.textContent = ev.jumlah_peserta;
      if (picEl) picEl.textContent = ev.pic;
    } else {
      if (titleEl) titleEl.textContent = `Ada ${items.length} kegiatan`;
      if (dateEl) dateEl.textContent = "";
      if (roomEl) roomEl.textContent = "";
      if (partEl) partEl.textContent = "";
      if (picEl) picEl.textContent = "";

      const container = document.createElement("div");
      container.className = "extra";
      items.forEach(ev => {
        const p = document.createElement("p");
        p.innerHTML = `
          <strong>${ev.nama_kegiatan}</strong><br>
          ${ev.tanggal_mulai} s.d. ${ev.tanggal_selesai}<br>
          Ruangan: ${ev.ruangan}<br>
          Peserta: ${ev.jumlah_peserta}<br>
          PIC: ${ev.pic}<br><br>
        `;
        container.appendChild(p);
      });
      modalContent.appendChild(container); // Gunakan modalContent
    }
    if (modal) {
      modal.style.display = "flex";
    }
  }

  // 5. UTILITIES
  function formatTanggal(str) {
    // Memastikan format tanggal konsisten (YYYY-MM-DD)
    if (!str) return "";
    const parts = str.split('/');
    if (parts.length === 3) {
      // Format DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    // Asumsikan sudah Malhotra-MM-DD atau format lain yang bisa diparse Date
    return str;
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
    const palette = [
      "#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#c2185b",
      "#0097a7", "#5d4037", "#455a64", "#d32f2f", "#0288d1"
    ];
    const hash = [...key].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return palette[hash % palette.length];
  }

  // 6. RENDER CALENDAR
  function renderCalendar() {
    const Y = currentDate.getFullYear();
    const M = currentDate.getMonth();
    const firstDay = new Date(Y, M, 1).getDay();
    const daysInMonth = new Date(Y, M + 1, 0).getDate();

    const now = new Date();
    const todayISO = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    if (monthYear) {
      monthYear.textContent = currentDate.toLocaleString("id-ID", { month: "long", year: "numeric" });
    }

    if (calendarDays) {
      calendarDays.innerHTML = "";
      for (let i = 0; i < firstDay; i++) {
        calendarDays.appendChild(document.createElement("div"));
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${Y}-${String(M + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement("div");
        cell.className = "day";
        cell.innerHTML = `<div class="date-number">${d}</div>`;

        if (iso === todayISO) {
          cell.classList.add("today");
        }

        if (eventsByDate[iso] && eventsByDate[iso].length > 0) { // Pastikan ada event untuk tanggal ini
          cell.classList.add("has-event");
          eventsByDate[iso].forEach(ev => {
            const lbl = document.createElement("div");
            lbl.className = "event-label";
            lbl.textContent = ev.nama_kegiatan;
            lbl.style.backgroundColor = getColorForKey(ev.nama_kegiatan);
            cell.appendChild(lbl);
          });
          cell.addEventListener("click", () => showModal(eventsByDate[iso]));
        }
        calendarDays.appendChild(cell);
      }
      console.log("Calendar rendered for:", monthYear.textContent, "with eventsByDate:", eventsByDate);
    } else {
      console.warn("calendarDays element not found. Cannot render calendar.");
    }
  }

  // 7. FILTER KALENDER
  function applyFilters() {
    eventsByDate = {};
    // Selalu filter dari data asli allEvents
    allEvents.forEach(ev => {
      if (selectedPIC && ev.pic && ev.pic !== selectedPIC) return; // Tambahkan null check untuk ev.pic
      if (selectedRoom && ev.ruangan && ev.ruangan !== selectedRoom) return; // Tambahkan null check untuk ev.ruangan
      getTanggalRange(ev.tanggal_mulai, ev.tanggal_selesai)
        .forEach(date => {
          (eventsByDate[date] ||= []).push(ev);
        });
    });
    console.log("Events by Date after filtering:", eventsByDate);
    renderCalendar();
  }

  function initFilters(data) {
    // Pastikan data yang masuk ke map tidak undefined
    const pics = [...new Set(data.map(ev => ev.pic).filter(Boolean))].sort(); // Filter out undefined/null
    const rooms = [...new Set(data.map(ev => ev.ruangan).filter(Boolean))].sort(); // Filter out undefined/null

    if (filterPIC) {
      filterPIC.innerHTML = `<option value="">Semua PIC</option>`;
      pics.forEach(p => filterPIC.add(new Option(p, p)));
      if (!filterPIC.dataset.listenerAttached) { // Pastikan hanya dilampirkan sekali
        filterPIC.addEventListener("change", e => {
          selectedPIC = e.target.value;
          applyFilters();
        });
        filterPIC.dataset.listenerAttached = "true";
      }
    } else {
      console.warn("Filter PIC element not found.");
    }

    if (filterRoom) {
      filterRoom.innerHTML = `<option value="">Semua Ruangan</option>`;
      rooms.forEach(r => filterRoom.add(new Option(r, r)));
      if (!filterRoom.dataset.listenerAttached) { // Pastikan hanya dilampirkan sekali
        filterRoom.addEventListener("change", e => {
          selectedRoom = e.target.value;
          applyFilters();
        });
        filterRoom.dataset.listenerAttached = "true";
      }
    } else {
      console.warn("Filter Room element not found.");
    }
    console.log("Calendar filters initialized with PICs:", pics, "and Rooms:", rooms);
  }

  // 8. FETCH DATA
  async function fetchSheet(id, sheet) {
    if (sheetDataCache[sheet]) {
      console.log(`Mengembalikan data yang di-cache untuk sheet: ${sheet}`);
      return sheetDataCache[sheet];
    }
    showLoader();
    try {
      const res = await fetch(`https://opensheet.elk.sh/${id}/${sheet}`);
      if (!res.ok) throw new Error(`Gagal mengambil data dari sheet: ${sheet}`);
      const data = await res.json();
      sheetDataCache[sheet] = data; // Cache data
      console.log(`Data berhasil diambil dan di-cache untuk sheet: ${sheet}`, data);
      return data;
    } catch (err) {
      console.error(`Error fetching sheet ${sheet}:`, err);
      return [];
    } finally {
      hideLoader();
    }
  }

  // 9. RENDER TABLE
  function renderTable(data, tableId) {
    const key = tableId.replace("table-", "");
    let table = document.getElementById(tableId);

    if (!table) {
      console.error(`Elemen tabel dengan ID '${tableId}' tidak ditemukan.`);
      return;
    }

    if (!data || data.length === 0) {
      table.innerHTML = "<p>Data tidak tersedia.</p>";
      return;
    }

    // Pastikan elemen adalah TABLE, jika tidak, buat yang baru
    if (table.tagName !== "TABLE") {
      const newTable = document.createElement("table");
      newTable.id = tableId;
      newTable.className = "data-table"; // Tambahkan kelas jika diperlukan
      table.replaceWith(newTable);
      table = newTable;
    }

    const allowed = kolomTampilkan[key] || Object.keys(data[0]);

    const thead = `<thead><tr>${allowed.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${data.map(row =>
      `<tr>${allowed.map(h => `<td>${row[h] || ""}</td>`).join("")}</tr>`
    ).join("")}</tbody>`;

    table.innerHTML = thead + tbody;
    table.classList.remove("loaded");
    setTimeout(() => table.classList.add("loaded"), 10);
    console.log(`Table '${tableId}' rendered with ${data.length} rows.`);
  }

  // Filter untuk Pendaftaran Training
  function applyPendaftaranFilter() {
    const trainingSelect = document.getElementById("filterTrainingPendaftaran");
    const namaInput = document.getElementById("filterNamaPendaftaran");
    const startInput = document.getElementById("startDatePendaftaran");
    const endInput = document.getElementById("endDatePendaftaran");

    // Pastikan elemen-elemen filter ada sebelum mencoba mengakses nilainya
    const training = trainingSelect ? trainingSelect.value : "all";
    const namaSearch = namaInput ? namaInput.value.toLowerCase() : "";
    const start = startInput ? startInput.value : "";
    const end = endInput ? endInput.value : "";

    console.log("Applying Pendaftaran Filter:");
    console.log("  Training:", training);
    console.log("  Nama Search:", namaSearch);
    console.log("  Start Date:", start);
    console.log("  End Date:", end);


    // Selalu filter dari data asli yang di-cache
    const dataToFilter = sheetDataCache[SHEET_SOURCES.pendaftaran_training.sheet] || [];
    console.log("Data untuk difilter (Pendaftaran Training):", dataToFilter);


    const startTime = start ? new Date(start).getTime() : -Infinity;
    const endTime = end ? new Date(end).getTime() : Infinity;

    const uniqueSet = new Set();
    const filtered = dataToFilter.filter(row => {
      const namaRow = (row.NAMA || row.Nama || "").toLowerCase();
      const trainingNameRow = row.TRAINING || "";
      const tanggalRow = row.TANGGAL || "";
      const waktuRow = new Date(tanggalRow).getTime();

      const matchTraining = training === "all" || trainingNameRow === training;
      const matchTanggal = waktuRow >= startTime && waktuRow <= endTime;
      const matchNama = namaRow.includes(namaSearch);

      const key = `${trainingNameRow}|${tanggalRow}|${namaRow}`; // Kunci unik untuk menghindari duplikat
      if (matchTraining && matchTanggal && matchNama && !uniqueSet.has(key)) {
        uniqueSet.add(key);
        return true;
      }
      return false;
    });

    const resultCountEl = document.getElementById("resultCountPendaftaran");
    if (resultCountEl) {
      resultCountEl.textContent = `Menampilkan ${filtered.length} entri unik berdasarkan filter.`;
    }

    console.log("Filtered Pendaftaran Training data:", filtered);
    renderTable(filtered, "table-pendaftaran_training");
  }

  function initPendaftaranFilter() {
    const trainingSelect = document.getElementById("filterTrainingPendaftaran");
    const namaInput = document.getElementById("filterNamaPendaftaran");
    const startInput = document.getElementById("startDatePendaftaran");
    const endInput = document.getElementById("endDatePendaftaran");
    const resetBtn = document.getElementById("resetFilterPendaftaran");
    const data = sheetDataCache[SHEET_SOURCES.pendaftaran_training.sheet] || [];

    if (!trainingSelect || !namaInput || !startInput || !endInput || !resetBtn) {
      console.warn("Elemen filter pendaftaran tidak ditemukan. Pastikan ID HTML sudah benar.");
      return;
    }

    if (trainingSelect.options.length <= 1 || trainingSelect.options[1]?.value === "Tidak Ada Data") { // Hanya isi ulang jika belum ada opsi atau ada placeholder "Tidak Ada Data"
      if (data.length > 0) {
        const uniqueTrainings = [...new Set(data.map(row => row.TRAINING).filter(Boolean))].sort(); // Filter out undefined/null
        trainingSelect.innerHTML = `<option value="all">Semua</option>` +
          uniqueTrainings.map(t => `<option value="${t}">${t}</option>`).join("");
        console.log("Training filter options populated:", uniqueTrainings);
      } else {
        console.warn("Tidak ada data untuk mengisi filter training.");
        trainingSelect.innerHTML = `<option value="all">Tidak Ada Data</option>`;
      }
    }


    // Pastikan event listener hanya dilampirkan sekali
    if (!trainingSelect.dataset.listenerAttached) {
      [trainingSelect, namaInput, startInput, endInput].forEach(el =>
        el.addEventListener("input", applyPendaftaranFilter)
      );
      // Tambahkan event listener untuk 'change' juga, terutama untuk input date
      [trainingSelect, startInput, endInput].forEach(el =>
        el.addEventListener("change", applyPendaftaranFilter)
      );


      resetBtn.addEventListener("click", () => {
        trainingSelect.value = "all";
        namaInput.value = "";
        startInput.value = "";
        endInput.value = "";
        applyPendaftaranFilter();
      });

      trainingSelect.dataset.listenerAttached = "true";
      console.log("Pendaftaran filter event listeners attached.");
    }

    // Tampilkan data awal setelah inisialisasi filter
    applyPendaftaranFilter();
  }

  // 10. NAVIGATION (untuk kalender)
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });
  }

  /**
   * Opens a specific tab in the UI.
   * @param {string} tabId - The ID of the tab content to show.
   * @param {Event} event - The click event (optional).
   */
  function openTab(tabId, event) {
    console.log("Attempting to open tab:", tabId);
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const targetTabContent = document.getElementById(tabId);
    if (targetTabContent) {
      targetTabContent.classList.add('active');
      console.log(`Tab content '${tabId}' activated.`);
    } else {
      console.warn(`Tab content with ID '${tabId}' not found. Cannot activate.`);
    }


    // Menemukan tombol tab yang sesuai berdasarkan data-tab
    let targetTabButton = null;
    document.querySelectorAll('.tab-btn').forEach(button => {
      if (button.dataset.tab === tabId) {
        targetTabButton = button;
      }
    });

    // Jika event disediakan (klik tombol), gunakan target event
    // Jika tidak, gunakan tombol yang ditemukan berdasarkan data-tab
    if (event && event.target) {
      event.target.classList.add('active');
      console.log(`Tab button for '${tabId}' activated via event target.`);
    } else if (targetTabButton) {
      targetTabButton.classList.add('active');
      console.log(`Tab button for '${tabId}' activated via data-tab.`);
    } else {
      console.warn(`Tab button for '${tabId}' not found to activate.`);
    }


    // Panggil fungsi inisialisasi/filter yang relevan saat tab diaktifkan
    if (tabId === 'pendaftaran_training') { // ID tab Pendaftaran Pelatihan
      console.log("Calling initPendaftaranFilter for tab:", tabId);
      initPendaftaranFilter();
    } else if (tabId === 'calendar') { // ID tab Jadwal Pelatihan (Kalender)
      console.log("Calling applyFilters for tab:", tabId);
      applyFilters(); // Untuk memastikan kalender di-render ulang dengan filter
    } else if (tabId === 'grafik') { // ID tab Monitoring Pelatihan
        // Asumsi 'grafik' menampilkan tabel monitoring_pelatihan
        console.log("Rendering monitoring_pelatihan table for tab:", tabId);
        if (sheetDataCache[SHEET_SOURCES.monitoring_pelatihan.sheet]) {
            renderTable(sheetDataCache[SHEET_SOURCES.monitoring_pelatihan.sheet], 'table-monitoring_pelatihan', 'monitoring_pelatihan');
        } else {
            // Jika data belum di-cache, fetch dan render
            fetchSheet(SHEET_SOURCES.monitoring_pelatihan.id, SHEET_SOURCES.monitoring_pelatihan.sheet)
                .then(data => renderTable(data, 'table-monitoring_pelatihan', 'monitoring_pelatihan'))
                .catch(error => console.error("Failed to fetch/render monitoring_pelatihan:", error));
        }
    }
    // Tambahkan logika untuk tab 'kompetensi' jika diperlukan
    else if (tabId === 'kompetensi') {
        console.log("Tab 'kompetensi' activated. Implement rendering logic here if needed.");
        // Anda mungkin perlu memanggil fungsi renderTable atau inisialisasi lain untuk tab ini
        // Contoh: renderTable(sheetDataCache.kompetensi_data, 'table-kompetensi', 'kompetensi');
    }
  }


  // 11. INIT - Fungsi inisialisasi utama
  (async () => {
    showLoader(); // Tampilkan loader di awal inisialisasi
    try {
      // Ambil dan proses data jadwal_training untuk kalender
      const jadwalTrainingData = await fetchSheet(
        SHEET_SOURCES.jadwal_training.id,
        SHEET_SOURCES.jadwal_training.sheet
      );
      allEvents = jadwalTrainingData.map(ev => ({
        ...ev,
        tanggal_mulai: formatTanggal(ev.tanggal_mulai),
        tanggal_selesai: formatTanggal(ev.tanggal_selesai)
      }));
      console.log("All calendar events after fetch and format:", allEvents);

      initFilters(allEvents); // Inisialisasi filter kalender
      // applyFilters() akan dipanggil oleh openTab('calendar')

      // Ambil data untuk Pendaftaran Training
      await fetchSheet(SHEET_SOURCES.pendaftaran_training.id, SHEET_SOURCES.pendaftaran_training.sheet);
      // initPendaftaranFilter() akan dipanggil oleh openTab('pendaftaran_training')

      // Ambil data untuk Monitoring Pelatihan
      await fetchSheet(SHEET_SOURCES.monitoring_pelatihan.id, SHEET_SOURCES.monitoring_pelatihan.sheet);


    } catch (err) {
      console.error("Gagal inisialisasi:", err);
    } finally {
      hideLoader(); // Sembunyikan loader setelah semua data diproses
    }
  })();

  // --- Initial Setup on Page Load ---
  // Event listener untuk tombol tab
  document.querySelectorAll('.tab-btn').forEach(button => {
    // Hapus atribut onclick jika ada di HTML
    button.removeAttribute('onclick');
    button.addEventListener('click', (event) => {
      const tabId = event.target.dataset.tab; // Ambil ID dari data-tab
      if (tabId) {
        openTab(tabId, event);
      }
    });
  });

  // Set tab "Jadwal Pelatihan" sebagai default saat halaman dimuat
  // Asumsi ID div konten untuk "Jadwal Pelatihan" adalah 'calendar'
  openTab('calendar', document.querySelector('.tab-btn[data-tab="calendar"]'));

});
