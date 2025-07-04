const SHEET_SOURCES = {
  pendaftaran: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "pendaftaran_induksi" },
  spdk: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "spdk" },
  checklist_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_checklist" },
  hasil_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_result" },
  score_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_score" },
  grafik: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "DashboardGrafik" },
  setting: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "setting" }
};

const kolomTampilkan = {
  pendaftaran: ["tanggal", "perusahaan", "NAMA", "JABATAN", "JENIS INDUKSI", "HARI", "DATE"],
  spdk: ["tanggal", "perusahaan", "NAMA", "SPDK", "KETERANGAN", "APPROVAL"],
  checklist_induksi: ["tanggal", "perusahaan", "NAMA", "CHECKLIST", "KETERANGAN", "APPROVAL"],
  hasil_induksi: ["tanggal", "perusahaan", "NAMA", "JABATAN", "KATEGORI", "S. SIMPER", "SCORE K3", "S. JABATAN", "S.RATA-RATA"],
  score_induksi: ["tanggal", "perusahaan", "skor_rata2"],
   grafik: ["TANGGAL INDUKSI", "CUTI", "NEW HIRE", "NAMA JABATAN", "SCORE_TERENDAH", "SCORE_TERTINGGI"]
};

const sheetDataCache = {};
let perusahaanList = [];
let allOriginalData = {}; // <— Tambahkan ini

document.addEventListener("DOMContentLoaded", () => {
  openTab('hasil_induksi');
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
      const hLower = h.toLowerCase();
      const valueLower = nilai.toString().toLowerCase();
      const isScore = hLower.includes("rata") || hLower.includes("skor");
      const angka = parseFloat(nilai);

      let warna = "";
      let emoji = "";

      if (isScore && angka < 75) warna = "red";
      else if (isScore && angka >= 75) warna = "green";
      else if (valueLower === "approved") {
        warna = "approved";
        emoji = "✅ ";
      } else if (valueLower === "hold") {
        warna = "hold";
        emoji = "⚠️ ";
      }

      return `<td class="${warna}">${emoji}${nilai}</td>`;
    }).join("")}</tr>`;
  }).join("")}</tbody>`;

  table.innerHTML = thead + tbody;

  // Isi dropdown filter perusahaan
  const filter = document.getElementById(`filter-${key}`);
  if (filter && perusahaanList.length) {
    filter.innerHTML = `<option value="all">Semua</option>` +
      perusahaanList.map(p => `<option value="${p}">${p}</option>`).join("");
  }

  table.classList.remove("loaded");
  setTimeout(() => table.classList.add("loaded"), 10);
}




function applyFilter(key) {
  const perusahaan = document.getElementById(`filter-${key}`)?.value || "all";
  const start = document.getElementById(`startDate-${key}`)?.value;
  const end = document.getElementById(`endDate-${key}`)?.value;
  const data = sheetDataCache[key] || [];

  const filtered = data.filter(d => {
    const perusahaanData = d["perusahaan"] || "";
    const matchPerusahaan = perusahaan === "all" ||
      perusahaanData.trim().toLowerCase() === perusahaan.trim().toLowerCase();

    const tanggalStr = d["tanggal"] || d["Tanggal"] || "";
    const rowDate = parseTanggal(tanggalStr);
    if (isNaN(rowDate)) return false;

    const startTime = start ? new Date(start).getTime() : -Infinity;
    const endTime = end ? new Date(end).getTime() : Infinity;

    return matchPerusahaan && rowDate.getTime() >= startTime && rowDate.getTime() <= endTime;
  });

  renderFilteredOnly(filtered, `table-${key}`, key);
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
      const hLower = h.toLowerCase();
      const valueLower = nilai.toString().toLowerCase();
      const isScore = hLower.includes("rata") || hLower.includes("skor");
      const angka = parseFloat(nilai);

      let warna = "";
      let emoji = "";

      if (isScore && angka < 75) {
          warna = "red";
      } else if (isScore && angka >= 75) {
          warna = "green";  // Warna hijau jika angka >= 75
      } else if (valueLower === "approved") {
          warna = "approved";
          emoji = "✅ ";
      } else if (valueLower === "hold") {
          warna = "hold";
          emoji = "⚠️ ";
      }

      const tdElement = document.createElement("td");
tdElement.textContent = nilai;
const tr = document.createElement("tr");

allowed.forEach(h => {
  const tdElement = document.createElement("td");
  const nilai = row[h] || "";
  tdElement.textContent = nilai;
  tr.appendChild(tdElement);
});

table.appendChild(tr);;



      return `<td class="${warna}">${emoji}${nilai}</td>`;
    }).join("")}</tr>`
  ).join("")}</tbody>`;

  table.innerHTML = thead + tbody;
  table.classList.remove("loaded");
  setTimeout(() => table.classList.add("loaded"), 10);
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


window.onload = async () => {
  showLoader();
  await loadPerusahaanList();
  await init();
  hideLoader();
};
