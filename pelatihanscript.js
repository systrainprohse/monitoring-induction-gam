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

  const sheetDataCache = {};

  // 2. ELEMENT REFERENCES
  const calendarDays = document.getElementById("calendarDays");
  const monthYear = document.getElementById("monthYear");
  const modal = document.getElementById("modal");
  const closeModal = document.getElementById("closeModal");
  const filterPIC = document.getElementById("filterPIC");
  const filterRoom = document.getElementById("filterRoom");
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");

  // 3. STATE
  let currentDate = new Date();
  let allEvents = [];
  let eventsByDate = {};
  let selectedPIC = "";
  let selectedRoom = "";

  // 4. MODAL HANDLERS
  closeModal.addEventListener("click", () => modal.style.display = "none");
  window.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  function showModal(items) {
    const titleEl = document.getElementById("modalTitle");
    const dateEl = document.getElementById("modalDate");
    const roomEl = document.getElementById("modalRoom");
    const partEl = document.getElementById("modalParticipants");
    const picEl = document.getElementById("modalPIC");
    const extra = modal.querySelector(".modal-content .extra");
    if (extra) extra.remove();

    if (items.length === 1) {
      const ev = items[0];
      titleEl.textContent = ev.nama_kegiatan;
      dateEl.textContent = `${ev.tanggal_mulai} s.d. ${ev.tanggal_selesai}`;
      roomEl.textContent = ev.ruangan;
      partEl.textContent = ev.jumlah_peserta;
      picEl.textContent = ev.pic;
    } else {
      titleEl.textContent = `Ada ${items.length} kegiatan`;
      dateEl.textContent = roomEl.textContent = partEl.textContent = picEl.textContent = "";

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
      modal.querySelector(".modal-content").appendChild(container);
    }

    modal.style.display = "flex";
  }

  // 5. UTILITIES
  function formatTanggal(str) {
    const [b, h, t] = str.split('/');
    return `${t}-${b.padStart(2, '0')}-${h.padStart(2, '0')}`;
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

    monthYear.textContent = currentDate.toLocaleString("id-ID", { month: "long", year: "numeric" });

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

      if (eventsByDate[iso]) {
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
  }

  // 7. FILTER
  function applyFilters() {
    eventsByDate = {};
    allEvents.forEach(ev => {
      if (selectedPIC && ev.pic !== selectedPIC) return;
      if (selectedRoom && ev.ruangan !== selectedRoom) return;
      getTanggalRange(ev.tanggal_mulai, ev.tanggal_selesai)
        .forEach(date => {
          (eventsByDate[date] ||= []).push(ev);
        });
    });
    renderCalendar();
  }

  function applyPendaftaranFilter(data) {
  const training = document.getElementById("filterTrainingPendaftaran").value;
  const start = document.getElementById("startDatePendaftaran").value;
  const end = document.getElementById("endDatePendaftaran").value;

  const startTime = start ? new Date(start).getTime() : -Infinity;
  const endTime = end ? new Date(end).getTime() : Infinity;

  const uniqueSet = new Set();
  const filtered = data.filter(row => {
    const nama = row.TRAINING || "";
    const tanggal = row.TANGGAL || "";
    const waktu = new Date(tanggal).getTime();

    const matchTraining = training === "all" || nama === training;
    const matchTanggal = waktu >= startTime && waktu <= endTime;

    const key = `${nama}|${tanggal}`;
    if (matchTraining && matchTanggal && !uniqueSet.has(key)) {
      uniqueSet.add(key);
      return true;
    }
    return false;
  });

  document.getElementById("resultCountPendaftaran").textContent =
    `Menampilkan ${filtered.length} entri unik berdasarkan filter.`;

  renderTable(filtered, "table-pendaftaran_training");
}


  function initFilters(data) {
    const pics = [...new Set(data.map(ev => ev.pic))].sort();
    const rooms = [...new Set(data.map(ev => ev.ruangan))].sort();
    pics.forEach(p => filterPIC.add(new Option(p, p)));
    rooms.forEach(r => filterRoom.add(new Option(r, r)));
    filterPIC.addEventListener("change", e => {
      selectedPIC = e.target.value;
      applyFilters();
    });
    filterRoom.addEventListener("change", e => {
      selectedRoom = e.target.value;
      applyFilters();
    });
  }

  // 8. FETCH DATA
  async function fetchSheet(id, sheet) {
    const res = await fetch(`https://opensheet.elk.sh/${id}/${sheet}`);
    if (!res.ok) throw new Error("Fetch error");
    return res.json();
  }

  // 9. RENDER TABLE
      function renderTable(data, tableId) {
        const key = tableId.replace("table-", "");
        sheetDataCache[key] = data;

        let table = document.getElementById(tableId);
        if (!table || !data.length) {
          if (table) table.innerHTML = "<p>Data tidak tersedia.</p>";
          return;
        }

        if (table.tagName !== "TABLE") {
          const newTable = document.createElement("table");
          newTable.id = tableId;
          newTable.className = "data-table";
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

        // Inisialisasi filter hanya sekali
      }

      function initPendaftaranFilter(data) {
        const trainingSelect = document.getElementById("filterTrainingPendaftaran");
        const namaInput = document.getElementById("filterNamaPendaftaran");
        const startInput = document.getElementById("startDatePendaftaran");
        const endInput = document.getElementById("endDatePendaftaran");
        const resetBtn = document.getElementById("resetFilterPendaftaran");

        if (!trainingSelect || !namaInput || !startInput || !endInput || !resetBtn) {
          console.warn("Elemen filter tidak ditemukan.");
          return;
        }

        if (trainingSelect.options.length <= 1) {
          const uniqueTrainings = [...new Set(data.map(row => row.TRAINING))].sort();
          trainingSelect.innerHTML = `<option value="all">Semua</option>` +
            uniqueTrainings.map(t => `<option value="${t}">${t}</option>`).join("");
        }

        if (!trainingSelect.dataset.listenerAttached) {
          const applyFilter = () => applyPendaftaranFilter(data);
          [trainingSelect, namaInput, startInput, endInput].forEach(el =>
            el.addEventListener("input", applyFilter)
          );

          resetBtn.addEventListener("click", () => {
            trainingSelect.value = "all";
            namaInput.value = "";
            startInput.value = "";
            endInput.value = "";
            applyPendaftaranFilter(data);
          });

          trainingSelect.dataset.listenerAttached = "true";
        }

        // Tampilkan data awal
        applyPendaftaranFilter(data);
      }




      function applyPendaftaranFilter(data) {
        const training = document.getElementById("filterTrainingPendaftaran").value;
        const namaInput = document.getElementById("filterNamaPendaftaran").value.toLowerCase();
        const start = document.getElementById("startDatePendaftaran").value;
        const end = document.getElementById("endDatePendaftaran").value;

        const startTime = start ? new Date(start).getTime() : -Infinity;
        const endTime = end ? new Date(end).getTime() : Infinity;

        const uniqueSet = new Set();
        const filtered = data.filter(row => {
          const nama = (row.NAMA || row.Nama || "").toLowerCase();
          const trainingName = row.TRAINING || "";
          const tanggal = row.TANGGAL || "";
          const waktu = new Date(tanggal).getTime();

          const matchTraining = training === "all" || trainingName === training;
          const matchTanggal = waktu >= startTime && waktu <= endTime;
          const matchNama = nama.includes(namaInput);

          const key = `${trainingName}|${tanggal}|${nama}`;
          if (matchTraining && matchTanggal && matchNama && !uniqueSet.has(key)) {
            uniqueSet.add(key);
            return true;
          }
          return false;
        });

        document.getElementById("resultCountPendaftaran").textContent =
          `Menampilkan ${filtered.length} entri unik berdasarkan filter.`;

        renderTable(filtered, "table-pendaftaran_training");
      }


function resetPendaftaranFilter(data) {
  document.getElementById("filterTrainingPendaftaran").value = "all";
  document.getElementById("startDatePendaftaran").value = "";
  document.getElementById("endDatePendaftaran").value = "";
  applyPendaftaranFilter(data);
}



  // 10. NAVIGATION
  prevBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // 11. INIT
  (async () => {
    try {
      // Ambil dan proses data jadwal_training untuk kalender
      const { id, sheet } = SHEET_SOURCES.jadwal_training;
      const data = await fetchSheet(id, sheet);
      allEvents = data.map(ev => ({
        ...ev,
        tanggal_mulai: formatTanggal(ev.tanggal_mulai),
        tanggal_selesai: formatTanggal(ev.tanggal_selesai)
      }));
      initFilters(allEvents);
      applyFilters();

      // Tampilkan semua tabel dari SHEET_SOURCES
      for (const key of Object.keys(SHEET_SOURCES)) {
        const { id, sheet } = SHEET_SOURCES[key];
        const data = await fetchSheet(id, sheet);
        const tableId = `table-${key}`;
        renderTable(data, tableId);
      }
    } catch (err) {
      console.error("Gagal inisialisasi:", err);
    }
  })();
});
