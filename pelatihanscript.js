window.addEventListener('DOMContentLoaded', () => {
  const SHEET_SOURCES = {
    jadwal_training: {
      id: "1rYjpyZMyvOHibsF-z_y-sAH9PZd1m79KNk_UB8_K5lM",
      sheet: "jadwal_training"
    }
  };

  const calendarDays = document.getElementById("calendarDays");
  const monthYear = document.getElementById("monthYear");
  const modal = document.getElementById("modal");
  const closeModal = document.getElementById("closeModal");

  let currentDate = new Date();
  let eventsByDate = {};
  let allEvents = [];
  let selectedPIC = "";
  let selectedRoom = "";

  closeModal.onclick = () => (modal.style.display = "none");
  window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
  };

  function formatTanggal(tanggal) {
    const [bulan, hari, tahun] = tanggal.split('/');
    return `${tahun}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`;
  }

  function getTanggalRange(start, end) {
    const dates = [];
    let current = new Date(start);
    const last = new Date(end);

    while (current <= last) {
      const iso = current.toISOString().split('T')[0];
      dates.push(iso);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  function getColorForKey(key) {
    const colors = [
      "#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#c2185b",
      "#0097a7", "#5d4037", "#455a64", "#d32f2f", "#0288d1"
    ];
    const hash = [...key].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  function showModal(dataList) {
    const title = document.getElementById("modalTitle");
    const date = document.getElementById("modalDate");
    const room = document.getElementById("modalRoom");
    const participants = document.getElementById("modalParticipants");
    const pic = document.getElementById("modalPIC");
    const agenda = document.getElementById("modalAgenda");

    if (dataList.length === 1) {
      const data = dataList[0];
      title.textContent = data.nama_kegiatan;
      date.textContent = `${data.tanggal_mulai} s.d. ${data.tanggal_selesai}`;
      room.textContent = data.ruangan;
      participants.textContent = data.jumlah_peserta;
      pic.textContent = data.pic;
    } else {
      title.textContent = `Ada ${dataList.length} kegiatan`;
      date.textContent = "";
      room.textContent = "";
      participants.textContent = "";
      pic.textContent = "";

      const container = document.createElement("div");
      dataList.forEach(item => {
        const p = document.createElement("p");
        p.innerHTML = `<strong>${item.nama_kegiatan}</strong><br>
          ${item.tanggal_mulai} s.d. ${item.tanggal_selesai}<br>
          Ruangan: ${item.ruangan}<br>
          Peserta: ${item.jumlah_peserta}<br>
          PIC: ${item.pic}<br><br>`;
        container.appendChild(p);
      });

      const modalContent = document.querySelector(".modal-content");
      modalContent.appendChild(container);
    }

    modal.style.display = "flex";
  }

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthYear.textContent = currentDate.toLocaleString("id-ID", {
      month: "long",
      year: "numeric"
    });

    calendarDays.innerHTML = "";

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      calendarDays.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEl = document.createElement("div");
      dayEl.className = "day";
      dayEl.innerHTML = `<div class="date-number">${day}</div>`;

      if (eventsByDate[dateStr]) {
        dayEl.classList.add("has-event");

        eventsByDate[dateStr].forEach(event => {
          const label = document.createElement("div");
          label.className = "event-label";
          label.textContent = event.nama_kegiatan;
          label.style.backgroundColor = getColorForKey(event.nama_kegiatan);
          dayEl.appendChild(label);
        });

        dayEl.onclick = () => showModal(eventsByDate[dateStr]);
      }

      calendarDays.appendChild(dayEl);
    }
  }

  function applyFilters() {
    eventsByDate = {};
    allEvents.forEach(item => {
      if (
        (selectedPIC && item.pic !== selectedPIC) ||
        (selectedRoom && item.ruangan !== selectedRoom)
      ) return;

      const range = getTanggalRange(item.tanggal_mulai, item.tanggal_selesai);
      range.forEach(tgl => {
        if (!eventsByDate[tgl]) eventsByDate[tgl] = [];
        eventsByDate[tgl].push(item);
      });
    });

    renderCalendar();
  }

  function isiDropdownFilter(data) {
    const picSet = new Set();
    const roomSet = new Set();

    data.forEach(item => {
      picSet.add(item.pic);
      roomSet.add(item.ruangan);
    });

    const picSelect = document.getElementById("filterPIC");
    const roomSelect = document.getElementById("filterRoom");

    [...picSet].sort().forEach(pic => {
      const opt = document.createElement("option");
      opt.value = pic;
      opt.textContent = pic;
      picSelect.appendChild(opt);
    });

    [...roomSet].sort().forEach(room => {
      const opt = document.createElement("option");
      opt.value = room;
      opt.textContent = room;
      roomSelect.appendChild(opt);
    });

    picSelect.addEventListener("change", e => {
      selectedPIC = e.target.value;
      applyFilters();
    });

    roomSelect.addEventListener("change", e => {
      selectedRoom = e.target.value;
      applyFilters();
    });
  }

  async function ambilData(sheetKey, sheetName) {
    const url = `https://opensheet.elk.sh/${sheetKey}/${sheetName}`;
    const res = await fetch(url);
    return await res.json();
  }

  document.getElementById("prevMonth").onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  };

  document.getElementById("nextMonth").onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  };

  (async () => {
    const sumber = SHEET_SOURCES.jadwal_training;
    const data = await ambilData(sumber.id, sumber.sheet);
    allEvents = data.map(item => ({
      ...item,
      tanggal_mulai: formatTanggal(item.tanggal_mulai),
      tanggal_selesai: formatTanggal(item.tanggal_selesai)
    }));
    isiDropdownFilter(allEvents);
    applyFilters();
  })();
});
