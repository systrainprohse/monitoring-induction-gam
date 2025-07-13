// --- Global Variables and Constants ---
updateBannerText(
  "🚧 Hari ini ada inspeksi K3 di area workshop • Pastikan semua APD lengkap •"
);

// Konfigurasi sumber data Google Sheet untuk halaman Induksi
const SHEET_SOURCES = {
  pendaftaran: {
    id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk",
    sheet: "pendaftaran_induksi",
  },
  spdk: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "spdk" },
  checklist_induksi: {
    id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk",
    sheet: "induction_checklist",
  },
  hasil_induksi: {
    id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk",
    sheet: "induction_result",
  },
  // MEMPERBAIKI ID UNTUK REMIDIAL (ID sebelumnya salah)
  remidial: {
    id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk",
    sheet: "remidial",
  },
  grafik: {
    id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk",
    sheet: "DashboardGrafik",
  },
  newhire: {
    id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk",
    sheet: "new_hire",
  },
  setting: {
    id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk",
    sheet: "setting",
  },

  temporary: {
    id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk",
    sheet: "temporary_data",
  }, // Data untuk tab Temporary
};

const kolomTampilkan = {
  // <— induksi
  newhire: [
    "tanggal",
    "NIK",
    "NAMA",
    "JABATAN",
    "perusahaan",
    "checklist",
    "SPDK",
    "SCORE",
    "APV SYS",
    "APV HSE",
    "STATUS",
  ],
  pendaftaran: [
    "tanggal",
    "perusahaan",
    "NAMA",
    "JABATAN",
    "JENIS INDUKSI",
    "HARI",
    "DATE",
  ],
  spdk: ["tanggal", "perusahaan", "NAMA", "SPDK"],
  checklist_induksi: ["tanggal", "perusahaan", "NAMA", "CHECKLIST"],
  hasil_induksi: [
    "tanggal",
    "perusahaan",
    "NAMA",
    "JABATAN",
    "KATEGORI",
    "S. SIMPER",
    "SCORE K3",
    "S. JABATAN",
    "S.RATA-RATA",
  ],
  remidial: [
    "tanggal",
    "perusahaan",
    "NAMA",
    "JABATAN",
    "KATEGORI",
    "S. SIMPER",
    "SCORE K3",
    "S. JABATAN",
    "S.RATA-RATA",
  ],
  temporary: [
    "DATE",
    "SCORE",
    "NAMA",
    "PERUSAHAAN",
    "DEPARTEMENT",
    "JABATAN",
    "PEMATERI",
    "STATUS",
  ], // Kolom untuk tab Temporary
  grafik: [
    "TANGGAL INDUKSI",
    "CUTI",
    "NEW HIRE",
    "NAMA JABATAN",
    "SCORE_TERENDAH",
    "SCORE_TERTINGGI",
  ],
};

let perusahaanList = [];
let currentFilteredData = {}; // Stores the currently filtered data for each table
let sortState = {}; // Objek untuk menyimpan status sorting setiap tabel { key: { column, direction } }
let audioUnlocked = false; // Flag untuk melacak apakah audio sudah diizinkan

/**
 * Loads and sorts the unique list of companies from the "setting" sheet.
 */
async function loadPerusahaanList() {
  const { id, sheet } = SHEET_SOURCES["setting"];
  const data = await fetchAndCacheSheet(id, sheet, "setting"); // Menggunakan fetchAndCacheSheet untuk konsistensi dan efisiensi
  const seen = new Set();
  perusahaanList = [];

  data.forEach((d) => {
    const nama = d["perusahaan"];
    if (nama) {
      const key = nama.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        perusahaanList.push(nama.trim());
      }
    }
  });
  perusahaanList.sort();
  // console.log("Perusahaan unik:", perusahaanList);
}

/**
 * Parses a date string into a Date object. Handles "DD/MM/YYYY" and "YYYY-MM-DD".
 * @param {string} str - The date string.
 * @returns {Date} - The parsed Date object.
 */
function parseTanggal(str) {
  if (!str) return new Date("Invalid Date");
  // Try YYYY-MM-DD first (standard ISO format)
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;

  // Try DD/MM/YYYY
  if (str.includes("/")) {
    const [d, m, y] = str.split("/");
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date("Invalid Date");
}

/**
 * Applies styling and emojis to table cells based on header and value.
 * @param {string} header - The column header.
 * @param {*} value - The cell value.
 * @returns {{warna: string, emoji: string}} - CSS class and emoji.
 */
function getCellStyle(header, value) {
  const hLower = header.toLowerCase();
  const valueLower = String(value).toLowerCase();

  // Define keywords for different categories
  const scoreKeywords = ["score", "rata-rata", "nilai"];
  const statusKeywords = ["status", "checklist", "spdk", "apv"]; // Simplified check

  // Check if the header matches any keyword category
  const isScore = scoreKeywords.some((kw) => hLower.includes(kw));
  const isStatus = statusKeywords.some((kw) => hLower.includes(kw));

  const angka = parseFloat(value);

  let warna = "";
  let emoji = "";

  if (isScore && !isNaN(angka)) {
    if (angka < 75) {
      warna = "red"; // Represents failure/low score
      emoji = "❌ ";
    } else {
      warna = "green"; // Represents success/high score
      emoji = "✅ ";
    }
  } else if (isStatus) {
    // Standardize status values
    if (["approved", "ok", "done", "lengkap", "ya"].includes(valueLower)) {
      warna = "approved"; // Green for completion/approval
      emoji = "✅ ";
    } else if (
      ["rejected", "no", "tidak", "gagal", "belum"].includes(valueLower)
    ) {
      warna = "red"; // Red for rejection/failure
      emoji = "❌ ";
    } else if (["hold", "pending", "menunggu", "proses"].includes(valueLower)) {
      warna = "hold"; // Yellow for pending states
      emoji = "⚠️ ";
    }
  }
  return { warna, emoji };
}

// --- DOM Manipulation and Event Handlers ---

/**
 * Mengatur status sorting untuk tabel tertentu dan memicu filter ulang.
 * @param {string} key - Kunci tabel (misal: "newhire").
 * @param {string} column - Nama kolom yang akan diurutkan.
 */
function setSortAndRefilter(key, column) {
  const currentSort = sortState[key];
  let direction = "asc";
  if (currentSort && currentSort.column === column) {
    direction = currentSort.direction === "asc" ? "desc" : "asc";
  }
  sortState[key] = { column, direction };
  applyFilter(key); // Terapkan filter ulang untuk mengurutkan dan merender ulang
}

/**
 * Membuat dan menyisipkan notifikasi offline jika data berasal dari cache.
 * @param {string} key - Kunci data (misal: "newhire").
 * @param {HTMLElement} tableElement - Elemen tabel tempat notifikasi akan disisipkan.
 */
function renderOfflineNotice(key, tableElement) {
  const tabContent = tableElement.closest(".tab-content");
  if (!tabContent) return;

  // Hapus notifikasi lama untuk mencegah duplikasi
  const existingNotice = tabContent.querySelector(".offline-notice");
  if (existingNotice) existingNotice.remove();

  const lastUpdateTimestamp = offlineTimestamps[key];
  if (lastUpdateTimestamp) {
    const notice = document.createElement("div");
    notice.className = "offline-notice";
    notice.innerHTML = `Anda melihat data offline. Terakhir diperbarui: <strong>${new Date(
      lastUpdateTimestamp
    ).toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    })}</strong>`;

    const firstChild = tabContent.querySelector(
      ".filter-bar, .filter-container, .table-wrapper"
    );
    if (firstChild) {
      tabContent.insertBefore(notice, firstChild);
    } else {
      tabContent.prepend(notice);
    }
  }
}

/**
 * Menambahkan efek zoom interaktif pada baris tabel.
 * @param {HTMLElement} tableBody - Elemen tbody dari tabel.
 */
function addZoomEffectListener(tableBody) {
  // Implementasi logika zoom yang sudah ada...
}

/**
 * Renders data into a specific table.
 * @param {Array} data - The data to render.
 * @param {string} tableId - The ID of the table element.
 * @param {string} key - The key identifying the data source (e.g., "newhire").
 */
function renderTable(data, tableId, key) {
  const table = document.getElementById(tableId);
  if (!table) {
    console.error(`Table element with ID '${tableId}' not found.`);
    return; // Keluar jika elemen tabel tidak ditemukan
  }

  const fragment = document.createDocumentFragment();

  // 1. Filter out invalid data rows (null, undefined, or empty objects)
  const validData = data
    ? data.filter((row) => row && Object.keys(row).length > 0)
    : [];

  // 2. Determine columns to display
  let allowed = kolomTampilkan[key];
  if (!allowed && validData.length > 0) {
    // Fallback to keys of the first valid row if not defined in kolomTampilkan
    allowed = Object.keys(validData[0]);
  }

  // 3. Render "No Data" message if there's no valid data or no columns to show
  if (validData.length === 0 || !allowed || allowed.length === 0) {
    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = "Data tidak tersedia.";
    td.colSpan = (kolomTampilkan[key] || []).length || 1;
    td.className = "placeholder-cell";
    tr.appendChild(td);
    tbody.appendChild(tr);
    fragment.appendChild(tbody);
    table.innerHTML = "";
    table.appendChild(fragment);
    return;
  }

  // 4. Render the table if data is valid
  renderOfflineNotice(key, table);

  // Create table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  allowed.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h.toUpperCase();
    th.style.cursor = "pointer";
    th.title = `Urutkan berdasarkan ${h}`;
    if (sortState[key] && sortState[key].column === h) {
      th.innerHTML +=
        sortState[key].direction === "asc"
          ? ' <span class="sort-arrow">▲</span>'
          : ' <span class="sort-arrow">▼</span>';
    }
    th.addEventListener("click", () => setSortAndRefilter(key, h));
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  fragment.appendChild(thead);

  // Create table body
  const tbody = document.createElement("tbody");
  validData.forEach((row) => {
    const tr = document.createElement("tr");
    allowed.forEach((h) => {
      const td = document.createElement("td");
      const nilai = row[h] || "";
      const { warna, emoji } = getCellStyle(h, nilai);
      if (warna) {
        const badge = document.createElement("span");
        badge.className = `badge ${warna}`;
        badge.textContent = emoji + nilai;
        td.appendChild(badge);
      } else {
        td.textContent = nilai;
      }
      td.title = nilai;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  fragment.appendChild(tbody);

  // Clear existing table content before appending new fragment
  table.innerHTML = "";
  table.appendChild(fragment);

  // Add click event listener for zoom effect using event delegation
  const tableBody = table.querySelector("tbody");
  if (tableBody) {
    tableBody.addEventListener("click", (event) => {
      const clickedRow = event.target.closest("tr");
      if (!clickedRow || !clickedRow.parentElement) return;

      const allRows = tableBody.querySelectorAll("tr");
      const isAlreadyZoomed = clickedRow.classList.contains("zoomed-in");

      allRows.forEach((r) => r.classList.remove("zoomed-in", "zoomed-out"));

      if (!isAlreadyZoomed) {
        clickedRow.classList.add("zoomed-in");
        allRows.forEach((r) => {
          if (r !== clickedRow) {
            r.classList.add("zoomed-out");
          }
        });
      }
    });
  }

  // Populate filter dropdown if available
  const filter = document.getElementById(`filter-${key}`);
  if (filter && perusahaanList.length && filter.options.length <= 1) {
    filter.innerHTML =
      `<option value="all">Semua</option>` +
      perusahaanList.map((p) => `<option value="${p}">${p}</option>`).join("");
  }

  table.classList.remove("loaded");
  setTimeout(() => table.classList.add("loaded"), 10);
}

/**
 * Merender kartu-kartu Key Performance Indicator (KPI) untuk halaman Induksi.
 * @param {Array<Object>} pendaftaranData - Data dari sheet pendaftaran.
 * @param {Array<Object>} hasilInduksiData - Data dari sheet hasil_induksi.
 * @param {Array<Object>} temporaryData - Data dari sheet temporary.
 * @param {Array<Object>} newhireData - Data dari sheet new_hire.
 */
function renderInduksiKPIs(
  pendaftaranData,
  hasilInduksiData,
  temporaryData,
  newhireData
) {
  const kpiContainer = document.getElementById("kpi-container-total");
  if (!kpiContainer) return;

  // 1. Hitung Total Pendaftaran
  const totalPendaftaran = pendaftaranData.length;

  // 2. Hitung statistik skor dari sheet 'hasil_induksi'
  const scores = hasilInduksiData
    .map((item) => {
      // Membuat parsing lebih kuat dengan mengganti koma dan menghapus spasi
      const scoreStr = String(item["S.RATA-RATA"] || "").replace(",", ".");
      return parseFloat(scoreStr);
    })
    .filter((score) => !isNaN(score)); // Filter hanya nilai yang valid (angka)

  let minScore = 0;
  let maxScore = 0;
  let avgScore = 0;

  if (scores.length > 0) {
    minScore = Math.min(...scores);
    maxScore = Math.max(...scores);
    const sumScores = scores.reduce((sum, score) => sum + score, 0);
    avgScore = (sumScores / scores.length).toFixed(1);
  }

  // 3. Hitung Total Permit Temporary
  const totalTemporary = temporaryData.length;

  // 4. Hitung Total Approval (menggunakan data 'newhire' yang sudah di-cache)
  const totalApproval = newhireData.length;

  const kpis = [
    {
      title: "Total Pendaftaran",
      value: totalPendaftaran.toLocaleString("id-ID"),
      tab: "pendaftaran",
    },
    {
      title: "Total Approval Permit",
      value: totalApproval.toLocaleString("id-ID"),
      tab: "newhire",
    },
    {
      title: "Permit Temporary Aktif",
      value: totalTemporary.toLocaleString("id-ID"),
      tab: "temporary",
    },
    {
      title: "Statistik Skor Induksi",
      values: [
        { label: "Terendah", value: minScore },
        { label: "Tertinggi", value: maxScore },
        { label: "Rata-rata", value: avgScore },
      ],
      tab: "hasil_induksi",
    },
  ];

  kpiContainer.innerHTML = kpis
    .map((kpi) => {
      if (kpi.values) {
        // Render kartu multi-nilai
        return `
                <div class="kpi-card clickable" data-tab="${
                  kpi.tab
                }" role="button" tabindex="0" aria-label="Lihat detail ${
          kpi.title
        }">
                    <div class="kpi-title">${kpi.title}</div>
                    <div class="kpi-multi-value">
                        ${kpi.values
                          .map(
                            (item) => `
                            <div class="kpi-sub-item">
                                <span class="kpi-sub-label">${item.label}</span>
                                <span class="kpi-sub-value">${item.value}</span>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `;
      } else {
        // Render kartu nilai tunggal standar
        return `
                <div class="kpi-card clickable" data-tab="${kpi.tab}" role="button" tabindex="0" aria-label="Lihat detail ${kpi.title}">
                    <div class="kpi-title">${kpi.title}</div>
                    <div class="kpi-value">${kpi.value}</div>
                </div>
            `;
      }
    })
    .join("");
}

/**
 * Menganimasikan perubahan angka pada sebuah elemen dari nilai awal ke akhir.
 * @param {HTMLElement} element - Elemen HTML yang teksnya akan dianimasikan.
 * @param {number} start - Nilai awal.
 * @param {number} end - Nilai akhir.
 * @param {number} duration - Durasi animasi dalam milidetik.
 */
function animateValue(element, start, end, duration) {
  if (start === end) {
    element.textContent = end.toLocaleString("id-ID");
    return; // Tidak perlu animasi jika nilainya sama
  }
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentValue = Math.floor(progress * (end - start) + start);
    element.textContent = currentValue.toLocaleString("id-ID"); // Format angka (misal: 1.000)
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}
/**
 * Memperbarui semua kartu KPI harian dari satu sumber data: 'hasil_induksi'.
 * @param {Array<Object>} inductionResultData - Data dari sheet 'hasil_induksi'.
 */
function updateDailyInductionKpi(inductionResultData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalisasi ke awal hari

  // --- BAGIAN 1: KPI INDUKSI CORE & MITRA ---
  const coreCountEl = document.getElementById("induksi-core-today-count");
  const mitraCountEl = document.getElementById("induksi-mitra-today-count");

  const newHireCountEl = document.getElementById("induksi-newhire-today-count");
  const cutiCountEl = document.getElementById("induksi-cuti-today-count");
  // Periksa apakah semua elemen ada
  if (!coreCountEl || !mitraCountEl || !newHireCountEl || !cutiCountEl) {
    console.error("Satu atau lebih elemen KPI harian tidak ditemukan.");
    return;
  }

  // Jika tidak ada data, set ke N/A dan keluar
  if (!inductionResultData) {
    console.error("Data 'hasil_induksi' tidak tersedia untuk KPI harian.");
    coreCountEl.textContent = "N/A";
    mitraCountEl.textContent = "N/A";
    newHireCountEl.textContent = "N/A";
    cutiCountEl.textContent = "N/A";
    return;
  }

  const coreCompanyKeywords = ["GAM", "UT", "WEM", "TEM", "BMJ"];
  let coreTodayCount = 0;
  let mitraTodayCount = 0;
  let newHireTodayCount = 0;
  let cutiTodayCount = 0;

  // Iterasi data sekali untuk menghitung semua nilai
  inductionResultData.forEach((row) => {
    if (!row || !row["tanggal"]) return;
    const inductionDate = parseTanggal(row["tanggal"]);
    if (isNaN(inductionDate.getTime())) return;

    inductionDate.setHours(0, 0, 0, 0);

    // Hanya proses baris yang tanggalnya hari ini
    if (inductionDate.getTime() === today.getTime()) {
      // Hitung Core vs Mitra
      const companyName = (row["perusahaan"] || "").toUpperCase();
      const isCore = coreCompanyKeywords.some((keyword) =>
        companyName.includes(keyword)
      );
      isCore ? coreTodayCount++ : mitraTodayCount++;

      // Hitung New Hire vs Cuti berdasarkan kolom KATEGORI
      const category = (row["KATEGORI"] || "").toLowerCase();
      if (category.includes("new hire")) {
        newHireTodayCount++;
      } else if (category.includes("cuti")) {
        cutiTodayCount++;
      }
    }
  });

  // Ambil nilai lama dari elemen untuk animasi
  const oldCoreCount =
    parseInt(coreCountEl.textContent.replace(/\./g, "")) || 0;
  const oldMitraCount =
    parseInt(mitraCountEl.textContent.replace(/\./g, "")) || 0;
  const oldNewHireCount =
    parseInt(newHireCountEl.textContent.replace(/\./g, "")) || 0;
  const oldCutiCount =
    parseInt(cutiCountEl.textContent.replace(/\./g, "")) || 0;

  // Animasikan semua nilai
  animateValue(coreCountEl, oldCoreCount, coreTodayCount, 1500);
  animateValue(mitraCountEl, oldMitraCount, mitraTodayCount, 1500);
  animateValue(newHireCountEl, oldNewHireCount, newHireTodayCount, 1500);
  animateValue(cutiCountEl, oldCutiCount, cutiTodayCount, 1500);
}

/**
 * Updates the comparison UI element (arrow and value) for a KPI card.
 * @param {string} elementId - The ID of the comparison container div.
 * @param {number} todayCount - The count for today.
 * @param {number} yesterdayCount - The count for yesterday.
 */
function updateComparisonUI(elementId, todayCount, yesterdayCount) {
  const container = document.getElementById(elementId);
  if (!container) return;

  const arrowEl = container.querySelector(".comparison-arrow");
  const valueEl = container.querySelector(".comparison-value");

  if (!arrowEl || !valueEl) return;

  valueEl.textContent = yesterdayCount.toLocaleString("id-ID");

  if (todayCount > yesterdayCount) {
    arrowEl.textContent = "▲";
    arrowEl.className = "comparison-arrow arrow-up";
    container.title = `Naik dari ${yesterdayCount} kemarin`;
  } else if (todayCount < yesterdayCount) {
    arrowEl.textContent = "▼";
    arrowEl.className = "comparison-arrow arrow-down";
    container.title = `Turun dari ${yesterdayCount} kemarin`;
  } else {
    arrowEl.textContent = "–";
    arrowEl.className = "comparison-arrow arrow-neutral";
    container.title = `Sama dengan kemarin`;
  }
}

/**
 * Memperbarui semua kartu KPI harian dari satu sumber data: 'hasil_induksi'.
 * @param {Array<Object>} inductionResultData - Data dari sheet 'hasil_induksi'.
 */
function updateDailyInductionKpi(inductionResultData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalisasi ke awal hari
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1); // Set ke hari kemarin

  // --- BAGIAN 1: KPI INDUKSI CORE & MITRA ---
  const coreCountEl = document.getElementById("induksi-core-today-count");
  const mitraCountEl = document.getElementById("induksi-mitra-today-count");

  const newHireCountEl = document.getElementById("induksi-newhire-today-count");
  const cutiCountEl = document.getElementById("induksi-cuti-today-count");
  // Periksa apakah semua elemen ada
  if (!coreCountEl || !mitraCountEl || !newHireCountEl || !cutiCountEl) {
    console.error("Satu atau lebih elemen KPI harian tidak ditemukan.");
    return;
  }

  // Jika tidak ada data, set ke N/A dan keluar
  if (!inductionResultData) {
    console.error("Data 'hasil_induksi' tidak tersedia untuk KPI harian.");
    coreCountEl.textContent = "N/A";
    mitraCountEl.textContent = "N/A";
    newHireCountEl.textContent = "N/A";
    cutiCountEl.textContent = "N/A";
    return;
  }

  const coreCompanyKeywords = ["GAM", "UT", "WEM", "TEM", "BMJ"];
  let coreTodayCount = 0,
    mitraTodayCount = 0,
    newHireTodayCount = 0,
    cutiTodayCount = 0;
  let coreYesterdayCount = 0,
    mitraYesterdayCount = 0,
    newHireYesterdayCount = 0,
    cutiYesterdayCount = 0;

  // Iterasi data sekali untuk menghitung semua nilai
  inductionResultData.forEach((row) => {
    if (!row || !row["tanggal"]) return;
    const inductionDate = parseTanggal(row["tanggal"]);
    if (isNaN(inductionDate.getTime())) return;

    inductionDate.setHours(0, 0, 0, 0);

    const companyName = (row["perusahaan"] || "").toUpperCase();
    const isCore = coreCompanyKeywords.some((keyword) =>
      companyName.includes(keyword)
    );
    const category = (row["KATEGORI"] || "").toLowerCase();

    // Cek apakah tanggalnya hari ini atau kemarin
    if (inductionDate.getTime() === today.getTime()) {
      isCore ? coreTodayCount++ : mitraTodayCount++;
      if (category.includes("new hire")) newHireTodayCount++;
      else if (category.includes("cuti")) cutiTodayCount++;
    } else if (inductionDate.getTime() === yesterday.getTime()) {
      isCore ? coreYesterdayCount++ : mitraYesterdayCount++;
      if (category.includes("new hire")) newHireYesterdayCount++;
      else if (category.includes("cuti")) cutiYesterdayCount++;
    }
  });

  // Ambil nilai lama dari elemen untuk animasi
  const oldCoreCount =
    parseInt(coreCountEl.textContent.replace(/\./g, "")) || 0;
  const oldMitraCount =
    parseInt(mitraCountEl.textContent.replace(/\./g, "")) || 0;
  const oldNewHireCount =
    parseInt(newHireCountEl.textContent.replace(/\./g, "")) || 0;
  const oldCutiCount =
    parseInt(cutiCountEl.textContent.replace(/\./g, "")) || 0;

  // Animasikan semua nilai
  animateValue(coreCountEl, oldCoreCount, coreTodayCount, 1500);
  animateValue(mitraCountEl, oldMitraCount, mitraTodayCount, 1500);
  animateValue(newHireCountEl, oldNewHireCount, newHireTodayCount, 1500);
  animateValue(cutiCountEl, oldCutiCount, cutiTodayCount, 1500);

  // Perbarui UI perbandingan
  updateComparisonUI("core-comparison", coreTodayCount, coreYesterdayCount);
  updateComparisonUI("mitra-comparison", mitraTodayCount, mitraYesterdayCount);
  updateComparisonUI(
    "newhire-comparison",
    newHireTodayCount,
    newHireYesterdayCount
  );
  updateComparisonUI("cuti-comparison", cutiTodayCount, cutiYesterdayCount);
}

/**
 * Memeriksa kondisi filter untuk satu baris data.
 * @param {Object} dataRow - Baris data yang akan diperiksa.
 * @param {Object} filters - Objek berisi nilai filter saat ini.
 * @returns {boolean} - True jika baris cocok dengan filter.
 */
function checkFilterMatch(dataRow, filters) {
  const { key, perusahaan, start, end, search } = filters;

  const perusahaanData = dataRow["perusahaan"] || dataRow["Perusahaan"] || "";
  const matchPerusahaan =
    perusahaan === "all" ||
    perusahaanData.trim().toLowerCase() === perusahaan.trim().toLowerCase();

  const tanggalStr =
    dataRow["tanggal"] ||
    dataRow["Tanggal"] ||
    dataRow["TANGGAL"] ||
    dataRow["DATE"] ||
    dataRow["TANGGAL INDUKSI"];
  const rowDate = parseTanggal(tanggalStr);
  const isDateValid = !isNaN(rowDate.getTime());
  const startTime = start ? new Date(start).setHours(0, 0, 0, 0) : -Infinity;
  const endTime = end ? new Date(end).setHours(23, 59, 59, 999) : Infinity;
  const matchDate =
    !isDateValid && (start || end)
      ? false
      : rowDate.getTime() >= startTime && rowDate.getTime() <= endTime;

  const nama = (dataRow["NAMA"] || dataRow["Nama"] || "").toLowerCase();
  const matchSearch = !search || nama.includes(search);

  return matchPerusahaan && matchDate && matchSearch;
}

/**
 * Filters the data based on user input (company, date range, search term)
 * and re-renders the table.
 * @param {string} key - The key identifying the data source.
 */
function applyFilter(key) {
  const perusahaan = document.getElementById(`filter-${key}`)?.value || "all";
  const start = document.getElementById(`startDate-${key}`)?.value;
  const end = document.getElementById(`endDate-${key}`)?.value;
  const search =
    document.getElementById(`search-${key}`)?.value?.toLowerCase() || "";

  // Selalu filter dari data asli yang ada di cache global
  const dataToFilter = sheetDataCache[key] || [];

  const filtered = dataToFilter.filter((row) => {
    const filters = { key, perusahaan, start, end, search };
    if (key === "grafik") {
      const jabatan = (row["NAMA JABATAN"] || "").toLowerCase();
      const matchJabatan = !search || jabatan.includes(search);
      return checkFilterMatch(row, { ...filters, search: "" }) && matchJabatan; // Cek filter lain tanpa search nama
    }
    return checkFilterMatch(row, filters);
  });

  // Lakukan sorting pada data yang sudah difilter (kecuali untuk grafik)
  if (key !== "grafik" && sortState[key]) {
    const { column, direction } = sortState[key];
    filtered.sort((a, b) => {
      let valA = a[column] || "";
      let valB = b[column] || "";

      // Coba parse sebagai angka
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        // Jika keduanya angka, bandingkan sebagai angka
        return direction === "asc" ? numA - numB : numB - numA;
      }

      // Jika bukan angka, bandingkan sebagai string (case-insensitive)
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Render ulang tabel atau grafik berdasarkan `key`
  if (key === "grafik") {
    // Urutkan data berdasarkan tanggal secara menaik (ascending) sebelum merender grafik
    // Ini memastikan sumbu-x pada grafik garis (line chart) berurutan secara kronologis.
    filtered.sort((a, b) => {
      const dateA = parseTanggal(a["TANGGAL INDUKSI"]);
      const dateB = parseTanggal(b["TANGGAL INDUKSI"]);
      return dateA - dateB;
    });
    currentFilteredData[key] = filtered; // Store filtered & sorted data for export
    initializeCharts(filtered);
  } else {
    currentFilteredData[key] = filtered; // Store filtered data for export
    renderTable(filtered, `table-${key}`, key);
  }
}

const debouncedApplyFilter = debounce(applyFilter, 300); // 300ms delay

/**
 * Initializes charts based on "grafik" data.
 * @param {Array} data - The data for charts.
 */
function initializeCharts(data) {
  // data di sini bisa berupa array atau objek offline
  // Clear previous charts if they exist to prevent memory leaks/re-rendering issues
  Chart.getChart("chartScore")?.destroy();
  Chart.getChart("chartScore1")?.destroy();
  Chart.getChart("chartScore2")?.destroy();
  Chart.getChart("companyTypeChart")?.destroy();

  // Buat dan sisipkan notifikasi offline jika ada
  const chartTab = document.getElementById("grafik");
  // Hapus notifikasi lama
  const existingNotice = chartTab?.querySelector(".offline-notice");
  if (existingNotice) {
    existingNotice.remove();
  }
  const lastUpdateTimestamp = offlineTimestamps["grafik"];
  if (lastUpdateTimestamp && chartTab) {
    const notice = document.createElement("div");
    notice.className = "offline-notice";
    notice.innerHTML = `Anda melihat data offline. Terakhir diperbarui: <strong>${new Date(
      lastUpdateTimestamp
    ).toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    })}</strong>`;
    const filterBar = chartTab.querySelector(".filter-bar");
    chartTab.insertBefore(notice, filterBar);
  }

  // Grafik 1 (chartScore) dinonaktifkan karena sumber data 'DashboardGrafik'
  // tidak memiliki kolom 'Kategori' dan 'Nilai'.
  // Jika ingin diaktifkan, pastikan kolom tersebut ada di Google Sheet.

  // Grafik 2 & 3: Cuti/New Hire & Skor Tertinggi/Terendah
  const canvas1 = document.getElementById("chartScore1");
  const canvas2 = document.getElementById("chartScore2");
  if (!canvas1 || !canvas2) return;

  const ctx1 = canvas1.getContext("2d");
  const ctx2 = canvas2.getContext("2d");

  const labels = data.map((d) => d["TANGGAL INDUKSI"] || "");
  const cutiData = data.map((d) => parseFloat(d["CUTI"]) || 0);
  const newHireData = data.map((d) => parseFloat(d["NEW HIRE"]) || 0);
  const scoreTertinggi = data.map((d) => parseFloat(d["SCORE_TERTINGGI"]) || 0);
  const scoreTerendah = data.map((d) => parseFloat(d["SCORE_TERENDAH"]) || 0);
  const jabatanLabels = data.map((d) => d["NAMA JABATAN"] || "");

  new Chart(ctx1, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Cuti",
          data: cutiData,
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgba(255, 99, 132, 1)",
          fill: true,
          pointRadius: 5,
        },
        {
          label: "New Hire",
          data: newHireData,
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          fill: true,
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: "index" },
        // datalabels for Chart.js v3+ requires plugin registration, removed for brevity
        // If you need datalabels, ensure you've included and registered the ChartDataLabels plugin
      },
      scales: {
        x: {
          type: "category",
          title: { display: true, text: "Tanggal Induksi" },
        },
        y: { beginAtZero: true, title: { display: true, text: "Jumlah" } },
      },
    },
  });

  new Chart(ctx2, {
    type: "bar",
    data: {
      labels: jabatanLabels,
      datasets: [
        {
          label: "SCORE_TERTINGGI",
          data: scoreTertinggi,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
        },
        {
          label: "SCORE_TERENDAH",
          data: scoreTerendah,
          backgroundColor: "rgba(153, 102, 255, 0.2)",
          borderColor: "rgba(153, 102, 255, 1)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        // datalabels requires plugin registration
      },
      scales: {
        x: { title: { display: true, text: "Jabatan" } },
        y: { beginAtZero: true, title: { display: true, text: "SCORE" } },
      },
    },
  });

  // Panggil fungsi untuk membuat grafik perusahaan berdasarkan jenis
  const induksiData = sheetDataCache.hasil_induksi || [];
  createCompanyTypeChart(induksiData);
}

/**
 * Membuat grafik batang bertumpuk untuk menampilkan jumlah induksi per perusahaan,
 * dikelompokkan berdasarkan jenis/kategori induksi.
 * @param {Array<Object>} data - Data dari sheet 'hasil_induksi'.
 */
function createCompanyTypeChart(data) {
  const canvas = document.getElementById("companyTypeChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (!data || data.length === 0) {
    return; // Tidak melakukan apa-apa jika tidak ada data
  }

  // 1. Proses data untuk mengelompokkan berdasarkan perusahaan dan kategori
  const companyData = {};
  const allCategories = new Set();

  data.forEach((item) => {
    const company = item.perusahaan;
    const category = item.KATEGORI;
    if (!company || !category) return;

    allCategories.add(category);

    if (!companyData[company]) {
      companyData[company] = {};
    }
    companyData[company][category] = (companyData[company][category] || 0) + 1;
  });

  const companies = Object.keys(companyData).sort();
  const categories = Array.from(allCategories).sort();

  // 2. Siapkan dataset untuk Chart.js
  const chartColors = [
    "rgba(54, 162, 235, 0.7)", // Biru
    "rgba(255, 99, 132, 0.7)", // Merah
    "rgba(75, 192, 192, 0.7)", // Hijau
    "rgba(255, 206, 86, 0.7)", // Kuning
    "rgba(153, 102, 255, 0.7)", // Ungu
    "rgba(255, 159, 64, 0.7)", // Oranye
  ];

  const datasets = categories.map((category, index) => ({
    label: category,
    data: companies.map((company) => companyData[company][category] || 0),
    backgroundColor: chartColors[index % chartColors.length],
  }));

  // 3. Buat grafik baru
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: companies,
      datasets: datasets,
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Jumlah Induksi per Perusahaan & Jenis",
          font: { size: 16 },
        },
        tooltip: {
          callbacks: {
            title: function (tooltipItems) {
              // Menampilkan nama perusahaan sebagai judul tooltip
              return tooltipItems[0].label;
            },
          },
        },
      },
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
      onClick: (event, elements, chart) => {
        if (elements.length === 0) return; // Tidak ada bar yang diklik
        const companyIndex = elements[0].index;
        const companyName = chart.data.labels[companyIndex];
        renderCompanyTypeDetails(companyName);
      },
      onHover: (event, chartElement) => {
        event.native.target.style.cursor = chartElement[0]
          ? "pointer"
          : "default";
      },
    },
  });
}

/**
 * Merender tabel detail untuk perusahaan yang dipilih dari grafik.
 * @param {string} companyName - Nama perusahaan yang akan ditampilkan detailnya.
 */
function renderCompanyTypeDetails(companyName) {
  const wrapper = document.getElementById("company-type-details-wrapper");
  const titleEl = document.getElementById("company-type-details-title");
  const tableEl = document.getElementById("company-type-details-table");

  if (!wrapper || !titleEl || !tableEl) return;

  // Filter data dari 'hasil_induksi' berdasarkan nama perusahaan
  const allData = sheetDataCache.hasil_induksi || [];
  const filteredData = allData.filter(
    (item) => item.perusahaan === companyName
  );

  // Update judul dan tampilkan kontainer
  titleEl.textContent = `Detail Induksi untuk: ${companyName}`;
  wrapper.classList.remove("hidden");

  // Kosongkan tabel sebelum mengisi data baru
  tableEl.innerHTML = "";

  // Tentukan kolom yang akan ditampilkan di tabel detail
  const columns = [
    "tanggal",
    "NAMA",
    "JABATAN",
    "KATEGORI",
    "S. SIMPER",
    "SCORE K3",
    "S. JABATAN",
    "S.RATA-RATA",
  ];

  // Buat header tabel
  const thead = tableEl.createTHead();
  const headerRow = thead.insertRow();
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.toUpperCase();
    headerRow.appendChild(th);
  });

  // Buat isi tabel
  const tbody = tableEl.createTBody();
  if (filteredData.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = columns.length;
    cell.textContent = "Tidak ada data detail untuk perusahaan ini.";
    cell.style.textAlign = "center";
  } else {
    filteredData.forEach((item) => {
      const row = tbody.insertRow();
      columns.forEach((col) => {
        const cell = row.insertCell();
        const nilai = item[col] || "";
        const { warna, emoji } = getCellStyle(col, nilai);

        if (warna) {
          const badge = document.createElement("span");
          badge.className = `badge ${warna}`;
          badge.textContent = emoji + nilai;
          cell.appendChild(badge);
        } else {
          cell.textContent = nilai;
        }
      });
    });
  }

  // Scroll ke tabel detail agar terlihat oleh pengguna
  wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Initializes all data and renders tables/charts.
 */
async function init() {
  try {
    await loadPerusahaanList();

    const relevantKeys = [
      "newhire",
      "pendaftaran",
      "spdk",
      "checklist_induksi",
      "hasil_induksi",
      "remidial",
      "grafik",
      "temporary",
    ];

    // Ambil semua data secara paralel dan isi cache global
    const dataPromises = relevantKeys.map((key) => {
      const { id, sheet } = SHEET_SOURCES[key];
      return fetchAndCacheSheet(id, sheet, key);
    });
    await Promise.all(dataPromises);

    // Setelah semua data ada di cache global, render KPI
    renderInduksiKPIs(
      sheetDataCache.pendaftaran || [],
      sheetDataCache.hasil_induksi || [],
      sheetDataCache.temporary || [],
      sheetDataCache.newhire || []
    );
    // Panggil fungsi baru untuk KPI harian
    updateDailyInductionKpi(sheetDataCache.hasil_induksi || []);

    // Render semua tabel dan grafik
    relevantKeys.forEach((key) => {
      const data = sheetDataCache[key] || [];
      if (key === "grafik") {
        initializeCharts(data);
      } else {
        renderTable(data, `table-${key}`, key);
      }
    });
  } catch (error) {
    handleError(error, "Gagal memuat data aplikasi. Coba muat ulang halaman.");
  }
}

/**
 * Opens a specific tab in the UI.
 * @param {string} tabId - The ID of the tab content to show.
 * @param {Event} event - The click event (optional).
 */
function openTab(tabId, event) {
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(tabId)?.classList.add("active");
  event?.target?.classList.add("active");

  // If the opened tab has filters, re-apply them to ensure correct display
  // This is important if data has been fetched but filters weren't applied after tab switch
  if (sheetDataCache[tabId]) {
    // Sekarang filter juga berlaku untuk tab 'grafik'
    applyFilter(tabId);
  }
}

function toggleGroup(groupId, toggleBtn) {
  const group = document.getElementById(groupId);
  if (!group || !toggleBtn) return;

  const isOpen = group.classList.toggle("show");

  // Update button text and emoji based on state
  if (groupId === "induksi-group") {
    toggleBtn.innerHTML = isOpen
      ? "📘 Proses Induksi ▴"
      : "📘 Proses Induksi ▾";
  } else if (groupId === "pelatihan-group") {
    // Ini mungkin tidak relevan untuk index.html, tapi tetap dipertahankan jika ada di pelatihan.html
    toggleBtn.innerHTML = isOpen
      ? "📚 Proses Pelatihan ▴"
      : "📚 Proses Pelatihan ▾";
  }
}

function toggleWAForm() {
  const form = document.getElementById("wa-form-popup");
  form.classList.toggle("hidden");
}

function kirimWhatsApp() {
  const nama = document.getElementById("wa-nama").value.trim();
  const pesan = document.getElementById("wa-pesan").value.trim();

  if (!nama || !pesan) {
    alert("Mohon isi nama dan pertanyaan terlebih dahulu.");
    return;
  }

  const nomor = "6282223089790";
  const teks = `Halo, saya ingin bertanya tentang induksi.%0ANama: ${encodeURIComponent(
    nama
  )}%0APertanyaan: ${encodeURIComponent(pesan)}`;
  const url = `https://wa.me/${nomor}?text=${teks}`;

  document.getElementById("wa-form-popup").classList.add("hidden");
  document.getElementById("wa-nama").value = "";
  document.getElementById("wa-pesan").value = "";
  window.open(url, "_blank");
}

const safetyMessages = [
  "⚠️ Gunakan helm dan rompi saat berada di area kerja.",
  "🦺 Pastikan APD lengkap sebelum memulai aktivitas.",
  "🚧 Dilarang menggunakan HP saat berkendara di area tambang.",
  "🧯 Kenali titik kumpul dan jalur evakuasi di area kerja.",
  "📢 Laporkan segera jika melihat kondisi tidak aman!",
];

let currentMessageIndex = 0; // Renamed to avoid conflict with function `currentMessage`
let safetyMessageInterval;

function showSafetyMessage(text, duration = 6000) {
  const alertBox = document.getElementById("safety-alert");
  const message = alertBox?.querySelector(".safety-message");
  const sound = document.getElementById("notif-sound");

  if (!alertBox || !message) return;

  message.innerHTML = text;

  alertBox.classList.remove("hidden");
  setTimeout(() => alertBox.classList.add("show"), 100);

  // Hanya coba putar suara jika audio sudah diizinkan oleh interaksi pengguna
  if (sound && audioUnlocked) {
    try {
      sound.currentTime = 0;
      sound.play().catch((e) => {
        console.warn(
          "🔇 Suara diblokir oleh browser (autoplay restriction):",
          e
        );
      });
    } catch (e) {
      console.warn("🎧 Gagal memutar suara:", e);
    }
  }

  // Pause banner and change color
  pauseBanner();
  updateBannerColor(true);

  setTimeout(() => {
    alertBox.classList.remove("show");
    setTimeout(() => {
      alertBox.classList.add("hidden");
      resumeBanner(); // Resume banner after alert hides
      updateBannerColor(false); // Reset banner color
    }, 400);
  }, duration);
}

function startSafetyRotation() {
  // Clear any existing interval to prevent multiple intervals running
  if (safetyMessageInterval) {
    clearInterval(safetyMessageInterval);
  }

  const rotateMessage = () => {
    if (safetyMessages.length > 0) {
      showSafetyMessage(safetyMessages[currentMessageIndex]);
      currentMessageIndex = (currentMessageIndex + 1) % safetyMessages.length; // Loop through messages
    }
  };

  rotateMessage(); // Show first message immediately
  safetyMessageInterval = setInterval(rotateMessage, 60000); // Rotate every 1 minute
}

function pauseBanner() {
  const banner = document.getElementById("safety-banner");
  if (banner) banner.classList.add("banner-paused");
}

function resumeBanner() {
  const banner = document.getElementById("safety-banner");
  if (banner) banner.classList.remove("banner-paused");
}

function updateBannerColor(active = false) {
  const banner = document.getElementById("safety-banner");
  if (!banner) return;
  // Logika perubahan warna dinonaktifkan sesuai permintaan untuk mengembalikan gaya semula.
  // Gaya banner sekarang sepenuhnya diatur oleh file style.css.
}

function updateBannerText(newText) {
  const bannerText = document.getElementById("banner-text");
  if (bannerText) {
    bannerText.innerHTML = newText;
    // Restart animation
    bannerText.style.animation = "none";
    void bannerText.offsetWidth; // Trigger reflow
    bannerText.style.animation = "scroll-banner 20s linear infinite";
  }
}

function setupEventListeners() {
  startSafetyRotation(); // Start safety message rotation

  // Event listener untuk tombol "Paksa Muat Ulang"
  const forceRefreshBtn = document.getElementById("force-refresh-btn");
  if (forceRefreshBtn) {
    forceRefreshBtn.addEventListener("click", async () => {
      if (
        confirm(
          "Anda yakin ingin memaksa muat ulang semua data? Ini akan membersihkan cache dan mengambil data baru dari server."
        )
      ) {
        showInfoToast("Membersihkan cache dan memuat ulang data...", 4000);

        // Panggil fungsi clear cache dari common.js
        clearAllCache();

        // Panggil kembali fungsi init untuk mengambil semua data dari awal
        await init();
        showInfoToast("Data berhasil dimuat ulang.", 3000);
      }
    });
  }

  // Event listeners for filters using debounced function
  document
    .querySelectorAll(
      '[id^="filter-"], [id^="startDate-"], [id^="endDate-"], [id^="search-"]'
    )
    .forEach((element) => {
      // Extract the key from the ID (e.g., "filter-newhire" -> "newhire")
      const key = element.id.split("-").slice(1).join("-");
      element.addEventListener("input", () => debouncedApplyFilter(key));
      element.addEventListener("change", () => debouncedApplyFilter(key)); // For date inputs
    });

  // Event listener for tab buttons
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const tabId = event.target.dataset.tab;
      if (tabId) {
        openTab(tabId, event);
      }
    });
  });

  // Event listener untuk group toggles (lebih robust)
  document.querySelectorAll(".tab-group-toggle").forEach((button) => {
    button.addEventListener("click", (event) => {
      const groupId = event.currentTarget.dataset.groupId;
      if (groupId) {
        toggleGroup(groupId, event.currentTarget); // Pass the button itself
      }
    });
  });

  // Event listener untuk KPI cards yang bisa diklik
  const kpiTotalContainer = document.getElementById("kpi-container-total");
  if (kpiTotalContainer) {
    kpiTotalContainer.addEventListener("click", (event) => {
      const card = event.target.closest(".kpi-card.clickable");
      if (card) {
        const tabId = card.dataset.tab;
        const tabButton = document.querySelector(
          `.tab-btn[data-tab="${tabId}"]`
        );
        if (tabButton) {
          tabButton.click(); // Memicu event klik pada tombol tab yang sesuai
        }
      }
    });
  }

  /**
   * Menangani klik pada tombol ekspor.
   * @param {Event} event - Objek event klik.
   */
  function exportHandler(event) {
    if (!event.target.matches(".export-btn")) return;

    const key = event.target.id.replace("export-", "");
    const dataToExport = currentFilteredData[key];

    if (!dataToExport || dataToExport.length === 0) {
      alert(
        `Tidak ada data yang telah difilter untuk diekspor pada tab ${key}. Coba filter data terlebih dahulu.`
      );
      return;
    }

    const startDate = document.getElementById(`startDate-${key}`)?.value;
    const endDate = document.getElementById(`endDate-${key}`)?.value;

    let datePart = new Date().toISOString().slice(0, 10);
    if (startDate && endDate) {
      datePart = `${startDate}_to_${endDate}`;
    } else if (startDate) {
      datePart = `from_${startDate}`;
    } else if (endDate) {
      datePart = `until_${endDate}`;
    }

    const filename = `Export_${key}_${datePart}`;
    exportToExcel(dataToExport, filename);
  }

  // Event listener untuk tombol export
  document.body.addEventListener("click", exportHandler);

  // WA form toggle dengan null checks
  const openWaFormBtn = document.getElementById("open-wa-form");
  if (openWaFormBtn) {
    openWaFormBtn.addEventListener("click", toggleWAForm);
  }
  const closeWaFormBtn = document.getElementById("close-wa-form");
  if (closeWaFormBtn) {
    closeWaFormBtn.addEventListener("click", toggleWAForm);
  }
  const kirimWaBtn = document.getElementById("kirim-wa-btn");
  if (kirimWaBtn) {
    kirimWaBtn.addEventListener("click", kirimWhatsApp);
  }

  // Audio play for intro
  const enterBtn = document.getElementById("enter-btn");
  if (enterBtn) {
    // Tambahkan null check untuk enter-btn
    enterBtn.addEventListener("click", () => {
      const audio = document.getElementById("intro-audio");
      if (audio) {
        audio.play().catch((error) => {
          console.warn("Intro audio play failed:", error);
        });
      }
    });
  }

  // --- Logic untuk membuka kunci audio setelah interaksi pengguna pertama ---
  // Event listener global untuk mendeteksi interaksi pengguna pertama kali
  const unlockAudio = () => {
    const notifSound = document.getElementById("notif-sound");
    if (notifSound && !audioUnlocked) {
      // Coba putar suara dengan volume 0 untuk membuka kunci audio
      notifSound.volume = 0;
      notifSound
        .play()
        .then(() => {
          notifSound.pause();
          notifSound.volume = 1; // Kembalikan volume ke normal
          audioUnlocked = true;
          console.log("🔊 Audio unlocked by user interaction.");
        })
        .catch((error) => {
          console.warn("Gagal membuka kunci audio:", error);
        });
    }
    // Hapus listener ini setelah dipicu sekali
    document.removeEventListener("click", unlockAudio);
    document.removeEventListener("touchstart", unlockAudio);
  };

  // Tambahkan listener ke body untuk interaksi pertama
  document.addEventListener("click", unlockAudio, { once: true });
  document.addEventListener("touchstart", unlockAudio, { once: true }); // Untuk perangkat sentuh

  // Initial audio activation for safety sound (to bypass browser autoplay policies)
  // Ini tetap ada jika ada tombol startButton terpisah untuk audio notifikasi
  const startButton = document.querySelector("#startButton");
  if (startButton) {
    startButton.addEventListener("click", () => {
      const audio = document.getElementById("notif-sound");
      if (audio && !audioUnlocked) {
        // Hanya coba jika belum terbuka kuncinya
        audio
          .play()
          .then(() => {
            console.log(
              "🔊 Safety notification sound activated by user interaction."
            );
            audioUnlocked = true; // Setel flag jika berhasil
          })
          .catch((error) => {
            console.warn(
              "Safety notification audio failed to play (user interaction):",
              error
            );
          });
      }
    });
  }
}

// --- Initial Setup on Page Load ---
document.addEventListener("DOMContentLoaded", () => {
  openTab("newhire"); // Open default tab
  setupEventListeners();
});

// Run initial data fetching and rendering after the common UI (splash screen) is ready
document.addEventListener("appReady", init);
