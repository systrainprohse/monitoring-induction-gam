const SHEET_SOURCES = {
  pendaftaran: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "pendaftaran_induksi" },
  spdk: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "spdk" },
  ceckhlist_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_checklist" },
  hasil_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_result" },
  score_induksi: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_score" },
  grafik: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "induction_result" },
  setting: { id: "1pusJcOz_MR2yZDgz_ABkErAR8p2T63lTWFelONwDQmk", sheet: "setting" }
};

const kolomTampilkan = {
  pendaftaran: ["tanggal", "perusahaan", "NAMA", "JENIS INDUKSI", "HARI", "DATE"],
  spdk: ["tanggal", "perusahaan", "NAMA", "SPDK", "KETERANGAN", "APPROVAL"],
  ceckhlist_induksi: ["tanggal", "perusahaan", "nama"],
  hasil_induksi: ["tanggal", "perusahaan", "NAMA", "JABATAN", "KATEGORI", "S. SIMPER", "SCORE K3", "S. JABATAN","S.RATA-RATA"],
  score_induksi: ["tanggal", "perusahaan", "skor_rata2"]
};

const sheetDataCache = {};
let perusahaanList = [];

function openTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  event.target?.classList.add('active');
}

function showLoader() {
  document.getElementById('loader')?.style.setProperty("display", "block");
}
function hideLoader() {
  document.getElementById('loader')?.style.setProperty("display", "none");
}

async function fetchSheetByKey(key) {
  const { id, sheet } = SHEET_SOURCES[key];
  const url = `https://opensheet.elk.sh/${id}/${sheet}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gagal mengambil ${sheet}`);
    return await response.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function loadPerusahaanList() {
  const data = await fetchSheetByKey("setting");
  perusahaanList = data.map(d => d["perusahaan"]).filter(p => p);
}

function parseTanggal(str) {
  if (!str || !str.includes("/")) return new Date(str);
  const [d, m, y] = str.split("/");
  return new Date(`${y}-${m}-${d}`);
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

  const thead = `<thead><tr>${allowed.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${data.map(row =>
    `<tr>${allowed.map(h => {
      const nilai = row[h] || "";
      const isScore = h.toLowerCase().includes("rata") || h.toLowerCase().includes("skor");
      const angka = parseFloat(nilai);
      const warna = isScore && angka < 75 ? "red" : "";
      return `<td class="${warna}">${nilai}</td>`;
    }).join("")}</tr>`
  ).join("")}</tbody>`;


  table.innerHTML = thead + tbody;

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
    const matchPerusahaan = perusahaan === "all" || d["perusahaan"] === perusahaan;
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
    `<tr>${allowed.map(h => `<td>${row[h] || ""}</td>`).join("")}</tr>`
  ).join("")}</tbody>`;

  table.innerHTML = thead + tbody;
  table.classList.remove("loaded");
  setTimeout(() => table.classList.add("loaded"), 10);
}

async function init() {
  for (const key in SHEET_SOURCES) {
    if (key === "setting") continue;
    const data = await fetchSheetByKey(key);

    if (key !== "grafik") {
      renderTable(data, `table-${key}`);
    } else {
      const canvas = document.getElementById("chartScore");
      if (!canvas) continue;
      const ctx = canvas.getContext("2d");
      const labels = data.map(d => d.Kategori || "");
      const values = data.map(d => parseFloat(d.Nilai) || 0);

      new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Statistik Induksi",
            data: values,
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
  }
}

window.onload = async () => {
  showLoader();
  await loadPerusahaanList();
  await init();
  hideLoader();
};
