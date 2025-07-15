// Memastikan seluruh DOM (Document Object Model) telah dimuat sebelum menjalankan script.
window.addEventListener("DOMContentLoaded", () => {
  // 1. KONFIGURASI SUMBER DATA GOOGLE SHEET
  // Objek ini mendefinisikan ID spreadsheet dan nama sheet untuk setiap jenis data.
  const SHEET_SOURCES = {
    monitoring_pelatihan: {
      id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM", // ID Spreadsheet
      sheet: "monitoring_internal", // ASUMSI: Nama sheet baru untuk data monitoring internal
    },
    pendaftaran_training: {
      id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM",
      sheet: "training_register",
    },
    jadwal_training: {
      id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM",
      sheet: "jadwal_training",
    },
    kompetensi: {
      id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM",
      sheet: "kompetensi_manpower", // Pastikan nama sheet ini sesuai di Google Sheet Anda
    },
  };

  // Objek ini menentukan kolom mana yang akan ditampilkan untuk setiap tabel.
  const kolomTampilkan = {
    monitoring_pelatihan: [
      "INTERNAL TRAINING",
      "CODE",
      "DONE",
      "ALL MP",
      "OFF",
      "PROGRESS",
      "NEED TRAINING",
    ],
    pendaftaran_training: ["TRAINING", "PERUSAHAAN", "TANGGAL", "DEPT", "NAMA"],
    jadwal_training: [
      "tanggal_mulai",
      "tanggal_selesai",
      "nama_kegiatan",
      "ruangan",
      "jumlah_peserta",
      "pic",
    ],
    // KOLOM UNTUK TABEL UTAMA KOMPETENSI (hanya NIK, Nama, Departemen, Jabatan)
    kompetensi: ["NIK", "NAMA", "DEPT", "JABATAN"],
  };

  const sheetDataCache = {}; // Cache untuk menyimpan data yang sudah diambil dari Google Sheets
  let currentFilteredData = {}; // Menyimpan data yang sudah difilter untuk diekspor
  let sortState = {}; // Objek untuk menyimpan status sorting setiap tabel

  // 2. REFERENSI ELEMEN HTML
  // Mengambil referensi ke elemen-elemen HTML yang akan dimanipulasi oleh JavaScript.
  const calendarDays = document.getElementById("calendarDays");
  const monthYear = document.getElementById("monthYear");
  const modal = document.getElementById("modal");
  const closeModal = document.getElementById("closeModal");
  const filterPIC = document.getElementById("filterPIC");
  const filterRoom = document.getElementById("filterRoom");
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");

  // Elemen filter khusus untuk tab kompetensi
  const filterDeptKompetensi = document.getElementById("filterDeptKompetensi");
  const filterJabatanKompetensi = document.getElementById(
    "filterJabatanKompetensi"
  );
  const filterKompetensiDropdown = document.getElementById(
    "filterKompetensiDropdown"
  );
  const resetFilterKompetensi = document.getElementById(
    "resetFilterKompetensi"
  );
  const filterNamaKompetensi = document.getElementById("filterNamaKompetensi");

  // Elemen filter untuk Pendaftaran Pelatihan
  const filterTrainingPendaftaran = document.getElementById(
    "filterTrainingPendaftaran"
  );
  const filterNamaPendaftaran = document.getElementById(
    "filterNamaPendaftaran"
  );
  const startDatePendaftaran = document.getElementById("startDatePendaftaran");
  const endDatePendaftaran = document.getElementById("endDatePendaftaran");
  const resetFilterPendaftaran = document.getElementById(
    "resetFilterPendaftaran"
  );

  // Elemen modal spesifik untuk detail kompetensi (sesuai desain baru)
  // Perbaikan: Pastikan ID elemen ini ada di HTML Anda.
  // Jika tidak ada elemen dengan ID 'modalProfileHeader', 'modalProfileDetails', 'modalKompetensiDetails'
  // maka referensi ini akan null dan perlu disesuaikan di HTML.
  const kompetensiModalContent = document.getElementById(
    "kompetensiModalContent"
  ); // Container utama untuk detail kompetensi
  const modalProfileName = document.getElementById("modalProfileName");
  const modalProfileTitle = document.getElementById("modalProfileTitle"); // Untuk Jabatan/Departemen
  const modalProfileNIK = document.getElementById("modalProfileNIK");
  const modalProfileDept = document.getElementById("modalProfileDept");
  const modalProfileJabatan = document.getElementById("modalProfileJabatan");
  const kompetensiList = document.getElementById("kompetensiList");

  // Elemen modal spesifik untuk detail kalender
  const calendarModalContent = document.getElementById("calendarModalContent"); // Container utama untuk detail kalender
  const modalTitle = document.getElementById("modalTitle"); // Judul utama modal, digunakan untuk keduanya
  const modalDate = document.getElementById("modalDate");
  const modalRoom = document.getElementById("modalRoom");
  const modalParticipants = document.getElementById("modalParticipants");
  const modalPIC = document.getElementById("modalPIC");

  // Elemen UI utama
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const splashScreen = document.querySelector(".splash-screen");
  const navbar = document.querySelector(".navbar");
  const currentDateTimeElement = document.getElementById("currentDateTime");

  // 3. VARIABEL STATE
  // Variabel-variabel yang menyimpan status aplikasi saat ini.
  let currentDate = new Date(); // Tanggal saat ini untuk kalender
  let allEvents = []; // Semua data event kalender
  let eventsByDate = {}; // Event kalender yang dikelompokkan berdasarkan tanggal
  let selectedPIC = ""; // PIC yang dipilih untuk filter kalender
  let selectedRoom = ""; // Ruangan yang dipilih untuk filter kalender

  // State filter untuk tab kompetensi
  let selectedDeptKompetensi = "all"; // Departemen yang dipilih
  let selectedJabatanKompetensi = "all"; // Jabatan yang dipilih
  let selectedKompetensi = "all"; // Kompetensi yang dipilih (dari dropdown)
  let searchNamaKompetensi = ""; // Teks pencarian nama

  // State filter untuk tab Pendaftaran Pelatihan
  let selectedTraining = "all";
  let searchNamaPendaftaran = "";
  let selectedStartDatePendaftaran = "";
  let selectedEndDatePendaftaran = "";

  // 4. PENANGAN MODAL
  // Menambahkan event listener untuk menutup modal.
  if (closeModal) {
    closeModal.addEventListener("click", () => {
      console.log("Modal closed.");
      if (modal) modal.style.display = "none";
    });
  }
  if (modal) {
    // Menutup modal jika area di luar konten modal diklik.
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        console.log("Clicked outside modal, closing.");
        modal.style.display = "none";
      }
    });
  }

  // Tambahkan event listener untuk menutup modal drilldown grafik
  const closeDrilldownBtn = document.getElementById("close-drilldown-modal");
  const drilldownModal = document.getElementById("chart-drilldown-modal");
  if (closeDrilldownBtn && drilldownModal) {
    closeDrilldownBtn.addEventListener("click", () => {
      drilldownModal.classList.add("hidden");
    });
  }

  /**
   * Menampilkan modal dengan detail yang relevan berdasarkan tipe.
   * @param {Object|Array} items - Data yang akan ditampilkan di modal.
   * @param {string} type - Tipe modal ('calendar' untuk jadwal, 'kompetensi' untuk detail kompetensi).
   */
  function showModal(items, type = "calendar") {
    console.log("Showing modal with items:", items, "type:", type);
    const modalContent = modal?.querySelector(".modal-content");
    if (!modalContent) {
      console.error("Elemen konten modal tidak ditemukan.");
      return;
    }

    // Sembunyikan semua bagian modal terlebih dahulu untuk memastikan tampilan bersih
    if (kompetensiModalContent) kompetensiModalContent.style.display = "none";
    if (calendarModalContent) calendarModalContent.style.display = "none";

    // Kosongkan konten yang mungkin ada dari penggunaan sebelumnya
    if (modalProfileName) modalProfileName.textContent = "";
    if (modalProfileTitle) modalProfileTitle.textContent = "";
    if (modalProfileNIK) modalProfileNIK.textContent = "";
    if (modalProfileDept) modalProfileDept.textContent = "";
    if (modalProfileJabatan) modalProfileJabatan.textContent = "";
    if (kompetensiList) kompetensiList.innerHTML = "";
    if (modalDate) modalDate.textContent = "";
    if (modalRoom) modalRoom.textContent = "";
    if (modalParticipants) modalParticipants.textContent = "";
    if (modalPIC) modalPIC.textContent = "";
    if (modalTitle) modalTitle.textContent = ""; // Kosongkan judul utama modal

    // Hapus elemen 'extra' dari modal kalender jika ada
    const existingExtraCalendarEvents = modalContent.querySelector(
      ".extra-calendar-events"
    );
    if (existingExtraCalendarEvents) existingExtraCalendarEvents.innerHTML = ""; // Kosongkan kontennya

    if (type === "calendar") {
      // Tampilkan bagian modal untuk kalender
      if (calendarModalContent) calendarModalContent.style.display = "block";

      if (items.length === 1) {
        // Jika hanya satu kegiatan, tampilkan detailnya
        const ev = items[0];
        if (modalTitle) modalTitle.textContent = ev.nama_kegiatan; // Gunakan modalTitle utama
        if (modalDate)
          modalDate.textContent = `${ev.tanggal_mulai} s.d. ${ev.tanggal_selesai}`;
        if (modalRoom) modalRoom.textContent = ev.ruangan;
        if (modalParticipants)
          modalParticipants.textContent = ev.jumlah_peserta;
        if (modalPIC) modalPIC.textContent = ev.pic;
      } else {
        // Jika ada banyak kegiatan, tampilkan ringkasan dan daftar
        if (modalTitle) modalTitle.textContent = `Ada ${items.length} kegiatan`; // Gunakan modalTitle utama
        // Kosongkan detail standar jika ada banyak kegiatan
        if (modalDate) modalDate.textContent = "";
        if (modalRoom) modalRoom.textContent = "";
        if (modalParticipants) modalParticipants.textContent = "";
        if (modalPIC) modalPIC.textContent = "";

        const container = modalContent.querySelector(".extra-calendar-events"); // Gunakan container yang sudah ada
        if (container) {
          items.forEach((ev) => {
            const p = document.createElement("p");
            p.innerHTML = `
                            <strong>${ev.nama_kegiatan}</strong><br>
                            ${ev.tanggal_mulai} s.d. ${ev.tanggal_selesai}<br>
                            Ruangan: ${ev.ruangan}<br>
                            Peserta: ${ev.jumlah_peserta}<br>
                            PIC: ${ev.pic}<br><br>
                        `;
            container.appendChild(p);
          });
        }
      }
    } else if (type === "kompetensi") {
      // Tampilkan bagian modal untuk kompetensi
      if (kompetensiModalContent)
        kompetensiModalContent.style.display = "block";

      const person = items.person; // Data dasar individu (NIK, Nama, Dept, Jabatan)
      const competencies = items.competencies; // Array objek kompetensi

      if (modalTitle)
        modalTitle.textContent = `Detail Kompetensi: ${person.NAMA || "N/A"}`; // Gunakan modalTitle utama
      if (modalProfileName) modalProfileName.textContent = person.NAMA || "N/A";
      // Gabungkan Departemen dan Jabatan untuk modalProfileTitle
      if (modalProfileTitle)
        modalProfileTitle.textContent = `${person.DEPT || "N/A"} - ${
          person.JABATAN || "N/A"
        }`;
      if (modalProfileNIK) modalProfileNIK.textContent = person.NIK || "N/A";
      if (modalProfileDept) modalProfileDept.textContent = person.DEPT || "N/A";
      if (modalProfileJabatan)
        modalProfileJabatan.textContent = person.JABATAN || "N/A";

      if (kompetensiList) {
        kompetensiList.innerHTML = ""; // Pastikan kosong sebelum mengisi
        if (competencies.length > 0) {
          // Isi daftar kompetensi
          competencies.forEach((comp) => {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${
              comp.KOMPETENSI || "N/A"
            }</strong>: Status: ${comp.STATUS || "N/A"}`;
            kompetensiList.appendChild(li);
          });
        } else {
          // Jika tidak ada kompetensi
          const li = document.createElement("li");
          li.textContent = "Tidak ada data kompetensi yang ditemukan.";
          kompetensiList.appendChild(li);
        }
      }
    }

    // Tampilkan modal
    if (modal) {
      modal.style.display = "flex";
    }
  }

  // 5. FUNGSI UTILITAS
  /**
   * Memformat string tanggal ke format YYYY-MM-DD.
   * @param {string} str - String tanggal (misal: "DD/MM/YYYY").
   * @returns {string} Tanggal dalam format YYYY-MM-DD.
   */
  function formatTanggal(str) {
    if (!str) return "";
    const parts = str.split("/");
    if (parts.length === 3) {
      // Format DD/MM/YYYY menjadi YYYY-MM-DD
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(
        2,
        "0"
      )}`;
    }
    // Asumsikan sudah dalam format YYYY-MM-DD atau format lain yang bisa diparse Date
    return str;
  }

  /**
   * Mengembalikan array string tanggal dalam rentang tertentu.
   * @param {string} start - Tanggal mulai (YYYY-MM-DD).
   * @param {string} end - Tanggal akhir (YYYY-MM-DD).
   * @returns {Array<string>} Array tanggal dalam format YYYY-MM-DD.
   */
  function getTanggalRange(start, end) {
    const out = [];
    let cur = new Date(start);
    const last = new Date(end);
    while (cur <= last) {
      out.push(cur.toISOString().slice(0, 10)); // Ambil bagian YYYY-MM-DD
      cur.setDate(cur.getDate() + 1); // Maju satu hari
    }
    return out;
  }

  /**
   * Mengatur status sorting dan memanggil fungsi filter yang sesuai.
   * @param {string} key - Kunci tabel (e.g., "kompetensi").
   * @param {string} column - Nama kolom yang akan diurutkan.
   */
  function setSort(key, column) {
    const currentSort = sortState[key];
    let direction = "asc";
    if (currentSort && currentSort.column === column) {
      direction = currentSort.direction === "asc" ? "desc" : "asc";
    }
    sortState[key] = { column, direction };

    // Panggil fungsi filter yang relevan untuk merender ulang tabel
    if (key === "kompetensi") applyKompetensiFilter();
    else if (key === "pendaftaran_training") applyPendaftaranFilter();
    else if (key === "monitoring_pelatihan") {
      // Tab ini tidak memiliki filter, jadi kita hanya perlu mengurutkan dan merender ulang datanya.
      const data =
        sheetDataCache[SHEET_SOURCES.monitoring_pelatihan.sheet] || [];
      const sortedData = sortData(data, "monitoring_pelatihan");
      renderTable(sortedData, "table-monitoring_pelatihan");
    }
  }

  /**
   * Exports an array of objects to an Excel file.
   * @param {Array<Object>} data - The data to export.
   * @param {string} filename - The desired filename (without extension).
   */
  function exportToExcel(data, filename) {
    if (!data || data.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Logika untuk auto-fit lebar kolom
    const objectMaxLength = [];
    data.forEach((item) => {
      Object.keys(item).forEach((key, i) => {
        const value = item[key] || "";
        const len = String(value).length;
        objectMaxLength[i] = Math.max(objectMaxLength[i] || 0, len);
      });
    });
    const headers = Object.keys(data[0]);
    const wscols = headers.map((key, i) => ({
      wch: Math.max(key.length, objectMaxLength[i] || 0) + 2,
    }));
    worksheet["!cols"] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  /**
   * Mengurutkan array data berdasarkan state yang tersimpan di `sortState`.
   * @param {Array<Object>} data - Array data yang akan diurutkan.
   * @param {string} key - Kunci tabel untuk mendapatkan state sorting.
   * @returns {Array<Object>} Array data yang sudah diurutkan.
   */
  function sortData(data, key) {
    if (sortState[key]) {
      const { column, direction } = sortState[key];
      // Gunakan slice() untuk membuat salinan array agar tidak mengubah data asli.
      return data.slice().sort((a, b) => {
        let valA = a[column] || "";
        let valB = b[column] || "";

        // Coba urutkan sebagai angka jika memungkinkan
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return direction === "asc" ? numA - numB : numB - numA;
        }

        // Jika bukan angka, urutkan sebagai teks (case-insensitive)
        return direction === "asc"
          ? String(valA).localeCompare(String(valB), undefined, {
              sensitivity: "base",
            })
          : String(valB).localeCompare(String(valA), undefined, {
              sensitivity: "base",
            });
      });
    }
    return data; // Kembalikan data asli jika tidak ada state sorting
  }

  /**
   * Mengembalikan warna unik berdasarkan kunci (string).
   * Digunakan untuk memberi warna berbeda pada event kalender.
   * @param {string} key - Kunci untuk menghasilkan warna.
   * @returns {string} Kode warna heksadesimal.
   */
  function getColorForKey(key) {
    const palette = [
      "#1976d2",
      "#388e3c",
      "#f57c00",
      "#7b1fa2",
      "#c2185b",
      "#0097a7",
      "#5d4037",
      "#455a64",
      "#d32f2f",
      "#0288d1",
    ];
    const hash = [...key].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return palette[hash % palette.length];
  }

  // Membuat versi debounced dari fungsi filter untuk input teks
  const debouncedApplyPendaftaranFilter = debounce(applyPendaftaranFilter, 300);
  const debouncedApplyKompetensiFilter = debounce(applyKompetensiFilter, 300);

  /**
   * A wrapper for the global fetchSheet function that adds caching and loader management.
   * Menggunakan cache untuk menghindari pengambilan data berulang.
   * @param {string} id - ID spreadsheet Google Sheet.
   * @param {string} sheet - Nama sheet di spreadsheet.
   * @returns {Promise<Array<Object>>} Promise yang berisi data dari sheet.
   */
  async function fetchAndCacheSheet(id, sheet) {
    // Cek cache terlebih dahulu
    if (sheetDataCache[sheet]) {
      console.log(`Mengembalikan data yang di-cache untuk sheet: ${sheet}`);
      return sheetDataCache[sheet];
    }

    showLoader();
    try {
      const data = await fetchSheet(id, sheet); // Call global fetchSheet
      sheetDataCache[sheet] = data; // Simpan data ke cache
      console.log(
        `Data berhasil diambil dan di-cache untuk sheet: ${sheet}`,
        data
      );
      return data;
    } catch (err) {
      console.error(`Gagal mengambil data untuk sheet ${sheet}:`, err);
      return []; // Kembalikan array kosong jika gagal
    } finally {
      hideLoader();
    }
  }

  /**
   * Menerapkan filter pada data kompetensi dan merender tabel.
   */
  function applyKompetensiFilter() {
    // Ambil data dari cache dan saring entri yang undefined/null
    const dataToFilter = (
      sheetDataCache[SHEET_SOURCES.kompetensi.sheet] || []
    ).filter(Boolean);
    console.log("Data untuk difilter (Kompetensi):", dataToFilter);
    const key = "kompetensi";

    const filtered = dataToFilter.filter((row) => {
      // Double-check: pastikan 'row' adalah objek yang valid sebelum mengakses propertinya
      if (typeof row !== "object" || row === null) {
        return false;
      }

      // Ambil nilai kolom dan ubah ke lowercase untuk perbandingan case-insensitive
      const deptRow = (row.DEPT || "").toLowerCase();
      const jabatanRow = (row.JABATAN || "").toLowerCase();
      const kompetensiRow = (row.KOMPETENSI || "").toLowerCase();
      const namaRow = (row.NAMA || "").toLowerCase();

      // Cek apakah baris cocok dengan filter yang dipilih
      const matchDept =
        selectedDeptKompetensi === "all" ||
        deptRow === selectedDeptKompetensi.toLowerCase();
      const matchJabatan =
        selectedJabatanKompetensi === "all" ||
        jabatanRow === selectedJabatanKompetensi.toLowerCase();
      const matchKompetensi =
        selectedKompetensi === "all" ||
        kompetensiRow === selectedKompetensi.toLowerCase();
      const matchNama =
        searchNamaKompetensi === "" ||
        namaRow.includes(searchNamaKompetensi.toLowerCase());

      return matchDept && matchJabatan && matchKompetensi && matchNama;
    });

    // Urutkan data yang sudah difilter
    const sortedData = sortData(filtered, key);

    currentFilteredData[key] = sortedData; // Simpan data untuk diekspor

    // Perbarui jumlah hasil yang ditampilkan
    const resultCountEl = document.getElementById("resultCountKompetensi");
    if (resultCountEl) {
      resultCountEl.textContent = `Menampilkan ${sortedData.length} entri.`;
    }

    renderTable(sortedData, "table-kompetensi");
  }

  /**
   * Menerapkan filter pada data pendaftaran training dan merender tabel.
   */
  function applyPendaftaranFilter() {
    const dataToFilter = (
      sheetDataCache[SHEET_SOURCES.pendaftaran_training.sheet] || []
    ).filter(Boolean);
    const key = "pendaftaran_training";
    const filtered = dataToFilter.filter((row) => {
      if (typeof row !== "object" || row === null) return false;

      const trainingRow = (row.TRAINING || "").toLowerCase();
      const namaRow = (row.NAMA || "").toLowerCase();
      const tanggalRow = formatTanggal(row.TANGGAL); // Menggunakan format YYYY-MM-DD

      const matchTraining =
        selectedTraining === "all" ||
        trainingRow === selectedTraining.toLowerCase();
      const matchNama =
        searchNamaPendaftaran === "" ||
        namaRow.includes(searchNamaPendaftaran.toLowerCase());

      let matchDate = true;
      if (selectedStartDatePendaftaran && selectedEndDatePendaftaran) {
        matchDate =
          tanggalRow >= selectedStartDatePendaftaran &&
          tanggalRow <= selectedEndDatePendaftaran;
      } else if (selectedStartDatePendaftaran) {
        matchDate = tanggalRow >= selectedStartDatePendaftaran;
      } else if (selectedEndDatePendaftaran) {
        matchDate = tanggalRow <= selectedEndDatePendaftaran;
      }

      return matchTraining && matchNama && matchDate;
    });

    // Urutkan data yang sudah difilter
    const sortedData = sortData(filtered, key);

    currentFilteredData[key] = sortedData; // Simpan data untuk diekspor

    const resultCountEl = document.getElementById("resultCountPendaftaran");
    if (resultCountEl) {
      resultCountEl.textContent = `Menampilkan ${sortedData.length} entri.`;
    }

    renderTable(sortedData, "table-pendaftaran_training");
  }

  /**
   * Menginisialisasi filter dropdown untuk tab Pendaftaran Training.
   */
  function initPendaftaranFilters() {
    const data = sheetDataCache[SHEET_SOURCES.pendaftaran_training.sheet] || [];

    if (
      !filterTrainingPendaftaran ||
      !filterNamaPendaftaran ||
      !resetFilterPendaftaran
    )
      return;

    if (!filterTrainingPendaftaran.dataset.listenerAttached) {
      const uniqueTrainings = [
        ...new Set(data.map((row) => row.TRAINING).filter(Boolean)),
      ].sort();
      filterTrainingPendaftaran.innerHTML =
        `<option value="all">Semua</option>` +
        uniqueTrainings
          .map((t) => `<option value="${t}">${t}</option>`)
          .join("");

      filterTrainingPendaftaran.addEventListener("change", (e) => {
        selectedTraining = e.target.value;
        applyPendaftaranFilter();
      });
      filterNamaPendaftaran.addEventListener("input", (e) => {
        searchNamaPendaftaran = e.target.value;
        debouncedApplyPendaftaranFilter();
      });
      startDatePendaftaran.addEventListener("change", (e) => {
        selectedStartDatePendaftaran = e.target.value;
        applyPendaftaranFilter();
      });
      endDatePendaftaran.addEventListener("change", (e) => {
        selectedEndDatePendaftaran = e.target.value;
        applyPendaftaranFilter();
      });

      resetFilterPendaftaran.addEventListener("click", () => {
        filterTrainingPendaftaran.value = "all";
        filterNamaPendaftaran.value = "";
        startDatePendaftaran.value = "";
        endDatePendaftaran.value = "";
        selectedTraining = "all";
        searchNamaPendaftaran = "";
        selectedStartDatePendaftaran = "";
        selectedEndDatePendaftaran = "";
        applyPendaftaranFilter();
      });

      filterTrainingPendaftaran.dataset.listenerAttached = "true";
    }
    applyPendaftaranFilter(); // Panggil untuk render awal
  }

  /**
   * Menginisialisasi filter dropdown untuk tab Kompetensi.
   * Mengisi opsi dropdown dan melampirkan event listener.
   */
  function initKompetensiFilters() {
    const data = sheetDataCache[SHEET_SOURCES.kompetensi.sheet] || [];

    // Periksa apakah semua elemen filter ditemukan di DOM
    if (
      !filterDeptKompetensi ||
      !filterJabatanKompetensi ||
      !filterKompetensiDropdown ||
      !resetFilterKompetensi ||
      !filterNamaKompetensi
    ) {
      console.warn(
        "Satu atau lebih elemen filter kompetensi tidak ditemukan. Pastikan ID HTML sudah benar."
      );
      return;
    }

    // Pastikan opsi filter hanya diisi dan event listener hanya dipasang sekali
    if (!filterDeptKompetensi.dataset.listenerAttached) {
      if (data.length > 0) {
        // Ambil nilai unik untuk dropdown Departemen
        const uniqueDepts = [
          ...new Set(data.map((row) => row.DEPT).filter(Boolean)),
        ].sort();
        filterDeptKompetensi.innerHTML =
          `<option value="all">Semua</option>` +
          uniqueDepts.map((d) => `<option value="${d}">${d}</option>`).join("");

        // Ambil nilai unik untuk dropdown Jabatan
        const uniqueJabatans = [
          ...new Set(data.map((row) => row.JABATAN).filter(Boolean)),
        ].sort();
        filterJabatanKompetensi.innerHTML =
          `<option value="all">Semua</option>` +
          uniqueJabatans
            .map((j) => `<option value="${j}">${j}</option>`)
            .join("");

        // Ambil nilai unik untuk dropdown Kompetensi
        const uniqueKompetensi = [
          ...new Set(data.map((row) => row.KOMPETENSI).filter(Boolean)),
        ].sort();
        filterKompetensiDropdown.innerHTML =
          `<option value="all">Semua</option>` +
          uniqueKompetensi
            .map((k) => `<option value="${k}">${k}</option>`)
            .join("");
      } else {
        // Jika tidak ada data, tampilkan opsi "Tidak Ada Data"
        console.warn("Tidak ada data untuk mengisi filter kompetensi.");
        filterDeptKompetensi.innerHTML = `<option value="all">Tidak Ada Data</option>`;
        filterJabatanKompetensi.innerHTML = `<option value="all">Tidak Ada Data</option>`;
        filterKompetensiDropdown.innerHTML = `<option value="all">Tidak Ada Data</option>`;
      }

      // Pasang event listeners untuk setiap filter
      filterDeptKompetensi.addEventListener("change", (e) => {
        selectedDeptKompetensi = e.target.value;
        applyKompetensiFilter();
      });
      filterJabatanKompetensi.addEventListener("change", (e) => {
        selectedJabatanKompetensi = e.target.value;
        applyKompetensiFilter();
      });
      filterKompetensiDropdown.addEventListener("change", (e) => {
        selectedKompetensi = e.target.value; // Perbarui state untuk dropdown kompetensi
        applyKompetensiFilter();
      });
      filterNamaKompetensi.addEventListener("input", (e) => {
        searchNamaKompetensi = e.target.value;
        debouncedApplyKompetensiFilter();
      });
      resetFilterKompetensi.addEventListener("click", () => {
        // Reset nilai dropdown dan state filter
        filterDeptKompetensi.value = "all";
        filterJabatanKompetensi.value = "all";
        filterKompetensiDropdown.value = "all";
        filterNamaKompetensi.value = "";
        selectedDeptKompetensi = "all";
        selectedJabatanKompetensi = "all";
        selectedKompetensi = "all";
        searchNamaKompetensi = "";
        applyKompetensiFilter();
      });
      // Tandai bahwa listener sudah terpasang untuk mencegah pemasangan berulang
      filterDeptKompetensi.dataset.listenerAttached = "true";
      console.log("Event listener filter kompetensi terpasang.");
    }
    // Panggil applyKompetensiFilter untuk menampilkan data awal saat inisialisasi
    applyKompetensiFilter();
  }

  // 6. RENDER KALENDER
  /**
   * Merender tampilan kalender berdasarkan bulan dan tahun saat ini.
   */
  function renderCalendar() {
    const Y = currentDate.getFullYear();
    const M = currentDate.getMonth();
    const firstDay = new Date(Y, M, 1).getDay(); // Hari pertama bulan (0=Minggu, 1=Senin, dst.)
    const daysInMonth = new Date(Y, M + 1, 0).getDate(); // Jumlah hari dalam bulan

    const now = new Date();
    // Format tanggal hari ini ke ISO string (YYYY-MM-DD) untuk perbandingan
    const todayISO = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    // Perbarui teks bulan dan tahun di header kalender
    if (monthYear) {
      monthYear.textContent = currentDate.toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });
    }

    if (calendarDays) {
      calendarDays.innerHTML = ""; // Bersihkan hari-hari sebelumnya
      // Buat div kosong untuk mengisi hari-hari sebelum tanggal 1
      for (let i = 0; i < firstDay; i++) {
        calendarDays.appendChild(document.createElement("div"));
      }

      // Buat sel untuk setiap hari dalam sebulan
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${Y}-${String(M + 1).padStart(2, "0")}-${String(
          d
        ).padStart(2, "0")}`;
        const cell = document.createElement("div");
        cell.className = "day";
        cell.innerHTML = `<div class="date-number">${d}</div>`;

        // Tandai hari ini
        if (iso === todayISO) {
          cell.classList.add("today");
        }

        // Tambahkan event jika ada kegiatan pada tanggal tersebut
        if (eventsByDate[iso] && eventsByDate[iso].length > 0) {
          cell.classList.add("has-event");
          eventsByDate[iso].forEach((ev) => {
            const lbl = document.createElement("div");
            lbl.className = "event-label";
            lbl.textContent = ev.nama_kegiatan;
            lbl.style.backgroundColor = getColorForKey(ev.nama_kegiatan);
            cell.appendChild(lbl);
          });
          // Tambahkan event listener untuk menampilkan modal kalender
          cell.addEventListener("click", () =>
            showModal(eventsByDate[iso], "calendar")
          );
        }
        calendarDays.appendChild(cell);
      }
      console.log(
        "Kalender dirender untuk:",
        monthYear.textContent,
        "dengan eventsByDate:",
        eventsByDate
      );
    } else {
      console.warn(
        "Elemen calendarDays tidak ditemukan. Tidak dapat merender kalender."
      );
    }
  }

  // 7. FILTER KALENDER
  /**
   * Menerapkan filter PIC dan Ruangan pada event kalender.
   */
  function applyFilters() {
    eventsByDate = {}; // Reset event yang dikelompokkan
    // Filter dari data asli allEvents berdasarkan PIC dan Ruangan yang dipilih
    allEvents.forEach((ev) => {
      if (selectedPIC && ev.pic && ev.pic !== selectedPIC) return;
      if (selectedRoom && ev.ruangan && ev.ruangan !== selectedRoom) return;
      // Dapatkan semua tanggal dalam rentang event dan tambahkan ke eventsByDate
      getTanggalRange(ev.tanggal_mulai, ev.tanggal_selesai).forEach((date) => {
        (eventsByDate[date] ||= []).push(ev); // Tambahkan event ke tanggal yang relevan
      });
    });
    console.log("Events by Date setelah filtering:", eventsByDate);
    renderCalendar(); // Render ulang kalender dengan event yang sudah difilter
  }

  /**
   * Menginisialisasi filter dropdown untuk kalender (PIC dan Ruangan).
   * @param {Array<Object>} data - Data event untuk mengekstrak nilai unik.
   */
  function initFilters(data) {
    // Ambil nilai unik untuk PIC dan Ruangan
    const pics = [...new Set(data.map((ev) => ev.pic).filter(Boolean))].sort();
    const rooms = [
      ...new Set(data.map((ev) => ev.ruangan).filter(Boolean)),
    ].sort();

    // Isi dropdown PIC
    if (filterPIC) {
      filterPIC.innerHTML = `<option value="">Semua PIC</option>`;
      pics.forEach((p) => filterPIC.add(new Option(p, p)));
      // Pasang event listener hanya sekali
      if (!filterPIC.dataset.listenerAttached) {
        filterPIC.addEventListener("change", (e) => {
          selectedPIC = e.target.value;
          applyFilters();
        });
        filterPIC.dataset.listenerAttached = "true";
      }
    } else {
      console.warn("Elemen Filter PIC tidak ditemukan.");
    }

    // Isi dropdown Ruangan
    if (filterRoom) {
      filterRoom.innerHTML = `<option value="">Semua Ruangan</option>`;
      rooms.forEach((r) => filterRoom.add(new Option(r, r)));
      // Pasang event listener hanya sekali
      if (!filterRoom.dataset.listenerAttached) {
        filterRoom.addEventListener("change", (e) => {
          selectedRoom = e.target.value;
          applyFilters();
        });
        filterRoom.dataset.listenerAttached = "true";
      }
    } else {
      console.warn("Elemen Filter Ruangan tidak ditemukan.");
    }
    console.log(
      "Filter kalender diinisialisasi dengan PICs:",
      pics,
      "dan Rooms:",
      rooms
    );
  }

  // 8. PENGAMBILAN DATA
  /**
   * Mengambil data dari Google Sheet menggunakan opensheet.elk.sh.
   * Menggunakan cache untuk menghindari pengambilan data berulang.
   * @param {string} id - ID spreadsheet Google Sheet.
   * @param {string} sheet - Nama sheet di spreadsheet.
   * @returns {Promise<Array<Object>>} Promise yang berisi data dari sheet.
   */
  async function fetchSheet(id, sheet) {
    // Cek cache terlebih dahulu
    if (sheetDataCache[sheet]) {
      console.log(`Mengembalikan data yang di-cache untuk sheet: ${sheet}`);
      return sheetDataCache[sheet];
    }
    showLoader(); // Tampilkan loader saat fetching
    try {
      const res = await fetch(`https://opensheet.elk.sh/${id}/${sheet}`);
      if (!res.ok) throw new Error(`Gagal mengambil data dari sheet: ${sheet}`);

      const data = await res.json();
      // PENTING: Validasi bahwa respons adalah array. Jika tidak, opensheet mungkin mengembalikan error.
      if (!Array.isArray(data)) {
        throw new Error(
          `Format respons tidak valid atau sheet '${sheet}' tidak dapat diakses/kosong.`
        );
      }

      sheetDataCache[sheet] = data;
      console.log(
        `Data berhasil diambil dan di-cache untuk sheet: ${sheet}`,
        data
      );
      return data;
    } catch (err) {
      // Menyertakan pesan error asli untuk debugging yang lebih baik
      console.error(`Error fetching sheet ${sheet}:`, err.message);
      return []; // Kembalikan array kosong jika ada error
    } finally {
      hideLoader(); // Sembunyikan loader setelah fetching selesai (berhasil/gagal)
    }
  }

  // 9. RENDER TABEL
  /**
   * Merender data ke dalam tabel HTML.
   * @param {Array<Object>} data - Data yang akan dirender.
   * @param {string} tableId - ID elemen tabel HTML.
   */
  function renderTable(data, tableId) {
    const key = tableId.replace("table-", ""); // Dapatkan kunci dari ID tabel (e.g., "kompetensi")
    let table = document.getElementById(tableId);

    if (!table) {
      console.error(`Elemen tabel dengan ID '${tableId}' tidak ditemukan.`);
      return;
    }

    // Tampilkan pesan jika tidak ada data
    if (!data || data.length === 0) {
      table.innerHTML =
        "<tbody><tr><td colspan='100%'>Data tidak tersedia.</td></tr></tbody>"; // Default message for empty table
      // Pastikan tabel terlihat walaupun tidak ada data (agar pesan "Data tidak tersedia" terlihat)
      table.classList.remove("loaded");
      setTimeout(() => table.classList.add("loaded"), 10);
      return;
    }

    // Jika elemen bukan tabel, ganti dengan elemen tabel baru
    if (table.tagName !== "TABLE") {
      const newTable = document.createElement("table");
      newTable.id = tableId;
      newTable.className = "data-table";
      table.replaceWith(newTable);
      table = newTable;
    }

    // Tentukan kolom yang diizinkan untuk ditampilkan
    const allowed = kolomTampilkan[key] || Object.keys(data[0]);

    // Buat header tabel
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
      th.addEventListener("click", () => setSort(key, h));
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    let tbodyHtml = "";

    // Logika rendering khusus untuk tabel kompetensi
    if (key === "kompetensi") {
      const uniqueIndividuals = {};
      // Kelompokkan data kompetensi berdasarkan NIK untuk individu unik
      data.forEach((row) => {
        const nik = row.NIK;
        if (nik) {
          if (!uniqueIndividuals[nik]) {
            // Inisialisasi data individu jika NIK baru ditemukan
            uniqueIndividuals[nik] = {
              NIK: row.NIK,
              NAMA: row.NAMA,
              DEPT: row.DEPT,
              JABATAN: row.JABATAN,
              competencies: [], // Array untuk menyimpan semua kompetensi orang ini
            };
          }
          // Tambahkan kompetensi dan statusnya ke individu yang sesuai
          if (row.KOMPETENSI || row.STATUS) {
            uniqueIndividuals[nik].competencies.push({
              KOMPETENSI: row.KOMPETENSI,
              STATUS: row.STATUS,
            });
          }
        }
      });

      // Ubah objek individu unik menjadi array untuk diiterasi
      const individualsArray = Object.values(uniqueIndividuals);

      // Buat baris tabel untuk setiap individu unik
      tbodyHtml = `<tbody>${individualsArray
        .map((person) => {
          const rowData = [
            person.NIK || "",
            person.NAMA || "",
            person.DEPT || "",
            person.JABATAN || "",
          ];
          const headers = kolomTampilkan.kompetensi; // Mengambil header dari konfigurasi
          // Baris ini akan memiliki event listener untuk menampilkan modal kompetensi
          return `<tr class="kompetensi-row" data-nik="${person.NIK}">
                                ${rowData
                                  .map(
                                    (cell, index) =>
                                      `<td data-label="${headers[index]}">${cell}</td>`
                                  )
                                  .join("")}
                            </tr>`;
        })
        .join("")}</tbody>`;
    } else {
      // Untuk tabel lainnya, render baris seperti biasa
      tbodyHtml = `<tbody>${data
        .map(
          (row) =>
            `<tr>${allowed
              .map((h) => {
                let cellContent = row[h] || "";
                let className = "";
                let cellHtml = cellContent;

                // Logika pewarnaan untuk kolom PROGRESS di tabel monitoring_pelatihan
                if (key === "monitoring_pelatihan" && h === "PROGRESS") {
                  const progress = parseFloat(
                    String(cellContent).replace("%", "")
                  );
                  if (!isNaN(progress)) {
                    if (progress >= 80)
                      className = "approved"; // Hijau untuk progres tinggi
                    else if (progress >= 50)
                      className = "hold"; // Kuning untuk progres menengah
                    else className = "red"; // Merah untuk progres rendah
                  }
                }
                // Logika status untuk pendaftaran dan score
                else if (
                  (key === "pendaftaran_training" || key === "score") &&
                  h === "STATUS"
                ) {
                  const statusLower = cellContent.toLowerCase();
                  if (statusLower === "approved" || statusLower === "lulus") {
                    className = "approved";
                  } else if (statusLower === "hold") {
                    className = "hold";
                  } else if (
                    statusLower === "rejected" ||
                    statusLower === "tidak lulus"
                  ) {
                    className = "red";
                  }
                }

                // Jika ada kelas khusus (misal: status), bungkus dengan span untuk penataan yang lebih baik
                if (className) {
                  cellHtml = `<span class="badge ${className}">${cellContent}</span>`;
                }
                return `<td data-label="${h}">${cellHtml}</td>`;
              })
              .join("")}</tr>`
        )
        .join("")}</tbody>`;
    }

    // Masukkan thead dan tbody ke dalam tabel
    table.innerHTML = ""; // Kosongkan tabel
    table.appendChild(thead);
    table.innerHTML += tbodyHtml; // Tambahkan body sebagai HTML string
    table.classList.remove("loaded"); // Hapus dulu untuk memastikan transisi
    setTimeout(() => table.classList.add("loaded"), 10); // Tambahkan kelas 'loaded' setelah sedikit delay
    console.log(`Tabel '${tableId}' dirender dengan ${data.length} baris.`);

    // Tambahkan efek zoom saat baris diklik menggunakan event delegation
    const tableBody = table.querySelector("tbody");
    if (tableBody) {
      tableBody.addEventListener("click", (event) => {
        const clickedRow = event.target.closest("tr");
        // Pastikan yang diklik adalah baris di dalam tbody
        if (!clickedRow || !clickedRow.parentElement) return;

        const allRows = tableBody.querySelectorAll("tr");
        const isAlreadyZoomed = clickedRow.classList.contains("zoomed-in");

        // Reset semua baris terlebih dahulu
        allRows.forEach((r) => r.classList.remove("zoomed-in", "zoomed-out"));

        // Jika baris yang diklik belum di-zoom, terapkan efeknya
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

    // Tambahkan event listener setelah tabel dirender, khusus untuk tabel kompetensi
    if (key === "kompetensi") {
      document
        .querySelectorAll("#table-kompetensi .kompetensi-row")
        .forEach((rowElement) => {
          rowElement.addEventListener("click", () => {
            const nik = rowElement.dataset.nik;
            // Ambil data lengkap dari cache asli (bukan yang sudah difilter) untuk NIK ini
            const allKompetensiData =
              sheetDataCache[SHEET_SOURCES.kompetensi.sheet] || [];

            const personDetails = {};
            const personCompetencies = [];

            allKompetensiData
              .filter((item) => item.NIK === nik)
              .forEach((item) => {
                // Ambil detail dasar (NIK, Nama, Dept, Jabatan) hanya dari baris pertama yang cocok
                if (Object.keys(personDetails).length === 0) {
                  personDetails.NIK = item.NIK;
                  personDetails.NAMA = item.NAMA;
                  personDetails.DEPT = item.DEPT;
                  personDetails.JABATAN = item.JABATAN;
                }
                // Tambahkan setiap kompetensi dan statusnya ke daftar kompetensi individu
                if (item.KOMPETENSI || item.STATUS) {
                  personCompetencies.push({
                    KOMPETENSI: item.KOMPETENSI,
                    STATUS: item.STATUS,
                  });
                }
              });

            // Tampilkan modal dengan detail individu dan daftar kompetensinya
            if (Object.keys(personDetails).length > 0) {
              showModal(
                { person: personDetails, competencies: personCompetencies },
                "kompetensi"
              );
            } else {
              console.warn(
                `Data lengkap untuk NIK ${nik} tidak ditemukan di cache.`
              );
            }
          });
        });
    }
  }

  // --- FUNGSI-FUNGSI BARU UNTUK DASHBOARD ---

  function renderDashboardKPIs(monitoringData, kompetensiData) {
    const kpiContainer = document.getElementById("kpi-container");
    if (!kpiContainer) return;

    // Hitung jumlah manpower unik yang sudah terlatih dari data kompetensi
    // Menggunakan (kompetensiData || []) untuk mencegah error jika data tidak tersedia
    const trainedManpowerNiks = new Set(
      (kompetensiData || [])
        .filter((item) => {
          const status = (item.STATUS || "").toLowerCase();
          // Asumsikan 'lulus' atau 'approved' menandakan sudah terlatih
          return status === "lulus" || status === "approved";
        })
        .map((item) => item.NIK)
        .filter(Boolean) // Hapus NIK yang null atau undefined
    );
    const totalDone = trainedManpowerNiks.size;

    const totalNeedTraining = (monitoringData || []).reduce(
      (sum, item) => sum + (parseInt(item["NEED TRAINING"], 10) || 0),
      0
    );
    const totalKompetensi = (kompetensiData || []).length;

    const kpis = [
      { title: "Total Kompetensi Tercatat", value: totalKompetensi },
      { title: "Total Manpower Terlatih", value: totalDone },
      { title: "Total Kebutuhan Pelatihan", value: totalNeedTraining },
    ];

    kpiContainer.innerHTML = kpis
      .map(
        (kpi) => `
            <div class="kpi-card">
                <div class="kpi-title">${kpi.title}</div>
                <div class="kpi-value">${kpi.value.toLocaleString(
                  "id-ID"
                )}</div>
            </div>
        `
      )
      .join("");
  }

  function createOverallProgressChart(monitoringData, kompetensiData) {
    const canvas = document.getElementById("overallProgressChart");
    if (!canvas) return;

    // Hitung jumlah manpower unik yang sudah terlatih dari data kompetensi
    const trainedManpowerNiks = new Set(
      (kompetensiData || [])
        .filter((item) => {
          const status = (item.STATUS || "").toLowerCase();
          // Asumsikan 'lulus' atau 'approved' menandakan sudah terlatih
          return status === "lulus" || status === "approved";
        })
        .map((item) => item.NIK)
        .filter(Boolean) // Hapus NIK yang null atau undefined
    );
    const totalDone = trainedManpowerNiks.size;

    const totalNeedTraining = (monitoringData || []).reduce(
      (sum, item) => sum + (parseInt(item["NEED TRAINING"], 10) || 0),
      0
    );

    // Hancurkan chart lama jika ada untuk mencegah duplikasi dan error
    if (window.myOverallProgressChart instanceof Chart) {
      window.myOverallProgressChart.destroy();
    }

    window.myOverallProgressChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Sudah Dilatih", "Perlu Pelatihan"],
        datasets: [
          {
            data: [totalDone, totalNeedTraining],
            backgroundColor: [
              "rgba(75, 192, 192, 0.8)",
              "rgba(255, 159, 64, 0.8)",
            ],
            borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 159, 64, 1)"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          datalabels: {
            color: "#fff",
            font: { weight: "bold" },
            formatter: (value, ctx) => {
              const total = ctx.chart.data.datasets[0].data.reduce(
                (a, b) => a + b,
                0
              );
              const percentage = ((value / total) * 100).toFixed(1) + "%";
              return percentage;
            },
          },
        },
      },
    });
  }

  function createTopNeedTrainingChart(monitoringData) {
    const canvas = document.getElementById("topNeedTrainingChart");
    if (!canvas) return;

    // Menggunakan (monitoringData || []) untuk mencegah error jika data tidak tersedia
    const sortedData = [...(monitoringData || [])]
      .sort(
        (a, b) =>
          (parseInt(b["NEED TRAINING"], 10) || 0) -
          (parseInt(a["NEED TRAINING"], 10) || 0)
      )
      .slice(0, 5); // Ambil 5 teratas

    const labels = sortedData.map((d) => d["INTERNAL TRAINING"]);
    const data = sortedData.map((d) => parseInt(d["NEED TRAINING"], 10) || 0);

    // Hancurkan chart lama jika ada
    if (window.myTopNeedTrainingChart instanceof Chart) {
      window.myTopNeedTrainingChart.destroy();
    }

    window.myTopNeedTrainingChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Jumlah Manpower",
            data: data,
            backgroundColor: "rgba(255, 99, 132, 0.7)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: "y", // Membuat grafik menjadi horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: "end",
            align: "end",
            color: "#444",
            font: { weight: "bold" },
          },
        },
        scales: {
          x: { beginAtZero: true },
        },
      },
    });
  }

  /**
   * Membuat grafik batang interaktif untuk sebaran kompetensi POP, POM, dan POU.
   * @param {Array<Object>} kompetensiData - Data dari sheet kompetensi.
   */
  function createPOChart(kompetensiData) {
    const poCanvas = document.getElementById("popPomPouChart");
    if (!poCanvas) return;

    const poCounts = { POP: 0, POM: 0, POU: 0 };

    // Logika penghitungan yang lebih akurat: menghitung setiap sertifikasi yang dimiliki.
    // Menggunakan (kompetensiData || []) untuk mencegah error
    (kompetensiData || []).forEach((item) => {
      const kompetensi = item.KOMPETENSI ? item.KOMPETENSI.toUpperCase() : "";
      if (kompetensi.includes("POP")) poCounts["POP"]++;
      if (kompetensi.includes("POM")) poCounts["POM"]++;
      if (kompetensi.includes("POU")) poCounts["POU"]++;
    });

    const chartData = {
      labels: Object.keys(poCounts),
      datasets: [
        {
          label: "Jumlah Manpower per Kompetensi",
          data: Object.values(poCounts),
          backgroundColor: [
            "rgba(255, 99, 132, 0.7)", // Merah untuk POP
            "rgba(54, 162, 235, 0.7)", // Biru untuk POM
            "rgba(255, 206, 86, 0.7)", // Kuning untuk POU
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };

    // Hancurkan chart lama jika ada untuk mencegah duplikasi
    if (window.myPOChart instanceof Chart) {
      window.myPOChart.destroy();
    }

    // Fungsi yang akan dijalankan saat bar di grafik diklik
    const handleChartClick = (event, elements, chart) => {
      if (elements.length === 0) return; // Keluar jika klik tidak mengenai bar

      const elementIndex = elements[0].index;
      const clickedLabel = chart.data.labels[elementIndex]; // Mendapatkan label yang diklik (misal: 'POP')

      // Filter data asli untuk menemukan nama yang cocok dengan kompetensi yang diklik
      const matchingManpower = kompetensiData
        .filter((item) => {
          const kompetensi = item.KOMPETENSI
            ? item.KOMPETENSI.toUpperCase()
            : "";
          return kompetensi.includes(clickedLabel);
        })
        .map((item) => item.NAMA); // Ambil namanya saja

      // Dapatkan elemen-elemen modal
      const modal = document.getElementById("chart-drilldown-modal");
      const modalTitle = document.getElementById("drilldown-modal-title");
      const modalContent = document.getElementById("drilldown-modal-content");

      if (!modal || !modalTitle || !modalContent) {
        console.error("Elemen modal drilldown tidak ditemukan!");
        return;
      }

      // Isi modal dengan data dan tampilkan
      modalTitle.textContent = `Daftar Manpower dengan Kompetensi ${clickedLabel}`;
      if (matchingManpower.length > 0) {
        modalContent.innerHTML = `<ul class="competency-list">${matchingManpower
          .map((nama) => `<li>${nama}</li>`)
          .join("")}</ul>`;
      } else {
        modalContent.innerHTML =
          "<p>Tidak ada data manpower yang ditemukan untuk kompetensi ini.</p>";
      }

      modal.classList.remove("hidden");
    };

    // Buat chart baru dengan opsi interaktif
    window.myPOChart = new Chart(poCanvas, {
      type: "bar",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: handleChartClick,
        onHover: (event, chartElement) => {
          event.native.target.style.cursor = chartElement[0]
            ? "pointer"
            : "default";
        },
        plugins: {
          title: {
            display: true,
            text: "Grafik Sebaran Kompetensi POP, POM, POU",
            font: { size: 18 },
            padding: { top: 10, bottom: 20 },
          },
          legend: { display: false },
          datalabels: {
            anchor: "end",
            align: "top",
            formatter: (value) => (value > 0 ? value : ""),
            color: "#444",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Jumlah Manpower" },
          },
        },
      },
    });
  }

  /**
   * Konfigurasi untuk setiap tab, mendefinisikan sumber data dan fungsi inisialisasi.
   * Ini menggantikan blok switch-case yang besar di loadTabData.
   */
  const TAB_CONFIG = {
    calendar: {
      source: SHEET_SOURCES.jadwal_training,
      init: (data) => {
        allEvents = data.map((ev) => ({
          ...ev,
          tanggal_mulai: formatTanggal(ev.tanggal_mulai),
          tanggal_selesai: formatTanggal(ev.tanggal_selesai),
        }));
        initFilters(allEvents);
        applyFilters();
      },
    },
    pendaftaran_training: {
      source: SHEET_SOURCES.pendaftaran_training,
      init: () => initPendaftaranFilters(),
    },
    monitoring_pelatihan: {
      source: SHEET_SOURCES.monitoring_pelatihan,
      init: async (data) => {
        // 1. Jadikan fungsi ini 'async' untuk menggunakan 'await'
        // 2. Ambil data kompetensi secara terpisah
        const kompetensiData = await fetchAndCacheSheet(
          SHEET_SOURCES.kompetensi.id,
          SHEET_SOURCES.kompetensi.sheet,
          "kompetensi"
        );

        // 3. Panggil semua fungsi rendering untuk dashboard
        if (data && kompetensiData) {
          renderDashboardKPIs(data, kompetensiData);
          createOverallProgressChart(data, kompetensiData);
          createTopNeedTrainingChart(data);
          createPOChart(kompetensiData);
        }
      },
    },
    kompetensi: {
      source: SHEET_SOURCES.kompetensi,
      init: () => initKompetensiFilters(),
    },
  };

  /**
   * Memuat data untuk tab yang dipilih berdasarkan TAB_CONFIG.
   * @param {string} tabId - ID dari tab yang akan dimuat.
   */
  async function loadTabData(tabId) {
    const config = TAB_CONFIG[tabId];
    if (!config) {
      console.warn(`Tidak ada konfigurasi pemuatan data untuk tab: ${tabId}`);
      return;
    }

    const data = await fetchAndCacheSheet(
      config.source.id,
      config.source.sheet,
      tabId
    );
    config.init(data); // Panggil fungsi inisialisasi dengan data yang diambil
  }

  /**
   * Mengatur semua event listener untuk elemen interaktif di halaman.
   */
  function setupEventListeners() {
    // Penangan Modal Utama
    if (closeModal) {
      closeModal.addEventListener("click", () => {
        if (modal) modal.style.display = "none";
      });
    }
    if (modal) {
      window.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
      });
    }

    // Penangan Modal Drilldown Grafik
    if (closeDrilldownBtn && drilldownModal) {
      closeDrilldownBtn.addEventListener("click", () => {
        drilldownModal.classList.add("hidden");
      });
    }

    // Penangan Tombol Tab
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetTabId = button.dataset.tab;
        if (button.classList.contains("active")) return;

        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        button.classList.add("active");
        const targetTabContent = document.getElementById(targetTabId);
        if (targetTabContent) targetTabContent.classList.add("active");

        loadTabData(targetTabId);
      });
    });

    // Penangan Tombol Ekspor
    document.body.addEventListener("click", exportHandler);

    // Penangan Navigasi Kalender
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        applyFilters();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        applyFilters();
      });
    }
  }

  /**
   * Menangani logika inisialisasi halaman, seperti splash screen dan pemuatan data awal.
   */
  function init() {
    // Pemuatan data awal untuk tab yang aktif
    const initialActiveTabButton = document.querySelector(".tab-btn.active");
    if (initialActiveTabButton) {
      loadTabData(initialActiveTabButton.dataset.tab);
    } else {
      const firstTabButton = document.querySelector(".tab-btn");
      if (firstTabButton) {
        firstTabButton.click(); // Memicu klik untuk mengaktifkan dan memuat data
      }
    }

    // Inisialisasi tampilan tanggal dan waktu saat ini
    if (currentDateTimeElement) {
      const updateDateTime = () => {
        const now = new Date();
        currentDateTimeElement.textContent = now.toLocaleString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      };
      updateDateTime();
      setInterval(updateDateTime, 1000);
    }
  }

  /**
   * Menangani klik pada tombol ekspor di halaman pelatihan.
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

    // Dapatkan tanggal dari filter yang relevan
    const startDateInput = document.getElementById(
      `startDate${
        key.charAt(0).toUpperCase() +
        key.slice(1).replace("_training", "Pendaftaran")
      }`
    );
    const endDateInput = document.getElementById(
      `endDate${
        key.charAt(0).toUpperCase() +
        key.slice(1).replace("_training", "Pendaftaran")
      }`
    );

    const startDate = startDateInput ? startDateInput.value : null;
    const endDate = endDateInput ? endDateInput.value : null;

    let datePart = new Date().toISOString().slice(0, 10);
    if (startDate && endDate) {
      datePart = `${startDate}_to_${endDate}`;
    } else if (startDate) {
      datePart = `from_${startDate}`;
    }

    const filename = `Export_${key}_${datePart}`;
    exportToExcel(dataToExport, filename);
  }

  // Atur event listener segera
  setupEventListeners();
  // Tunda inisialisasi data sampai UI siap
  document.addEventListener("appReady", init);
});
