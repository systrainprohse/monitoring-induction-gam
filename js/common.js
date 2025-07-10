/**
 * =================================================================
 * common.js
 * -----------------------------------------------------------------
 * Berisi fungsi-fungsi utilitas yang digunakan bersama oleh
 * script.js (Induksi) dan pelatihanscript.js (Pelatihan).
 *
 * Tujuan:
 * - Mengurangi duplikasi kode.
 * - Memusatkan logika umum untuk kemudahan pemeliharaan.
 * - Meningkatkan konsistensi di seluruh aplikasi.
 * =================================================================
 */

const sheetDataCache = {};

/**
 * Menampilkan indikator loading.
 */
function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = "flex";
        setTimeout(() => loader.classList.add('show'), 10);
    }
}

/**
 * Menyembunyikan indikator loading.
 */
function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.remove('show');
        const onTransitionEnd = () => {
            loader.style.display = "none";
            loader.removeEventListener('transitionend', onTransitionEnd);
        };
        loader.addEventListener('transitionend', onTransitionEnd);
    }
}

/**
 * Mengambil data dari Google Sheet dengan mekanisme cache dan retry.
 * @param {string} id - ID spreadsheet.
 * @param {string} sheet - Nama sheet.
 * @param {number} maxRetries - Jumlah percobaan ulang.
 * @returns {Promise<Array<Object>>} Data dari sheet.
 */
async function fetchSheet(id, sheet, maxRetries = 3) {
    if (sheetDataCache[sheet]) {
        return sheetDataCache[sheet];
    }
    let attempt = 0;
    while (attempt < maxRetries) {
        showLoader();
        try {
            const res = await fetch(`https://opensheet.elk.sh/${id}/${sheet}`);
            if (!res.ok) throw new Error(`Gagal mengambil data dari sheet: ${sheet} (Status: ${res.status})`);
            const data = await res.json();
            sheetDataCache[sheet] = data;
            return data;
        } catch (err) {
            console.error(`Error fetching sheet ${sheet} (attempt ${attempt + 1}):`, err);
            attempt++;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } finally {
            hideLoader();
        }
    }
    return [];
}

/**
 * Memberikan gaya (warna dan emoji) pada sel tabel berdasarkan header dan nilainya.
 * @param {string} header - Header kolom.
 * @param {*} value - Nilai sel.
 * @returns {{warna: string, emoji: string}} Objek berisi kelas warna dan emoji.
 */
function getCellStyle(header, value) {
    const hLower = header.toLowerCase();
    const valueLower = String(value).toLowerCase();
    const scoreKeywords = ["score", "rata-rata", "nilai", "progress"];
    const statusKeywords = ["status", "checklist", "spdk", "apv"];
    const isScore = scoreKeywords.some(kw => hLower.includes(kw));
    const isStatus = statusKeywords.some(kw => hLower.includes(kw));
    const angka = parseFloat(String(value).replace('%', ''));

    let warna = "";
    let emoji = "";

    if (isScore && !isNaN(angka)) {
        if (angka < 75) {
            warna = "red";
            emoji = "❌ ";
        } else {
            warna = "green";
            emoji = "✅ ";
        }
    } else if (isStatus) {
        if (["approved", "ok", "done", "lengkap", "ya", "lulus"].includes(valueLower)) {
            warna = "approved";
            emoji = "✅ ";
        } else if (["rejected", "no", "tidak", "gagal", "belum", "tidak lulus"].includes(valueLower)) {
            warna = "red";
            emoji = "❌ ";
        } else if (["hold", "pending", "menunggu", "proses"].includes(valueLower)) {
            warna = "hold";
            emoji = "⚠️ ";
        }
    }
    return { warna, emoji };
}

/**
 * Merender data ke dalam tabel HTML, mendukung sorting dan tampilan mobile.
 * @param {Array<Object>} data - Data untuk dirender.
 * @param {string} tableId - ID elemen tabel.
 * @param {Array<string>} allowedColumns - Daftar kolom yang akan ditampilkan.
 * @param {Object} sortState - Status sorting saat ini.
 * @param {Function} onHeaderClick - Fungsi callback saat header diklik.
 * @param {Function} onRowClick - Fungsi callback saat baris diklik.
 */
function renderTable(data, tableId, allowedColumns, sortState, onHeaderClick, onRowClick) {
    const table = document.getElementById(tableId);
    if (!table) return;

    table.innerHTML = ""; // Clear existing content

    // Create Header
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    allowedColumns.forEach(h => {
        const th = document.createElement("th");
        th.textContent = h.toUpperCase();
        th.style.cursor = "pointer";
        th.title = `Urutkan berdasarkan ${h}`;
        if (sortState && sortState.column === h) {
            th.innerHTML += sortState.direction === 'asc' ? ' <span class="sort-arrow">▲</span>' : ' <span class="sort-arrow">▼</span>';
        }
        th.addEventListener('click', () => onHeaderClick(h));
        headerRow.appendChild(th);
    });

    // Create Body
    const tbody = table.createTBody();
    if (!data || data.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = allowedColumns.length;
        cell.textContent = "Data tidak tersedia.";
        cell.className = "placeholder-cell";
    } else {
        data.forEach(rowData => {
            const row = tbody.insertRow();
            if (onRowClick) {
                row.style.cursor = "pointer";
                row.addEventListener('click', () => onRowClick(rowData));
            }
            allowedColumns.forEach(h => {
                const cell = row.insertCell();
                const value = rowData[h] || "";
                cell.dataset.label = h; // For mobile view

                const { warna, emoji } = getCellStyle(h, value);
                if (warna) {
                    cell.innerHTML = `<span class="badge ${warna}">${emoji}${value}</span>`;
                } else {
                    cell.textContent = value;
                }
            });
        });
    }

    table.classList.remove("loaded");
    setTimeout(() => table.classList.add("loaded"), 10);
}

/**
 * Mengekspor data ke file Excel.
 * @param {Array<Object>} data - Data untuk diekspor.
 * @param {string} filename - Nama file (tanpa ekstensi).
 */
function exportToExcel(data, filename) {
    if (typeof XLSX === 'undefined') {
        alert("Pustaka Excel (XLSX) tidak termuat. Periksa koneksi internet Anda.");
        return;
    }
    if (!data || data.length === 0) {
        alert("Tidak ada data untuk diekspor.");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Menunda eksekusi fungsi (untuk input search).
 * @param {Function} func - Fungsi yang akan dieksekusi.
* @param {number} delay - Waktu tunda dalam milidetik.
 */
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}