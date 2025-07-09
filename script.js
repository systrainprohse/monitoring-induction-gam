// --- Global Variables and Constants ---
updateBannerText("🚧 Hari ini ada inspeksi K3 di area workshop • Pastikan semua APD lengkap •");

const SHEET_SOURCES = {
  // <— induksi
  pendaftaran: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "pendaftaran_induksi" },
  spdk: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "spdk" },
  checklist_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_checklist" },
  hasil_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_result" },
  // MEMPERBAIKI ID UNTUK REMIDIAL (ID sebelumnya salah)
  remidial: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "remidial" },
  grafik: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "DashboardGrafik" },
  newhire: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "new_hire" },
  setting: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "setting" },

  temporary: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "temporary_data" }, // Data untuk tab Temporary

  // <— pelatihan (Sumber data ini hanya relevan untuk pelatihan.html, tidak untuk index.html)
  monitoring_pelatihan: { id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM", sheet: "monitoring" },
  pendaftaran_training: { id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM", sheet: "training_register" },
  jadwal_training: { id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM", sheet: "jadwal_training" }
};

const kolomTampilkan = {
  // <— induksi
  newhire: ["tanggal", "NIK", "NAMA", "JABATAN", "perusahaan", "checklist", "SPDK", "SCORE", "APV SYS", "APV HSE", "STATUS"],
  pendaftaran: ["tanggal", "perusahaan", "NAMA", "JABATAN", "JENIS INDUKSI", "HARI", "DATE"],
  spdk: ["tanggal", "perusahaan", "NAMA", "SPDK"],
  checklist_induksi: ["tanggal", "perusahaan", "NAMA", "CHECKLIST"],
  hasil_induksi: ["tanggal", "perusahaan", "NAMA", "JABATAN", "KATEGORI", "S. SIMPER", "SCORE K3", "S. JABATAN", "S.RATA-RATA"],
  remidial: ["tanggal", "perusahaan", "NAMA", "JABATAN", "KATEGORI", "S. SIMPER", "SCORE K3", "S. JABATAN", "S.RATA-RATA"],
  temporary: ["DATE", "SCORE", "NAMA", "PERUSAHAAN", "DEPARTEMENT", "JABATAN", "PEMATERI", "STATUS"], // Kolom untuk tab Temporary
  grafik: ["TANGGAL INDUKSI", "CUTI", "NEW HIRE", "NAMA JABATAN", "SCORE_TERENDAH", "SCORE_TERTINGGI"],

  // <— pelatihan (Kolom ini hanya relevan untuk pelatihan.html)
  monitoring_pelatihan: ["tanggal", "perusahaan", "skor_rata2"],
  pendaftaran_training: ["TRAINING", "PERUSAHAAN", "TANGGAL", "DEPT"],
  jadwal_training: ["tanggal_mulai", "tanggal_selesai", "nama_kegiatan", "ruangan", "jumlah_peserta", "pic"]
};

let perusahaanList = [];
let allOriginalData = {}; // Stores all fetched, original data
let audioUnlocked = false; // Flag untuk melacak apakah audio sudah diizinkan

// --- Utility Functions ---

function showLoader() {
  document.getElementById('loader')?.style.setProperty("display", "block");
}

function hideLoader() {
  document.getElementById('loader')?.style.setProperty("display", "none");
}

/**
 * Fetches data from a Google Sheet. Caches data to avoid redundant fetches.
 * @param {string} key - The key from SHEET_SOURCES.
 * @returns {Promise<Array>} - The fetched data.
 */
async function fetchSheetByKey(key) {
  if (allOriginalData[key]) {
    // console.log(`Returning cached data for ${key}`);
    return allOriginalData[key];
  }

  showLoader();
  try {
    const { id, sheet } = SHEET_SOURCES[key];
    const url = `https://opensheet.elk.sh/${id}/${sheet}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gagal mengambil ${sheet}`);
    const data = await response.json();
    allOriginalData[key] = data; // Cache the fetched data
    return data;
  } catch (err) {
    console.error(`Error fetching ${key}:`, err);
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * Loads and sorts the unique list of companies from the "setting" sheet.
 */
async function loadPerusahaanList() {
  const data = await fetchSheetByKey("setting");
  const seen = new Set();
  perusahaanList = [];

  data.forEach(d => {
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
    const isScore = scoreKeywords.some(kw => hLower.includes(kw));
    const isStatus = statusKeywords.some(kw => hLower.includes(kw));

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
        } else if (["rejected", "no", "tidak", "gagal", "belum"].includes(valueLower)) {
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

  const allowed = kolomTampilkan[key] || Object.keys(data[0]);

  // Using DocumentFragment for efficient DOM updates
  const fragment = document.createDocumentFragment();

  // Selalu buat header tabel agar struktur tetap konsisten
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  allowed.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h.toUpperCase(); // Membuat header menjadi kapital
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  fragment.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (!data || data.length === 0) {
    // Jika tidak ada data, tampilkan pesan di dalam satu baris tabel
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = "Data tidak tersedia.";
    td.colSpan = allowed.length || 1; // Colspan agar pesan berada di tengah
    td.style.textAlign = "center";
    td.style.padding = "20px";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    // Jika ada data, buat baris untuk setiap entri data
    data.forEach(row => {
      const tr = document.createElement('tr');
      allowed.forEach(h => {
        const td = document.createElement('td');
        const nilai = row[h] || "";
        const { warna, emoji } = getCellStyle(h, nilai);

        if (warna) { // If a special style is returned, create a badge
            const badge = document.createElement('span');
            badge.className = `badge ${warna}`; // e.g., "badge approved"
            badge.textContent = emoji + nilai;
            td.appendChild(badge);
        } else { // Otherwise, just render plain text
            td.textContent = nilai;
        }

        td.title = nilai;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  fragment.appendChild(tbody);

  // Clear existing table content before appending new fragment
  table.innerHTML = '';
  table.appendChild(fragment);

  // Populate filter dropdown if available
  const filter = document.getElementById(`filter-${key}`);
  if (filter && perusahaanList.length && filter.options.length <= 1) { // Prevent re-populating if already done
    filter.innerHTML = `<option value="all">Semua</option>` +
      perusahaanList.map(p => `<option value="${p}">${p}</option>`).join("");
  }

  table.classList.remove("loaded");
  setTimeout(() => table.classList.add("loaded"), 10);
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
  const search = document.getElementById(`search-${key}`)?.value?.toLowerCase() || "";

  // Always filter from the original, full dataset
  const dataToFilter = allOriginalData[key] || [];

  const filtered = dataToFilter.filter(d => {
    // Filter Perusahaan (tidak berlaku untuk grafik, tapi aman untuk dipertahankan)
    const perusahaanData = d["perusahaan"] || d["Perusahaan"] || "";
    const matchPerusahaan = perusahaan === "all" ||
      perusahaanData.trim().toLowerCase() === perusahaan.trim().toLowerCase();

    // Filter Tanggal (menambahkan 'TANGGAL INDUKSI' untuk data grafik)
    const tanggalStr = d["tanggal"] || d["Tanggal"] || d["TANGGAL"] || d["DATE"] || d["TANGGAL INDUKSI"];
    const rowDate = parseTanggal(tanggalStr);
    const isDateValid = !isNaN(rowDate.getTime());
    let matchDate = true;
    if (isDateValid) {
      const startTime = start ? new Date(start).setHours(0, 0, 0, 0) : -Infinity;
      const endTime = end ? new Date(end).setHours(23, 59, 59, 999) : Infinity;
      matchDate = rowDate.getTime() >= startTime && rowDate.getTime() <= endTime;
    } else if (start || end) {
      matchDate = false;
    }

    // Filter Pencarian (disesuaikan untuk setiap tab)
    let matchSearch = true;
    if (search) {
      if (key === 'grafik') {
        const jabatan = (d["NAMA JABATAN"] || "").toLowerCase();
        matchSearch = jabatan.includes(search);
      } else {
        const nama = (d["NAMA"] || d["Nama"] || "").toLowerCase();
        matchSearch = nama.includes(search);
      }
    }

    return matchPerusahaan && matchDate && matchSearch;
  });

  // Render ulang tabel atau grafik berdasarkan `key`
  if (key === 'grafik') {
    // Urutkan data berdasarkan tanggal secara menaik (ascending) sebelum merender grafik
    // Ini memastikan sumbu-x pada grafik garis (line chart) berurutan secara kronologis.
    filtered.sort((a, b) => {
        const dateA = parseTanggal(a["TANGGAL INDUKSI"]);
        const dateB = parseTanggal(b["TANGGAL INDUKSI"]);
        return dateA - dateB;
    });
    initializeCharts(filtered);
  } else {
    renderTable(filtered, `table-${key}`, key);
  }
}

// Debounce function to limit how often a function is called
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

const debouncedApplyFilter = debounce(applyFilter, 300); // 300ms delay

/**
 * Initializes charts based on "grafik" data.
 * @param {Array} data - The data for charts.
 */
function initializeCharts(data) {
  // Clear previous charts if they exist to prevent memory leaks/re-rendering issues
  Chart.getChart("chartScore")?.destroy();
  Chart.getChart("chartScore1")?.destroy();
  Chart.getChart("chartScore2")?.destroy();

  // Grafik 1 (chartScore) dinonaktifkan karena sumber data 'DashboardGrafik'
  // tidak memiliki kolom 'Kategori' dan 'Nilai'.
  // Jika ingin diaktifkan, pastikan kolom tersebut ada di Google Sheet.

  // Grafik 2 & 3: Cuti/New Hire & Skor Tertinggi/Terendah
  const canvas1 = document.getElementById("chartScore1");
  const canvas2 = document.getElementById("chartScore2");
  if (!canvas1 || !canvas2) return;

  const ctx1 = canvas1.getContext("2d");
  const ctx2 = canvas2.getContext("2d");

  const labels = data.map(d => d["TANGGAL INDUKSI"] || "");
  const cutiData = data.map(d => parseFloat(d["CUTI"]) || 0);
  const newHireData = data.map(d => parseFloat(d["NEW HIRE"]) || 0);
  const scoreTertinggi = data.map(d => parseFloat(d["SCORE_TERTINGGI"]) || 0);
  const scoreTerendah = data.map(d => parseFloat(d["SCORE_TERENDAH"]) || 0);
  const jabatanLabels = data.map(d => d["NAMA JABATAN"] || "");

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
          pointRadius: 5
        },
        {
          label: "New Hire",
          data: newHireData,
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          fill: true,
          pointRadius: 5
        }
      ]
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
        x: { type: "category", title: { display: true, text: "Tanggal Induksi" } },
        y: { beginAtZero: true, title: { display: true, text: "Jumlah" } }
      }
    }
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
          borderColor: "rgba(75, 192, 192, 1)"
        },
        {
          label: "SCORE_TERENDAH",
          data: scoreTerendah,
          backgroundColor: "rgba(153, 102, 255, 0.2)",
          borderColor: "rgba(153, 102, 255, 1)"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        // datalabels requires plugin registration
      },
      scales: {
        x: { title: { display: true, text: "Jabatan" } },
        y: { beginAtZero: true, title: { display: true, text: "SCORE" } }
      }
    }
  });
}

/**
 * Initializes all data and renders tables/charts.
 */
async function init() {
  showLoader(); // Show loader at the very beginning of init
  try {
    await loadPerusahaanList(); // Ensure companies are loaded first

    // Hanya proses kunci yang relevan untuk index.html
    const relevantKeysForIndexHtml = [
      "newhire",
      "pendaftaran",
      "spdk",
      "checklist_induksi",
      "hasil_induksi",
      "remidial",
      "grafik",
      "temporary" // Tambahkan 'temporary' ke daftar kunci yang relevan
    ];

    for (const key of relevantKeysForIndexHtml) {
      const data = await fetchSheetByKey(key); // This will use cached data if available

      if (key === "grafik") {
        initializeCharts(data);
      } else {
        renderTable(data, `table-${key}`, key);
      }
    }
  } catch (error) {
    console.error("Initialization failed:", error);
  } finally {
    hideLoader(); // Sembunyikan loader setelah semua data diproses
  }
}

/**
 * Opens a specific tab in the UI.
 * @param {string} tabId - The ID of the tab content to show.
 * @param {Event} event - The click event (optional).
 */
function openTab(tabId, event) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  event?.target?.classList.add('active');

  // If the opened tab has filters, re-apply them to ensure correct display
  // This is important if data has been fetched but filters weren't applied after tab switch
  if (allOriginalData[tabId]) { // Sekarang filter juga berlaku untuk tab 'grafik'
    applyFilter(tabId);
  }
}


function toggleGroup(groupId, toggleBtn) {
  const group = document.getElementById(groupId);
  if (!group || !toggleBtn) return;

  const isOpen = group.classList.toggle("show");

  // Update button text and emoji based on state
  if (groupId === 'induksi-group') {
    toggleBtn.innerHTML = isOpen
      ? "📘 Proses Induksi ▴"
      : "📘 Proses Induksi ▾";
  } else if (groupId === 'pelatihan-group') {
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
  const teks = `Halo, saya ingin bertanya tentang induksi.%0ANama: ${encodeURIComponent(nama)}%0APertanyaan: ${encodeURIComponent(pesan)}`;
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
  "📢 Laporkan segera jika melihat kondisi tidak aman!"
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
      sound.play().catch(e => {
        console.warn("🔇 Suara diblokir oleh browser (autoplay restriction):", e);
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

// --- Initial Setup on Page Load ---
document.addEventListener("DOMContentLoaded", () => {
  // Combine DOMContentLoaded logic
  openTab('newhire'); // Open default tab
  startSafetyRotation(); // Start safety message rotation

  // Event listeners for filters using debounced function
  document.querySelectorAll('[id^="filter-"], [id^="startDate-"], [id^="endDate-"], [id^="search-"]')
    .forEach(element => {
      // Extract the key from the ID (e.g., "filter-newhire" -> "newhire")
      const key = element.id.split('-').slice(1).join('-');
      element.addEventListener('input', () => debouncedApplyFilter(key));
      element.addEventListener('change', () => debouncedApplyFilter(key)); // For date inputs
    });

  // Event listener for tab buttons
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      const tabId = event.target.dataset.tab;
      if (tabId) {
        openTab(tabId, event);
      }
    });
  });

  // Event listener untuk group toggles (lebih robust)
  document.querySelectorAll('.tab-group-toggle').forEach(button => {
    button.addEventListener('click', (event) => {
        const groupId = event.currentTarget.dataset.groupId;
        if (groupId) {
            toggleGroup(groupId, event.currentTarget); // Pass the button itself
        }
    });
  });

  // WA form toggle dengan null checks
  const openWaFormBtn = document.getElementById('open-wa-form');
  if (openWaFormBtn) {
    openWaFormBtn.addEventListener('click', toggleWAForm);
  }
  const closeWaFormBtn = document.getElementById('close-wa-form');
  if (closeWaFormBtn) {
    closeWaFormBtn.addEventListener('click', toggleWAForm);
  }
  const kirimWaBtn = document.getElementById('kirim-wa-btn');
  if (kirimWaBtn) {
    kirimWaBtn.addEventListener('click', kirimWhatsApp);
  }

  // Splash screen and navbar fade-in
  const navbar = document.querySelector('.navbar');
  if (navbar) { // Tambahkan null check untuk navbar
    setTimeout(() => {
      navbar.classList.add('show');
    }, 2200); // match splash fadeOut timing
  }


  // Audio play for intro
  const enterBtn = document.getElementById('enter-btn');
  if (enterBtn) { // Tambahkan null check untuk enter-btn
    enterBtn.addEventListener('click', () => {
      const audio = document.getElementById('intro-audio');
      if (audio) {
        audio.play().catch(error => {
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
      notifSound.play().then(() => {
        notifSound.pause();
        notifSound.volume = 1; // Kembalikan volume ke normal
        audioUnlocked = true;
        console.log("🔊 Audio unlocked by user interaction.");
      }).catch(error => {
        console.warn("Gagal membuka kunci audio:", error);
      });
    }
    // Hapus listener ini setelah dipicu sekali
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };

  // Tambahkan listener ke body untuk interaksi pertama
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true }); // Untuk perangkat sentuh

  // Initial audio activation for safety sound (to bypass browser autoplay policies)
  // Ini tetap ada jika ada tombol startButton terpisah untuk audio notifikasi
  const startButton = document.querySelector("#startButton");
  if (startButton) {
    startButton.addEventListener("click", () => {
      const audio = document.getElementById("notif-sound");
      if (audio && !audioUnlocked) { // Hanya coba jika belum terbuka kuncinya
        audio.play().then(() => {
          console.log("🔊 Safety notification sound activated by user interaction.");
          audioUnlocked = true; // Setel flag jika berhasil
        }).catch(error => {
          console.warn("Safety notification audio failed to play (user interaction):", error);
        });
      }
    });
  }
});

// Run initial data fetching and rendering when the window loads
window.addEventListener("load", init);
