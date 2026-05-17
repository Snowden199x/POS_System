(function () {
  "use strict";

  // ── CHART COLORS ───────────────────────────────────────────────────────
  const GREEN = "#1C3924";
  const GOLD = "#C99813";
  const GOLD_T = "rgba(216,195,111,0.18)";
  const MODAL_BG = "#F4EFD7";
  const CHIP_BORDER = "#DDD3AF";

  // ── TREND LINE CHART ───────────────────────────────────────────────────
  let trendChart = null;

  function buildTrendData(mode) {
    if (mode === "weekly") {
      return {
        labels: WEEKLY_DATA.map((w) => {
          const s = new Date(w.week_start);
          const e = new Date(w.week_end);
          const fmt = (d) =>
            `${d.toLocaleString("en", { month: "short" })} ${d.getDate()}`;
          return `${fmt(s)} – ${fmt(e)}`;
        }),
        values: WEEKLY_DATA.map((w) => parseFloat(w.total_sales)),
      };
    } else {
      const mNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return {
        labels: MONTHLY_DATA.map((m) => mNames[m.mo - 1]),
        values: MONTHLY_DATA.map((m) => parseFloat(m.total_sales)),
      };
    }
  }

  function renderTrendChart(mode) {
    const ctx = document.getElementById("trendChart");
    if (!ctx) return;
    const { labels, values } = buildTrendData(mode);
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: GREEN,
            backgroundColor: GOLD_T,
            pointBackgroundColor: GREEN,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.3,
            fill: true,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => `₱${ctx.parsed.y.toLocaleString()}` },
          },
          datalabels: false,
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => `₱${(v / 1000).toFixed(0)}k`,
              font: { family: "Poppins", size: 11 },
              color: "#5A6B5E",
            },
            grid: { color: "rgba(0,0,0,0.05)" },
            beginAtZero: true,
          },
          x: {
            ticks: { font: { family: "Poppins", size: 11 }, color: "#5A6B5E" },
            grid: { display: false },
          },
        },
      },
    });
  }

  window.switchTrend = function (mode) {
    renderTrendChart(mode);
  };

  // ── BAR CHART (dashboard) ──────────────────────────────────────────────
  let barChart = null;

  function buildBarData(mode) {
    if (mode === "weekly") {
      return {
        labels: WEEKLY_DATA.map((w) => {
          const s = new Date(w.week_start);
          return `${s.toLocaleString("en", { month: "short" })} ${s.getDate()}`;
        }),
        values: WEEKLY_DATA.map((w) => parseFloat(w.total_sales)),
      };
    } else {
      return {
        labels: DAILY_DATA.map((d) => {
          const dt = new Date(d.sale_date);
          return `${dt.toLocaleString("en", { month: "short" })} ${dt.getDate()}`;
        }),
        values: DAILY_DATA.map((d) => parseFloat(d.total_sales)),
      };
    }
  }

  function renderBarChart(mode) {
    const ctx = document.getElementById("barChart");
    if (!ctx) return;
    const { labels, values } = buildBarData(mode);
    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: GOLD,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 48,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => `₱${ctx.parsed.y.toLocaleString()}` },
          },
          datalabels: false,
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => `₱${(v / 1000).toFixed(0)}k`,
              font: { family: "Poppins", size: 11 },
              color: "#5A6B5E",
            },
            grid: { color: "rgba(0,0,0,0.05)" },
            beginAtZero: true,
          },
          x: {
            ticks: { font: { family: "Poppins", size: 11 }, color: "#5A6B5E" },
            grid: { display: false },
          },
        },
      },
    });
  }

  window.switchBarView = function (mode) {
    renderBarChart(mode);
  };

  // ── SECTION BAR CHART ──────────────────────────────────────────────────
  let sectionBarChart = null;

  function renderSectionBarChart() {
    const ctx = document.getElementById("sectionBarChart");
    if (!ctx) return;
    if (!BAR_DATA || BAR_DATA.length === 0) {
      ctx.parentElement.style.display = "none";
      return;
    }
    const labels = BAR_DATA.map((d) => {
      const dt = new Date(d.d);
      return `${dt.toLocaleString("en", { month: "short" })} ${dt.getDate()}`;
    });
    const values = BAR_DATA.map((d) => parseInt(d.cnt));
    if (sectionBarChart) sectionBarChart.destroy();
    sectionBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: GOLD,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 29,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} orders` } },
          datalabels: false,
        },
        scales: {
          y: {
            ticks: {
              stepSize: 1,
              font: { family: "Poppins", size: 11 },
              color: "#5A6B5E",
            },
            grid: { color: "rgba(0,0,0,0.05)" },
            beginAtZero: true,
          },
          x: {
            ticks: {
              font: { family: "Poppins", size: 10 },
              color: "#5A6B5E",
              maxRotation: 0,
              padding: 8,
            },
            grid: { display: false },
          },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  LIVE ORDERS — opens in a new browser tab
  // ══════════════════════════════════════════════════════════════════════
  window.openLiveOrders = function () {
    // Adjust the path below to match your actual project structure.
    // Since your index.php routes pages, we open the direct file path.
    window.open(
      "/Github/POS_SYSTEM/modules/statistics/live_orders.php",
      "_blank",
      "noopener,noreferrer",
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  //  EXCEL EXPORT — dropdown popover (no big modal), then auto-download
  // ══════════════════════════════════════════════════════════════════════

  // Build a small year-selector + report-type popover anchored to the button
  window.openExcelModal = function () {
    const btn = document.getElementById("excel-export-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Preparing...";
    }

    fetch("index.php?page=statistics&excel_report=1", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then((r) => r.json())
      .then((data) => {
        buildAllSheetsExcel(data);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Excel Report`;
        }
      })
      .catch(() => {
        if (btn) {
          btn.disabled = false;
        }
        alert("Failed to generate report. Please try again.");
      });
  };
  function buildAllSheetsExcel(data) {
    const wb = XLSX.utils.book_new();
    const mNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const today = data.today || new Date().toISOString().split("T")[0];
    const year = data.year || new Date().getFullYear();
    const month = data.month || new Date().getMonth() + 1;

    // ── HELPERS ──────────────────────────────────────────────────────────
    function makeSheet(titleText, headers, rows, colWidths, statusColIdx) {
      const aoa = [[titleText], [], headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = colWidths.map((w) => ({ wch: w }));
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      ];
      ws["!autofilter"] = { ref: `K3:K3` };
      const range = XLSX.utils.decode_range(ws["!ref"]);

      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) ws[addr] = { v: "", t: "s" };
          if (!ws[addr].s) ws[addr].s = {};

          // All cells: border + font
          ws[addr].s.border = {
            top: { style: "thin", color: { rgb: "D0C8A0" } },
            bottom: { style: "thin", color: { rgb: "D0C8A0" } },
            left: { style: "thin", color: { rgb: "D0C8A0" } },
            right: { style: "thin", color: { rgb: "D0C8A0" } },
          };
          ws[addr].s.font = { name: "Calibri", sz: 11 };
          ws[addr].s.alignment = { vertical: "center" };

          // Row 0: Title
          if (R === 0) {
            ws[addr].s.fill = { fgColor: { rgb: "1C3924" } };
            ws[addr].s.font = {
              name: "Calibri",
              sz: 13,
              bold: true,
              color: { rgb: "FFFFFF" },
            };
            ws[addr].s.alignment = { horizontal: "center", vertical: "center" };
          }
          // Row 2: Headers
          else if (R === 2) {
            ws[addr].s.fill = { fgColor: { rgb: "1C3924" } };
            ws[addr].s.font = {
              name: "Calibri",
              sz: 11,
              bold: true,
              color: { rgb: "FFFFFF" },
            };
            ws[addr].s.alignment = {
              horizontal: "center",
              vertical: "center",
              wrapText: true,
            };
          }
          // Data rows
          else if (R > 2) {
            const isEven = R % 2 === 0;
            ws[addr].s.fill = {
              fgColor: { rgb: isEven ? "FFFBEF" : "FFFFFF" },
            };
            ws[addr].s.alignment = { horizontal: "center", vertical: "center", wrapText: true };

            // Status column coloring
            if (statusColIdx !== null && C === statusColIdx) {
              const val = (ws[addr].v || "").toString().toLowerCase();
              if (val === "served") {
                ws[addr].s.font = {
                  name: "Calibri",
                  sz: 11,
                  bold: true,
                  color: { rgb: "2D6A2D" },
                };
                ws[addr].s.fill = { fgColor: { rgb: "EFFAD4" } };
              }
              if (val === "pending") {
                ws[addr].s.font = {
                  name: "Calibri",
                  sz: 11,
                  bold: true,
                  color: { rgb: "A88A20" },
                };
                ws[addr].s.fill = { fgColor: { rgb: "FFF8DC" } };
              }
              if (val === "voided") {
                ws[addr].s.font = {
                  name: "Calibri",
                  sz: 11,
                  bold: true,
                  color: { rgb: "980E0E" },
                };
                ws[addr].s.fill = { fgColor: { rgb: "FFE8E8" } };
              }
            }
          }
        }
      }

      // Row heights
      ws["!rows"] = [];
      for (let R = range.s.r; R <= range.e.r; R++) {
        if (R === 0) ws["!rows"][R] = { hpt: 28 };
        else if (R === 2) ws["!rows"][R] = { hpt: 22 };
        else ws["!rows"][R] = { hpt: 18 };
      }

      return ws;
    }

    // ── SHEET 1: ORDERS ──────────────────────────────────────────────────
    const orderHeaders = [
      "Order ID",
      "Beeper #",
      "Items",
      "Order Type",
      "Payment",
      "Subtotal",
      "Discount",
      "Total",
      "Change",
      "Status",
      "Date Ordered",
      "Date Served",
    ];
    const orderRows = (data.orders || []).map((o) => [
      o.id,
      o.beeper_number,
      o.items_str || "",
      o.order_type === "dine-in" ? "Dine In" : "Take Out",
      ucfirst(o.payment_method),
      parseFloat(o.subtotal || 0),
      parseFloat(o.discount || 0),
      parseFloat(o.total || 0),
      parseFloat(o.change_amount || 0),
      ucfirst(o.status),
      o.created_at ? o.created_at.split(" ")[0] : "",
      o.served_at ? o.served_at.split(" ")[0] : "—",
    ]);
    const ws1 = makeSheet(
      `TWIST & ROLL POS — Orders for ${mNames[month-1]} ${year}`,
      orderHeaders,
      orderRows,
      [10, 10, 45, 12, 12, 12, 12, 12, 12, 12, 22, 22],
      9, // status col index
    );
    XLSX.utils.book_append_sheet(wb, ws1, "Orders");

    // ── SHEET 2: WEEKLY ───────────────────────────────────────────────────
    const weeklyHeaders = [
      "Week #",
      "Week Start",
      "Week End",
      "Total Orders",
      "Served",
      "Pending",
      "Voided",
      "Total Sales (₱)",
      "Total Discounts (₱)",
    ];
    const weeklyRows = (data.weekly || []).map((w, i) => [
      i + 1,
      w.week_start,
      w.week_end,
      parseInt(w.total_orders || 0),
      parseInt(w.served || 0),
      parseInt(w.pending || 0),
      parseInt(w.voided || 0),
      parseFloat(w.total_sales || 0),
      parseFloat(w.total_discounts || 0),
    ]);
    const ws2 = makeSheet(
      `TWIST & ROLL POS — Weekly Summary ${year}`,
      weeklyHeaders,
      weeklyRows,
      [8, 14, 14, 14, 10, 10, 10, 18, 20],
      null,
    );
    XLSX.utils.book_append_sheet(wb, ws2, "Weekly Summary");

    // ── SHEET 3: MONTHLY ──────────────────────────────────────────────────
    const monthlyHeaders = [
      "Month",
      "Total Orders",
      "Served",
      "Pending",
      "Voided",
      "Total Sales (₱)",
      "Total Discounts (₱)",
      "Avg Order (₱)",
    ];
    const monthlyRows = (data.monthly || []).map((m) => [
      mNames[m.mo - 1],
      parseInt(m.total_orders || 0),
      parseInt(m.served || 0),
      parseInt(m.pending || 0),
      parseInt(m.voided || 0),
      parseFloat(m.total_sales || 0),
      parseFloat(m.total_discounts || 0),
      parseFloat(m.avg_order || 0),
    ]);
    const ws3 = makeSheet(
      `TWIST & ROLL POS — Monthly Summary ${year}`,
      monthlyHeaders,
      monthlyRows,
      [14, 14, 10, 10, 10, 18, 20, 16],
      null,
    );
    XLSX.utils.book_append_sheet(wb, ws3, "Monthly Summary");

    // ── SHEET 4: ANNUAL ───────────────────────────────────────────────────
    const annualHeaders = [
      "Year",
      "Total Orders",
      "Served",
      "Pending",
      "Voided",
      "Total Sales (₱)",
      "Total Discounts (₱)",
    ];
    const annualRows = (data.annual || []).map((a) => [
      a.yr,
      parseInt(a.total_orders || 0),
      parseInt(a.served || 0),
      parseInt(a.pending || 0),
      parseInt(a.voided || 0),
      parseFloat(a.total_sales || 0),
      parseFloat(a.total_discounts || 0),
    ]);
    const ws4 = makeSheet(
      `TWIST & ROLL POS — Annual Summary`,
      annualHeaders,
      annualRows,
      [10, 14, 10, 10, 10, 18, 20],
      null,
    );
    XLSX.utils.book_append_sheet(wb, ws4, "Annual Summary");

    // ── SHEET 5: TOP ITEMS ────────────────────────────────────────────────
    const topHeaders = [
      "Rank",
      "Item Name",
      "Total Qty Sold",
      "Total Revenue (₱)",
    ];
    const topRows = (data.top_items || []).map((item, i) => [
      i + 1,
      item.name,
      parseInt(item.total_qty || 0),
      parseFloat(item.total_revenue || 0),
    ]);
    const ws5 = makeSheet(
      `TWIST & ROLL POS — Top Items for ${mNames[month - 1]} ${year}`,
      topHeaders,
      topRows,
      [8, 30, 16, 20],
      null,
    );
    XLSX.utils.book_append_sheet(wb, ws5, "Top Items");

    // ── DOWNLOAD ──────────────────────────────────────────────────────────
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    XLSX.writeFile(wb, `TwistandRoll_Report_${dateStr}.xlsx`);
  }

  function positionPopover(popover, anchor) {
    const rect = anchor.getBoundingClientRect();
    const pw = 300;
    let left = rect.right - pw;
    if (left < 8) left = 8;
    popover.style.top = rect.bottom + 8 + "px";
    popover.style.left = left + "px";
  }

  function outsideClickHandler(e) {
    const pop = document.getElementById("excel-popover");
    const btn = document.getElementById("excel-export-btn");
    if (
      pop &&
      !pop.contains(e.target) &&
      e.target !== btn &&
      !btn?.contains(e.target)
    ) {
      closeExcelPopover();
    }
  }

  function closeExcelPopover() {
    const pop = document.getElementById("excel-popover");
    if (pop) pop.remove();
    document.removeEventListener("click", outsideClickHandler);
  }

  // ── ACTUAL DOWNLOAD ────────────────────────────────────────────────────
  function triggerExcelDownload(type, year) {
    const status = document.getElementById("ep-status");
    if (status) {
      status.style.display = "flex";
      status.innerHTML = `<div class="ep-spinner"></div> Preparing ${type} report…`;
    }

    // Disable all ep-btns while loading
    document
      .querySelectorAll(".ep-btn[data-type]")
      .forEach((b) => (b.disabled = true));

    fetch(`index.php?page=statistics&excel_data=${type}&year=${year}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then((r) => r.json())
      .then((data) => {
        buildExcel(type, data, year);
        if (status) {
          status.innerHTML = `✅ Download started!`;
          setTimeout(() => {
            status.style.display = "none";
            document
              .querySelectorAll(".ep-btn[data-type]")
              .forEach((b) => (b.disabled = false));
          }, 3000);
        }
      })
      .catch(() => {
        if (status) {
          status.innerHTML = `⚠️ Failed. Please try again.`;
          setTimeout(() => {
            status.style.display = "none";
            document
              .querySelectorAll(".ep-btn[data-type]")
              .forEach((b) => (b.disabled = false));
          }, 3000);
        }
      });
  }

  function buildExcel(type, data, year) {
    const wb = XLSX.utils.book_new();
    const mNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    if (type === "orders") {
      const rows = [
        [
          "#",
          "Beeper #",
          "Date & Time",
          "Order Type",
          "Payment",
          "Subtotal",
          "Discount",
          "Total",
          "Status",
          "Items",
        ],
      ];
      (data.orders || []).forEach((o, i) => {
        rows.push([
          i + 1,
          o.beeper_number,
          o.created_at,
          o.order_type === "dine-in" ? "Dine In" : "Take Out",
          ucfirst(o.payment_method),
          parseFloat(o.subtotal || 0),
          parseFloat(o.discount || 0),
          parseFloat(o.total || 0),
          ucfirst(o.status),
          o.items_str || "",
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      styleSheet(ws);
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
    } else if (type === "weekly") {
      const rows = [
        ["Week #", "Week Start", "Week End", "Total Orders", "Total Sales (₱)"],
      ];
      (data.weekly || []).forEach((w, i) => {
        rows.push([
          i + 1,
          w.week_start,
          w.week_end,
          parseInt(w.order_count),
          parseFloat(w.total_sales),
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      styleSheet(ws);
      XLSX.utils.book_append_sheet(wb, ws, "Weekly");
    } else if (type === "monthly") {
      const rows = [["Month", "Total Orders", "Total Sales (₱)"]];
      (data.monthly || []).forEach((m) => {
        rows.push([
          mNames[m.mo - 1],
          parseInt(m.order_count),
          parseFloat(m.total_sales),
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      styleSheet(ws);
      XLSX.utils.book_append_sheet(wb, ws, "Monthly");
    } else if (type === "annual") {
      const summaryRows = [
        ["Month", "Orders", "Served", "Voided", "Total Sales (₱)"],
      ];
      (data.months || []).forEach((m) => {
        summaryRows.push([
          mNames[m.mo - 1],
          parseInt(m.orders || 0),
          parseInt(m.served || 0),
          parseInt(m.voids || 0),
          parseFloat(m.total || 0),
        ]);
      });
      summaryRows.push([
        "TOTAL",
        summaryRows.slice(1).reduce((s, r) => s + r[1], 0),
        summaryRows.slice(1).reduce((s, r) => s + r[2], 0),
        summaryRows.slice(1).reduce((s, r) => s + r[3], 0),
        summaryRows.slice(1).reduce((s, r) => s + r[4], 0),
      ]);
      const ws = XLSX.utils.aoa_to_sheet(summaryRows);
      styleSheet(ws);
      XLSX.utils.book_append_sheet(wb, ws, `Annual ${year}`);

      if (data.orders_by_month) {
        Object.entries(data.orders_by_month).forEach(([mo, orders]) => {
          const moRows = [
            [
              "#",
              "Beeper #",
              "Date & Time",
              "Order Type",
              "Payment",
              "Total",
              "Status",
            ],
          ];
          orders.forEach((o, i) => {
            moRows.push([
              i + 1,
              o.beeper_number,
              o.created_at,
              o.order_type === "dine-in" ? "Dine In" : "Take Out",
              ucfirst(o.payment_method),
              parseFloat(o.total),
              ucfirst(o.status),
            ]);
          });
          const ws2 = XLSX.utils.aoa_to_sheet(moRows);
          styleSheet(ws2);
          XLSX.utils.book_append_sheet(
            wb,
            ws2,
            mNames[parseInt(mo) - 1].substring(0, 3),
          );
        });
      }
    }

    const filename = `TwistandRoll_${ucfirst(type)}_Report_${year}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  function styleSheet(ws) {
    ws["!cols"] = [5, 10, 22, 14, 14, 16, 12, 16, 12, 50].map((w) => ({
      wch: w,
    }));
  }

  // ── FILTER STATES ──────────────────────────────────────────────────────
  let selectedOrderType = "all";
  let selectedPaymentMethod = "all";
  let selectedStatus = "all";
  let selectedDateFrom = "";
  let selectedDateTo = "";

  function activateChip(chip) {
    chip.style.background = GOLD;
    chip.style.color = "#fff";
    chip.style.borderColor = GOLD;
  }
  function deactivateChip(chip) {
    chip.style.background = "#F8F4E4";
    chip.style.color = GOLD;
    chip.style.borderColor = CHIP_BORDER;
  }

  // ── FILTER MODAL ───────────────────────────────────────────────────────
  window.filterTable = function () {
    if (document.getElementById("filter-modal-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "filter-modal-overlay";
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px);`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeFilterModal();
    });

    overlay.innerHTML = `
      <div style="width:560px;max-width:90vw;background:${MODAL_BG};border-radius:28px;overflow:hidden;box-shadow:0 25px 70px rgba(0,0,0,0.18);font-family:Poppins,sans-serif;">
        <div style="padding:22px 28px 16px;display:flex;align-items:center;gap:14px;">
          <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
            <svg width="24" height="24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2" fill="#111"/><circle cx="15" cy="12" r="2" fill="#111"/><circle cx="11" cy="18" r="2" fill="#111"/></svg>
          </div>
          <div style="font-size:19px;font-weight:700;color:${GREEN};">Filter</div>
        </div>
        <div style="height:1px;background:#D9D2B8;"></div>
        <div style="padding:28px 38px 24px;">
          <div style="font-size:15px;font-weight:700;color:${GREEN};margin-bottom:22px;">Filter by:</div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;gap:18px;">
            <div style="display:flex;align-items:center;gap:14px;width:190px;">
              <div style="width:48px;height:48px;border-radius:50%;background:#E8DDB7;display:flex;align-items:center;justify-content:center;">
                <svg width="24" height="24" fill="none" stroke="${GOLD}" stroke-width="2.2"><rect x="4" y="6" width="18" height="16" rx="2"></rect><line x1="4" y1="11" x2="22" y2="11"></line><line x1="8" y1="3" x2="8" y2="8"></line><line x1="18" y1="3" x2="18" y2="8"></line></svg>
              </div>
              <div style="font-size:15px;font-weight:600;color:${GREEN};">Date</div>
            </div>
            <div style="flex:1;display:flex;align-items:center;gap:10px;">
              <input type="date" id="filter-date-from" value="${selectedDateFrom}" style="flex:1;height:40px;border-radius:12px;border:1.5px solid ${CHIP_BORDER};padding:0 12px;font-family:Poppins,sans-serif;background:white;color:${GREEN};">
              <span style="font-size:12px;color:#777;">to</span>
              <input type="date" id="filter-date-to" value="${selectedDateTo}" style="flex:1;height:40px;border-radius:12px;border:1.5px solid ${CHIP_BORDER};padding:0 12px;font-family:Poppins,sans-serif;background:white;color:${GREEN};">
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;gap:18px;">
            <div style="display:flex;align-items:center;gap:14px;width:190px;">
              <div style="width:48px;height:48px;border-radius:50%;background:#E8DDB7;display:flex;align-items:center;justify-content:center;">
                <svg width="26" height="26" fill="none" stroke="${GOLD}" stroke-width="2"><path d="M5 10h18l-2 11H7L5 10Z"></path><path d="M9 10a5 5 0 0 1 10 0"></path></svg>
              </div>
              <div style="font-size:15px;font-weight:600;color:${GREEN};">Order type</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="filter-chip" data-group="order-type" data-value="all">All</button>
              <button class="filter-chip" data-group="order-type" data-value="dine in">Dine in</button>
              <button class="filter-chip" data-group="order-type" data-value="take out">Take out</button>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;gap:18px;">
            <div style="display:flex;align-items:center;gap:14px;width:190px;">
              <div style="width:48px;height:48px;border-radius:50%;background:#E8DDB7;display:flex;align-items:center;justify-content:center;">
                <svg width="26" height="26" fill="none" stroke="${GOLD}" stroke-width="2"><rect x="4" y="7" width="20" height="14" rx="3"></rect><line x1="4" y1="11" x2="24" y2="11"></line></svg>
              </div>
              <div style="font-size:15px;font-weight:600;color:${GREEN};">Payment Method</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="filter-chip" data-group="payment" data-value="all">All</button>
              <button class="filter-chip" data-group="payment" data-value="cash">Cash</button>
              <button class="filter-chip" data-group="payment" data-value="gcash">GCash</button>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:30px;gap:18px;">
            <div style="display:flex;align-items:center;gap:14px;width:190px;">
              <div style="width:48px;height:48px;border-radius:50%;background:#E8DDB7;display:flex;align-items:center;justify-content:center;">
                <svg width="26" height="26" fill="none" stroke="${GOLD}" stroke-width="2.5"><circle cx="14" cy="14" r="10"></circle><path d="M9 14l3 3 7-7"></path></svg>
              </div>
              <div style="font-size:15px;font-weight:600;color:${GREEN};">Status</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="filter-chip" data-group="status" data-value="all">All</button>
              <button class="filter-chip" data-group="status" data-value="served">Served</button>
              <button class="filter-chip" data-group="status" data-value="voided">Voided</button>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button onclick="clearFilter()" style="height:40px;padding:0 16px;border-radius:999px;border:1.5px solid ${CHIP_BORDER};background:#F8F4E4;color:${GREEN};font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">↺ Reset</button>
            <button onclick="applyFilter()" style="height:40px;padding:0 20px;border:none;border-radius:999px;background:${GREEN};color:white;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">Apply</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.style.cssText += `height:38px;min-width:80px;padding:0 14px;border-radius:10px;border:1.5px solid ${CHIP_BORDER};background:#F8F4E4;color:${GOLD};font-family:Poppins,sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:0.15s ease;`;
      const group = chip.dataset.group;
      const value = chip.dataset.value;
      let active = false;
      if (group === "order-type" && value === selectedOrderType) active = true;
      if (group === "payment" && value === selectedPaymentMethod) active = true;
      if (group === "status" && value === selectedStatus) active = true;
      if (active) activateChip(chip);
      else deactivateChip(chip);
      chip.addEventListener("click", () => {
        document
          .querySelectorAll(`.filter-chip[data-group="${group}"]`)
          .forEach((c) => deactivateChip(c));
        activateChip(chip);
        if (group === "order-type") selectedOrderType = value;
        if (group === "payment") selectedPaymentMethod = value;
        if (group === "status") selectedStatus = value;
      });
    });
  };

  window.closeFilterModal = function () {
    const modal = document.getElementById("filter-modal-overlay");
    if (modal) modal.remove();
  };

  window.applyFilter = function () {
    const from = document.getElementById("filter-date-from")?.value || "";
    const to = document.getElementById("filter-date-to")?.value || "";
    selectedDateFrom = from;
    selectedDateTo = to;
    getAllTableRows().forEach((row) => {
      let show = true;
      const dateCell = row.cells[1];
      const orderTypeCell = row.cells[2];
      const paymentCell = row.cells[3];
      const statusCell = row.cells[5];
      if (dateCell) {
        const parsed = Date.parse(dateCell.textContent.trim());
        const rowDate = isNaN(parsed) ? null : new Date(parsed);
        if (rowDate) {
          const rowDateOnly = rowDate.toISOString().split("T")[0];
          if (from && rowDateOnly < from) show = false;
          if (to && rowDateOnly > to) show = false;
        }
      }
      if (selectedOrderType !== "all" && orderTypeCell) {
        if (
          orderTypeCell.textContent.trim().toLowerCase() !== selectedOrderType
        )
          show = false;
      }
      if (selectedPaymentMethod !== "all" && paymentCell) {
        if (
          paymentCell.textContent.trim().toLowerCase() !== selectedPaymentMethod
        )
          show = false;
      }
      if (selectedStatus !== "all" && statusCell) {
        if (statusCell.textContent.trim().toLowerCase() !== selectedStatus)
          show = false;
      }
      row.dataset.filtered = show ? "1" : "0";
    });
    renderTablePage(1);
    closeFilterModal();
  };

  window.clearFilter = function () {
    selectedOrderType = "all";
    selectedPaymentMethod = "all";
    selectedStatus = "all";
    selectedDateFrom = "";
    selectedDateTo = "";
    getAllTableRows().forEach((r) => {
      r.dataset.filtered = "1";
    });
    renderTablePage(1);
    closeFilterModal();
  };

  // ══════════════════════════════════════════════════════════════════════
  //  TABLE PAGINATION
  // ══════════════════════════════════════════════════════════════════════
  const TABLE_PER_PAGE = 10;
  let tablePage = 1;

  function getAllTableRows() {
    return Array.from(
      document.querySelectorAll("#orders-table tbody tr"),
    ).filter((r) => !r.querySelector(".table-empty"));
  }

  function renderTablePage(page) {
    tablePage = page;
    const allRows = getAllTableRows();
    const filteredRows = allRows.filter((r) => r.dataset.filtered !== "0");
    const totalPages = Math.max(
      1,
      Math.ceil(filteredRows.length / TABLE_PER_PAGE),
    );
    if (tablePage > totalPages) tablePage = totalPages;
    const start = (tablePage - 1) * TABLE_PER_PAGE;
    const end = start + TABLE_PER_PAGE;
    allRows.forEach((r) => (r.style.display = "none"));
    filteredRows.forEach((r, i) => {
      r.style.display = i >= start && i < end ? "" : "none";
    });
    renderTablePagination(tablePage, totalPages, filteredRows.length);
  }

  function renderTablePagination(page, totalPages, total) {
    let container = document.getElementById("orders-table-pagination");
    if (!container) {
      container = document.createElement("div");
      container.id = "orders-table-pagination";
      container.className = "table-pagination";
      const wrap = document.querySelector(".orders-list-wrap");
      if (wrap) wrap.appendChild(container);
    }
    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }
    const prevDisabled = page === 1 ? "disabled" : "";
    const nextDisabled = page === totalPages ? "disabled" : "";
    const delta = 2;
    let pageNums = [];
    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    )
      pageNums.push(i);
    let btnHTML = "";
    if (pageNums[0] > 1) {
      btnHTML += `<button class="tpg-btn" data-p="1">1</button>`;
      if (pageNums[0] > 2) btnHTML += `<span class="tpg-ellipsis">…</span>`;
    }
    pageNums.forEach((p) => {
      btnHTML += `<button class="tpg-btn ${p === page ? "tpg-btn--active" : ""}" data-p="${p}">${p}</button>`;
    });
    if (pageNums[pageNums.length - 1] < totalPages) {
      if (pageNums[pageNums.length - 1] < totalPages - 1)
        btnHTML += `<span class="tpg-ellipsis">…</span>`;
      btnHTML += `<button class="tpg-btn" data-p="${totalPages}">${totalPages}</button>`;
    }
    const showing =
      total === 0
        ? "No orders found"
        : `Showing ${(page - 1) * TABLE_PER_PAGE + 1}–${Math.min(page * TABLE_PER_PAGE, total)} of ${total} orders`;
    container.innerHTML = `
      <div class="tpg-info">${showing}</div>
      <div class="tpg-controls">
        <button class="tpg-arrow" id="tpg-prev" ${prevDisabled}>&#8592;</button>
        ${btnHTML}
        <button class="tpg-arrow" id="tpg-next" ${nextDisabled}>&#8594;</button>
      </div>
    `;
    container
      .querySelector("#tpg-prev")
      ?.addEventListener("click", () => renderTablePage(tablePage - 1));
    container
      .querySelector("#tpg-next")
      ?.addEventListener("click", () => renderTablePage(tablePage + 1));
    container
      .querySelectorAll(".tpg-btn")
      .forEach((b) =>
        b.addEventListener("click", () =>
          renderTablePage(parseInt(b.dataset.p)),
        ),
      );
  }

  // ── SIDEBAR TREE ───────────────────────────────────────────────────────
  window.toggleMonth = function (yr, num) {
    const children = document.getElementById("mc-" + yr + "-" + num);
    const arrow = document.getElementById("ma-" + yr + "-" + num);
    if (!children) return;
    const open = children.style.display !== "none";
    children.style.display = open ? "none" : "block";
    if (arrow) arrow.textContent = open ? "›" : "▾";
  };

  // ── ANNUAL INCOME MODAL ────────────────────────────────────────────────
  function buildAnnualModal() {
    const overlay = document.createElement("div");
    overlay.id = "annual-overlay";
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;display:flex;align-items:center;justify-content:center;`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    const mNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const labels = MONTHLY_DATA.map((m) => mNames[m.mo - 1]);
    const values = MONTHLY_DATA.map((m) => parseFloat(m.total_sales));
    const total = values.reduce((a, b) => a + b, 0);
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:28px 30px;width:560px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);position:relative;font-family:Poppins,sans-serif;">
        <button onclick="document.getElementById('annual-overlay').remove()" style="position:absolute;top:16px;right:18px;background:none;border:none;font-size:20px;cursor:pointer;color:#888;">✕</button>
        <h2 style="font-size:18px;font-weight:700;color:#1C3924;margin-bottom:4px;">📁 Annual Income — ${SELECTED_YEAR}</h2>
        <p style="font-size:13px;color:#888;margin-bottom:18px;">Total: <strong style="color:#1C3924;">₱${total.toLocaleString()}</strong></p>
        <canvas id="annualChart" height="160"></canvas>
        <div id="annual-month-list" style="margin-top:18px;display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const ctx = document.getElementById("annualChart");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: GOLD,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        responsive: true,
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const month = MONTHLY_DATA[idx].mo;
            window.location.href = `?page=statistics&sidebar=1&year=${SELECTED_YEAR}&month=${month}&section=orders`;
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `₱${ctx.parsed.y.toLocaleString()}`,
              afterLabel: () => "Click to view orders",
            },
          },
          datalabels: false,
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => `₱${(v / 1000).toFixed(0)}k`,
              font: { family: "Poppins", size: 11 },
              color: "#5A6B5E",
            },
            grid: { color: "rgba(0,0,0,0.05)" },
            beginAtZero: true,
          },
          x: {
            ticks: { font: { family: "Poppins", size: 11 }, color: "#5A6B5E" },
            grid: { display: false },
          },
        },
      },
    });
    const list = document.getElementById("annual-month-list");
    MONTHLY_DATA.forEach((m) => {
      const item = document.createElement("a");
      item.href = `?page=statistics&sidebar=1&year=${SELECTED_YEAR}&month=${m.mo}&section=orders`;
      item.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:10px;background:#fdf9ee;text-decoration:none;border:1px solid #e8e0c8;transition:background 0.15s;`;
      item.innerHTML = `<span style="font-size:13px;font-weight:500;color:#1C3924;">📂 ${mNames[m.mo - 1]}</span><span style="font-size:13px;font-weight:700;color:#1C3924;">₱${parseFloat(m.total_sales).toLocaleString()}</span>`;
      item.onmouseover = () => (item.style.background = "#f5edcf");
      item.onmouseout = () => (item.style.background = "#fdf9ee");
      list.appendChild(item);
    });
  }

  function initAnnualClick() {
    const annualEl = document.querySelector(".tree-annual");
    if (!annualEl) return;
    annualEl.style.cursor = "pointer";
    annualEl.style.borderRadius = "8px";
    annualEl.style.transition = "background 0.15s";
    annualEl.addEventListener(
      "mouseenter",
      () => (annualEl.style.background = "rgba(216,195,111,0.2)"),
    );
    annualEl.addEventListener(
      "mouseleave",
      () => (annualEl.style.background = ""),
    );
    annualEl.addEventListener("click", buildAnnualModal);
  }

  // ── SIDEBAR OPEN / CLOSE ───────────────────────────────────────────────
  window.openSidebar = function () {
    const sidebar = document.getElementById("stats-sidebar");
    const openBtn = document.getElementById("open-sidebar");
    if (sidebar) sidebar.classList.add("stats-sidebar--open");
    if (openBtn) openBtn.style.display = "none";
  };

  window.closeSidebar = function () {
    const sidebar = document.getElementById("stats-sidebar");
    const openBtn = document.getElementById("open-sidebar");
    if (sidebar) sidebar.classList.remove("stats-sidebar--open");
    if (openBtn) openBtn.style.display = "flex";
  };

  // ── PROFILE DROPDOWN ───────────────────────────────────────────────────
  const profileBtn = document.getElementById("profile-btn");
  const dropdown = document.getElementById("profile-dropdown");
  const logoutBtn = document.getElementById("logout-btn");

  if (profileBtn && dropdown) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });
    document.addEventListener("click", () => dropdown.classList.remove("open"));
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      window.location.href = logoutBtn.dataset.logoutUrl;
    });
  }

  // ── CLOCK ──────────────────────────────────────────────────────────────
  function updateClock() {
    const now = new Date();
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    let h = now.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, "0");
    const dayEl = document.getElementById("current-day");
    const dateEl = document.getElementById("current-date");
    if (dayEl) dayEl.textContent = days[now.getDay()];
    if (dateEl)
      dateEl.textContent = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} at ${h}:${m} ${ampm}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ── INIT ───────────────────────────────────────────────────────────────
  if (typeof SIDEBAR_OPEN !== "undefined" && SIDEBAR_OPEN) {
    const openBtn = document.getElementById("open-sidebar");
    if (openBtn) openBtn.style.display = "none";
  }

  renderTrendChart("weekly");
  renderBarChart("weekly");
  renderSectionBarChart();
  initAnnualClick();

  getAllTableRows().forEach((r) => {
    r.dataset.filtered = "1";
  });
  renderTablePage(1);

  // ── ORDER OVERVIEW MODAL ───────────────────────────────────────────────
  window.openOrderModal = function (orderData) {
    if (document.getElementById("order-modal-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "order-modal-overlay";
    overlay.id = "order-modal-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOrderModal();
    });
    const itemsHTML = (orderData.items || [])
      .map(
        (item) => `
      <div class="order-item">
        <span>${item.qty}x ${item.name}</span>
        <span>Php ${Number(item.price * item.qty).toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span>
      </div>
    `,
      )
      .join("");
    const discountAmt = parseFloat(orderData.discount) || 0;
    const discountRow =
      discountAmt > 0
        ? `<div class="summary-row"><span>Discount</span><span class="served-discount" style="color:#2e6b40;">−Php ${Number(discountAmt).toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span></div>`
        : "";
    const footerLine =
      orderData.served_at && orderData.served_at !== orderData.ordered_at
        ? `Ordered: ${orderData.ordered_at} &nbsp;·&nbsp; Served: ${orderData.served_at}`
        : `Ordered: ${orderData.ordered_at}`;
    overlay.innerHTML = `
      <div class="order-modal">
        <div class="order-modal-top">
          <div class="order-number">#${orderData.id}</div>
          <div class="order-date">${orderData.date}</div>
          <div class="order-title">Order Overview</div>
          <div class="order-badges">
            <div class="badge badge-served">${orderData.status}</div>
            <div class="badge badge-dinein">${orderData.type}</div>
          </div>
        </div>
        <div class="order-divider"></div>
        <div class="order-items">${itemsHTML || '<p style="color:#aaa;font-size:13px;text-align:center;">No items found</p>'}</div>
        <div class="order-divider"></div>
        <div class="order-summary">
          <div class="summary-row"><span>Mode of Payment</span><span>${orderData.payment || "—"}</span></div>
          <div class="summary-row"><span>Subtotal</span><span>Php ${Number(orderData.subtotal).toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span></div>
          ${discountRow}
          <div class="summary-total"><span>Total</span><span class="total-amount">Php ${Number(orderData.total).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        </div>
        <div class="order-footer">${footerLine}</div>
        <div class="order-close-wrap"><button class="order-close-btn" onclick="closeOrderModal()">Close</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
  };

  window.closeOrderModal = function () {
    const modal = document.getElementById("order-modal-overlay");
    if (modal) modal.remove();
  };

  document.querySelectorAll("#orders-table tbody tr").forEach((row) => {
    if (row.querySelector(".table-empty")) return;
    row.style.cursor = "pointer";
    row.addEventListener("click", () => {
      let items = [];
      try {
        const raw = row.getAttribute("data-items");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed))
            items = parsed.map((i) => ({
              qty: i.qty,
              name: i.name,
              price: i.price,
            }));
        }
      } catch (e) {
        console.error("Invalid JSON:", e);
      }
      const discountVal = parseFloat(row.getAttribute("data-discount") || "0");
      const subtotalVal = parseFloat(row.getAttribute("data-subtotal") || "0");
      const servedAt = row.getAttribute("data-served-at") || "";
      const beeperNumber = row.cells[0]?.textContent.trim() || "—";
      const dateText = row.cells[1]?.textContent.trim() || "";
      const typeText = row.cells[2]?.textContent.trim() || "";
      const paymentText = row.cells[3]?.textContent.trim() || "";
      const totalText = parseFloat(
        (row.cells[4]?.textContent || "0").replace(/[₱,\s]/g, ""),
      );
      const statusText = row.cells[5]?.textContent.trim() || "";
      openOrderModal({
        id: beeperNumber,
        date: dateText,
        type: typeText,
        payment: paymentText,
        status: statusText,
        items,
        subtotal: subtotalVal || totalText + discountVal,
        discount: discountVal,
        total: totalText,
        ordered_at: dateText,
        served_at: servedAt,
      });
    });
  });

  function ucfirst(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
})();
