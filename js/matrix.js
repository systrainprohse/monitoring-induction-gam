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
    if (!tableContainer) return;
    tableContainer.className = "";
    tableContainer.classList.add(`zoom-level-${currentZoomLevel}`);
  }

  if (zoomInBtn && zoomOutBtn) {
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
  }

  function applyFilters() {
    const deptFilter = deptFilterEl.value;
    const sectFilter = sectFilterEl.value;
    const jabFilter = jabFilterEl.value;
    const levelFilter = levelFilterEl.value;
    const visibleRows = [];
    document.querySelectorAll("#matrix-data-table tbody tr").forEach((tr) => {
      const showDept = !deptFilter || tr.dataset.department === deptFilter;
      const showSect = !sectFilter || tr.dataset.section === sectFilter;
      const showJab = !jabFilter || tr.dataset.jabatan === jabFilter;
      const showLevel = !levelFilter || tr.dataset.levels.includes(levelFilter);
      const isVisible = showDept && showSect && showJab && showLevel;
      tr.style.display = isVisible ? "" : "none";
      if (isVisible) visibleRows.push(tr);
    });
    const visibleCompetencyIndices = new Set();
    visibleRows.forEach((row) => {
      competencies.forEach((comp, i) => {
        const cell = row.cells[i + 3];
        if (cell && cell.innerHTML.trim() !== "") {
          visibleCompetencyIndices.add(i);
        }
      });
    });
    competencies.forEach((comp, i) => {
      const shouldBeVisible = visibleCompetencyIndices.has(i);
      const tableColumnIndex = i + 4;
      const th = document.querySelector(
        `#matrix-data-table thead th:nth-child(${tableColumnIndex})`
      );
      if (th) th.style.display = shouldBeVisible ? "" : "none";
      document.querySelectorAll(`#matrix-data-table tbody tr`).forEach((tr) => {
        if (tr.cells[i + 3])
          tr.cells[i + 3].style.display = shouldBeVisible ? "" : "none";
      });
    });
  }

  function renderCompetencyContent(value) {
    const cleanValue = value ? String(value).trim().toUpperCase() : "";
    let icon = "";
    let textColorClass = "";
    switch (cleanValue) {
      case "N5":
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="competency-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`;
        textColorClass = "color-n5 font-semibold";
        break;
      case "N4":
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="competency-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
        textColorClass = "color-n4 font-semibold";
        break;
      case "N3":
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="competency-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
        textColorClass = "color-n3 font-semibold";
        break;
      case "N2":
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="competency-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
        textColorClass = "color-n2 font-semibold";
        break;
      default:
        return "";
    }
    let tooltip = "";
    switch (cleanValue) {
      case "N5":
        tooltip = "Dasar";
        break;
      case "N4":
        tooltip = "Perlu Supervisi";
        break;
      case "N3":
        tooltip = "Mampu Mandiri";
        break;
      case "N2":
        tooltip = "Mahir";
        break;
    }
    return `<div class="competency-cell ${textColorClass}"><span title="${tooltip}">${icon}</span><span>${cleanValue}</span></div>`;
  }
  function getCompetencyBgClass(value) {
    const cleanValue = value ? String(value).trim().toUpperCase() : "";
    switch (cleanValue) {
      case "N5":
        return "bg-level-n5";
      case "N4":
        return "bg-level-n4";
      case "N3":
        return "bg-level-n3";
      case "N2":
        return "bg-level-n2";
      default:
        return "";
    }
  }

  try {
    const response = await fetch(URL);
    if (!response.ok)
      throw new Error(`Gagal mengambil data: ${response.statusText}`);
    let jsonText = await response.text();
    const jsonMatch = jsonText.match(
      /google\.visualization\.Query\.setResponse\((.*)\)/s
    );
    if (!jsonMatch || !jsonMatch[1])
      throw new Error("Format respons tidak valid.");
    const data = JSON.parse(jsonMatch[1]);
    if (!data.table || !data.table.rows || data.table.rows.length < 1)
      throw new Error("Data sheet tidak lengkap.");
    const allRows = data.table.rows;

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
      "#fee2e2",
      "#fef3c7",
      "#dcfce7",
      "#dbeafe",
      "#e0e7ff",
      "#f3e8ff",
      "#fce7f3",
    ];
    const departmentColors = {};
    let colorIndex = 0;
    Object.keys(filterData)
      .sort()
      .forEach((dept) => {
        departmentColors[dept] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
      });
    let tableHTML = '<table id="matrix-data-table" class="data-table">';
    tableHTML += "<thead>";
    tableHTML += "<tr>";
    tableHTML += "<th>DEPARTEMEN</th>";
    tableHTML += "<th>SECTION</th>";
    tableHTML += "<th>JABATAN</th>";
    competencies.forEach((comp) => {
      tableHTML += `<th class="header-competency"><div class="vertical-text">${comp.name}</div></th>`;
    });
    tableHTML += "</tr></thead><tbody>";
    dataRows.forEach((row) => {
      const dept = row.c[0] ? row.c[0].v : "";
      const sect = row.c[1] ? row.c[1].v : "N/A";
      const jab = row.c[2] ? row.c[2].v : "N/A";
      const rowColor = departmentColors[dept] || "#ffffff";
      let rowLevels = new Set();
      competencies.forEach((comp) => {
        const cell = row.c[comp.originalIndex];
        if (cell && cell.v) rowLevels.add(String(cell.v).trim().toUpperCase());
      });
      tableHTML += `<tr data-department="${dept}" data-section="${sect}" data-jabatan="${jab}" data-levels="${[
        ...rowLevels,
      ].join(",")}" style="background-color: ${rowColor}">`;
      tableHTML += `<td class="text-left font-medium">${dept}</td>`;
      tableHTML += `<td class="text-left">${sect}</td>`;
      tableHTML += `<td class="text-left">${jab}</td>`;
      competencies.forEach((comp) => {
        const cell = row.c[comp.originalIndex];
        const cellValue = cell ? cell.v : "";
        const cellBgClass = getCompetencyBgClass(cellValue);
        const cellContent = renderCompetencyContent(cellValue);
        tableHTML += `<td class="${cellBgClass}">${cellContent}</td>`;
      });
      tableHTML += "</tr>";
    });
    tableHTML += "</tbody></table>";
    loader.style.display = "none";
    tableContainer.innerHTML = tableHTML;
    applyZoom();
    applyFilters();
  } catch (error) {
    console.error("Error loading Matrix data:", error);
    loader.innerHTML = `<p style="color: red;">Gagal memuat data Matrix. Error: ${error.message}</p>`;
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
    const response = await fetch(URL);
    if (!response.ok)
      throw new Error(`Gagal mengambil data TNA: ${response.statusText}`);
    let jsonText = await response.text();
    const jsonMatch = jsonText.match(
      /google\.visualization\.Query\.setResponse\((.*)\)/s
    );
    if (!jsonMatch || !jsonMatch[1])
      throw new Error("Format respons TNA tidak valid.");
    const data = JSON.parse(jsonMatch[1]);
    if (!data.table || !data.table.rows || data.table.rows.length < 2)
      throw new Error("Data sheet TNA tidak lengkap.");

    const allRows = data.table.rows;
    const headerRow = allRows[0].c || [];
    headers = headerRow.map((cell) => (cell ? cell.v : null));

    const uniqueSections = new Set();
    const uniqueJabatans = new Set();
    const dataRows = allRows.slice(1).filter((row) => {
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

    let tableHTML = '<table id="tna-data-table" class="data-table">';
    tableHTML += "<thead>";
    tableHTML += "<tr>";
    headers.forEach((header) => {
      tableHTML += `<th>${header || ""}</th>`;
    });
    tableHTML += "</tr></thead><tbody>";

    dataRows.forEach((row, index) => {
      const sect = row.c && row.c[2] && row.c[2].v ? row.c[2].v : "N/A";
      const jab = row.c && row.c[3] && row.c[3].v ? row.c[3].v : "N/A";
      const rowColorClass = index % 2 === 0 ? "" : "bg-gray-50";

      tableHTML += `<tr data-section="${sect}" data-jabatan="${jab}" class="${rowColorClass}">`;
      for (let i = 0; i < headers.length; i++) {
        const cell = row.c[i];
        const cellValue = cell ? cell.v : "";
        let title = "";
        if (headers[i] === "Y") title = "DONE";
        if (headers[i] === "N") title = "NO ATAU BELUM DONE";
        tableHTML += `<td class="text-left" title="${title}">${cellValue}</td>`;
      }
      tableHTML += "</tr>";
    });
    tableHTML += "</tbody></table>";

    loader.style.display = "none";
    tableContainer.innerHTML = tableHTML;
    applyZoom();
    applyTnaFilters();
  } catch (error) {
    console.error("Error loading TNA data:", error);
    loader.innerHTML = `<p class="text-red-500">Gagal memuat data TNA. Error: ${error.message}</p>`;
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
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;
    const tableContainer = document.getElementById(containerId);
    const loader = document.getElementById(loaderId);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Gagal memuat ${sheetName}`);
      let jsonText = await response.text();
      const jsonMatch = jsonText.match(
        /google\.visualization\.Query\.setResponse\((.*)\)/s
      );
      if (!jsonMatch || !jsonMatch[1])
        throw new Error(`Format respons tidak valid untuk ${sheetName}.`);
      const data = JSON.parse(jsonMatch[1]);
      if (
        !data.table ||
        !data.table.rows ||
        data.table.rows.length < headerRowIndex + 1
      )
        throw new Error(`Data sheet ${sheetName} tidak lengkap atau kosong.`);

      const allRows = data.table.rows;
      const headers = (allRows[headerRowIndex].c || []).map((cell) =>
        cell ? cell.v : ""
      );
      const dataRows = allRows.slice(dataRowIndex);

      let tableHTML = '<table class="add-komp-table">';
      tableHTML += "<thead><tr>";
      headers.forEach((header, index) => {
        if (hiddenColumns.includes(index)) return;
        tableHTML += `<th>${header}</th>`;
      });
      tableHTML += `<th>Aksi</th>`;
      tableHTML += "</tr></thead><tbody>";

      dataRows.forEach((row, rowIndex) => {
        const rowColorClass = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50";
        tableHTML += `<tr class="${rowColorClass}">`;
        (row.c || []).forEach((cell, cellIndex) => {
          if (hiddenColumns.includes(cellIndex)) return;
          const cellValue = cell ? cell.v : "";
          tableHTML += `<td class="text-left">${cellValue}</td>`;
        });
        tableHTML += `<td class="action-cell">
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
      console.error(`Error loading ${sheetName}:`, error);
      loader.innerHTML = `<p class="text-red-500">${error.message}</p>`;
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
    internalContainer.className = "table-wrapper";
    allContainer.className = "table-wrapper";
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
        const response = await fetch(URL);
        if (!response.ok) throw new Error(`Gagal memuat data Setting`);
        let jsonText = await response.text();
        const jsonMatch = jsonText.match(
          /google\.visualization\.Query\.setResponse\((.*)\)/s
        );
        if (!jsonMatch || !jsonMatch[1])
          throw new Error(`Format respons tidak valid.`);
        const data = JSON.parse(jsonMatch[1]);
        if (!data.table || !data.table.rows || data.table.rows.length === 0)
          throw new Error(`Data sheet Setting kosong.`);

        const allRows = data.table.rows;
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

        let tableHTML = '<table id="setting-data-table" class="data-table">';
        tableHTML += "<thead><tr>";
        headers.forEach((header) => {
          tableHTML += `<th>${header}</th>`;
        });
        tableHTML += `<th>Aksi</th>`;
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
            tableHTML += `<td class="text-left">${cellValue}</td>`;
          }
          tableHTML += `<td class="action-cell">
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
        console.error(`Error loading Setting:`, error);
        loader.innerHTML = `<p class="text-red-500">${error.message}</p>`;
      }
    },
    { once: true }
  );
})();

// --- LOGIKA UNTUK TNA INDIVIDU ---
(async function loadTnaIndividuData() {
  // Kode untuk TNA Individu tetap sama seperti sebelumnya
})();

// --- LOGIKA UNTUK TAB SWITCHING ---
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      tabButtons.forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");
      tabContents.forEach((content) => {
        if (content.id === targetId) {
          content.classList.add("active");
          content.classList.remove("hidden");
        } else {
          content.classList.remove("active");
          content.classList.add("hidden");
        }
      });
    });
  });

  const subTabButtons = document.querySelectorAll(".sub-tab-button");
  subTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const parent = button.closest(".tab-content");
      const subContents = parent.querySelectorAll(".sub-tab-content");
      const targetId = button.dataset.target;

      parent.querySelectorAll(".sub-tab-button").forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");

      subContents.forEach((content) => {
        content.classList.toggle("hidden", content.id !== targetId);
        content.classList.toggle("active", content.id === targetId);
      });
    });
  });
});

// --- LOGIKA UNTUK MODAL ADD/EDIT ---
document.addEventListener("DOMContentLoaded", () => {
  const dataModal = document.getElementById("data-modal");
  const closeModalBtn = document.getElementById("close-modal");
  const cancelModalBtn = document.getElementById("cancel-modal");
  const modalTitleEl = document.getElementById("modal-title");
  const modalForm = document.getElementById("modal-form");

  // Pastikan semua elemen ada sebelum melanjutkan
  if (
    !dataModal ||
    !closeModalBtn ||
    !cancelModalBtn ||
    !modalTitleEl ||
    !modalForm
  )
    return;

  /**
   * Menutup modal dan membersihkan isinya.
   */
  const closeModal = () => {
    dataModal.classList.add("hidden");
    modalForm.innerHTML = ""; // Kosongkan form saat ditutup
  };

  /**
   * Membuka modal, mengatur judul, dan (nantinya) mengisi form.
   * @param {string} type Tipe data (e.g., 'internal', 'all', 'setting')
   */
  const openAddEditModal = (type) => {
    const titles = {
      internal: "Tambah Data Internal Kompetensi",
      all: "Tambah Data All Kompetensi",
      setting: "Tambah Data Setting Kompetensi",
    };
    modalTitleEl.textContent = titles[type] || "Formulir Data";
    let formHTML = "";

    if (type === "internal") {
      formHTML = `
        <div class="form-group">
          <label for="nama-kompetensi">Nama Kompetensi:</label>
          <input type="text" id="nama-kompetensi" name="nama_kompetensi" required>
        </div>
        <div class="form-group">
          <label for="deskripsi">Deskripsi:</label>
          <textarea id="deskripsi" name="deskripsi" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="departemen">Departemen:</label>
          <select id="departemen" name="departemen">
            <option value="hse">HSE</option>
            <option value="operation">Operation</option>
            <option value="maintenance">Maintenance</option>
            <!-- Tambahkan opsi departemen lainnya sesuai kebutuhan -->
          </select>
        </div>
        <div class="form-group">
          <label for="tipe">Tipe:</label>
          <select id="tipe" name="tipe">
            <option value="internal">Internal</option>
            <option value="eksternal">Eksternal</option>
          </select>
        </div>
        <div class="form-group">
          <label for="level">Level:</label>
          <select id="level" name="level">
            <option value="n5">N5</option>
            <option value="n4">N4</option>
            <option value="n3">N3</option>
            <option value="n2">N2</option>
          </select>
        </div>
      `;
    } else if (type === "all") {
      // Form untuk "All Kompetensi" (sesuaikan fieldnya)
      formHTML = `
        <div class="form-group">
          <label for="nama-kompetensi-all">Nama Kompetensi (All):</label>
          <input type="text" id="nama-kompetensi-all" name="nama_kompetensi_all" required>
        </div>
        <!-- Tambahkan field lainnya untuk "All Kompetensi" di sini -->
      `;
    } else if (type === "setting") {
      // Form untuk "Setting Kompetensi" (sesuaikan fieldnya)
      formHTML = `
        <div class="form-group">
          <label for="jabatan-setting">Jabatan:</label>
          <input type="text" id="jabatan-setting" name="jabatan_setting" required>
        </div>
        <!-- Tambahkan field lainnya untuk "Setting Kompetensi" di sini -->
      `;
    } else {
      formHTML = `<p class="text-center text-gray-500">Formulir tidak tersedia untuk tipe ini.</p>`;
    }

    modalForm.innerHTML = formHTML;

    dataModal.classList.remove("hidden");
  };

  /**
   * Menangani penyimpanan data dari modal. (Saat ini hanya menampilkan alert)
   */
  const saveModalData = () => {
    const form = document.getElementById("modal-form");
    if (form) {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      alert("Data akan disimpan (simulasi):\n" + JSON.stringify(data, null, 2));
      closeModal();
    }
  };

  const saveModalBtn = document.getElementById("save-modal");
  saveModalBtn.addEventListener("click", saveModalData);

  // Event listener untuk tombol pembuka modal
  const openModalButtons = document.querySelectorAll(".btn-open-modal");
  openModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const modalType = button.dataset.modalType;
      openAddEditModal(modalType);
    });
  });

  // Event listeners untuk menutup modal
  closeModalBtn.addEventListener("click", closeModal);
  cancelModalBtn.addEventListener("click", closeModal);
  dataModal.addEventListener("click", (e) => {
    // Tutup jika user mengklik area latar belakang (di luar modal-content)
    if (e.target === dataModal) {
      closeModal();
    }
  });
});
