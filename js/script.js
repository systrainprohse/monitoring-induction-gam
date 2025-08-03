// --- Global Variables and Constants ---
updateBannerText(
  "🚧 Hari ini ada inspeksi K3 di area workshop • Pastikan semua APD lengkap •"
);

// Konfigurasi sumber data Google Sheet untuk halaman Induksi
const SHEET_SOURCES = {
  pendaftaran: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheet: "pendaftaran_induksi",
  },
  hasil_induksi: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheet: "PASCA_CUTI",
  },
  // MEMPERBAIKI ID UNTUK REMIDIAL (ID sebelumnya salah)
  remidial: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheet: "REMIDI",
  },
  grafik: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheet: "DashboardGrafik", // Menggunakan nama tanpa spasi, jika masih error, ganti ke "Dashboard Grafik"
  },
  newhire: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheet: "NEW_HIRE",
  },
  setting: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheet: "setting",
  },
  visitor: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheet: "VISITOR",
  },

  temporary: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheet: "TEMPORARY",
  }, // Data untuk tab Temporary
  password: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheet: "KODE_AKSES",
  },
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
    "STATUS",
  ],
  pendaftaran: [
    "Timestamp",
    "PERUSAHAAN",
    "NAMA",
    "JABATAN",
    "JENIS INDUKSI",
    "RENCANA HARI INDUKSI",
    "RENCANA INDUKSI",
  ],
  hasil_induksi: [
    "DATE",
    "NIK",
    "NAMA",
    "JABATAN",
    "PERUSAHAAN",
    "STATUS INDUKSI",
    "SCORE",
  ],
  visitor: [
    "MULAI",
    "SELESAI",
    "NAMA",
    "PERUSAHAAN",
    "TUJUAN",
    "PENDAMPING",
    "STATUS",
    "CEK",
  ],
  remidial: [
    "DATE",
    "NIK",
    "NAMA",
    "JABATAN",
    "PERUSAHAAN",
    "STATUS INDUKSI",
    "SCORE",
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
    "TANGGAL",
    "NEW HIRE",
    "PASCA CUTI",
    "VISITOR",
    "TEMPORARY",
    "NAMA JABATAN",
    "SCORE_TERENDAH",
    "SCORE_TERTINGGI",
    "PERUSAHAAN",
    "NEW HIRE_1", // Asumsi opensheet akan menamai ulang kolom duplikat
    "PASCA CUTI_1",
    "VISITOR_1",
    "TEMPORARY_1",
  ],
};

const ROWS_PER_PAGE = 25;
let perusahaanList = [];
let currentFilteredData = {}; // Stores the currently filtered data for each table
let currentPageState = {}; // Objek untuk menyimpan halaman saat ini untuk setiap tabel
let sortState = {}; // Objek untuk menyimpan status sorting setiap tabel { key: { column, direction } }
let audioUnlocked = false; // Flag untuk melacak apakah audio sudah diizinkan
let trendChartPeriod = "daily"; // 'daily', 'weekly', 'monthly', 'yearly'
let trendChartYear = "all"; // Menyimpan tahun yang dipilih, 'all' secara default

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
  // Try to parse standard formats first
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;

  // Try DD/MM/YYYY
  if (String(str).includes("/")) {
    const parts = str.split(" ")[0].split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts;
      // Handle cases with time, e.g., "25/07/2024 10:00:00"
      return new Date(`${y}-${m}-${d} ${str.split(" ")[1] || ""}`);
    }
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
  currentPageState[key] = 1; // Selalu kembali ke halaman pertama saat sorting
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

  // Ambil halaman saat ini atau default ke 1
  const currentPage = currentPageState[key] || 1;
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;

  // 1. Filter out invalid data rows (null, undefined, or empty objects)
  const validData = data
    ? data.filter((row) => row && Object.keys(row).length > 0)
    : [];

  // 2. Determine columns to display
  let allowed = kolomTampilkan[key];

  const totalRows = validData.length;
  const paginatedData = validData.slice(startIndex, endIndex);
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
  paginatedData.forEach((row) => {
    const tr = document.createElement("tr");

    // Pewarnaan baris berdasarkan status untuk tabel visitor
    if (key === "visitor") {
      const status = (row["STATUS"] || "").toLowerCase();
      if (status === "non aktif") {
        tr.classList.add("status-non-aktif");
      } else if (status === "aktif") {
        tr.classList.add("status-aktif");
      }
    }

    allowed.forEach((h) => {
      const td = document.createElement("td");
      const nilai = row[h] || "";
      const { warna, emoji } = getCellStyle(h, nilai);
      // Styling khusus untuk kolom 'CEK' di tabel visitor
      if (key === "visitor" && h === "CEK") {
        td.className = `cek-${(nilai || "").toLowerCase()}`;
        td.textContent = nilai;
      } else if (warna) {
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
  // Render pagination controls
  renderPagination(key, totalRows);

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
 * Menghitung dan mengembalikan perusahaan teratas dari kumpulan data.
 * @param {Array<Object>} data - Kumpulan data.
 * @param {number} count - Jumlah perusahaan teratas yang diinginkan.
 * @returns {Array<string>} - Daftar nama perusahaan teratas.
 */
function getTopCompanies(data, count = 5) {
  if (!data || data.length === 0) return [];

  const companyCounts = data.reduce((acc, row) => {
    const company = row["perusahaan"] || row["PERUSAHAAN"];
    if (company) {
      acc[company] = (acc[company] || 0) + 1;
    }
    return acc;
  }, {});

  return Object.entries(companyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([name, count]) => ({ name, count }));
}

/**
 * Membuat markup HTML untuk slider perusahaan.
 * @param {Array<string>} companies - Daftar nama perusahaan.
 * @returns {string} - String HTML untuk slider.
 */
function createCompanySliderHTML(companies) {
  if (companies.length === 0) return "";

  // Duplikasi daftar untuk efek loop yang mulus jika ada lebih dari 1 item
  const items = companies.length > 1 ? [...companies, ...companies] : companies;

  return `
    <div class="kpi-company-slider">
      <ul class="kpi-company-list" style="--item-count: ${companies.length}">
        ${items
          .map(
            (company) =>
              `<li>${company.name} <span class="kpi-company-count">(${company.count})</span></li>`
          )
          .join("")}
      </ul>
    </div>
  `;
}

/**
 * Merender kontrol paginasi untuk sebuah tabel.
 * @param {string} key - Kunci tabel (misal: "newhire").
 * @param {number} totalRows - Jumlah total baris data (sebelum paginasi).
 */
function renderPagination(key, totalRows) {
  const container = document.getElementById(`pagination-${key}`);
  if (!container) return;

  const currentPage = currentPageState[key] || 1;
  const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE);

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const startRow = (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endRow = Math.min(currentPage * ROWS_PER_PAGE, totalRows);

  container.innerHTML = `
    <span class="pagination-info">
      Menampilkan ${startRow} - ${endRow} dari ${totalRows} data
    </span>
    <div class="pagination-controls">
        <button class="pagination-btn" data-key="${key}" data-action="prev" ${
    currentPage === 1 ? "disabled" : ""
  }>&laquo; Sebelumnya</button>
        <button class="pagination-btn" data-key="${key}" data-action="next" ${
    currentPage === totalPages ? "disabled" : ""
  }>Selanjutnya &raquo;</button>
    </div>`;
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
  const kpiContainer = document.getElementById("kpi-container");
  if (!kpiContainer) return;

  // Hitung perusahaan teratas untuk setiap KPI
  const topPendaftaranCompanies = getTopCompanies(pendaftaranData);
  const topApprovalCompanies = getTopCompanies(newhireData);
  const topTemporaryCompanies = getTopCompanies(temporaryData);

  const pendaftaranSlider = createCompanySliderHTML(topPendaftaranCompanies);
  const approvalSlider = createCompanySliderHTML(topApprovalCompanies);
  const temporarySlider = createCompanySliderHTML(topTemporaryCompanies);

  // 1. Hitung Total Pendaftaran
  const totalPendaftaran = pendaftaranData.length;

  // 3. Hitung Total Permit Temporary yang statusnya 'AKTIF'
  const totalTemporary = temporaryData.filter(
    (row) => (row.STATUS || "").toLowerCase() === "aktif"
  ).length;

  // 4. Hitung Total Approval (menggunakan data 'newhire' yang sudah di-cache)
  const totalApproval = newhireData.length;

  const kpis = [
    {
      title: "Total Pendaftaran",
      value: totalPendaftaran.toLocaleString("id-ID"),
      tab: "pendaftaran",
      slider: pendaftaranSlider,
      span: 2,
    },
    {
      title: "Total Approval Permit",
      value: totalApproval.toLocaleString("id-ID"),
      tab: "newhire",
      slider: approvalSlider,
      span: 2,
    },
    {
      title: "Permit Temporary Aktif",
      value: totalTemporary.toLocaleString("id-ID"),
      tab: "temporary",
      slider: temporarySlider,
      span: 2,
    },
  ];

  // Menggunakan += untuk menambahkan kartu baru ke kontainer yang sudah ada
  kpiContainer.innerHTML += kpis
    .map((kpi) => {
      // Render kartu nilai tunggal standar
      return `
                <div class="kpi-card clickable span-col-${
                  kpi.span
                }" data-tab="${
        kpi.tab
      }" role="button" tabindex="0" aria-label="Lihat detail ${kpi.title}">
                    <div class="kpi-title">${kpi.title}</div>
                    <div class="kpi-value">${kpi.value}</div>
                    ${kpi.slider || ""}
                </div>
            `;
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

  // Check if the number is a float to decide on formatting
  const isFloat = yesterdayCount % 1 !== 0;
  const formatOptions = isFloat
    ? { minimumFractionDigits: 1, maximumFractionDigits: 1 }
    : {};
  const formattedYesterday = yesterdayCount.toLocaleString(
    "id-ID",
    formatOptions
  );

  valueEl.textContent = formattedYesterday;

  if (todayCount > yesterdayCount) {
    arrowEl.textContent = "▲";
    arrowEl.className = "comparison-arrow arrow-up";
    container.title = `Naik dari ${formattedYesterday} kemarin`;
  } else if (todayCount < yesterdayCount) {
    arrowEl.textContent = "▼";
    arrowEl.className = "comparison-arrow arrow-down";
    container.title = `Turun dari ${formattedYesterday} kemarin`;
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
    if (!row || !row["DATE"]) return;
    const inductionDate = parseTanggal(row["DATE"]);
    if (isNaN(inductionDate.getTime())) return;

    inductionDate.setHours(0, 0, 0, 0);

    const companyName = (row["PERUSAHAAN"] || "").toUpperCase();
    const isCore = coreCompanyKeywords.some((keyword) =>
      companyName.includes(keyword)
    );
    const category = (row["KATEGORI"] || "").toLowerCase(); // Tetap coba baca KATEGORI jika ada di sheet

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
 * Menghitung statistik skor (terendah, tertinggi, rata-rata) dari sekumpulan data.
 * @param {Array<Object>} data - Data induksi yang akan dihitung.
 * @returns {{lowest: number, highest: number, average: number}} - Objek berisi statistik skor.
 */
function calculateScoreStats(data) {
  if (!data || data.length === 0) {
    return { lowest: 0, highest: 0, average: 0 };
  }

  const scores = data
    .map((item) => {
      const scoreStr = String(
        item["SCORE"] || item["S.RATA-RATA"] || ""
      ).replace(",", ".");
      return parseFloat(scoreStr);
    })
    .filter((score) => !isNaN(score));

  if (scores.length === 0) {
    return { lowest: 0, highest: 0, average: 0 };
  }

  const lowest = Math.min(...scores);
  const highest = Math.max(...scores);
  const sum = scores.reduce((acc, score) => acc + score, 0);
  const average = parseFloat((sum / scores.length).toFixed(1));

  return { lowest, highest, average };
}

/**
 * Memperbarui kartu KPI statistik skor harian (terendah, tertinggi, rata-rata).
 * @param {Array<Object>} inductionResultData - Data dari sheet 'hasil_induksi'.
 */
function updateDailyScoreKpi(inductionResultData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayData = inductionResultData.filter((row) => {
    if (!row || !row["DATE"]) return false;
    const inductionDate = parseTanggal(row["DATE"]);
    return (
      !isNaN(inductionDate.getTime()) &&
      inductionDate.setHours(0, 0, 0, 0) === today.getTime()
    );
  });

  const yesterdayData = inductionResultData.filter((row) => {
    if (!row || !row["DATE"]) return false;
    const inductionDate = parseTanggal(row["DATE"]);
    return (
      !isNaN(inductionDate.getTime()) &&
      inductionDate.setHours(0, 0, 0, 0) === yesterday.getTime()
    );
  });

  const todayStats = calculateScoreStats(todayData);
  const yesterdayStats = calculateScoreStats(yesterdayData);

  document.getElementById("score-lowest-today").textContent =
    todayStats.lowest.toLocaleString("id-ID");
  document.getElementById("score-highest-today").textContent =
    todayStats.highest.toLocaleString("id-ID");
  document.getElementById("score-average-today").textContent =
    todayStats.average.toLocaleString("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  updateComparisonUI(
    "lowest-score-comparison",
    todayStats.lowest,
    yesterdayStats.lowest
  );
  updateComparisonUI(
    "highest-score-comparison",
    todayStats.highest,
    yesterdayStats.highest
  );
  updateComparisonUI(
    "average-score-comparison",
    todayStats.average,
    yesterdayStats.average
  );
}
/**
 * Memperbarui kartu KPI harian untuk Induksi Visitor.
 * @param {Array<Object>} visitorData - Data dari sheet 'visitor_result'.
 */
function updateDailyVisitorKpi(visitorData) {
  const visitorCountEl = document.getElementById("induksi-visitor-today-count");
  if (!visitorCountEl) {
    console.error("Elemen KPI visitor tidak ditemukan.");
    return;
  }

  if (!visitorData) {
    visitorCountEl.textContent = "N/A";
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let todayCount = 0;
  let yesterdayCount = 0;
  let activeCount = 0;

  visitorData.forEach((row) => {
    if (!row) return;

    // Hitung induksi harian berdasarkan tanggal 'MULAI'
    if (row["MULAI"]) {
      const visitDate = parseTanggal(row["MULAI"]);
      if (!isNaN(visitDate.getTime())) {
        visitDate.setHours(0, 0, 0, 0);
        if (visitDate.getTime() === today.getTime()) todayCount++;
        else if (visitDate.getTime() === yesterday.getTime()) yesterdayCount++;
      }
    }

    // Hitung visitor aktif berdasarkan rentang tanggal 'MULAI' dan 'SELESAI'
    const startDate = parseTanggal(row["MULAI"]);
    const endDate = parseTanggal(row["SELESAI"]);

    if (!isNaN(startDate.getTime())) {
      startDate.setHours(0, 0, 0, 0);

      if (isNaN(endDate.getTime())) {
        // Jika tidak ada tanggal selesai, anggap aktif jika hari ini >= tanggal mulai
        if (today.getTime() >= startDate.getTime()) {
          activeCount++;
        }
      } else {
        // Jika ada tanggal selesai, anggap aktif jika hari ini berada di antara rentang
        endDate.setHours(0, 0, 0, 0);
        if (
          today.getTime() >= startDate.getTime() &&
          today.getTime() <= endDate.getTime()
        ) {
          activeCount++;
        }
      }
    }
  });

  const oldVisitorCount =
    parseInt(visitorCountEl.textContent.replace(/\./g, "")) || 0;
  animateValue(visitorCountEl, oldVisitorCount, todayCount, 1500);
  updateComparisonUI("visitor-comparison", todayCount, yesterdayCount);

  // Perbarui badge visitor aktif
  const activeVisitorCountEl = document.getElementById("active-visitor-count");
  if (activeVisitorCountEl) {
    activeVisitorCountEl.textContent = activeCount;
    // Tambahkan atau hapus kelas 'blinking' berdasarkan jumlah visitor aktif
    if (activeCount > 0) {
      activeVisitorCountEl.classList.add("blinking");
    } else {
      activeVisitorCountEl.classList.remove("blinking");
    }
  }
}

/**
 * Mengambil dan menampilkan kata sandi untuk hari ini.
 * PERBAIKAN: Fungsi ini sekarang mencari berdasarkan kolom 'tanggal' dan 'kode_akses'.
 */
async function updatePasswordKpi() {
  const passwordEl = document.getElementById("password-today");
  if (!passwordEl) {
    console.error("Elemen KPI password tidak ditemukan.");
    return;
  }

  try {
    const { id, sheet } = SHEET_SOURCES.password;
    const passwordData = await fetchSheet(id, sheet);

    if (!passwordData || passwordData.length === 0) {
      passwordEl.textContent = "Data Error";
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalisasi ke awal hari untuk perbandingan yang akurat

    console.log(
      `Mencari password untuk tanggal: ${today.toLocaleDateString("id-ID")}`
    );

    const todayPasswordRow = passwordData.find((row) => {
      if (!row.tanggal) return false;
      const rowDate = parseTanggal(row.tanggal);
      rowDate.setHours(0, 0, 0, 0); // Normalisasi tanggal dari sheet juga
      // Log untuk debugging
      // console.log(`Membandingkan: ${today.getTime()} vs ${rowDate.getTime()} (dari: ${row.tanggal})`);
      return rowDate.getTime() === today.getTime();
    });

    if (todayPasswordRow && todayPasswordRow.kode_akses) {
      const password = todayPasswordRow.kode_akses;
      passwordEl.textContent = password;
      passwordEl.addEventListener("click", () => {
        navigator.clipboard.writeText(password).then(() => {
          showInfoToast(`Password "${password}" disalin!`);
        });
      });
    } else {
      passwordEl.textContent = "Tidak Tersedia";
    }
  } catch (error) {
    console.error("Gagal mengambil data password:", error);
    passwordEl.textContent = "Gagal Memuat";
  }
}

/**
 * Updates the date display card with the current date.
 */
function updateDateDisplay() {
  const dayEl = document.getElementById("current-day");
  const dateEl = document.getElementById("current-date");
  const yearEl = document.getElementById("current-year");

  if (!dayEl || !dateEl || !yearEl) return;

  const now = new Date();
  const dayName = new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(
    now
  );
  const dateNumber = now.getDate();
  const monthYear = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(now);

  dayEl.textContent = dayName;
  dateEl.textContent = dateNumber;
  yearEl.textContent = monthYear;
}

/**
 * Updates the digital clock display every second.
 */
function updateDigitalClock() {
  const timeEl = document.getElementById("current-time");
  if (!timeEl) return;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  timeEl.textContent = `${hours}:${minutes}:${seconds}`;
}

/**
 * Memeriksa kondisi filter untuk satu baris data.
 * @param {Object} dataRow - Baris data yang akan diperiksa.
 * @param {Object} filters - Objek berisi nilai filter saat ini.
 * @returns {boolean} - True jika baris cocok dengan filter.
 */
function checkFilterMatch(dataRow, filters) {
  const { key, perusahaanDropdown, perusahaanSearch, start, end, search } =
    filters;

  // 1. Filter Perusahaan (Prioritaskan search box)
  const perusahaanData = (
    dataRow["perusahaan"] ||
    dataRow["PERUSAHAAN"] ||
    ""
  ).toLowerCase();
  let matchPerusahaan;
  if (perusahaanSearch) {
    // Jika search box diisi, gunakan itu untuk filter
    matchPerusahaan = perusahaanData.includes(perusahaanSearch);
  } else {
    // Jika kosong, gunakan dropdown
    matchPerusahaan =
      perusahaanDropdown === "all" ||
      perusahaanData.trim() === perusahaanDropdown.trim().toLowerCase();
  }

  const tanggalStr =
    dataRow["tanggal"] ||
    dataRow["Timestamp"] ||
    dataRow["DATE"] ||
    dataRow["TANGGAL"] ||
    dataRow["MULAI"];
  const rowDate = parseTanggal(tanggalStr);
  const isDateValid = !isNaN(rowDate.getTime());
  const startTime = start ? new Date(start).setHours(0, 0, 0, 0) : -Infinity;
  const endTime = end ? new Date(end).setHours(23, 59, 59, 999) : Infinity;
  const matchDate =
    (!start && !end) ||
    (isDateValid &&
      rowDate.getTime() >= startTime &&
      rowDate.getTime() <= endTime);

  const nama = (dataRow["NAMA"] || dataRow["NAMA JABATAN"] || "").toLowerCase();
  const matchSearch = !search || nama.includes(search);

  return matchPerusahaan && matchDate && matchSearch;
}

/**
 * Mengisi dropdown filter tahun untuk grafik tren.
 * @param {Array<Object>} data Data dari sheet 'grafik'.
 */
function populateYearFilter(data) {
  const yearFilter = document.getElementById("trend-year-filter");
  if (!yearFilter || !data) return;

  const years = [
    ...new Set(data.map((row) => parseTanggal(row.TANGGAL).getFullYear())),
  ]
    .filter((year) => !isNaN(year))
    .sort((a, b) => b - a); // Urutkan dari tahun terbaru

  yearFilter.innerHTML = `<option value="all">Semua Tahun</option>`;
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });
}

/**
 * Gets the date of the Monday of the week for a given date.
 * @param {Date} d The input date.
 * @returns {string} The date string in YYYY-MM-DD format.
 */
function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Aggregates chart data by a given time period.
 * @param {Array<Object>} data The raw data to aggregate, expected to have a 'TANGGAL' property.
 * @param {'daily'|'weekly'|'monthly'|'yearly'} period The time period for aggregation.
 * @returns {Array<Object>} The aggregated data.
 */
function aggregateDataByPeriod(data, period) {
  if (period === "daily") {
    return data; // No aggregation needed for daily view
  }

  const aggregator = new Map();
  const metrics = ["NEW HIRE", "PASCA CUTI", "VISITOR", "TEMPORARY"];

  data.forEach((row) => {
    const date = parseTanggal(row.TANGGAL);
    if (isNaN(date.getTime())) return;

    let key;
    if (period === "weekly") {
      key = getStartOfWeek(date);
    } else if (period === "monthly") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
    } else if (period === "yearly") {
      key = `${date.getFullYear()}`;
    }

    if (!key) return;

    if (!aggregator.has(key)) {
      const initialData = { TANGGAL: key };
      metrics.forEach((metric) => (initialData[metric] = 0));
      aggregator.set(key, initialData);
    }

    const current = aggregator.get(key);
    metrics.forEach((metric) => {
      current[metric] += Number(row[metric] || 0);
    });
  });

  // Convert map to array and sort by date
  return Array.from(aggregator.values()).sort(
    (a, b) => new Date(a.TANGGAL) - new Date(b.TANGGAL)
  );
}

/**
 * Sorts an array of data based on a specified column and direction.
 * Handles date, numeric, and string comparisons.
 * @param {Array<Object>} data The data to sort (will be sorted in-place).
 * @param {string} column The column to sort by.
 * @param {'asc'|'desc'} direction The sort direction.
 */
function sortData(data, column, direction) {
  const isDateColumn = [
    "tanggal",
    "date",
    "mulai",
    "selesai",
    "timestamp",
    "tanggal induksi",
  ].includes(column.toLowerCase());

  data.sort((a, b) => {
    let valA = a[column] || "";
    let valB = b[column] || "";

    // Jika ini kolom tanggal, gunakan perbandingan tanggal
    if (isDateColumn) {
      const dateA = parseTanggal(valA);
      const dateB = parseTanggal(valB);
      // Handle invalid dates by pushing them to the end
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    // Coba parse sebagai angka untuk kolom skor, dll.
    const numA = parseFloat(String(valA).replace(",", "."));
    const numB = parseFloat(String(valB).replace(",", "."));

    if (!isNaN(numA) && !isNaN(numB)) {
      return direction === "asc" ? numA - numB : numB - numA;
    }

    // Jika bukan, bandingkan sebagai string (case-insensitive)
    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();

    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

/**
 * Filters the data based on user input (company, date range, search term)
 * and re-renders the table.
 * @param {string} key - The key identifying the data source.
 */
function applyFilter(key) {
  const perusahaanDropdown =
    document.getElementById(`filter-${key}`)?.value || "all";
  const perusahaanSearch =
    document.getElementById(`search-perusahaan-${key}`)?.value?.toLowerCase() ||
    "";
  const start = document.getElementById(`startDate-${key}`)?.value;
  const end = document.getElementById(`endDate-${key}`)?.value;
  const search =
    document.getElementById(`search-${key}`)?.value?.toLowerCase() || "";

  // Selalu filter dari data asli yang ada di cache global
  const dataToFilter = sheetDataCache[key] || [];

  let filtered = dataToFilter.filter((row) => {
    const filters = {
      key,
      perusahaanDropdown,
      perusahaanSearch,
      start,
      end,
      search,
    };
    return checkFilterMatch(row, filters);
  });

  // Lakukan sorting pada data yang sudah difilter
  if (sortState[key]) {
    const { column, direction } = sortState[key];
    sortData(filtered, column, direction);
  }

  // Render ulang tabel atau grafik berdasarkan `key`
  if (key === "grafik") {
    currentFilteredData[key] = filtered;
    // Hanya inisialisasi chart jika tab 'grafik' sedang aktif.
    // Ini mencegah error "getContext of null" saat halaman pertama kali dimuat,
    // karena canvas chart belum ada di DOM jika tab-nya tidak aktif.
    const grafikTabElement = document.getElementById("grafik");
    if (grafikTabElement && grafikTabElement.classList.contains("active")) {
      // 1. Filter berdasarkan tahun jika tahun spesifik dipilih dan view bukan 'tahunan'
      let yearFilteredData = filtered;
      if (trendChartYear !== "all" && trendChartPeriod !== "yearly") {
        yearFilteredData = filtered.filter((row) => {
          const rowYear = parseTanggal(row.TANGGAL).getFullYear();
          return rowYear == trendChartYear;
        });
      }
      // 2. Agregasi data yang (kemungkinan) sudah difilter per tahun
      const trendData = aggregateDataByPeriod(
        yearFilteredData,
        trendChartPeriod
      );
      // 3. Inisialisasi chart (chart lain tetap menggunakan data filter penuh)
      initializeCharts({ trendData: trendData, otherData: filtered });
    }
  } else {
    currentFilteredData[key] = filtered;
    renderTable(filtered, `table-${key}`, key);
  }
}

const debouncedApplyFilter = debounce(applyFilter, 300); // 300ms delay

/**
 * Initializes all charts based on "grafik" data.
 * @param {Object} chartData - An object containing data for different charts.
 * @param {Array} chartData.trendData - Aggregated data for the trend chart.
 * @param {Array} chartData.otherData - Raw filtered data for other charts.
 */
function initializeCharts({ trendData, otherData }) {
  // Get canvas elements
  const trendCanvas = document.getElementById("induksiTrendChart");
  const skorCanvas = document.getElementById("skorJabatanChart");
  const perusahaanCanvas = document.getElementById("induksiPerusahaanChart");

  // If any canvas is not found, do not proceed.
  // This can happen if the 'grafik' tab is not active or the elements are missing in the HTML.
  if (!trendCanvas || !skorCanvas || !perusahaanCanvas) {
    console.warn(
      "One or more chart canvas elements not found. Skipping chart initialization."
    );
    return;
  }

  // Hancurkan chart lama untuk mencegah memory leak
  ["induksiTrendChart", "skorJabatanChart", "induksiPerusahaanChart"].forEach(
    (id) => {
      const chartInstance = Chart.getChart(id);
      if (chartInstance) {
        chartInstance.destroy();
      }
    }
  );

  // --- 1. Grafik Tren Induksi Harian (Line Chart) ---
  const dataTren = trendData;
  const labelsTren = dataTren.map((d) => d.TANGGAL); // Label is now week start or month
  new Chart(trendCanvas.getContext("2d"), {
    type: "line",
    data: {
      labels: labelsTren,
      datasets: [
        {
          label: "New Hire",
          data: dataTren.map((d) => d["NEW HIRE"] || 0),
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: true,
        },
        {
          label: "Pasca Cuti",
          data: dataTren.map((d) => d["PASCA CUTI"] || 0),
          borderColor: "rgba(255, 206, 86, 1)",
          backgroundColor: "rgba(255, 206, 86, 0.2)",
          fill: true,
        },
        {
          label: "Visitor",
          data: dataTren.map((d) => d["VISITOR"] || 0),
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          fill: true,
        },
        {
          label: "Temporary",
          data: dataTren.map((d) => d["TEMPORARY"] || 0),
          borderColor: "rgba(153, 102, 255, 1)",
          backgroundColor: "rgba(153, 102, 255, 0.2)",
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Tren Induksi Harian" } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // --- 2. Grafik Skor per Jabatan (Bar Chart) ---
  const dataSkor = otherData.filter((d) => d["NAMA JABATAN"]);
  const labelsJabatan = [...new Set(dataSkor.map((d) => d["NAMA JABATAN"]))];
  new Chart(skorCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labelsJabatan,
      datasets: [
        {
          label: "Skor Terendah",
          data: dataSkor.map((d) => d["SCORE_TERENDAH"] || 0),
          backgroundColor: "rgba(255, 99, 132, 0.7)",
        },
        {
          label: "Skor Tertinggi",
          data: dataSkor.map((d) => d["SCORE_TERTINGGI"] || 0),
          backgroundColor: "rgba(75, 192, 192, 0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Skor Induksi per Jabatan" } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // --- 3. Grafik Komposisi Induksi per Perusahaan (Stacked Bar Chart) ---
  const dataPerusahaan = otherData.filter((d) => d.PERUSAHAAN);
  const labelsPerusahaan = [
    ...new Set(dataPerusahaan.map((d) => d.PERUSAHAAN)),
  ]; // Ambil perusahaan unik
  new Chart(perusahaanCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labelsPerusahaan,
      datasets: [
        {
          label: "New Hire",
          data: labelsPerusahaan.map((p) =>
            dataPerusahaan
              .filter((d) => d.PERUSAHAAN === p)
              .reduce((sum, item) => sum + (Number(item["NEW HIRE_1"]) || 0), 0)
          ),
          backgroundColor: "rgba(54, 162, 235, 0.7)",
        },
        {
          label: "Pasca Cuti",
          data: labelsPerusahaan.map((p) =>
            dataPerusahaan
              .filter((d) => d.PERUSAHAAN === p)
              .reduce(
                (sum, item) => sum + (Number(item["PASCA CUTI_1"]) || 0),
                0
              )
          ),
          backgroundColor: "rgba(255, 206, 86, 0.7)",
        },
        {
          label: "Visitor",
          data: labelsPerusahaan.map((p) =>
            dataPerusahaan
              .filter((d) => d.PERUSAHAAN === p)
              .reduce((sum, item) => sum + (Number(item["VISITOR_1"]) || 0), 0)
          ),
          backgroundColor: "rgba(75, 192, 192, 0.7)",
        },
        {
          label: "Temporary",
          data: labelsPerusahaan.map((p) =>
            dataPerusahaan
              .filter((d) => d.PERUSAHAAN === p)
              .reduce(
                (sum, item) => sum + (Number(item["TEMPORARY_1"]) || 0),
                0
              )
          ),
          backgroundColor: "rgba(153, 102, 255, 0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "Komposisi Induksi per Perusahaan" },
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true },
      },
    },
  });
}

/**
 * Initializes all data and renders tables/charts.
 */
async function init() {
  showLoader();
  try {
    await loadPerusahaanList();

    // Kunci yang relevan setelah menghapus spdk dan checklist_induksi
    const relevantKeys = [
      "newhire",
      "pendaftaran",
      "hasil_induksi",
      "remidial",
      "grafik",
      "temporary",
      "visitor",
    ];

    // Inisialisasi state untuk setiap tabel
    relevantKeys.forEach((key) => {
      currentPageState[key] = 1;
      // Atur pengurutan default ke tanggal terbaru untuk tabel, dan urutan waktu untuk grafik
      switch (key) {
        case "visitor":
          sortState[key] = { column: "MULAI", direction: "desc" };
          break;
        case "temporary":
        case "hasil_induksi":
        case "remidial":
          sortState[key] = { column: "DATE", direction: "desc" };
          break;
        case "pendaftaran":
          sortState[key] = { column: "Timestamp", direction: "desc" };
          break;
        case "grafik":
          sortState[key] = { column: "TANGGAL", direction: "asc" }; // Grafik harus urut waktu
          break;
        case "newhire":
          sortState[key] = { column: "tanggal", direction: "desc" };
          break;
        default:
          // Fallback jika ada key baru
          break;
      }
    });

    // Ambil semua data secara paralel dan isi cache global
    const dataPromises = relevantKeys.map((key) => {
      const { id, sheet } = SHEET_SOURCES[key];
      return fetchAndCacheSheet(id, sheet, key);
    });
    await Promise.all(dataPromises);

    // Isi filter tahun untuk grafik tren setelah data dimuat
    populateYearFilter(sheetDataCache.grafik || []);

    // Setelah semua data ada di cache global, render semuanya

    // Render KPI
    renderInduksiKPIs(
      sheetDataCache.pendaftaran || [],
      sheetDataCache.hasil_induksi || [],
      sheetDataCache.temporary || [],
      sheetDataCache.newhire || []
    );
    updateDailyInductionKpi(sheetDataCache.hasil_induksi || []);
    updateDailyVisitorKpi(sheetDataCache.visitor || []);
    updateDailyScoreKpi(sheetDataCache.hasil_induksi || []);
    updatePasswordKpi();

    // Terapkan filter dan render semua tabel dan grafik
    relevantKeys.forEach((key) => {
      applyFilter(key); // Sekarang panggil applyFilter setelah data dimuat
    });
  } catch (error) {
    handleError(error, "Gagal memuat data aplikasi. Coba muat ulang halaman.");
  } finally {
    hideLoader();
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

  const tabElement = document.getElementById(tabId);
  if (tabElement) {
    tabElement.classList.add("active");
  }

  // Jika event ada, aktifkan tombol yang diklik. Jika tidak, cari tombol berdasarkan tabId.
  if (event) {
    event.currentTarget.classList.add("active");
  } else {
    const tabButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (tabButton) {
      tabButton.classList.add("active");
    }
  }

  if (sheetDataCache[tabId]) {
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
  updateDateDisplay(); // Tampilkan tanggal hari ini
  setInterval(updateDigitalClock, 1000); // Mulai jam digital
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

  // Event listener untuk filter rentang waktu pada grafik tren
  const trendChartFilter = document.getElementById("trend-chart-filter");
  const yearFilterDropdown = document.getElementById("trend-year-filter");

  if (trendChartFilter && yearFilterDropdown) {
    trendChartFilter.addEventListener("click", (event) => {
      if (event.target.matches(".time-filter-btn")) {
        // Hapus kelas aktif dari semua tombol
        trendChartFilter
          .querySelectorAll(".time-filter-btn")
          .forEach((btn) => btn.classList.remove("active"));
        // Tambahkan kelas aktif ke tombol yang diklik
        event.target.classList.add("active");
        // Perbarui state rentang waktu global
        trendChartPeriod = event.target.dataset.period;

        // Tampilkan/sembunyikan dropdown tahun
        if (trendChartPeriod === "yearly") {
          yearFilterDropdown.classList.add("hidden");
          // Reset filter tahun saat beralih ke tampilan tahunan
          if (trendChartYear !== "all") {
            yearFilterDropdown.value = "all";
            trendChartYear = "all";
          }
        } else {
          yearFilterDropdown.classList.remove("hidden");
        }

        // Terapkan ulang filter untuk merender ulang grafik
        applyFilter("grafik");
      }
    });

    yearFilterDropdown.addEventListener("change", (event) => {
      trendChartYear = event.target.value;
      applyFilter("grafik");
    });
  }

  // Event listeners for filters using debounced function
  document
    .querySelectorAll(
      '[id^="filter-"], [id^="startDate-"], [id^="endDate-"], [id^="search-"], [id^="search-perusahaan-"]'
    )
    .forEach((element) => {
      // Extract the key from the ID (e.g., "filter-newhire" -> "newhire")
      // This logic robustly gets the last part of the ID, which is always the key.
      // e.g., "search-perusahaan-newhire" becomes "newhire".
      const key = element.id.substring(element.id.lastIndexOf("-") + 1);

      const filterChangeHandler = () => {
        currentPageState[key] = 1; // Kembali ke halaman 1 saat filter diubah
        debouncedApplyFilter(key);
      };

      element.addEventListener("input", filterChangeHandler);
      element.addEventListener("change", filterChangeHandler); // For date inputs
    });

  // Event listener untuk tombol tab buttons
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const tabId = event.currentTarget.dataset.tab;
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
  const kpiContainer = document.getElementById("kpi-container");
  if (kpiContainer) {
    kpiContainer.addEventListener("click", (event) => {
      const card = event.target.closest(".kpi-card.clickable");
      if (card) {
        const tabId = card.dataset.tab;
        const tabButton = document.querySelector(
          `.tab-btn[data-tab="${tabId}"]`
        );
        if (tabButton) {
          tabButton.click();
        }
      }
    });
  }

  // Event listener untuk tombol paginasi (menggunakan event delegation)
  document.body.addEventListener("click", (event) => {
    if (event.target.matches(".pagination-btn")) {
      const key = event.target.dataset.key;
      const action = event.target.dataset.action;
      const currentPage = currentPageState[key] || 1;
      const totalRows = currentFilteredData[key]?.length || 0;
      const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE);

      if (action === "next" && currentPage < totalPages) {
        currentPageState[key]++;
      } else if (action === "prev" && currentPage > 1) {
        currentPageState[key]--;
      }
      applyFilter(key); // Render ulang tabel untuk halaman baru
    }
  });

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
