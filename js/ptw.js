window.addEventListener("DOMContentLoaded", () => {
  // --- KONFIGURASI DAN STATE ---

  // 1. KONFIGURASI SUMBER DATA GOOGLE SHEET
  const SHEET_SOURCES = {
    permits: {
      id: "13xyGk0h4u5zfCmZ0fPgDJAbY8j2RdaIKmnxc6vo8JfU",
      sheet: "database",
    },
  };

  // PENTING: Ganti placeholder di bawah dengan URL Web App dari Google Apps Script Anda.
  // Ini adalah URL lengkap yang Anda dapatkan setelah men-deploy script, bukan hanya ID deployment.
  // Contoh: https://script.google.com/macros/s/ABCDEFG.../exec
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxedz0NzpPg5yt_2hHGdkbGZMblTQoSjxpTGTwn7Ay0wCgvR_ELHZ1pe7ox6gpho4Ib/exec";

  // 2. KONFIGURASI KOLOM YANG AKAN DITAMPILKAN DI TABEL
  const kolomTampilkan = {
    permits: {
      id: "ID",
      title: "Judul",
      category: "Kategori",
      status: "Status",
    },
  };

  // 3. STATE APLIKASI
  const sheetDataCache = {}; // Cache untuk menyimpan data yang sudah diambil
  let currentFilteredData = {}; // Menyimpan data yang sudah difilter untuk diekspor
  let currentSort = {
    column: "id",
    direction: "asc",
  };
  let currentFilters = {
    status: "all",
    search: "",
  };
  let currentView = "list";
  let selectedPermit = null;
  let masterPermitList = []; // Variabel baru untuk menyimpan daftar izin yang sudah diambil
  let currentMap = null;

  // --- ELEMEN DOM ---
  const contentArea = document.getElementById("app");
  const permitListContainer = document.getElementById("permit-list-container");
  const permitTableHead = document.getElementById("permit-table-head");
  const permitTableBody = document.getElementById("permit-table-body");
  const resultCountEl = document.getElementById("result-count");
  const offlineNoticeContainer = document.getElementById(
    "offline-notice-container"
  );
  const searchFilter = document.getElementById("search-filter");
  const statusFilter = document.getElementById("status-filter");

  const messageModalEl = document.getElementById("message-modal");
  const modalMessageEl = document.getElementById("modal-message");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const loadingSpinner = document.getElementById("loading-spinner");
  const createPermitModal = document.getElementById("create-permit-modal");
  const createPermitForm = document.getElementById("create-permit-form");
  const logoutButton = document.getElementById("logout-button");

  // --- FUNGSI UTAMA ---

  const showMessage = (msg) => {
    modalMessageEl.textContent = msg;
    messageModalEl.classList.remove("hidden");
    messageModalEl.classList.add("flex");
  };
  const closeMessageModal = () => {
    messageModalEl.classList.add("hidden");
    messageModalEl.classList.remove("flex");
  };
  // Menambahkan pengecekan untuk memastikan elemen ada sebelum menambahkan event listener.
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeMessageModal);
  }

  const getStatusClass = (status) => {
    const statusStr = String(status || "")
      .trim()
      .toLowerCase();
    // Mengembalikan modifier class warna yang sesuai dengan yang ada di style.css
    const classMap = {
      pending: "hold", // Kuning
      approved: "approved", // Hijau
      "in progress": "blue", // Biru
      completed: "gray", // Abu-abu
      rejected: "red", // Merah
    };
    return classMap[statusStr] || "gray"; // Default ke abu-abu
  };

  // Fungsi baru untuk mengirim pembaruan ke Google Apps Script
  async function updatePermitStatus(permitId, newStatus) {
    if (SCRIPT_URL.includes("GANTI_DENGAN_URL")) {
      showMessage(
        "URL Google Apps Script belum dikonfigurasi. Silakan perbarui variabel SCRIPT_URL di ptw.js."
      );
      return;
    }

    loadingSpinner.classList.add("show"); // Tampilkan spinner

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "cors", // Penting untuk cross-origin request
        headers: {
          "Content-Type": "text/plain;charset=utf-8", // Apps Script seringkali lebih baik dengan text/plain
        },
        body: JSON.stringify({
          action: "updateStatus",
          permitId: permitId,
          newStatus: newStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage(result.message);
        // Perbarui data di cache lokal (masterPermitList)
        const permitToUpdate = masterPermitList.find((p) => p.id == permitId);
        if (permitToUpdate) {
          permitToUpdate.status = newStatus;
        }
        // Render ulang detail view untuk menampilkan status baru
        renderPermitDetail(permitToUpdate);
      } else {
        throw new Error(
          result.message || "Terjadi kesalahan yang tidak diketahui."
        );
      }
    } catch (error) {
      console.error("Error saat memperbarui status:", error);
      let errorMessage = `Gagal memperbarui status: ${error.message}`;
      // Memberikan petunjuk yang lebih spesifik jika error terkait CORS
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        errorMessage +=
          '\n\nIni seringkali disebabkan oleh masalah CORS. Pastikan Google Apps Script Anda sudah di-deploy ulang dengan versi baru dan akses diatur ke "Anyone".';
      }
      showMessage(errorMessage);
    } finally {
      loadingSpinner.classList.remove("show"); // Sembunyikan spinner
    }
  }

  async function createPermit(permitData) {
    if (SCRIPT_URL.includes("GANTI_DENGAN_URL")) {
      showMessage("URL Google Apps Script belum dikonfigurasi.");
      return;
    }

    loadingSpinner.classList.add("show");

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "createPermit",
          data: permitData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage(result.message);
        // Tutup modal dan segarkan daftar izin
        createPermitModal.classList.add("hidden");
        createPermitForm.reset(); // Kosongkan form
        currentView = "list";
        renderApp(); // Render ulang untuk menampilkan data baru
      } else {
        throw new Error(
          result.message ||
            "Terjadi kesalahan yang tidak diketahui saat membuat izin."
        );
      }
    } catch (error) {
      console.error("Error saat membuat izin:", error);
      let errorMessage = `Gagal membuat izin baru: ${error.message}`;
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        errorMessage +=
          "\n\nPastikan Google Apps Script Anda sudah di-deploy ulang dengan benar.";
      }
      showMessage(errorMessage);
    } finally {
      loadingSpinner.classList.remove("show");
    }
  }

  /**
   * Fetches data from a Google Sheet with robust retry and offline caching.
   * @param {string} id - The Google Sheet ID.
   * @param {string} sheet - The name of the sheet.
   * @param {number} maxRetries - Maximum number of fetch attempts.
   * @returns {Promise<{data: Array, timestamp: string|null, isOffline: boolean, error: object|null}>} An object with the data and status.
   */

  async function fetchSheet(id, sheet, maxRetries = 3) {
    // 1. Try to fetch from the network with retries
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(`https://opensheet.elk.sh/${id}/${sheet}`);
        if (res.status === 400)
          throw new Error(
            `Gagal mengambil data (Error 400). Pastikan Google Sheet Anda sudah dibagikan dengan "Anyone with the link".`
          );
        if (!res.ok)
          throw new Error(
            `Gagal mengambil data dari sheet: ${sheet} (Status: ${res.status})`
          );

        const data = await res.json();
        const timestamp = new Date().toISOString();

        // Cache in memory and save to localStorage for offline use
        sheetDataCache[sheet] = { data, timestamp };
        try {
          localStorage.setItem(
            `ptw_offline_${sheet}`,
            JSON.stringify({ data, timestamp })
          );
        } catch (e) {
          console.warn("Gagal menyimpan data offline:", e);
        }
        console.log(
          `Data berhasil diambil dari jaringan untuk sheet: ${sheet}`
        );
        return { data, timestamp, isOffline: false, error: null };
      } catch (err) {
        console.error(
          `Error fetching sheet ${sheet} (attempt ${attempt + 1}):`,
          err
        );
        if (attempt < maxRetries - 1) {
          console.log(`Mencoba lagi setelah 2 detik...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          // Last attempt failed, break out to try offline mode
          break;
        }
      }
    }
    // 2. If network fails, try to load from localStorage
    try {
      const offlineDataJSON = localStorage.getItem(`ptw_offline_${sheet}`);
      if (offlineDataJSON) {
        const { data, timestamp } = JSON.parse(offlineDataJSON);
        console.log(`Menampilkan data offline untuk sheet: ${sheet}`);
        return { data, timestamp, isOffline: true, error: null };
      }
    } catch (e) {
      console.warn("Gagal membaca data offline:", e);
    }

    // 3. If both network and offline fail, return an error state
    const errorMessage = `Gagal total mengambil data untuk sheet: ${sheet}. Periksa koneksi internet dan konfigurasi sheet.`;
    showMessage(errorMessage);
    return {
      data: [],
      timestamp: null,
      isOffline: false,
      error: { message: errorMessage, sheetId: id },
    };
  }

  function applyFiltersAndSort(permits) {
    // 1. Apply Filters
    const filtered = permits.filter((p) => {
      const searchLower = currentFilters.search.toLowerCase();
      const statusMatch =
        currentFilters.status === "all" ||
        (p.status &&
          p.status.toLowerCase() === currentFilters.status.toLowerCase());
      const searchMatch =
        !currentFilters.search ||
        (p.title && p.title.toLowerCase().includes(searchLower)) ||
        (p.id && p.id.toLowerCase().includes(searchLower)) ||
        (p.category && p.category.toLowerCase().includes(searchLower));
      return statusMatch && searchMatch;
    });

    // 2. Apply Sorting
    filtered.sort((a, b) => {
      const valA = a[currentSort.column] || "";
      const valB = b[currentSort.column] || "";

      let comparison = 0;
      if (valA > valB) {
        comparison = 1;
      } else if (valA < valB) {
        comparison = -1;
      }

      return currentSort.direction === "desc" ? comparison * -1 : comparison;
    });

    return filtered;
  }

  function handleSort(column) {
    const isAsc =
      currentSort.column === column && currentSort.direction === "asc";
    currentSort.column = column;
    currentSort.direction = isAsc ? "desc" : "asc";
    renderPermitList(); // Re-render without fetching
  }

  // --- FUNGSI RENDER UI ---

  async function renderPermitList() {
    // Pastikan kontainer daftar terlihat dan hapus tampilan detail jika ada
    if (permitListContainer) permitListContainer.style.display = "block";
    const detailWrapper = contentArea.querySelector(
      ".ptw-detail-container-wrapper"
    );
    if (detailWrapper) detailWrapper.remove();

    const { id, sheet } = SHEET_SOURCES.permits;

    // Langkah 1: Tampilkan skeleton loader terlebih dahulu
    if (!masterPermitList.length && permitTableBody) {
      const colspan = Object.keys(kolomTampilkan.permits).length + 1;
      permitTableBody.innerHTML = `
                    <tr>
                        <td colspan="${colspan}" class="table-body-cell text-center">
                            <div class="skeleton-wrapper p-4">
                                <div class="skeleton skeleton-row w-3/4 mx-auto"></div>
                                <div class="skeleton skeleton-row w-full"></div>
                                <div class="skeleton skeleton-row w-full"></div>
                            </div>
                        </td>
                    </tr>
                `;
    }

    // Add Export to CSV button above the table if not already present
    if (!document.getElementById("export-csv-btn")) {
      const tableContainer = permitTableBody.parentElement;
      if (tableContainer) {
        const exportBtn = document.createElement("button");
        exportBtn.id = "export-csv-btn";
        exportBtn.textContent = "Export to CSV";
        exportBtn.className = "button-base button-primary mb-4";
        exportBtn.addEventListener("click", () => {
          exportPermitsToCSV(masterPermitList);
        });
        tableContainer.parentElement.insertBefore(exportBtn, tableContainer);
      }
    }

    const {
      data: permitsData,
      timestamp: lastUpdateTimestamp,
      isOffline,
      error,
    } = await fetchSheet(id, sheet);

    if (error) {
      if (permitListContainer) permitListContainer.style.display = "none";
      contentArea.innerHTML = `<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg max-w-3xl mx-auto shadow-md"><h3 class="font-bold text-lg mb-2">Gagal Memuat Data</h3><p>${error.message}</p></div>`;
      return;
    }

    if (permitsData) {
      masterPermitList = permitsData; // Simpan data ke variabel master untuk akses cepat
    }

    const processedPermits = applyFiltersAndSort(masterPermitList);

    // Isi filter status (hanya sekali)
    if (statusFilter && statusFilter.options.length === 0) {
      const statusOptions = [
        "All",
        "Pending",
        "Approved",
        "In Progress",
        "Completed",
        "Rejected",
      ];
      statusFilter.innerHTML = statusOptions
        .map((opt) => `<option value="${opt.toLowerCase()}">${opt}</option>`)
        .join("");
      statusFilter.value = currentFilters.status;
    }

    // Atur nilai filter pencarian
    if (searchFilter) {
      searchFilter.value = currentFilters.search;
    }

    // Render header tabel
    const headersConfig = kolomTampilkan.permits;
    const tableHeadersHTML = `<tr>${Object.keys(headersConfig)
      .map((key) => {
        const headerText = headersConfig[key];
        const isSorted = currentSort.column === key;
        const sortedClass = isSorted ? "sorted" : "";
        const sortIcon = isSorted
          ? currentSort.direction === "asc"
            ? "▲"
            : "▼"
          : "↕";
        return `<th class="table-header-cell sortable ${sortedClass}" data-column="${key}">
                        ${headerText}
                        <span class="sort-icon">${sortIcon}</span>
                    </th>`;
      })
      .join("")} <th class="table-header-cell text-right">Aksi</th></tr>`;
    if (permitTableHead) permitTableHead.innerHTML = tableHeadersHTML;

    // Render baris tabel
    const tableRowsHTML =
      processedPermits.length === 0
        ? `<tr><td colspan="${
            Object.keys(headersConfig).length + 1
          }" class="table-body-cell text-center">Tidak ada izin kerja yang cocok dengan filter Anda.</td></tr>`
        : processedPermits
            .map(
              (p) => `
                <tr class="table-body-row">
                    ${Object.keys(headersConfig)
                      .map((key) => {
                        let cellContent = p[key] || "";
                        if (key === "status") {
                          return `<td class="table-body-cell"><span class="badge ${getStatusClass(
                            cellContent
                          )}">${cellContent}</span></td>`;
                        }
                        return `<td class="table-body-cell">${cellContent}</td>`;
                      })
                      .join("")}
                    <td class="table-body-cell text-right">
                        <button class="table-action-button" data-id='${
                          p.id
                        }'>Lihat Detail</button>
                    </td>
                </tr>
            `
            )
            .join("");
    if (permitTableBody) permitTableBody.innerHTML = tableRowsHTML;

    // Perbarui jumlah hasil
    if (resultCountEl) {
      resultCountEl.textContent = `Menampilkan ${processedPermits.length} dari ${masterPermitList.length} total izin.`;
    }

    // Tampilkan notifikasi offline jika perlu
    if (offlineNoticeContainer) {
      offlineNoticeContainer.innerHTML = isOffline
        ? `
            <div class="offline-notice">
                Anda melihat data offline. Terakhir diperbarui pada: 
                <strong>${new Date(lastUpdateTimestamp).toLocaleString(
                  "id-ID",
                  { dateStyle: "full", timeStyle: "short" }
                )}</strong>
            </div>
            `
        : "";
    }

    // Picu transisi fade-in setelah konten baru dimasukkan ke DOM
    if (permitListContainer) {
      // setTimeout kecil memberikan browser waktu untuk merender elemen dengan opacity 0 sebelum memulai transisi.
      setTimeout(() => {
        permitListContainer.classList.add("visible");
      }, 10);
    }

    lucide.createIcons();
  }

  function renderPermitDetail(permit) {
    // Sembunyikan kontainer daftar
    if (permitListContainer) permitListContainer.style.display = "none";

    if (!permit) {
      contentArea.innerHTML = `<p class="text-center text-red-600">Izin tidak ditemukan.</p>`;
      return;
    }

    // Hapus detail view sebelumnya jika ada
    const existingDetail = contentArea.querySelector(
      ".ptw-detail-container-wrapper"
    );
    if (existingDetail) existingDetail.remove();

    // Ganti blok "Fitur Read-Only" dengan UI untuk update
    const statusOptions = [
      "Pending",
      "Approved",
      "In Progress",
      "Completed",
      "Rejected",
    ];
    const statusDropdownHtml = statusOptions
      .map(
        (opt) =>
          `<option value="${opt}" ${
            permit.status === opt ? "selected" : ""
          }>${opt}</option>`
      )
      .join("");
    if (currentMap) {
      currentMap.remove();
      currentMap = null;
    }

    // Buat wrapper untuk detail view
    const detailWrapper = document.createElement("div");
    detailWrapper.className = "ptw-detail-container-wrapper";
    detailWrapper.innerHTML = `
            <div class="ptw-detail-container max-w-4xl mx-auto w-full">
                <button id="back-to-list-btn" class="button-back mb-4">
                    <svg class="lucide lucide-arrow-left mr-2" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                    Kembali ke Daftar Izin
                </button>
                
                <h2 class="text-3xl font-bold text-gray-800 mb-2">${
                  permit.title
                }</h2>
                <p class="text-sm text-gray-500 mb-6">ID Izin: ${
                  permit.id
                } | Kategori: ${permit.category || "N/A"}</p>

                <div class="grid md:grid-cols-2 gap-6 mb-6">
                    <div class="space-y-4">
                        <div>
                            <h3 class="font-semibold text-gray-700">Status Saat Ini</h3>
                            <span class="mt-1 badge ${getStatusClass(
                              permit.status
                            )}">${permit.status}</span>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-700">Lokasi</h3>
                            <p class="text-gray-600">${permit.location}</p>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-700">Durasi</h3>
                            <p class="text-gray-600">${permit.startDate} s/d ${
      permit.endDate
    }</p>
                        </div>
                        
                        <!-- UI untuk Update Status -->
                        <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                            <h3 class="font-semibold text-gray-700 mb-2">Perbarui Status Izin</h3>
                            <div class="flex items-center space-x-3">
                                <select id="status-select" class="form-select flex-grow">
                                    ${statusDropdownHtml}
                                </select>
                                <button id="update-status-btn" data-id="${
                                  permit.id
                                }" class="button-primary">
                                    <svg class="lucide lucide-save mr-2" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                    Simpan
                                </button>
                                </div>
                            </div>

                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-700 mb-2">Lokasi pada Peta</h3>
                        <div id="map-container"></div>
                    </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-md">
                    <h3 class="font-semibold text-gray-700 mb-2">Deskripsi Pekerjaan</h3>
                    <p class="text-gray-600 text-sm">${permit.description}</p>
                </div>
            </div>
        `;
    // Tambahkan wrapper ke content area
    contentArea.appendChild(detailWrapper);

    const locationParts = (permit.location || "")
      .split(",")
      .map((part) => parseFloat(part.trim()));
    if (
      locationParts.length === 2 &&
      !isNaN(locationParts[0]) &&
      !isNaN(locationParts[1])
    ) {
      const [lat, lon] = locationParts;
      const mapContainer = document.getElementById("map-container");
      if (mapContainer) {
        currentMap = L.map(mapContainer).setView([lat, lon], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(currentMap);
        L.marker([lat, lon])
          .addTo(currentMap)
          .bindPopup(`<b>${permit.title}</b>`)
          .openPopup();

        setTimeout(() => currentMap.invalidateSize(), 100);
      }
    } else {
      document.getElementById("map-container").innerHTML =
        '<p class="text-gray-500 text-center p-8">Format lokasi tidak valid untuk peta.</p>';
    }
    lucide.createIcons();
  }

  // --- KONTROL APLIKASI ---
  function renderApp() {
    switch (currentView) {
      case "detail":
        renderPermitDetail(selectedPermit);
        break;
      case "list":
      default:
        renderPermitList();
        break;
    }
  }

  // --- EVENT LISTENERS ---

  contentArea.addEventListener("click", (event) => {
    const target = event.target;
    if (target.matches(".table-action-button")) {
      const permitId = target.dataset.id;
      // Tidak perlu fetch ulang, langsung gunakan masterPermitList untuk performa lebih baik
      if (!masterPermitList || masterPermitList.length === 0) return;
      selectedPermit = masterPermitList.find((p) => p.id == permitId);
      if (selectedPermit) {
        currentView = "detail";
        renderApp();
      }
    }
    if (target.closest("#back-to-list-btn")) {
      currentView = "list";
      renderApp();
    }

    // Tambahkan listener untuk tombol update status
    if (target.closest("#update-status-btn")) {
      const button = target.closest("#update-status-btn");
      const permitId = button.dataset.id;
      const newStatus = document.getElementById("status-select").value;
      updatePermitStatus(permitId, newStatus);
    }
  });

  // Event listeners untuk filter dan sort (didelegasikan ke contentArea)
  if (searchFilter) {
    searchFilter.addEventListener("input", (e) => {
      currentFilters.search = e.target.value;
      renderPermitList();
    });
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      currentFilters.status = e.target.value;
      renderPermitList();
    });
  }
  contentArea.addEventListener("click", (e) => {
    const sortableHeader = e.target.closest(".sortable");
    if (sortableHeader) {
      handleSort(sortableHeader.dataset.column);
    }
  });

  const createPermitBtn = document.getElementById("create-permit-btn");
  if (createPermitBtn) {
    createPermitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (createPermitModal) {
        createPermitModal.classList.remove("hidden");
      } else {
        console.error(
          'Elemen modal "create-permit-modal" tidak ditemukan di HTML.'
        );
        showMessage("Gagal membuka form. Elemen modal tidak ditemukan.");
      }
    });
  }

  // Listener untuk menutup modal
  const closeModalBtnForCreate = document.getElementById(
    "close-create-modal-btn"
  );
  if (closeModalBtnForCreate) {
    closeModalBtnForCreate.addEventListener("click", () => {
      if (createPermitModal) {
        createPermitModal.classList.add("hidden"); // Sembunyikan modal
      }
    });
  }

  const viewAllPermitsBtn = document.getElementById("view-all-permits-btn");
  if (viewAllPermitsBtn) {
    viewAllPermitsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      currentView = "list";
      renderApp();
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("userRole");
      window.location.href = "index.html";
    });
  }

  // Listener untuk form pembuatan izin baru
  if (createPermitForm) {
    createPermitForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(createPermitForm);
      const permitData = {
        title: formData.get("title"),
        category: formData.get("category"),
        location: formData.get("location"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        description: formData.get("description"),
      };
      createPermit(permitData);
    });
  }

  // --- INISIALISASI ---
  renderApp();
});
