/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 * @param {Function} func The function to debounce.
 * @param {number} wait The number of milliseconds to delay.
 * @returns {Function} Returns the new debounced function.
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// --- Centralized Loader Management ---
let loaderRequestCount = 0;

/**
 * Displays the global loader element with a fade-in effect.
 * Manages a request counter to prevent flickering with multiple requests.
 */
function showLoader() {
  const loader = document.getElementById("loader");
  if (loaderRequestCount === 0 && loader) {
    loader.style.display = "flex";
    setTimeout(() => {
      loader.classList.add("show");
    }, 10);
  }
  loaderRequestCount++;
}

/**
 * Hides the global loader element with a fade-out effect.
 * Only hides when all concurrent requests are completed.
 */
function hideLoader() {
  loaderRequestCount--;
  if (loaderRequestCount <= 0) {
    loaderRequestCount = 0; // Reset to prevent negative numbers
    const loader = document.getElementById("loader");
    if (loader) {
      loader.classList.remove("show");
      const onTransitionEnd = () => {
        loader.style.display = "none";
        loader.removeEventListener("transitionend", onTransitionEnd);
      };
      loader.addEventListener("transitionend", onTransitionEnd);
    }
  }
}

/**
 * Fetches data from a Google Sheet using opensheet.elk.sh with a retry mechanism.
 * This is a generic utility and does not handle caching or loaders.
 * @param {string} id The ID of the Google Spreadsheet.
 * @param {string} sheet The name of the sheet.
 * @param {number} [maxRetries=3] The maximum number of retry attempts.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of data objects.
 * @throws {Error} If fetching fails after all retries.
 */
async function fetchSheet(id, sheet, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await fetch(`https://opensheet.elk.sh/${id}/${sheet}`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error(
        `Error fetching sheet ${sheet} (attempt ${attempt + 1}):`,
        err.message
      );
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(
          `Failed to fetch sheet ${sheet} after ${maxRetries} attempts.`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before retry
    }
  }
}

// --- Centralized Data Caching ---
const sheetDataCache = {};
const offlineTimestamps = {};

/**
 * Fetches data from a Google Sheet, using a cache to avoid redundant requests.
 * Manages loader visibility and offline data handling.
 * @param {string} id The ID of the Google Spreadsheet.
 * @param {string} sheet The name of the sheet.
 * @param {string} key The application-specific key to use for caching.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of data objects.
 */
async function fetchAndCacheSheet(id, sheet, key) {
  // Jika tidak ada key, gunakan nama sheet sebagai fallback untuk kompatibilitas
  const cacheKey = key || sheet;

  showLoader();
  try {
    // 1. Selalu coba ambil data dari jaringan terlebih dahulu (Online-First)
    const data = await fetchSheet(id, sheet); // Uses the generic fetcher
    const timestamp = new Date().toISOString();

    // 2. Jika berhasil, perbarui cache memori dan localStorage
    sheetDataCache[cacheKey] = data; // Update memory cache
    delete offlineTimestamps[cacheKey]; // Clear offline timestamp if fetch succeeds

    // Save to localStorage for future offline use
    try {
      localStorage.setItem(
        `offline_${cacheKey}`,
        JSON.stringify({ data, timestamp })
      );
    } catch (e) {
      console.warn(
        `Gagal menyimpan data ke localStorage untuk ${cacheKey}:`,
        e
      );
    }

    console.log(
      `ONLINE: Data berhasil diambil dari jaringan untuk sheet: ${cacheKey}`
    );
    return data;
  } catch (err) {
    // 3. Jika jaringan gagal, gunakan data dari cache sebagai fallback
    handleError(
      err,
      `Gagal mengambil data online untuk '${cacheKey}'. Mencoba menggunakan data offline.`
    );

    // Coba cache memori terlebih dahulu
    if (sheetDataCache[cacheKey] && sheetDataCache[cacheKey].length > 0) {
      console.log(
        `OFFLINE: Mengembalikan data dari cache memori untuk sheet: ${cacheKey}`
      );
      return sheetDataCache[cacheKey];
    }

    // Jika tidak ada di memori, coba localStorage
    try {
      const offlineDataJSON = localStorage.getItem(`offline_${cacheKey}`);
      if (offlineDataJSON) {
        const { data, timestamp } = JSON.parse(offlineDataJSON);
        sheetDataCache[cacheKey] = data; // Isi cache memori
        offlineTimestamps[cacheKey] = timestamp;
        console.log(
          `OFFLINE: Mengembalikan data dari localStorage untuk sheet: ${cacheKey}`
        );
        return data;
      }
    } catch (e) {
      console.warn(
        `Gagal membaca data offline dari localStorage untuk ${cacheKey}:`,
        e
      );
    }

    // Jika semua gagal, kembalikan array kosong
    console.error(`Gagal total mendapatkan data untuk sheet ${cacheKey}.`);
    return [];
  } finally {
    hideLoader();
  }
}

/**
 * Clears all application data from memory cache and localStorage.
 */
function clearAllCache() {
  console.warn("FORCE REFRESH: Clearing all application cache...");

  // 1. Clear memory cache
  for (const key in sheetDataCache) {
    delete sheetDataCache[key];
  }
  for (const key in offlineTimestamps) {
    delete offlineTimestamps[key];
  }
  console.log("Memory cache cleared.");

  // 2. Clear localStorage cache
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("offline_") || key.startsWith("ptw_offline_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`Removed '${key}' from localStorage.`);
    });
  } catch (e) {
    console.error("Gagal membersihkan localStorage:", e);
  }

  console.log("Cache clearing process completed.");
}

/**
 * Creates and appends a global error toast element to the body if it doesn't exist.
 */
function createErrorToast() {
  if (document.getElementById("error-toast")) return;

  const toast = document.createElement("div");
  toast.id = "error-toast";
  toast.className = "error-toast";
  // Menambahkan ikon dan tombol close ke dalam toast
  toast.innerHTML = `
    <div class="error-icon">⚠️</div>
    <p class="error-message"></p>
    <button class="close-toast-btn" aria-label="Tutup">&times;</button>
  `;
  document.body.appendChild(toast);

  // Tambahkan event listener untuk tombol close
  toast.querySelector(".close-toast-btn").addEventListener("click", () => {
    toast.classList.remove("show");
  });
}

/**
 * Displays a centralized error message to the user and logs the full error.
 * @param {Error} error The error object.
 * @param {string} [userMessage="Terjadi kesalahan. Silakan coba lagi."] A user-friendly message.
 */
function handleError(
  error,
  userMessage = "Terjadi kesalahan. Silakan coba lagi."
) {
  console.error("An error was handled centrally:", error);

  const toast = document.getElementById("error-toast");
  if (!toast) return;

  toast.querySelector(".error-message").textContent = userMessage;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 5000); // Sembunyikan otomatis setelah 5 detik
}

/**
 * Displays a centralized info message to the user.
 * @param {string} message The message to display.
 * @param {number} [duration=3000] The duration in milliseconds.
 */
function showInfoToast(message, duration = 3000) {
  const toast = document.getElementById("error-toast"); // Re-using the toast element
  if (!toast) return;

  toast.querySelector(".error-icon").textContent = "ℹ️"; // Change icon
  toast.querySelector(".error-message").textContent = message;
  toast.className = "error-toast info-toast show"; // Add info class

  setTimeout(() => {
    toast.classList.remove("show");
    // Reset class after hiding
    setTimeout(() => (toast.className = "error-toast"), 500);
  }, duration);
}

/**
 * Loads the navbar from nav.html and inserts it into the header.
 * Also sets the 'active' class on the correct nav button.
 */
async function loadNavbar() {
  const header = document.querySelector("header.minimal-header");
  if (!header) return;

  try {
    const response = await fetch("nav.html");
    if (!response.ok) throw new Error("Gagal memuat navigasi.");
    const navbarHtml = await response.text();
    header.insertAdjacentHTML("beforeend", navbarHtml);

    // Set active class based on current page
    const currentPage = window.location.pathname.split("/").pop();
    const pageKey = currentPage.replace(".html", "").replace(/_/g, "-");
    const navButtonId = `nav-${pageKey}`;
    const activeButton = document.getElementById(navButtonId);
    if (activeButton) {
      activeButton.classList.add("active");
    }
  } catch (error) {
    console.error("Error loading navbar:", error);
    if (header) header.innerHTML += "<p>Gagal memuat navigasi.</p>";
  }
}

/**
 * Loads the footer from footer.html and inserts it after the main content area.
 */
async function loadFooter() {
  // Find a suitable element to insert the footer after
  const mainContent = document.querySelector("main");
  const appContainer = document.getElementById("app"); // For ptw.html
  const matrixContainer = document.querySelector("body > .max-w-full"); // For matrik_kompetensi.html

  const anchorElement = mainContent || appContainer || matrixContainer;

  try {
    const response = await fetch("footer.html");
    if (!response.ok) throw new Error("Gagal memuat footer.");
    const footerHtml = await response.text();

    if (anchorElement) {
      anchorElement.insertAdjacentHTML("afterend", footerHtml);
    } else {
      // Fallback if no specific container is found
      document.body.insertAdjacentHTML("beforeend", footerHtml);
      console.warn(
        "Elemen <main> atau kontainer utama tidak ditemukan, footer ditambahkan di akhir body."
      );
    }
  } catch (error) {
    console.error("Error loading footer:", error);
  }
}

/**
 * Initializes common UI elements and event listeners after shared components are loaded.
 */
function initializeCommonUI() {
  // 1. Role-based Menu Visibility
  const userRole = localStorage.getItem("userRole");
  const matrikNav = document.getElementById("nav-matrik-kompetensi");
  const pelatihanNav = document.getElementById("nav-pelatihan");

  if (userRole === "gam" && matrikNav) {
    matrikNav.style.display = "flex";
  }

  if (userRole === "mitra" && pelatihanNav) {
    pelatihanNav.style.display = "none";
  }

  // 2. Logout Button
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("userRole");
      window.location.href = "index.html";
    });
  }

  // 3. Navbar & Splash Screen Logic
  const navbar = document.querySelector(".navbar");
  const splashScreen = document.querySelector(".splash-screen");

  const onAppReady = () => {
    if (navbar) navbar.classList.add("show");
    // Dispatch a custom event to let other scripts know the UI is ready
    document.dispatchEvent(new CustomEvent("appReady"));
  };

  if (splashScreen) {
    // If there's a splash screen, wait for its animation to end
    splashScreen.addEventListener(
      "animationend",
      () => {
        splashScreen.style.display = "none";
        onAppReady();
      },
      { once: true }
    );
  } else {
    // If no splash screen, consider the app ready immediately
    setTimeout(() => {
      onAppReady();
    }, 100);
  }

  // 4. Buat elemen toast error saat halaman dimuat
  createErrorToast();
}

// Main initialization logic
document.addEventListener("DOMContentLoaded", async () => {
  // Load shared components first
  await Promise.all([loadNavbar(), loadFooter()]);

  // Then, initialize UI elements that depend on them
  initializeCommonUI();
});

/**
 * Initializes common UI elements and event listeners after shared components are loaded.
 */
function initializeCommonUI() {
  // 1. Role-based Menu Visibility
  const userRole = localStorage.getItem("userRole");
  const matrikNav = document.getElementById("nav-matrik-kompetensi");
  const pelatihanNav = document.getElementById("nav-pelatihan");

  if (userRole === "gam" && matrikNav) {
    matrikNav.style.display = "flex";
  }

  if (userRole === "mitra" && pelatihanNav) {
    pelatihanNav.style.display = "none";
  }

  // 2. Logout Button
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("userRole");
      window.location.href = "index.html";
    });
  }

  // 3. Navbar & Splash Screen Logic
  const navbar = document.querySelector(".navbar");
  const splashScreen = document.querySelector(".splash-screen");

  const onAppReady = () => {
    if (navbar) navbar.classList.add("show");
    // Dispatch a custom event to let other scripts know the UI is ready
    document.dispatchEvent(new CustomEvent("appReady"));
  };

  if (splashScreen) {
    // If there's a splash screen, wait for its animation to end
    splashScreen.addEventListener(
      "animationend",
      () => {
        splashScreen.style.display = "none";
        onAppReady();
      },
      { once: true }
    );
  } else {
    // If no splash screen, consider the app ready immediately
    setTimeout(() => {
      onAppReady();
    }, 100);
  }

  // 4. Buat elemen toast error saat halaman dimuat
  createErrorToast();
}
