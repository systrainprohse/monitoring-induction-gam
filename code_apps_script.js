/**
 * @fileoverview Google Apps Script untuk Web App yang berfungsi sebagai API
 * dan juga menyajikan halaman HTML untuk pengujian.
 * Dilengkapi dengan sistem caching dan penanganan galat yang lebih baik.
 * Ditambahkan dukungan JSONP untuk mengatasi masalah CORS/fetch.
 */

const CONFIG = {
  induksi: {
    id: "19SWnTTs34iX-fnrqovnCwwLcS2oAMt4Yu0apIdB5wV8",
    sheets: {
      Induksi_PascaCuti: {
        key: "pascaCuti",
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
      Induksi_NewHire: {
        key: "newHire",
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
      Induksi_Temporary: {
        key: "temporary",
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
      Induksi_Visitor: {
        key: "visitor",
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
      KodeAkses: { key: "kodeAkses", headers: ["date", "kodeAkses"] },
      Setting: { key: "setting", headers: ["namaPerusahaan"] },
      Pendaftaran: {
        key: "pendaftaranInduksi",
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
  },
  pelatihan: {
    id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM",
    sheets: {
      monitoring_internal: {
        key: "monitoringInternal",
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
      jadwal_training: {
        key: "jadwalTraining",
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
      kompetensi_manpower: {
        key: "kompetensiManpower",
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
      peserta_training_actual: {
        key: "pesertaTrainingActual",
        headers: [
          "nikGam",
          "timestamp",
          "score",
          "namaLengkap",
          "departement",
          "nomorTelpon",
          "perusahaan",
          "jabatan",
          "jenisTes",
          "namaTraining",
          "batch",
          "date",
        ],
      },
      training_register: {
        key: "trainingRegister",
        headers: [
          "dateRegist",
          "jabatan",
          "masaKerja",
          "nama",
          "perusahaan",
          "dept",
          "jobdesk",
          "noWa",
          "nik",
          "training",
          "tanggal",
          "detailJabatan1",
          "detailJabatan2",
        ],
      },
    },
  },
  insiden: {
    id: "1bFevC9EGzYmyQTLSCMxu53_7sH7Ab24GT4O0A4nZXTA",
    sheets: {
      Data_Dasbor: {
        key: "dataDasbor",
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
      PERFORMANCE: {
        key: "hsePerformance",
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
  },
};

const CACHE_EXPIRATION = 600;

function doGet(e) {
  try {
    if (e.parameter.callback) {
      const source = e.parameter.source;
      let data;

      switch (source) {
        case "dashboard":
          data = getDashboardData();
          break;
        case "pelatihan":
          data = getPelatihanData();
          break;
        case "induksi":
          data = getInduksiData();
          break;
        case "insiden":
          data = getInsidenData();
          break;
        default:
          data = { error: `Parameter 'source' tidak valid: "${source}".` };
      }
      return createJsonResponse(data, e.parameter.callback);
    }

    return HtmlService.createHtmlOutputFromFile("index")
      .setTitle("Dasbor Uji Coba API Profesional")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    console.error("Error in doGet: " + err.stack);
    const errorData = {
      error: "Terjadi kesalahan internal pada server.",
      details: err.message,
    };
    if (e.parameter.callback) {
      return createJsonResponse(errorData, e.parameter.callback);
    }
    return createJsonResponse(errorData);
  }
}

function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

function getDashboardData() {
  const induksiData = fetchDataForCategory("induksi");
  const insidenData = fetchDataForCategory("insiden");
  return { ...induksiData, ...insidenData };
}

function getPelatihanData() {
  return fetchDataForCategory("pelatihan");
}

function getInduksiData() {
  return fetchDataForCategory("induksi");
}

function getInsidenData() {
  return fetchDataForCategory("insiden");
}

function fetchDataForCategory(categoryName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `data_${categoryName}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const categoryConfig = CONFIG[categoryName];
  const fetchedData = fetchAndMapSheets(
    categoryConfig.id,
    categoryConfig.sheets
  );

  // PERBAIKAN: Menambahkan try-catch untuk menangani data yang terlalu besar untuk cache.
  try {
    const jsonString = JSON.stringify(fetchedData);
    cache.put(cacheKey, jsonString, CACHE_EXPIRATION);
  } catch (e) {
    // Jika data terlalu besar (melebihi 100KB), log pesan peringatan tapi jangan hentikan eksekusi.
    // Aplikasi akan tetap berfungsi, hanya saja tanpa caching untuk data ini.
    if (e.message.includes("Argument too large")) {
      console.warn(
        `Peringatan: Data untuk '${categoryName}' terlalu besar untuk disimpan di cache. Data akan diambil langsung setiap saat.`
      );
    } else {
      // Lemparkan kembali galat lain yang tidak terduga
      throw e;
    }
  }

  return fetchedData;
}

function fetchAndMapSheets(spreadsheetId, sheetConfig) {
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const dataContainer = {};
    Object.keys(sheetConfig).forEach((sheetName) => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      const config = sheetConfig[sheetName];
      dataContainer[config.key] = sheet
        ? sheetDataToJSON(sheet, config.headers)
        : [];
    });
    return dataContainer;
  } catch (e) {
    console.error(
      `Error accessing Spreadsheet ID ${spreadsheetId}: ${e.message}`
    );
    return {};
  }
}

function sheetDataToJSON(sheet, headers) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  return values
    .slice(1)
    .map((row) => {
      if (row.join("").trim() === "") return null;
      const obj = {};
      headers.forEach((header, index) => {
        if (!header) return;
        const cellValue = row[index];
        obj[header] =
          cellValue instanceof Date && !isNaN(cellValue)
            ? Utilities.formatDate(
                cellValue,
                Session.getScriptTimeZone(),
                "yyyy-MM-dd"
              )
            : cellValue;
      });
      return obj;
    })
    .filter((item) => item !== null);
}

function createJsonResponse(data, callback = null) {
  if (callback) {
    const jsonp = `${callback}(${JSON.stringify(data)})`;
    return ContentService.createTextOutput(jsonp).setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  } else {
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON)
      .addHttpHeader("Access-Control-Allow-Origin", "*");
  }
}
