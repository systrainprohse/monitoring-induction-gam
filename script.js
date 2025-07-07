updateBannerText("🚧 Hari ini ada inspeksi K3 di area workshop • Pastikan semua APD lengkap •");

const SHEET_SOURCES = {

  // <— induksi

  pendaftaran: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "pendaftaran_induksi" },
  spdk: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "spdk" },
  checklist_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_checklist" },
  hasil_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_result" },
  remidial: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "remidial" },
  grafik: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "DashboardGrafik" },
  newhire: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "new_hire" },
  setting: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "setting" },
  
  // <— pelatihan

  monitoring_pelatihan: { id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM", sheet: "monitoring" },
  pendaftaran_training: { id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM", sheet: "pendaftaran_training" },
  jadwal_training: { id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM", sheet: "jadwal_training" }
  


};

const kolomTampilkan = {

  // <— induksi
  
  newhire: ["tanggal",	"NIK",	"NAMA",	"JABATAN","perusahaan","checklist","SPDK",	"APV SYS",	"APV HSE",	"STATUS","SCORE"],
  pendaftaran: ["tanggal", "perusahaan", "NAMA", "JABATAN", "JENIS INDUKSI", "HARI", "DATE"],
  spdk: ["tanggal", "perusahaan", "NAMA", "SPDK"],
  checklist_induksi: ["tanggal", "perusahaan", "NAMA", "CHECKLIST"],
  hasil_induksi: ["tanggal", "perusahaan", "NAMA", "JABATAN", "KATEGORI", "S. SIMPER", "SCORE K3", "S. JABATAN", "S.RATA-RATA"],
  remidial: ["tanggal", "perusahaan", "NAMA", "JABATAN", "KATEGORI", "S. SIMPER", "SCORE K3", "S. JABATAN", "S.RATA-RATA"],
  grafik: ["TANGGAL INDUKSI", "CUTI", "NEW HIRE", "NAMA JABATAN", "SCORE_TERENDAH", "SCORE_TERTINGGI"],

  // <— pelatihan

  monitoring_pelatihan: ["tanggal", "perusahaan", "skor_rata2"],
  pendaftaran_training: ["TANGGAL INDUKSI", "CUTI", "NEW HIRE", "NAMA JABATAN", "SCORE_TERENDAH", "SCORE_TERTINGGI"],
  jadwal_training: ["tanggal_mulai", "tanggal_selesai", "nama_kegiatan", "ruangan", "jumlah_peserta", "pic"]

};

const sheetDataCache = {};
let perusahaanList = [];
let allOriginalData = {}; // <— Tambahkan ini

document.addEventListener("DOMContentLoaded", () => {
  openTab('newhire');
});


function openTab(tabId, event) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
 event?.target?.classList.add('active');
}

function showLoader() {
  document.getElementById('loader')?.style.setProperty("display", "block");
}
function hideLoader() {
  document.getElementById('loader')?.style.setProperty("display", "none");
}

async function fetchSheetByKey(key) {
  showLoader();
  try {
    const { id, sheet } = SHEET_SOURCES[key];
    const url = `https://opensheet.elk.sh/${id}/${sheet}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gagal mengambil ${sheet}`);
    return await response.json();
  } catch (err) {
    console.error(err);
    return [];
  } finally {
    hideLoader();
  }
}


async function loadPerusahaanList() {
  const data = await fetchSheetByKey("setting");

  // Gunakan Set untuk menghindari duplikat berdasarkan lowercase + trim
  const seen = new Set();
  perusahaanList = [];

  data.forEach(d => {
    const nama = d["perusahaan"];
    if (!nama) return;

    const key = nama.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      perusahaanList.push(nama.trim()); // Simpan format asli
    }
  });

  perusahaanList.sort(); // Urutkan alfabetis
  console.log("Perusahaan unik:", perusahaanList);
}





function parseTanggal(str) {
  if (!str) return new Date("Invalid");
  if (str.includes("/")) {
    const [d, m, y] = str.split("/");
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(str);
}


function renderTable(data, tableId) {
  const key = tableId.replace("table-", "");
  sheetDataCache[key] = data;

  const table = document.getElementById(tableId);
  if (!data.length) {
    table.innerHTML = "<p>Data tidak tersedia.</p>";
    return;
  }

  const allowed = kolomTampilkan[key] || Object.keys(data[0]);
  const uniqueNames = new Set();

  const thead = `<thead><tr>${allowed.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${data.map(row => {
    const name = row["NAMA"] || "";
    if (uniqueNames.has(name)) return "";
    uniqueNames.add(name);

    return `<tr>${allowed.map(h => {
      const nilai = row[h] || "";
      const { warna, emoji } = getCellStyle(h, nilai);
      return `<td class="${warna}" title="${nilai}">${emoji}${nilai}</td>`;
    }).join("")}</tr>`;
  }).join("")}</tbody>`;

  table.innerHTML = thead + tbody;

  const filter = document.getElementById(`filter-${key}`);
  if (filter && perusahaanList.length) {
    filter.innerHTML = `<option value="all">Semua</option>` +
      perusahaanList.map(p => `<option value="${p}">${p}</option>`).join("");
  }

  table.classList.remove("loaded");
  setTimeout(() => table.classList.add("loaded"), 10);
}


function getUniqueCompanies(data) {
  const normalize = name =>
    name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();

  const rawNames = data.map(d => d["perusahaan"] || d["Perusahaan"] || "");
  const unique = [...new Set(rawNames.map(normalize))];
  return unique.filter(name => name); // buang yang kosong
}


function applyFilter(key) {
  const perusahaan = document.getElementById(`filter-${key}`)?.value || "all";
  const start = document.getElementById(`startDate-${key}`)?.value;
  const end = document.getElementById(`endDate-${key}`)?.value;
  const search = document.getElementById(`search-${key}`)?.value?.toLowerCase() || "";
  const data = sheetDataCache[key] || [];
  

  const filtered = data.filter(d => {
    const perusahaanData = d["perusahaan"] || d["Perusahaan"] || "";
    const nama = (d["NAMA"] || d["Nama"] || "").toLowerCase();
    const matchPerusahaan = perusahaan === "all" ||
      perusahaanData.trim().toLowerCase() === perusahaan.trim().toLowerCase();

    const tanggalStr = d["tanggal"] || d["Tanggal"] || "";
    const rowDate = parseTanggal(tanggalStr);
    if (isNaN(rowDate)) return false;

    const startTime = start ? new Date(start).getTime() : -Infinity;
    const endTime = end ? new Date(end).getTime() : Infinity;

    return matchPerusahaan &&
           rowDate.getTime() >= startTime &&
           rowDate.getTime() <= endTime &&
           nama.includes(search);
  });

  renderFilteredOnly(filtered, `table-${key}`, key);
  console.log(`🔍 Filtered ${filtered.length} rows for key: ${key}`);
}





function renderFilteredOnly(data, tableId, key) {
  const table = document.getElementById(tableId);
  if (!data.length) {
    table.innerHTML = "<p>Data tidak ditemukan.</p>";
    return;
  }

  const allowed = kolomTampilkan[key] || Object.keys(data[0]);

  const thead = `<thead><tr>${allowed.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${data.map(row =>
    `<tr>${allowed.map(h => {
      const nilai = row[h] || "";
      const { warna, emoji } = getCellStyle(h, nilai);
      return `<td class="${warna}" title="${nilai}">${emoji}${nilai}</td>`;
    }).join("")}</tr>`
  ).join("")}</tbody>`;

  table.innerHTML = thead + tbody;
  table.classList.remove("loaded");
  setTimeout(() => table.classList.add("loaded"), 10);
}


function getCellStyle(header, value) {
  const hLower = header.toLowerCase();
  const valueLower = value.toString().toLowerCase();
  const isScore = hLower.includes("rata") || hLower.includes("skor");
  const isStatus = ["checklist","status", "spdk", "apv sys", "apv hse"].includes(hLower);
  const angka = parseFloat(value);

  let warna = "";
  let emoji = "";

  if (isScore && !isNaN(angka)) {
    if (angka < 75) {
      warna = "red";
      emoji = "❌ ";
    } else {
      warna = "green";
      emoji = "✅ ";
    }
  } else if (isStatus) {
    if (["approved", "ok", "done"].includes(valueLower)) {
      warna = "approved";
      emoji = "✅ ";
    } else if (["no", "rejected"].includes(valueLower)) {
      warna = "red";
      emoji = "❌ ";
    } else if (valueLower === "hold") {
      warna = "hold";
      emoji = "⚠️ ";
    }
  }

  return { warna, emoji };
}



async function init() {
  for (const key in SHEET_SOURCES) {
    if (key === "setting") continue;
    const data = await fetchSheetByKey(key);

    if (key === "grafik") {
      // Grafik 1: Statistik Induksi (Kategori & Nilai)
      const canvasStatistik = document.getElementById("chartScore");
      if (canvasStatistik) {
        const ctxStatistik = canvasStatistik.getContext("2d");
        const kategoriLabels = data.map(d => d.Kategori || "");
        const nilaiData = data.map(d => parseFloat(d.Nilai) || 0);

        new Chart(ctxStatistik, {
          type: "bar",
          data: {
            labels: kategoriLabels,
            datasets: [{
              label: "Statistik Induksi",
              data: nilaiData,
              backgroundColor: "#007BFF"
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true },
              tooltip: { mode: "index" }
            },
            scales: { y: { beginAtZero: true } }
          }
        });
      }

      // Grafik 2: Cuti/New Hire & Skor Tertinggi/Terendah
      const canvas1 = document.getElementById("chartScore1");
      const canvas2 = document.getElementById("chartScore2");
      if (!canvas1 || !canvas2) continue;

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
            datalabels: {
              display: true,
              align: "top",
              backgroundColor: "rgba(255,255,255,0.7)",
              font: { weight: "bold", size: 12 },
              formatter: value => value.toFixed(0)
            }
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
            datalabels: {
              display: true,
              align: "top",
              backgroundColor: "rgba(255,255,255,0.7)",
              font: { weight: "bold", size: 12 },
              formatter: value => value.toFixed(0)
            }
          },
          scales: {
            x: { title: { display: true, text: "Jabatan" } },
            y: { beginAtZero: true, title: { display: true, text: "SCORE" } }
          }
        }
      });

    } else {
      allOriginalData[key] = data;
      renderTable(data, `table-${key}`);
    }
  }
}

function toggleGroup(groupId) {
  const group = document.getElementById(groupId);
  const toggleBtn = group.previousElementSibling;

  const isOpen = group.classList.toggle("show");

  toggleBtn.innerHTML = isOpen
    ? "📘 Proses Induksi ▴"
    : "📘 Proses Induksi ▾";
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

  const nomor = "6282223089790"; // Ganti dengan nomor kamu
  const teks = `Halo, saya ingin bertanya tentang induksi.%0ANama: ${encodeURIComponent(nama)}%0APertanyaan: ${encodeURIComponent(pesan)}`;
  const url = `https://wa.me/${nomor}?text=${teks}`;

  // Tutup form sebelum membuka WhatsApp
  document.getElementById("wa-form-popup").classList.add("hidden");

  // Reset input (opsional)
  document.getElementById("wa-nama").value = "";
  document.getElementById("wa-pesan").value = "";

  // Buka WhatsApp
  window.open(url, "_blank");
}

const safetyMessages = [
  "⚠️ Gunakan helm dan rompi saat berada di area kerja.",
  "🦺 Pastikan APD lengkap sebelum memulai aktivitas.",
  "🚧 Dilarang menggunakan HP saat berkendara di area tambang.",
  "🧯 Kenali titik kumpul dan jalur evakuasi di area kerja.",
  "📢 Laporkan segera jika melihat kondisi tidak aman!"
];

let currentMessage = 0;

function showSafetyMessage(text, duration = 6000) {
  const alertBox = document.getElementById("safety-alert");
  const message = alertBox.querySelector(".safety-message");
  message.innerHTML = text;

  alertBox.classList.remove("hidden");
  setTimeout(() => alertBox.classList.add("show"), 100);

  setTimeout(() => {
    alertBox.classList.remove("show");
    setTimeout(() => alertBox.classList.add("hidden"), 400);
  }, duration);
}

function startSafetyRotation() {
  showSafetyMessage(safetyMessages[currentMessage]);

  currentMessage++;
  if (currentMessage < safetyMessages.length) {
    setTimeout(startSafetyRotation, 60000); // 1 menit
  } else {
    setTimeout(() => location.reload(), 60000); // Reload setelah pesan terakhir
  }
}

window.addEventListener("load", () => {
  setTimeout(startSafetyRotation, 1000); // Mulai 1 detik setelah halaman load
});

window.onload = async () => {
  showLoader();
  await loadPerusahaanList();
  await init();
  hideLoader();
};

// Fungsi untuk menampilkan pesan keselamatan dan memutar suara
function showSafetyMessage(text, duration = 6000) {
  const alertBox = document.getElementById("safety-alert");
  const message = alertBox?.querySelector(".safety-message");
  const sound = document.getElementById("notif-sound");

  if (!alertBox || !message) return;

  message.innerHTML = text;

  alertBox.classList.remove("hidden");
  setTimeout(() => alertBox.classList.add("show"), 100);

  // 🔊 Mainkan suara jika sudah ada interaksi pengguna
  if (sound) {
    try {
      sound.currentTime = 0;
      sound.play().catch(e => {
        console.warn("🔇 Suara diblokir oleh browser:", e);
      });
    } catch (e) {
      console.warn("🎧 Gagal memutar suara:", e);
    }
  }

    // 🔁 Pause banner dan ubah warna


  // ⏳ Sembunyikan alert setelah durasi tertentu
  setTimeout(() => {
    alertBox.classList.remove("show");
    setTimeout(() => alertBox.classList.add("hidden"), 400);
  }, duration);
}

// Tambahkan event listener hanya sekali saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("#startButton");
  if (btn) {
    btn.addEventListener("click", () => {
      const audio = document.getElementById("notif-sound");
      if (audio) {
        audio.play().then(() => {
          console.log("🔊 Suara diaktifkan oleh pengguna.");
        }).catch(error => {
          console.warn("Audio gagal diputar:", error);
        });
      }
    });
  }
});

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
  banner.style.backgroundColor = active ? "#b02a37" : "#222";
  banner.style.color = "#fff";
}

function updateBannerText(newText) {
  const bannerText = document.getElementById("banner-text");
  if (bannerText) {
    bannerText.innerHTML = newText;
    // Restart animasi agar teks baru langsung berjalan
    bannerText.style.animation = "none";
    bannerText.offsetHeight; // trigger reflow
    bannerText.style.animation = "";
    bannerText.style.animation = "scroll-banner 20s linear infinite";
  }
}

// Delay fade-in animation on page load
window.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');
  setTimeout(() => {
    navbar.classList.add('show');
  }, 300); // Delay for dramatic effect
});

window.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');

  // Delay navbar appearance until splash screen fades out
  setTimeout(() => {
    navbar.classList.add('show');
  }, 2200); // match splash fadeOut timing
});


document.getElementById('enter-btn').addEventListener('click', () => {
  const audio = document.getElementById('intro-audio');
  audio.play();
});

