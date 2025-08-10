/**
 * @fileoverview Google Apps Script ini berfungsi sebagai "microservice"
 * yang melayani data dari kategori 'insiden' dengan dukungan paginasi
 * dan agregasi data yang dinamis berdasarkan filter.
 */

const CONFIG = {
  id: "1bFevC9EGzYmyQTLSCMxu53_7sH7Ab24GT4O0A4nZXTA",
  sheets: {
    dataDasbor: {
      key: "dataDasbor",
      name: "Data_Dasbor",
      headers: [
        "id",
        "judulInsiden",
        "tanggalKejadian",
        "tahun",
        "hariKejadian",
        "jamMulaiKecelakaan",
        "jamSelesaiKecelakaan",
        "kategoriKecelakaan",
        "kategoriCedera",
        "kategoriPdUnit",
        "jenisKontakInsiden",
        "penyebabLangsung",
        "penyebabDasar",
        "perusahaan",
        "jabatan",
        "unitTerlibat",
        "usia",
        "masaKerja",
        "statusKaryawan",
        "poh",
        "tempatTinggal",
        "lokasiKejadian",
        "lokasiRincian",
        "latitude",
        "longitude",
        "biayaPengobatan",
        "biayaPerbaikan",
        "biayaTidakLangsung",
        "totalBiaya",
        "kategoriPd",
        "statusLpi",
        "sanksi",
        "tipeCedera",
        "bagianCidera",
      ],
    },
    hsePerformance: {
      key: "hsePerformance",
      name: "PERFORMANCE",
      headers: [
        "deskripsi",
        "januari",
        "februari",
        "maret",
        "april",
        "mei",
        "juni",
        "juli",
        "agustus",
        "september",
        "oktober",
        "november",
        "desember",
        "ytd",
        "year",
      ],
    },
  },
};

const CACHE_EXPIRATION = 300; // Cache 5 menit

/**
 * Fungsi utama yang menangani permintaan GET.
 * Sekarang berfungsi sebagai router berdasarkan parameter 'action'.
 */
function doGet(e) {
  try {
    const action = e.parameter.action || "getPaginatedData";
    let data;

    // Mengambil parameter filter
    const year = e.parameter.year;
    const month = e.parameter.month;

    switch (action) {
      case "getPaginatedData":
        const page = parseInt(e.parameter.page, 10) || 1;
        const pageSize = parseInt(e.parameter.pageSize, 10) || 50;
        data = getPaginatedIncidentData(page, pageSize);
        break;

      case "getChartData":
        // Teruskan parameter filter ke fungsi agregasi
        data = getAggregatedChartData(year, month);
        break;

      case "getHseData":
        data = getHsePerformanceData();
        break;

      default:
        throw new Error("Action tidak valid.");
    }

    return createJsonResponse(data, e.parameter.callback);
  } catch (err) {
    console.error(
      `Error in doGet (Action: ${e.parameter.action}): ` + err.stack
    );
    const errorData = {
      error: "Terjadi kesalahan internal pada server Insiden.",
      details: err.message,
    };
    return createJsonResponse(errorData, e.parameter.callback);
  }
}

/**
 * Mengambil semua data mentah dari sheet.
 * @returns {Array<Object>} Array dari objek data insiden.
 */
function getAllIncidentData() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "all_incident_data_raw_v2";
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const sheet = SpreadsheetApp.openById(CONFIG.id).getSheetByName(
    CONFIG.sheets.dataDasbor.name
  );
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();

  const data = values.map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      let cellValue = row[index];
      if (cellValue instanceof Date && !isNaN(cellValue)) {
        // Simpan sebagai ISO string untuk mempertahankan informasi waktu
        cellValue = Utilities.formatDate(
          cellValue,
          Session.getScriptTimeZone(),
          "yyyy-MM-dd'T'HH:mm:ss'Z'"
        );
      }
      obj[CONFIG.sheets.dataDasbor.headers[index]] = cellValue;
    });
    return obj;
  });

  try {
    cache.put(cacheKey, JSON.stringify(data), CACHE_EXPIRATION);
  } catch (e) {
    console.warn(
      `Peringatan: Data mentah insiden terlalu besar untuk di-cache. ${e.message}`
    );
  }

  return data;
}

/**
 * Mengambil data insiden dengan paginasi.
 */
function getPaginatedIncidentData(page, pageSize) {
  const sheet = SpreadsheetApp.openById(CONFIG.id).getSheetByName(
    CONFIG.sheets.dataDasbor.name
  );
  const totalRows = sheet.getLastRow() - 1;
  const totalPages = Math.ceil(totalRows / pageSize);
  const startRow = (page - 1) * pageSize + 2;
  const numRows = Math.min(pageSize, totalRows - (startRow - 2));

  if (numRows <= 0) {
    return { page, pageSize, totalPages, totalData: totalRows, data: [] };
  }

  const range = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn());
  const values = range.getValues();
  const headers = CONFIG.sheets.dataDasbor.headers;

  const data = values.map((row) => {
    let obj = {};
    headers.forEach((header, index) => {
      let cellValue = row[index];
      if (cellValue instanceof Date && !isNaN(cellValue)) {
        cellValue = Utilities.formatDate(
          cellValue,
          Session.getScriptTimeZone(),
          "yyyy-MM-dd"
        );
      }
      obj[header] = cellValue;
    });
    return obj;
  });

  return { page, pageSize, totalPages, totalData: totalRows, data };
}

/**
 * Mengambil dan memformat data HSE Performance.
 */
function getHsePerformanceData() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "hse_performance_data_v2";
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const sheet = SpreadsheetApp.openById(CONFIG.id).getSheetByName(
    CONFIG.sheets.hsePerformance.name
  );
  const values = sheet.getDataRange().getValues();
  const headers = CONFIG.sheets.hsePerformance.headers;
  const dataRows = values.slice(1);

  const data = dataRows.map((row) => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  cache.put(cacheKey, JSON.stringify(data), CACHE_EXPIRATION);
  return data;
}

/**
 * Menghitung/mengagregasi semua data yang dibutuhkan untuk grafik di dasbor.
 * @param {string|null} yearFilter - Tahun yang akan difilter.
 * @param {string|null} monthFilter - Bulan yang akan difilter (0-11).
 * @returns {Object} Objek berisi data untuk setiap grafik.
 */
function getAggregatedChartData(yearFilter, monthFilter) {
  const cacheKey = `aggregated_chart_data_insiden_v2_${yearFilter || "all"}_${
    monthFilter || "all"
  }`;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  let allData = getAllIncidentData();

  // Terapkan filter jika ada
  let filteredData = allData;
  if (yearFilter && yearFilter !== "Semua") {
    filteredData = filteredData.filter(
      (d) => new Date(d.tanggalKejadian).getFullYear() == yearFilter
    );
  }
  if (monthFilter && monthFilter !== "Semua") {
    filteredData = filteredData.filter(
      (d) => new Date(d.tanggalKejadian).getMonth() == monthFilter
    );
  }

  const countBy = (data, key) =>
    data.reduce((acc, item) => {
      const value = item[key] || "N/A";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});

  const getTopN = (data, key, n = 5) => {
    const counts = countBy(data, key);
    return Object.fromEntries(
      Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, n)
    );
  };

  const chartData = {
    summary: {
      totalInsiden: filteredData.length,
      totalPropertyDamage: filteredData.filter(
        (d) => d.kategoriKecelakaan === "Property Damage"
      ).length,
      totalFatality: filteredData.filter(
        (d) => d.kategoriKecelakaan === "Fatal"
      ).length, // Diubah ke Fatal
      totalNearMiss: filteredData.filter(
        (d) => d.kategoriKecelakaan === "Near Miss"
      ).length,
    },
    costs: filteredData.reduce(
      (acc, d) => {
        acc.pengobatan += Number(d.biayaPengobatan) || 0;
        acc.perbaikan += Number(d.biayaPerbaikan) || 0;
        acc.tidakLangsung += Number(d.biayaTidakLangsung) || 0;
        acc.total +=
          (Number(d.biayaPengobatan) || 0) +
          (Number(d.biayaPerbaikan) || 0) +
          (Number(d.biayaTidakLangsung) || 0);
        return acc;
      },
      { pengobatan: 0, perbaikan: 0, tidakLangsung: 0, total: 0 }
    ),
    // Tren bulanan selalu dihitung dari semua data untuk perbandingan
    monthlyTrend: allData.reduce((acc, d) => {
      const date = new Date(d.tanggalKejadian);
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!acc[year]) acc[year] = Array(12).fill(0);
      acc[year][month]++;
      return acc;
    }, {}),
    classification: countBy(filteredData, "kategoriKecelakaan"),
    byJabatan: getTopN(filteredData, "jabatan"),
    byHari: countBy(filteredData, "hariKejadian"),
    byPerusahaan: getTopN(filteredData, "perusahaan"),
    byPenyebabLangsung: getTopN(filteredData, "penyebabLangsung"),
    byPenyebabDasar: getTopN(filteredData, "penyebabDasar"),
    byUnitTerlibat: getTopN(filteredData, "unitTerlibat"),
    byMasaKerja: getTopN(filteredData, "masaKerja"),
    byTipeCedera: getTopN(filteredData, "tipeCedera"),
    byUsia: countBy(filteredData, "usia"),
    byStatusKaryawan: countBy(filteredData, "statusKaryawan"),
    byTempatTinggal: getTopN(filteredData, "tempatTinggal"),
    byShift: filteredData.reduce((acc, d) => {
      const jamMulai = new Date(d.jamMulaiKecelakaan).getHours();
      let shift;
      if (jamMulai >= 7 && jamMulai < 15) {
        shift = "Shift 1 (07-15)";
      } else if (jamMulai >= 15 && jamMulai < 23) {
        shift = "Shift 2 (15-23)";
      } else {
        shift = "Shift 3 (23-07)";
      }
      acc[shift] = (acc[shift] || 0) + 1;
      return acc;
    }, {}),
    mapPoints: filteredData
      .map((d) => ({
        lat: parseFloat(d.latitude),
        lon: parseFloat(d.longitude),
      }))
      .filter(
        (p) => !isNaN(p.lat) && !isNaN(p.lon) && p.lat !== 0 && p.lon !== 0
      ),
  };

  const jsonString = JSON.stringify(chartData);
  try {
    cache.put(cacheKey, jsonString, CACHE_EXPIRATION);
  } catch (e) {
    console.warn(
      `Peringatan: Data agregasi terlalu besar untuk di-cache. ${e.message}`
    );
  }

  return chartData;
}

/**
 * Membuat respon JSON atau JSONP.
 */
function createJsonResponse(dataObject, callback = null) {
  const jsonString = JSON.stringify(dataObject);

  if (callback) {
    return ContentService.createTextOutput(
      `${callback}(${jsonString})`
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(jsonString).setMimeType(
    ContentService.MimeType.JSON
  );
}
