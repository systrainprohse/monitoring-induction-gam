/**
 * @fileoverview Google Apps Script API Backend Final untuk Dasbor Pelatihan GAMITAS.
 * Arsitektur diubah untuk melayani permintaan data yang lebih kecil dan terpisah per komponen.
 * Versi ini berisi semua action yang diperlukan oleh file HTML.
 */

const CONFIG = {
  id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM", // GANTI DENGAN ID SPREADSHEET ANDA
  sheets: {
    "monitoring-internal": {
      name: "monitoring_internal",
      headers: [
        "internalTraining",
        "code",
        "done",
        "allMp",
        "off",
        "progress",
        "needTraining",
      ],
    },
    "jadwal-training": {
      name: "jadwal_training",
      headers: [
        "tanggalMulai",
        "tanggalSelesai",
        "namaKegiatan",
        "ruangan",
        "jumlahPeserta",
        "pic",
        "kode",
        "totalHari",
      ],
    },
    "kompetensi-manpower": {
      name: "kompetensi_manpower",
      headers: [
        "noPermit",
        "nik",
        "nama",
        "dept",
        "section",
        "jabatan",
        "kompetensi",
        "status",
      ],
    },
    "competency-lx": {
      name: "competency_lx",
      headers: [
        "competency",
        "competencyCode",
        "jenisCompetency",
        "kelompokCompetency",
        "peraturan",
      ],
    },
    "internal-matrix": {
      name: "internal_matrix",
      headers: [
        "departement",
        "section",
        "jabatan",
        "pop",
        "pom",
        "pou",
        "ibpr",
        "jsa",
        "bekerjaDiRuangTerbatas",
        "bekerjaDiKetinggianTkpk",
        "bekerjaDiDekatAir",
        "kesiapSiagaanTanggapDarurat",
        "fatigueManagement",
        "inspeksiObservasi",
        "lotoLockOutTagOut",
        "basicFirstAidP3k",
        "investigasiInsidenKecelakaan",
        "haccp",
        "fireFighting",
        "officeSafety",
        "manualHandling",
        "ddtDefensiveDrivingTraining1",
        "msdsMaterialSafetyDataSheet",
        "k3Kelistrikan",
        "petugasOperatorGenset",
        "awarenessUnitCommissioning",
      ],
    },
  },
};

function doGet(e) {
  return createJsonResponse({
    status: "API is active. Use POST requests to fetch data.",
  });
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    let result;

    switch (action) {
      case "getStatsData":
        result = getStatsData();
        break;
      case "getKompetensiChartData":
        result = getKompetensiChartData();
        break;
      case "getProgressChartData":
        result = getProgressChartData();
        break;
      case "getTopNeedsChartData":
        result = getTopNeedsChartData();
        break;
      case "getUpcomingScheduleData":
        result = getUpcomingScheduleData();
        break;
      case "getManpowerData":
        result = getManpowerData();
        break;
      case "getMatrixData":
        result = getMatrixData();
        break;
      case "getCalendarData":
        result = getCalendarData();
        break;
      case "getTableData":
        result = getTableData(params);
        break;
      default:
        throw new Error("Aksi tidak valid.");
    }
    return createJsonResponse(result);
  } catch (err) {
    console.error(`Error pada aksi POST: ${err.stack}`);
    return createJsonResponse({
      error: "Terjadi kesalahan pada server",
      details: err.message,
    });
  }
}

// --- FUNGSI-FUNGSI PENGAMBILAN DATA PER KOMPONEN ---

function getStatsData() {
  const ss = SpreadsheetApp.openById(CONFIG.id);
  const kompetensiManpower = getSheetDataAsObjects(ss, "kompetensi-manpower");
  const monitoringInternal = getSheetDataAsObjects(ss, "monitoring-internal");
  const totalCompetencies = new Set(
    kompetensiManpower.map((item) => item.kompetensi)
  ).size;
  const totalTrainedManpower = new Set(
    kompetensiManpower.map((item) => item.nik)
  ).size;
  const totalTrainingNeeds = monitoringInternal.reduce(
    (acc, item) => acc + (parseInt(item.needTraining) || 0),
    0
  );
  return { totalCompetencies, totalTrainedManpower, totalTrainingNeeds };
}

function getKompetensiChartData() {
  const ss = SpreadsheetApp.openById(CONFIG.id);
  const kompetensiManpower = getSheetDataAsObjects(ss, "kompetensi-manpower");
  const kompetensiCounts = kompetensiManpower.reduce(
    (acc, item) => {
      const kompetensi = String(item.kompetensi || "").toUpperCase();
      if (kompetensi.includes("POP")) acc.pop++;
      if (kompetensi.includes("POM")) acc.pom++;
      if (kompetensi.includes("POU")) acc.pou++;
      return acc;
    },
    { pop: 0, pom: 0, pou: 0 }
  );
  return {
    labels: ["POP", "POM", "POU"],
    data: [kompetensiCounts.pop, kompetensiCounts.pom, kompetensiCounts.pou],
  };
}

function getProgressChartData() {
  const ss = SpreadsheetApp.openById(CONFIG.id);
  const monitoringInternal = getSheetDataAsObjects(ss, "monitoring-internal");
  const overallProgress = monitoringInternal.reduce(
    (acc, item) => {
      acc.done += parseInt(item.done) || 0;
      acc.total += parseInt(item.allMp) || 0;
      return acc;
    },
    { done: 0, total: 0 }
  );
  return { completed: overallProgress.done, total: overallProgress.total };
}

function getTopNeedsChartData() {
  const ss = SpreadsheetApp.openById(CONFIG.id);
  const monitoringInternal = getSheetDataAsObjects(ss, "monitoring-internal");
  return monitoringInternal
    .map((item) => ({
      name: item.internalTraining,
      needed: parseInt(item.needTraining) || 0,
    }))
    .sort((a, b) => b.needed - a.needed)
    .slice(0, 5);
}

function getUpcomingScheduleData() {
  const ss = SpreadsheetApp.openById(CONFIG.id);
  const jadwalTraining = getSheetDataAsObjects(ss, "jadwal-training");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return jadwalTraining
    .filter((item) => item.tanggalMulai && new Date(item.tanggalMulai) >= today)
    .sort((a, b) => new Date(a.tanggalMulai) - new Date(b.tanggalMulai))
    .slice(0, 3);
}

function getManpowerData() {
  const ss = SpreadsheetApp.openById(CONFIG.id);
  const kompetensiData = getSheetDataAsObjects(ss, "kompetensi-manpower");
  const manpowerGrouped = kompetensiData.reduce((acc, row) => {
    const nik = row.nik;
    if (!nik) return acc;
    if (!acc[nik]) {
      acc[nik] = {
        nik: nik,
        nama: row.nama,
        dept: row.dept,
        section: row.section,
        jabatan: row.jabatan,
        kompetensi: [],
      };
    }
    if (row.kompetensi) {
      acc[nik].kompetensi.push({ nama: row.kompetensi, status: row.status });
    }
    return acc;
  }, {});
  return manpowerGrouped;
}

function getMatrixData() {
  const ss = SpreadsheetApp.openById(CONFIG.id);
  return {
    matrixData: getSheetDataAsObjects(ss, "internal-matrix"),
    competencyHeaders: CONFIG.sheets["internal-matrix"].headers.slice(3),
  };
}

function getCalendarData() {
  const ss = SpreadsheetApp.openById(CONFIG.id);
  return getSheetDataAsObjects(ss, "jadwal-training");
}

function getTableData({ table, page = 1, limit = 50, search = "" }) {
  if (!table || !CONFIG.sheets[table])
    throw new Error("Nama tabel tidak valid.");
  const ss = SpreadsheetApp.openById(CONFIG.id);
  let allData = getSheetDataAsObjects(ss, table);
  if (search) {
    const lowerSearch = search.toLowerCase();
    allData = allData.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(lowerSearch)
      )
    );
  }
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  return {
    data: allData.slice(startIndex, startIndex + parseInt(limit)),
    totalFiltered: allData.length,
  };
}

// --- FUNGSI UTILITAS ---
function getSheetDataAsObjects(ss, sheetKey) {
  const config = CONFIG.sheets[sheetKey];
  if (!config) return [];
  const sheet = ss.getSheetByName(config.name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, config.headers.length)
    .getValues();
  return values.map((row) =>
    config.headers.reduce((obj, key, i) => {
      let cell = row[i];
      obj[key] =
        cell instanceof Date && !isNaN(cell)
          ? Utilities.formatDate(
              cell,
              Session.getScriptTimeZone(),
              "yyyy-MM-dd"
            )
          : cell;
      return obj;
    }, {})
  );
}

function createJsonResponse(data, callback = null) {
  const out = JSON.stringify(data);
  const mimeType = callback
    ? ContentService.MimeType.JAVASCRIPT
    : ContentService.MimeType.JSON;
  const content = callback ? `${callback}(${out})` : out;
  return ContentService.createTextOutput(content).setMimeType(mimeType);
}
