/**
 * @fileoverview Google Apps Script API Backend Final untuk Dasbor Induksi GAMITAS.
 * VERSI DISEMPURNAKAN: Otomatis menyaring baris tanpa tanggal dan mengurutkan berdasarkan data terbaru.
 */

const CONFIG = {
  id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
  sheets: {
    "pasca-cuti": {
      name: "Induksi_PascaCuti",
      headers: [
        "date",
        "nik",
        "nama",
        "jabatan",
        "perusahaan",
        "statusInduksi",
        "score",
        "spdkChecklist",
      ],
    },
    "new-hire": {
      name: "Induksi_NewHire",
      headers: [
        "date",
        "nik",
        "nama",
        "jabatan",
        "perusahaan",
        "checklist",
        "spdk",
        "apvSystem",
        "status",
        "score",
      ],
    },
    temporary: {
      name: "Induksi_Temporary",
      headers: [
        "date",
        "nik",
        "nama",
        "jabatan",
        "perusahaan",
        "status",
        "score",
      ],
    },
    visitor: {
      name: "Induksi_Visitor",
      headers: [
        "date",
        "nik",
        "nama",
        "jabatan",
        "perusahaan",
        "status",
        "score",
      ],
    },
    kodeAkses: { name: "KodeAkses", headers: ["date", "kodeAkses"] },
    setting: { name: "Setting", headers: ["namaPerusahaan"] },
    pendaftaranInduksi: {
      name: "Pendaftaran",
      headers: [
        "timestamp",
        "jenisInduksi",
        "nama",
        "nikKtp",
        "nomorWhatsapp",
        "perusahaan",
        "jabatan",
        "departement",
        "rencanaHariInduksi",
        "rencanaInduksi",
        "fotoTerbaru",
      ],
    },
  },
};

const CACHE_EXPIRATION = 300;
const SCRIPT_CACHE = CacheService.getScriptCache();

function doGet(e) {
  if (!e || !e.parameter)
    return createJsonResponse({ error: "Invalid request." });
  const action = e.parameter.action || "getDashboardData";
  try {
    let result;
    if (action === "getDashboardData") result = getDashboardData();
    else if (action === "getTableData") result = getTableData(e.parameter);
    else throw new Error("Aksi tidak valid.");
    return createJsonResponse(result, e.parameter.callback);
  } catch (err) {
    console.error(`Error pada action '${action}': ${err.stack}`);
    return createJsonResponse(
      { error: "Terjadi kesalahan pada server", details: err.message },
      e.parameter.callback
    );
  }
}

function getDashboardData() {
  // Fungsi ini tidak berubah dan sudah benar.
  const cacheKey = "dashboard_summary_data_v4";
  const cached = SCRIPT_CACHE.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const ss = SpreadsheetApp.openById(CONFIG.id);
  const todayStr = new Date().toLocaleDateString("en-CA");
  const newHireData = getSheetDataAsObjects(ss, "new-hire");
  const pascaCutiData = getSheetDataAsObjects(ss, "pasca-cuti");
  const temporaryData = getSheetDataAsObjects(ss, "temporary");
  const visitorData = getSheetDataAsObjects(ss, "visitor");
  const pendaftaranData = getSheetDataAsObjects(ss, "pendaftaranInduksi");
  const kodeAksesData = getSheetDataAsObjects(ss, "kodeAkses");
  const settingData = getSheetDataAsObjects(ss, "setting");
  const mainCompany = "PT. GAM";
  const allInduksiData = [...newHireData, ...pascaCutiData, ...temporaryData];
  const approvedData = allInduksiData.filter(
    (d) =>
      d.status &&
      !["pending", "hold", "need"].includes(String(d.status).toLowerCase())
  );
  const induksiToday = allInduksiData.filter((d) => d.date === todayStr);
  const visitorsToday = visitorData.filter((d) => d.date === todayStr);
  const todayScores = [...induksiToday, ...visitorsToday]
    .map((d) => parseFloat(d.score))
    .filter((s) => !isNaN(s));
  const countByCompany = (data) =>
    data.reduce((acc, item) => {
      const name = item.perusahaan || "Lainnya";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
  const result = {
    setting: settingData[0] || {},
    dashboard: {
      induksiCoreToday: induksiToday.filter(
        (d) => d.perusahaan?.toLowerCase() === mainCompany
      ).length,
      induksiMitraToday: induksiToday.filter(
        (d) => d.perusahaan?.toLowerCase() !== mainCompany
      ).length,
      induksiVisitorToday: visitorsToday.length,
      statusNewHireToday: newHireData.filter((d) => d.date === todayStr).length,
      statusCutiToday: pascaCutiData.filter((d) => d.date === todayStr).length,
      scoreStats: {
        terendah: todayScores.length ? Math.min(...todayScores) : 0,
        tertinggi: todayScores.length ? Math.max(...todayScores) : 0,
        rata: todayScores.length
          ? todayScores.reduce((a, b) => a + b, 0) / todayScores.length
          : 0,
      },
      kodeAkses: (
        kodeAksesData.find((k) => k.date === todayStr) || { kodeAkses: "N/A" }
      ).kodeAkses,
      totalPendaftaran: pendaftaranData.length,
      pendaftaranBreakdown: countByCompany(pendaftaranData),
      totalApproval: approvedData.length,
      approvalBreakdown: countByCompany(approvedData),
      totalTemporary: temporaryData.length,
      temporaryBreakdown: countByCompany(temporaryData),
    },
    chartData: {
      byType: {
        "New Hire": newHireData.length,
        "Pasca Cuti": pascaCutiData.length,
        Temporary: temporaryData.length,
        Visitor: visitorData.length,
      },
      byCompany: countByCompany(allInduksiData),
    },
  };
  SCRIPT_CACHE.put(cacheKey, JSON.stringify(result), CACHE_EXPIRATION);
  return result;
}

function getTableData({
  table,
  page = 1,
  limit = 50,
  search = "",
  filter = "",
  sortBy = null,
  sortOrder = "asc",
}) {
  if (!table || !CONFIG.sheets[table])
    throw new Error("Nama tabel tidak valid.");

  // Kunci cache sekarang menyertakan parameter sorting untuk memastikan data selalu baru
  const cacheKey = `table_v3_${table}_p${page}_l${limit}_s${search}_f${filter}_sb${sortBy}_so${sortOrder}`;
  const cached = SCRIPT_CACHE.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.openById(CONFIG.id);
  let allData = getSheetDataAsObjects(ss, table);

  const dateColumn = CONFIG.sheets[table].headers.find(
    (h) =>
      h.toLowerCase().includes("date") || h.toLowerCase().includes("timestamp")
  );
  if (dateColumn) {
    allData = allData.filter(
      (row) => row[dateColumn] && String(row[dateColumn]).trim() !== ""
    );
  }

  const statusColumn =
    CONFIG.sheets[table].headers.find((h) =>
      h.toLowerCase().includes("status")
    ) || "status";
  const lowerSearch = search.toLowerCase();
  const lowerFilter = filter.toLowerCase();

  let filteredData = allData.filter(
    (row) =>
      (!lowerFilter ||
        (row[statusColumn] &&
          String(row[statusColumn]).toLowerCase() === lowerFilter)) &&
      (!lowerSearch ||
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(lowerSearch)
        ))
  );

  // PERBAIKAN UTAMA: Memastikan pengurutan default adalah tanggal terbaru
  const effectiveSortBy = sortBy || dateColumn;
  const effectiveSortOrder = sortBy ? sortOrder : "desc"; // Jika user tidak mengurutkan, paksa 'desc' (terbaru)

  if (effectiveSortBy) {
    filteredData.sort((a, b) => {
      let valA = a[effectiveSortBy] || "";
      let valB = b[effectiveSortBy] || "";

      if (effectiveSortBy === dateColumn) {
        valA = new Date(valA).getTime() || 0;
        valB = new Date(valB).getTime() || 0;
      } else {
        let aIsNumeric = !isNaN(parseFloat(valA)) && isFinite(valA);
        let bIsNumeric = !isNaN(parseFloat(valB)) && isFinite(valB);
        if (aIsNumeric && bIsNumeric) {
          valA = parseFloat(valA);
          valB = parseFloat(valB);
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }
      }

      if (valA < valB) return effectiveSortOrder === "asc" ? -1 : 1;
      if (valA > valB) return effectiveSortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }

  const startIndex = (page - 1) * limit;
  const result = {
    data: filteredData.slice(startIndex, startIndex + parseInt(limit)),
    totalFiltered: filteredData.length,
  };

  SCRIPT_CACHE.put(cacheKey, JSON.stringify(result), CACHE_EXPIRATION);
  return result;
}

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
              key === "timestamp" ? "yyyy-MM-dd HH:mm:ss" : "yyyy-MM-dd"
            )
          : cell;
      return obj;
    }, {})
  );
}

function createJsonResponse(data, callback = null) {
  const out = JSON.stringify(data);
  return ContentService.createTextOutput(
    callback ? `${callback}(${out})` : out
  ).setMimeType(
    callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON
  );
}
