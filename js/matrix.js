/**
 * Fetches and parses data from a specified Google Sheet.
 * @param {string} sheetId The ID of the Google Spreadsheet.
 * @param {string} sheetName The name of the sheet.
 * @param {string} [range=""] Optional A1 notation range.
 * @returns {Promise<object>} A promise that resolves with the data table object.
 * @throws {Error} If fetching or parsing fails.
 */
async function fetchSheetData(sheetId, sheetName, range = "") {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}${
    range ? `&range=${range}` : ""
  }`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Gagal mengambil data dari sheet '${sheetName}' (status: ${response.status})`
    );
  }

  const jsonText = await response.text();
  const jsonMatch = jsonText.match(
    /google\.visualization\.Query\.setResponse\((.*)\)/s
  );

  if (!jsonMatch || !jsonMatch[1]) {
    throw new Error(`Format respons tidak valid dari sheet '${sheetName}'.`);
  }

  const data = JSON.parse(jsonMatch[1]);
  if (!data.table || !data.table.rows) {
    throw new Error(
      `Struktur data tidak valid atau sheet '${sheetName}' kosong.`
    );
  }

  return data.table;
}

// --- LOGIKA UNTUK MATRIX KOMPETENSI ---
(async function loadMatrixData() {
  const SHEET_ID = "1RmNABlAsDGOoxYk5yqZ3SD--LMhMOxLEh2AwPsMV86Q";
  const SHEET_NAME = "EXPORT_WEB";
  const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

  const tableContainer = document.getElementById("table-container-matrix");
  const loader = document.getElementById("loader-matrix");
  const deptFilterEl = document.getElementById("filter-department");
  const sectFilterEl = document.getElementById("filter-section");
  const jabFilterEl = document.getElementById("filter-jabatan");
  const levelFilterEl = document.getElementById("filter-level");
  const zoomInBtn = document.getElementById("zoom-in-matrix");
  const zoomOutBtn = document.getElementById("zoom-out-matrix");
  let currentZoomLevel = 2;
  let competencies = [];

  function applyZoom() {
    tableContainer.className = "";
    tableContainer.classList.add(`zoom-level-${currentZoomLevel}`);
  }

  zoomInBtn.addEventListener("click", () => {
    if (currentZoomLevel < 3) {
      currentZoomLevel++;
      applyZoom();
    }
  });
  zoomOutBtn.addEventListener("click", () => {
    if (currentZoomLevel > 1) {
      currentZoomLevel--;
      applyZoom();
    }
  });

  function applyFilters() {
    const deptFilter = deptFilterEl.value;
    const sectFilter = sectFilterEl.value;
    const jabFilter = jabFilterEl.value;
    const levelFilter = levelFilterEl.value;
    document.querySelectorAll("#matrix-data-table tbody tr").forEach((tr) => {
      const showDept = !deptFilter || tr.dataset.department === deptFilter;
      const showSect = !sectFilter || tr.dataset.section === sectFilter;
      const showJab = !jabFilter || tr.dataset.jabatan === jabFilter;
      const showLevel = !levelFilter || tr.dataset.levels.includes(levelFilter);
      const isVisible = showDept && showSect && showJab && showLevel;
      tr.style.display = isVisible ? "" : "none";
    });
  }

  function renderCompetencyContent(value) {
    const cleanValue = value ? String(value).trim().toUpperCase() : "";
    let icon = "";
    let textColorClass = "";
    switch (cleanValue) {
      case "N5":
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="competency-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`;
        textColorClass = "text-red-900 font-semibold";
        break;
      case "N4":
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="competency-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
        textColorClass = "text-orange-900 font-semibold";
        break;
      case "N3":
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="competency-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
        textColorClass = "text-blue-900 font-semibold";
        break;
      case "N2":
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="competency-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
        textColorClass = "text-green-900 font-semibold";
        break;
      default:
        return "";
    }
    return `<div class="competency-cell">${icon}<span>${cleanValue}</span></div>`;
  }
  function getCompetencyBgClass(value) {
    const cleanValue = value ? String(value).trim().toUpperCase() : "";
    switch (cleanValue) {
      case "N5":
        return "bg-red-200";
      case "N4":
        return "bg-orange-200";
      case "N3":
        return "bg-blue-200";
      case "N2":
        return "bg-green-200";
      default:
        return "";
    }
  }

  try {
    const tableData = await fetchSheetData(SHEET_ID, SHEET_NAME);
    const allRows = tableData.rows;
    if (allRows.length < 1) throw new Error("Data sheet tidak lengkap.");
    const nameRow = allRows[0].c || [];
    competencies = [];
    nameRow.slice(3).forEach((cell, index) => {
      const name = cell ? cell.v : null;
      if (name && String(name).trim() !== "") {
        competencies.push({ name: name, originalIndex: index + 3 });
      }
    });
    const filterData = {};
    const allUniqueSections = new Set();
    const allUniqueJabatans = new Set();
    const dataRows = allRows.slice(1).filter((row) => {
      if (row && row.c && row.c[0] && row.c[0].v) {
        const dept = row.c[0].v;
        const sect = row.c[1] ? row.c[1].v : "N/A";
        const jab = row.c[2] ? row.c[2].v : "N/A";
        allUniqueSections.add(sect);
        allUniqueJabatans.add(jab);
        if (!filterData[dept]) filterData[dept] = {};
        if (!filterData[dept][sect]) filterData[dept][sect] = new Set();
        filterData[dept][sect].add(jab);
        return true;
      }
      return false;
    });
    const populateDropdown = (element, options, defaultLabel) => {
      element.innerHTML = `<option value="">${defaultLabel}</option>`;
      options.forEach((opt) => {
        element.innerHTML += `<option value="${opt}">${opt}</option>`;
      });
    };
    populateDropdown(
      deptFilterEl,
      Object.keys(filterData).sort(),
      "Semua Departemen"
    );
    populateDropdown(
      sectFilterEl,
      [...allUniqueSections].sort(),
      "Semua Section"
    );
    populateDropdown(
      jabFilterEl,
      [...allUniqueJabatans].sort(),
      "Semua Jabatan"
    );
    deptFilterEl.addEventListener("change", () => {
      const selectedDept = deptFilterEl.value;
      if (selectedDept) {
        const sectionsInDept = Object.keys(filterData[selectedDept]).sort();
        populateDropdown(sectFilterEl, sectionsInDept, "Semua Section");
        const jabatansInDept = new Set();
        sectionsInDept.forEach((sect) =>
          filterData[selectedDept][sect].forEach((jab) =>
            jabatansInDept.add(jab)
          )
        );
        populateDropdown(
          jabFilterEl,
          [...jabatansInDept].sort(),
          "Semua Jabatan"
        );
      } else {
        populateDropdown(
          sectFilterEl,
          [...allUniqueSections].sort(),
          "Semua Section"
        );
        populateDropdown(
          jabFilterEl,
          [...allUniqueJabatans].sort(),
          "Semua Jabatan"
        );
      }
      applyFilters();
    });
    sectFilterEl.addEventListener("change", () => {
      const selectedDept = deptFilterEl.value;
      const selectedSect = sectFilterEl.value;
      if (selectedDept && selectedSect) {
        const jabatans = [...filterData[selectedDept][selectedSect]].sort();
        populateDropdown(jabFilterEl, jabatans, "Semua Jabatan");
      } else if (selectedDept) {
        const jabatansInDept = new Set();
        Object.keys(filterData[selectedDept]).forEach((sect) =>
          filterData[selectedDept][sect].forEach((jab) =>
            jabatansInDept.add(jab)
          )
        );
        populateDropdown(
          jabFilterEl,
          [...jabatansInDept].sort(),
          "Semua Jabatan"
        );
      }
      applyFilters();
    });
    jabFilterEl.addEventListener("change", applyFilters);
    levelFilterEl.addEventListener("change", applyFilters);
    const colorPalette = [
      "bg-red-50",
      "bg-yellow-50",
      "bg-green-50",
      "bg-blue-50",
      "bg-indigo-50",
      "bg-purple-50",
      "bg-pink-50",
    ];
    const departmentColors = {};
    let colorIndex = 0;
    Object.keys(filterData)
      .sort()
      .forEach((dept) => {
        departmentColors[dept] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
      });
    let tableHTML =
      '<table id="matrix-data-table" class="min-w-full border-collapse border border-gray-300">';
    tableHTML += '<thead class="bg-gray-100 text-gray-600">';
    tableHTML += "<tr>";
    tableHTML +=
      '<th class="border border-gray-300 font-semibold w-40">DEPARTEMEN</th>';
    tableHTML +=
      '<th class="border border-gray-300 font-semibold w-40">SECTION</th>';
    tableHTML +=
      '<th class="border border-gray-300 font-semibold w-48">JABATAN</th>';
    competencies.forEach((comp) => {
      tableHTML += `<th class="border border-gray-300 header-competency"><div class="vertical-text">${comp.name}</div></th>`;
    });
    tableHTML += "</tr></thead><tbody>";
    dataRows.forEach((row) => {
      const dept = row.c[0] ? row.c[0].v : "";
      const sect = row.c[1] ? row.c[1].v : "N/A";
      const jab = row.c[2] ? row.c[2].v : "N/A";
      const rowColorClass = departmentColors[dept] || "bg-white";
      let rowLevels = new Set();
      competencies.forEach((comp) => {
        const cell = row.c[comp.originalIndex];
        if (cell && cell.v) rowLevels.add(String(cell.v).trim().toUpperCase());
      });
      tableHTML += `<tr data-department="${dept}" data-section="${sect}" data-jabatan="${jab}" data-levels="${[
        ...rowLevels,
      ].join(",")}" class="${rowColorClass}">`;
      tableHTML += `<td class="border border-gray-300 text-left font-medium">${dept}</td>`;
      tableHTML += `<td class="border border-gray-300 text-left">${sect}</td>`;
      tableHTML += `<td class="border border-gray-300 text-left">${jab}</td>`;
      competencies.forEach((comp) => {
        const cell = row.c[comp.originalIndex];
        const cellValue = cell ? cell.v : "";
        const cellBgClass = getCompetencyBgClass(cellValue);
        const cellContent = renderCompetencyContent(cellValue);
        tableHTML += `<td class="border border-gray-300 ${cellBgClass}">${cellContent}</td>`;
      });
      tableHTML += "</tr>";
    });
    tableHTML += "</tbody></table>";
    loader.style.display = "none";
    tableContainer.innerHTML = tableHTML;
    applyZoom();
    applyFilters();
  } catch (error) {
    handleError(error, "Gagal memuat data Matrix.");
    if (loader) loader.style.display = "none";
  }
})();

// --- LOGIKA UNTUK TNA ---
(async function loadTnaData() {
  const SHEET_ID = "1SOFXUDzAZRMqzYvtH9XSxPGDay1Y4SG3qSY5KTZ9YBc";
  const SHEET_NAME = "EXPORT_M.TNA_TO_WEB";
  const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

  const tableContainer = document.getElementById("table-container-tna");
  const loader = document.getElementById("loader-tna");
  const sectFilterEl = document.getElementById("tna-filter-section");
  const jabFilterEl = document.getElementById("tna-filter-jabatan");
  const zoomInBtn = document.getElementById("zoom-in-tna");
  const zoomOutBtn = document.getElementById("zoom-out-tna");
  let currentZoomLevel = 2;
  let headers = [];

  function applyZoom() {
    tableContainer.className = "";
    tableContainer.classList.add(`zoom-level-${currentZoomLevel}`);
  }

  zoomInBtn.addEventListener("click", () => {
    if (currentZoomLevel < 3) {
      currentZoomLevel++;
      applyZoom();
    }
  });
  zoomOutBtn.addEventListener("click", () => {
    if (currentZoomLevel > 1) {
      currentZoomLevel--;
      applyZoom();
    }
  });

  function applyTnaFilters() {
    const sectFilter = sectFilterEl.value;
    const jabFilter = jabFilterEl.value;
    document.querySelectorAll("#tna-data-table tbody tr").forEach((tr) => {
      const showSect = !sectFilter || tr.dataset.section === sectFilter;
      const showJab = !jabFilter || tr.dataset.jabatan === jabFilter;
      tr.style.display = showSect && showJab ? "" : "none";
    });
  }

  try {
    const tableData = await fetchSheetData(SHEET_ID, SHEET_NAME);
    const allRows = tableData.rows;

    // Cari baris pertama yang berisi konten untuk digunakan sebagai header.
    // Ini menangani kasus di mana sheet mungkin memiliki baris kosong di bagian atas.
    const headerRowIndex = allRows.findIndex(
      (row) => row && row.c && row.c.some((cell) => cell && cell.v)
    );

    if (headerRowIndex === -1) {
      throw new Error(
        "Data sheet TNA tidak berisi header atau data yang valid."
      );
    }

    const headerRow = allRows[headerRowIndex].c || [];
    headers = headerRow.map((cell) => (cell ? cell.v : null));

    const uniqueSections = new Set();
    const uniqueJabatans = new Set();
    const dataRows = allRows.slice(headerRowIndex + 1).filter((row) => {
      if (row && row.c && row.c[0] && row.c[0].v) {
        if (row.c[2] && row.c[2].v) uniqueSections.add(row.c[2].v);
        if (row.c[3] && row.c[3].v) uniqueJabatans.add(row.c[3].v);
        return true;
      }
      return false;
    });

    const populateDropdown = (element, options, defaultLabel) => {
      element.innerHTML = `<option value="">${defaultLabel}</option>`;
      options.forEach((opt) => {
        element.innerHTML += `<option value="${opt}">${opt}</option>`;
      });
    };

    populateDropdown(sectFilterEl, [...uniqueSections].sort(), "Semua Section");
    populateDropdown(jabFilterEl, [...uniqueJabatans].sort(), "Semua Jabatan");

    sectFilterEl.addEventListener("change", applyTnaFilters);
    jabFilterEl.addEventListener("change", applyTnaFilters);

    let tableHTML =
      '<table id="tna-data-table" class="min-w-full border-collapse border border-gray-300">';
    tableHTML += '<thead class="bg-gray-100 text-gray-600">';
    tableHTML += "<tr>";
    headers.forEach((header) => {
      tableHTML += `<th class="border border-gray-300 p-2 font-semibold">${
        header || ""
      }</th>`;
    });
    tableHTML += "</tr></thead><tbody>";

    dataRows.forEach((row, index) => {
      const sect = row.c && row.c[2] && row.c[2].v ? row.c[2].v : "N/A";
      const jab = row.c && row.c[3] && row.c[3].v ? row.c[3].v : "N/A";
      const rowColorClass = index % 2 === 0 ? "bg-white" : "bg-gray-50";

      tableHTML += `<tr data-section="${sect}" data-jabatan="${jab}" class="${rowColorClass}">`;
      for (let i = 0; i < headers.length; i++) {
        const cell = row.c[i];
        const cellValue = cell ? cell.v : "";
        let title = "";
        if (headers[i] === "Y") title = "DONE";
        if (headers[i] === "N") title = "NO ATAU BELUM DONE";
        tableHTML += `<td class="border border-gray-300 p-2 text-left" title="${title}">${cellValue}</td>`;
      }
      tableHTML += "</tr>";
    });
    tableHTML += "</tbody></table>";

    loader.style.display = "none";
    tableContainer.innerHTML = tableHTML;
    applyZoom();
    applyTnaFilters();
  } catch (error) {
    handleError(error, "Gagal memuat data TNA.");
    if (loader) loader.style.display = "none";
  }
})();

// --- LOGIKA UNTUK ADD KOMPETENSI ---
(async function loadAddKompetensiData() {
  const sheetId = "1RmNABlAsDGOoxYk5yqZ3SD--LMhMOxLEh2AwPsMV86Q";

  const buildTable = async (sheetName, containerId, loaderId, options = {}) => {
    const {
      headerRowIndex = 1,
      dataRowIndex = 2,
      hiddenColumns = [],
    } = options;
    const tableContainer = document.getElementById(containerId);
    const loader = document.getElementById(loaderId);

    try {
      const tableData = await fetchSheetData(sheetId, sheetName);
      const allRows = tableData.rows;
      if (allRows.length < headerRowIndex + 1) {
        throw new Error(`Data sheet ${sheetName} tidak lengkap atau kosong.`);
      }
      const headers = (allRows[headerRowIndex].c || []).map((cell) =>
        cell ? cell.v : ""
      );
      const dataRows = allRows.slice(dataRowIndex);

      let tableHTML =
        '<table class="min-w-full border-collapse border border-gray-300 text-sm">';
      tableHTML += '<thead class="bg-gray-100"><tr>';
      headers.forEach((header, index) => {
        if (hiddenColumns.includes(index)) return;
        tableHTML += `<th class="border border-gray-300 p-2 font-semibold text-gray-600">${header}</th>`;
      });
      tableHTML += `<th class="border border-gray-300 p-2 font-semibold text-gray-600">Aksi</th>`;
      tableHTML += "</tr></thead><tbody>";

      dataRows.forEach((row, rowIndex) => {
        const rowColorClass = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50";
        tableHTML += `<tr class="${rowColorClass}">`;
        (row.c || []).forEach((cell, cellIndex) => {
          if (hiddenColumns.includes(cellIndex)) return;
          const cellValue = cell ? cell.v : "";
          tableHTML += `<td class="border border-gray-300 p-2 text-left">${cellValue}</td>`;
        });
        tableHTML += `<td class="border border-gray-300 p-2 text-center space-x-2">
                            <button class="text-blue-500 hover:text-blue-700">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                            </button>
                            <button class="text-red-500 hover:text-red-700">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                            </button>
                        </td>`;
        tableHTML += "</tr>";
      });
      tableHTML += "</tbody></table>";

      loader.style.display = "none";
      tableContainer.innerHTML = tableHTML;
    } catch (error) {
      handleError(error, `Gagal memuat data untuk ${sheetName}.`);
      if (loader) loader.style.display = "none";
    }
  };

  const addKompetensiTab = document.querySelector(
    '[data-target="tab-add-kompetensi"]'
  );
  addKompetensiTab.addEventListener(
    "click",
    () => {
      const internalTable = document.getElementById("table-container-internal");
      const allTable = document.getElementById("table-container-all");

      if (internalTable.innerHTML.trim() === "") {
        buildTable(
          "BASE INTERNAL TRAINING",
          "table-container-internal",
          "loader-internal",
          { headerRowIndex: 1, dataRowIndex: 2 }
        );
      }
      if (allTable.innerHTML.trim() === "") {
        buildTable(
          "BASE KOMPETENSI TRAINING",
          "table-container-all",
          "loader-all",
          { headerRowIndex: 1, dataRowIndex: 2, hiddenColumns: [8, 9, 10, 12] }
        );
      }
    },
    { once: true }
  );

  const zoomInBtn = document.getElementById("zoom-in-add");
  const zoomOutBtn = document.getElementById("zoom-out-add");
  let currentZoomLevel = 1;

  function applyAddZoom() {
    const internalContainer = document.getElementById(
      "table-container-internal"
    );
    const allContainer = document.getElementById("table-container-all");
    internalContainer.className = "overflow-x-auto";
    allContainer.className = "overflow-x-auto";
    internalContainer.classList.add(`zoom-level-${currentZoomLevel}`);
    allContainer.classList.add(`zoom-level-${currentZoomLevel}`);
  }

  applyAddZoom();

  zoomInBtn.addEventListener("click", () => {
    if (currentZoomLevel < 3) {
      currentZoomLevel++;
      applyAddZoom();
    }
  });
  zoomOutBtn.addEventListener("click", () => {
    if (currentZoomLevel > 1) {
      currentZoomLevel--;
      applyAddZoom();
    }
  });
})();

// --- LOGIKA UNTUK SETTING KOMPETENSI ---
(async function loadSettingData() {
  const SHEET_ID = "1RmNABlAsDGOoxYk5yqZ3SD--LMhMOxLEh2AwPsMV86Q";
  const SHEET_NAME = "K3 JABATAN";
  const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}&range=A3:G`;

  const tableContainer = document.getElementById("table-container-setting");
  const loader = document.getElementById("loader-setting");
  const jabFilterEl = document.getElementById("setting-filter-jabatan");
  const levelFilterEl = document.getElementById("setting-filter-level");
  const refreshFilterEl = document.getElementById("setting-filter-refresh");
  const zoomInBtn = document.getElementById("zoom-in-setting");
  const zoomOutBtn = document.getElementById("zoom-out-setting");
  let currentZoomLevel = 2;

  function applyZoom() {
    tableContainer.className = "";
    tableContainer.classList.add(`zoom-level-${currentZoomLevel}`);
  }

  zoomInBtn.addEventListener("click", () => {
    if (currentZoomLevel < 3) {
      currentZoomLevel++;
      applyZoom();
    }
  });
  zoomOutBtn.addEventListener("click", () => {
    if (currentZoomLevel > 1) {
      currentZoomLevel--;
      applyZoom();
    }
  });

  function applySettingFilters() {
    const jabFilter = jabFilterEl.value;
    const levelFilter = levelFilterEl.value;
    const refreshFilter = refreshFilterEl.value;
    document.querySelectorAll("#setting-data-table tbody tr").forEach((tr) => {
      const showJab = !jabFilter || tr.dataset.jabatan === jabFilter;
      const showLevel = !levelFilter || tr.dataset.level === levelFilter;
      const showRefresh =
        !refreshFilter || tr.dataset.refresh === refreshFilter;
      tr.style.display = showJab && showLevel && showRefresh ? "" : "none";
    });
  }

  const settingTab = document.querySelector('[data-target="tab-setting"]');
  settingTab.addEventListener(
    "click",
    async () => {
      if (tableContainer.innerHTML.trim() !== "") return;

      try {
        const tableData = await fetchSheetData(SHEET_ID, SHEET_NAME, "A3:G");
        const allRows = tableData.rows;
        if (allRows.length === 0) throw new Error(`Data sheet Setting kosong.`);
        const headers = (allRows[0].c || []).map((cell) =>
          cell ? cell.v : ""
        );
        const dataRows = allRows.slice(1);

        const uniqueJabatans = new Set();
        const uniqueLevels = new Set();
        const uniqueRefreshes = new Set();
        dataRows.forEach((row) => {
          if (row.c[2] && row.c[2].v) uniqueJabatans.add(row.c[2].v);
          if (row.c[4] && row.c[4].v) uniqueLevels.add(row.c[4].v);
          if (row.c[6] && row.c[6].v) uniqueRefreshes.add(row.c[6].v);
        });

        const populateDropdown = (element, options, defaultLabel) => {
          element.innerHTML = `<option value="">${defaultLabel}</option>`;
          options.forEach((opt) => {
            element.innerHTML += `<option value="${opt}">${opt}</option>`;
          });
        };

        populateDropdown(
          jabFilterEl,
          [...uniqueJabatans].sort(),
          "Semua Jabatan"
        );
        populateDropdown(
          levelFilterEl,
          [...uniqueLevels].sort(),
          "Semua Level"
        );
        populateDropdown(
          refreshFilterEl,
          [...uniqueRefreshes].sort(),
          "Semua Refresh"
        );

        jabFilterEl.addEventListener("change", applySettingFilters);
        levelFilterEl.addEventListener("change", applySettingFilters);
        refreshFilterEl.addEventListener("change", applySettingFilters);

        let tableHTML =
          '<table id="setting-data-table" class="min-w-full border-collapse border border-gray-300">';
        tableHTML += '<thead class="bg-gray-100"><tr>';
        headers.forEach((header) => {
          tableHTML += `<th class="border border-gray-300 p-2 font-semibold text-gray-600">${header}</th>`;
        });
        tableHTML += `<th class="border border-gray-300 p-2 font-semibold text-gray-600">Aksi</th>`;
        tableHTML += "</tr></thead><tbody>";

        dataRows.forEach((row, index) => {
          const jab = row.c && row.c[2] && row.c[2].v ? row.c[2].v : "N/A";
          const level = row.c && row.c[4] && row.c[4].v ? row.c[4].v : "N/A";
          const refresh = row.c && row.c[6] && row.c[6].v ? row.c[6].v : "N/A";
          const rowColorClass = index % 2 === 0 ? "bg-white" : "bg-gray-50";
          tableHTML += `<tr class="${rowColorClass}" data-jabatan="${jab}" data-level="${level}" data-refresh="${refresh}">`;
          for (let i = 0; i < headers.length; i++) {
            const cell = row.c[i];
            const cellValue = cell ? cell.v : "";
            tableHTML += `<td class="border border-gray-300 p-2 text-left">${cellValue}</td>`;
          }
          tableHTML += `<td class="border border-gray-300 p-2 text-center space-x-2">
                            <button class="text-blue-500 hover:text-blue-700">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                            </button>
                            <button class="text-red-500 hover:text-red-700">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                            </button>
                        </td>`;
          tableHTML += "</tr>";
        });
        tableHTML += "</tbody></table>";

        loader.style.display = "none";
        tableContainer.innerHTML = tableHTML;
        applyZoom();
      } catch (error) {
        handleError(error, "Gagal memuat data Setting.");
        if (loader) loader.style.display = "none";
      }
    },
    { once: true }
  );
})();

// --- LOGIKA UNTUK TNA INDIVIDU ---
(async function loadTnaIndividuData() {
  const buildSimpleTable = async (
    sheetId,
    sheetName,
    containerId,
    loaderId,
    options = {}
  ) => {
    const { headerRowIndex = 0, dataRowIndex = 1, range = "" } = options;
    const tableContainer = document.getElementById(containerId);
    const loader = document.getElementById(loaderId);

    try {
      const tableData = await fetchSheetData(sheetId, sheetName, range);
      const allRows = tableData.rows;
      if (allRows.length < headerRowIndex + 1) {
        throw new Error(`Data sheet ${sheetName} tidak lengkap atau kosong.`);
      }
      const headers = (allRows[headerRowIndex].c || []).map((cell) =>
        cell ? cell.v : ""
      );
      const dataRows = allRows.slice(dataRowIndex);

      let tableHTML =
        '<table class="min-w-full border-collapse border border-gray-300 text-sm">';
      tableHTML += '<thead class="bg-gray-100"><tr>';
      headers.forEach((header) => {
        tableHTML += `<th class="border border-gray-300 p-2 font-semibold text-gray-600">${header}</th>`;
      });
      tableHTML += "</tr></thead><tbody>";

      dataRows.forEach((row, index) => {
        const rowColorClass = index % 2 === 0 ? "bg-white" : "bg-gray-50";
        tableHTML += `<tr class="${rowColorClass}">`;
        for (let i = 0; i < headers.length; i++) {
          const cell = row.c[i];
          const cellValue = cell ? cell.v : "";
          tableHTML += `<td class="border border-gray-300 p-2 text-left">${cellValue}</td>`;
        }
        tableHTML += "</tr>";
      });
      tableHTML += "</tbody></table>";

      loader.style.display = "none";
      tableContainer.innerHTML = tableHTML;
    } catch (error) {
      handleError(error, `Gagal memuat data untuk ${sheetName}.`);
      if (loader) loader.style.display = "none";
    }
  };

  const tnaIndividuTab = document.querySelector(
    '[data-target="tab-tna-individu"]'
  );
  tnaIndividuTab.addEventListener(
    "click",
    () => {
      const pelatihanTable = document.getElementById(
        "table-container-pelatihan"
      );
      if (pelatihanTable && pelatihanTable.innerHTML.trim() === "") {
        buildSimpleTable(
          "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM",
          "kompetensi_manpower",
          "table-container-pelatihan",
          "loader-pelatihan"
        );
      }
      const manpowerTable = document.getElementById("table-container-manpower");
      if (manpowerTable && manpowerTable.innerHTML.trim() === "") {
        buildSimpleTable(
          "1SOFXUDzAZRMqzYvtH9XSxPGDay1Y4SG3qSY5KTZ9YBc",
          "BASE MANPOWER",
          "table-container-manpower",
          "loader-manpower",
          { range: "A:H" }
        );
      }
      const tnaFinalContainer = document.getElementById("loader-tna-final");
      if (tnaFinalContainer && tnaFinalContainer.innerHTML.includes("Memuat")) {
        tnaFinalContainer.innerHTML =
          "<p>Konten untuk TNA akan ditampilkan di sini.</p>";
      }
    },
    { once: true }
  );

  const unlockBtn = document.getElementById("unlock-manpower");
  const passwordInput = document.getElementById("password-manpower");
  const passwordError = document.getElementById("password-error-manpower");
  const manpowerTableContainer = document.getElementById(
    "table-container-manpower"
  );
  const passwordGate = document.getElementById("password-gate-manpower");

  unlockBtn.addEventListener("click", () => {
    if (passwordInput.value === "12345") {
      manpowerTableContainer.classList.remove("blur-sm");
      passwordGate.style.display = "none";
      passwordError.classList.add("hidden");
    } else {
      passwordError.classList.remove("hidden");
    }
  });
})();

// --- LOGIKA UNTUK TAB SWITCHING ---
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      tabButtons.forEach((btn) => {
        btn.classList.remove("active", "text-gray-700");
        btn.classList.add("text-gray-500", "bg-gray-200");
      });
      button.classList.add("active", "text-gray-700");
      button.classList.remove("text-gray-500", "bg-gray-200");

      // Menggunakan sistem kelas .active agar konsisten dengan style.css
      tabContents.forEach((content) => {
        content.classList.remove("active");
      });
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  const subTabButtons = document.querySelectorAll(".sub-tab-button");
  const subTabContents = document.querySelectorAll(".sub-tab-content");

  subTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      subTabButtons.forEach((btn) => {
        btn.classList.remove("active", "text-indigo-600", "border-indigo-500");
        btn.classList.add(
          "text-gray-500",
          "hover:text-gray-700",
          "hover:border-gray-300"
        );
      });
      button.classList.add("active", "text-indigo-600", "border-indigo-500");
      button.classList.remove(
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      );

      subTabContents.forEach((content) => {
        content.classList.toggle("hidden", content.id !== targetId);
      });
    });
  });
});
