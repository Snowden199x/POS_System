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
            `${d.toLocaleString("en", {
              month: "short",
            })} ${d.getDate()}`;

          return `${fmt(s)} – ${fmt(e)}`;
        }),

        values: WEEKLY_DATA.map((w) =>
          parseFloat(w.total_sales),
        ),
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
        labels: MONTHLY_DATA.map(
          (m) => mNames[m.mo - 1],
        ),

        values: MONTHLY_DATA.map((m) =>
          parseFloat(m.total_sales),
        ),
      };
    }
  }

  function renderTrendChart(mode) {
    const ctx =
      document.getElementById("trendChart");

    if (!ctx) return;

    const { labels, values } =
      buildTrendData(mode);

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
          legend: {
            display: false,
          },

          tooltip: {
            callbacks: {
              label: (ctx) =>
                `₱${ctx.parsed.y.toLocaleString()}`,
            },
          },

          datalabels: false,
        },

        scales: {
          y: {
            ticks: {
              callback: (v) =>
                `₱${(v / 1000).toFixed(0)}k`,

              font: {
                family: "Poppins",
                size: 11,
              },

              color: "#5A6B5E",
            },

            grid: {
              color: "rgba(0,0,0,0.05)",
            },

            beginAtZero: true,
          },

          x: {
            ticks: {
              font: {
                family: "Poppins",
                size: 11,
              },

              color: "#5A6B5E",
            },

            grid: {
              display: false,
            },
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

          return `${s.toLocaleString("en", {
            month: "short",
          })} ${s.getDate()}`;
        }),

        values: WEEKLY_DATA.map((w) =>
          parseFloat(w.total_sales),
        ),
      };
    } else {
      return {
        labels: DAILY_DATA.map((d) => {
          const dt = new Date(d.sale_date);

          return `${dt.toLocaleString("en", {
            month: "short",
          })} ${dt.getDate()}`;
        }),

        values: DAILY_DATA.map((d) =>
          parseFloat(d.total_sales),
        ),
      };
    }
  }

  function renderBarChart(mode) {
    const ctx =
      document.getElementById("barChart");

    if (!ctx) return;

    const { labels, values } =
      buildBarData(mode);

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
          legend: {
            display: false,
          },

          tooltip: {
            callbacks: {
              label: (ctx) =>
                `₱${ctx.parsed.y.toLocaleString()}`,
            },
          },

          datalabels: false,
        },

        scales: {
          y: {
            ticks: {
              callback: (v) =>
                `₱${(v / 1000).toFixed(0)}k`,

              font: {
                family: "Poppins",
                size: 11,
              },

              color: "#5A6B5E",
            },

            grid: {
              color: "rgba(0,0,0,0.05)",
            },

            beginAtZero: true,
          },

          x: {
            ticks: {
              font: {
                family: "Poppins",
                size: 11,
              },

              color: "#5A6B5E",
            },

            grid: {
              display: false,
            },
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
    const ctx =
      document.getElementById(
        "sectionBarChart",
      );

    if (!ctx) return;

    if (!BAR_DATA || BAR_DATA.length === 0) {
      ctx.parentElement.style.display =
        "none";

      return;
    }

    const labels = BAR_DATA.map((d) => {
      const dt = new Date(d.d);

      return `${dt.toLocaleString("en", {
        month: "short",
      })} ${dt.getDate()}`;
    });

    const values = BAR_DATA.map((d) =>
      parseInt(d.cnt),
    );

    if (sectionBarChart)
      sectionBarChart.destroy();

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
          legend: {
            display: false,
          },

          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.parsed.y} orders`,
            },
          },

          datalabels: false,
        },

        scales: {
          y: {
            ticks: {
              stepSize: 1,

              font: {
                family: "Poppins",
                size: 11,
              },

              color: "#5A6B5E",
            },

            grid: {
              color: "rgba(0,0,0,0.05)",
            },

            beginAtZero: true,
          },

          x: {
            ticks: {
              font: {
                family: "Poppins",
                size: 10,
              },

              color: "#5A6B5E",

              maxRotation: 0,
              padding: 8,
            },

            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  // ── FILTER STATES ──────────────────────────────────────────────────────
  let selectedOrderType = "all";
  let selectedPaymentMethod = "all";
  let selectedStatus = "all";

    // ── FILTER DATE STATES ─────────────────────────────────────────────────
let selectedDateFrom = "";
let selectedDateTo = "";

  // ── FILTER CHIP STYLE ──────────────────────────────────────────────────
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
    if (
      document.getElementById(
        "filter-modal-overlay",
      )
    ) {
      return;
    }

    const overlay =
      document.createElement("div");

    overlay.id = "filter-modal-overlay";

    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      backdrop-filter: blur(2px);
    `;

    // AUTO CLOSE WHEN CLICKING OUTSIDE
    overlay.addEventListener(
      "click",
      (e) => {
        if (e.target === overlay) {
          closeFilterModal();
        }
      }
    );

    overlay.innerHTML = `
      <div style="
        width: 560px;
        max-width: 90vw;
        background: ${MODAL_BG};
        border-radius: 28px;
        overflow:hidden;
        box-shadow: 0 25px 70px rgba(0,0,0,0.18);
        font-family:Poppins,sans-serif;
      ">

        <div style="
          padding:22px 28px 16px;
          display:flex;
          align-items:center;
        ">

          <div style="
            display:flex;
            align-items:center;
            gap:14px;
          ">

            <div style="
              width:32px;
              height:32px;
              display:flex;
              align-items:center;
              justify-content:center;
            ">
              <svg width="24" height="24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
                <line x1="4" y1="18" x2="20" y2="18"/>
                <circle cx="9" cy="6" r="2" fill="#111"/>
                <circle cx="15" cy="12" r="2" fill="#111"/>
                <circle cx="11" cy="18" r="2" fill="#111"/>
              </svg>
            </div>

            <div style="
              font-size:19px;
              font-weight:700;
              color:${GREEN};
            ">
              Filter
            </div>

          </div>

        </div>

        <div style="
          height:1px;
          background:#D9D2B8;
        "></div>

        <div style="
          padding:28px 38px 24px;
        ">

          <div style="
            font-size:15px;
            font-weight:700;
            color:${GREEN};
            margin-bottom:22px;
          ">
            Filter by:
          </div>

          <!-- DATE -->
          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            margin-bottom:26px;
            gap:18px;
          ">

            <div style="
              display:flex;
              align-items:center;
              gap:14px;
              width:190px;
            ">

              <div style="
                width:48px;
                height:48px;
                border-radius:50%;
                background:#E8DDB7;
                display:flex;
                align-items:center;
                justify-content:center;
              ">

                <svg width="24" height="24" fill="none" stroke="${GOLD}" stroke-width="2.2">
                  <rect x="4" y="6" width="18" height="16" rx="2"></rect>
                  <line x1="4" y1="11" x2="22" y2="11"></line>
                  <line x1="8" y1="3" x2="8" y2="8"></line>
                  <line x1="18" y1="3" x2="18" y2="8"></line>
                </svg>

              </div>

              <div style="
                font-size:15px;
                font-weight:600;
                color:${GREEN};
              ">
                Date
              </div>

            </div>

            <div style="
              flex:1;
              display:flex;
              align-items:center;
              gap:10px;
            ">

<input
  type="date"
  id="filter-date-from"
  value="${selectedDateFrom}"
                style="
                  flex:1;
                  height:40px;
                  border-radius:12px;
                  border:1.5px solid ${CHIP_BORDER};
                  padding:0 12px;
                  font-family:Poppins,sans-serif;
                  background:white;
                  color:${GREEN};
                "
              >

              <span style="
                font-size:12px;
                color:#777;
              ">
                to
              </span>

<input
  type="date"
  id="filter-date-to"
  value="${selectedDateTo}"
                style="
                  flex:1;
                  height:40px;
                  border-radius:12px;
                  border:1.5px solid ${CHIP_BORDER};
                  padding:0 12px;
                  font-family:Poppins,sans-serif;
                  background:white;
                  color:${GREEN};
                "
              >

            </div>

          </div>

          <!-- ORDER TYPE -->
          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            margin-bottom:26px;
            gap:18px;
          ">

            <div style="
              display:flex;
              align-items:center;
              gap:14px;
              width:190px;
            ">

              <div style="
                width:48px;
                height:48px;
                border-radius:50%;
                background:#E8DDB7;
                display:flex;
                align-items:center;
                justify-content:center;
              ">

                <svg width="26" height="26" fill="none" stroke="${GOLD}" stroke-width="2">
                  <path d="M5 10h18l-2 11H7L5 10Z"></path>
                  <path d="M9 10a5 5 0 0 1 10 0"></path>
                </svg>

              </div>

              <div style="
                font-size:15px;
                font-weight:600;
                color:${GREEN};
              ">
                Order type
              </div>

            </div>

            <div style="
              display:flex;
              gap:8px;
            ">

              <button class="filter-chip"
                data-group="order-type"
                data-value="all">
                All
              </button>

              <button class="filter-chip"
                data-group="order-type"
                data-value="dine in">
                Dine in
              </button>

              <button class="filter-chip"
                data-group="order-type"
                data-value="take out">
                Take out
              </button>

            </div>

          </div>

          <!-- PAYMENT -->
          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            margin-bottom:26px;
            gap:18px;
          ">

            <div style="
              display:flex;
              align-items:center;
              gap:14px;
              width:190px;
            ">

              <div style="
                width:48px;
                height:48px;
                border-radius:50%;
                background:#E8DDB7;
                display:flex;
                align-items:center;
                justify-content:center;
              ">

                <svg width="26" height="26" fill="none" stroke="${GOLD}" stroke-width="2">
                  <rect x="4" y="7" width="20" height="14" rx="3"></rect>
                  <line x1="4" y1="11" x2="24" y2="11"></line>
                </svg>

              </div>

              <div style="
                font-size:15px;
                font-weight:600;
                color:${GREEN};
              ">
                Payment Method
              </div>

            </div>

            <div style="
              display:flex;
              gap:8px;
            ">

              <button class="filter-chip"
                data-group="payment"
                data-value="all">
                All
              </button>

              <button class="filter-chip"
                data-group="payment"
                data-value="cash">
                Cash
              </button>

              <button class="filter-chip"
                data-group="payment"
                data-value="gcash">
                GCash
              </button>

            </div>

          </div>

          <!-- STATUS -->
          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            margin-bottom:30px;
            gap:18px;
          ">

            <div style="
              display:flex;
              align-items:center;
              gap:14px;
              width:190px;
            ">

              <div style="
                width:48px;
                height:48px;
                border-radius:50%;
                background:#E8DDB7;
                display:flex;
                align-items:center;
                justify-content:center;
              ">

                <svg width="26" height="26" fill="none" stroke="${GOLD}" stroke-width="2.5">
                  <circle cx="14" cy="14" r="10"></circle>
                  <path d="M9 14l3 3 7-7"></path>
                </svg>

              </div>

              <div style="
                font-size:15px;
                font-weight:600;
                color:${GREEN};
              ">
                Status
              </div>

            </div>

            <div style="
              display:flex;
              gap:8px;
            ">

              <button class="filter-chip"
                data-group="status"
                data-value="all">
                All
              </button>

              <button class="filter-chip"
                data-group="status"
                data-value="served">
                Served
              </button>

              <button class="filter-chip"
                data-group="status"
                data-value="voided">
                Voided
              </button>

            </div>

          </div>

          <!-- BUTTONS -->
          <div style="
            display:flex;
            justify-content:flex-end;
            gap:10px;
          ">

            <button
              onclick="clearFilter()"
              style="
                height:40px;
                padding:0 16px;
                border-radius:999px;
                border:1.5px solid ${CHIP_BORDER};
                background:#F8F4E4;
                color:${GREEN};
                font-weight:600;
                cursor:pointer;
                font-family:Poppins,sans-serif;
              "
            >
              ↺ Reset
            </button>

            <button
              onclick="applyFilter()"
              style="
                height:40px;
                padding:0 20px;
                border:none;
                border-radius:999px;
                background:${GREEN};
                color:white;
                font-weight:600;
                cursor:pointer;
                font-family:Poppins,sans-serif;
              "
            >
              Apply
            </button>

          </div>

        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    document
      .querySelectorAll(".filter-chip")
      .forEach((chip) => {
        chip.style.cssText += `
          height:38px;
          min-width:80px;
          padding:0 14px;
          border-radius:10px;
          border:1.5px solid ${CHIP_BORDER};
          background:#F8F4E4;
          color:${GOLD};
          font-family:Poppins,sans-serif;
          font-size:12px;
          font-weight:600;
          cursor:pointer;
          transition:0.15s ease;
        `;

        const group =
          chip.dataset.group;

        const value =
          chip.dataset.value;

        let active = false;

        if (
          group === "order-type" &&
          value === selectedOrderType
        ) {
          active = true;
        }

        if (
          group === "payment" &&
          value === selectedPaymentMethod
        ) {
          active = true;
        }

        if (
          group === "status" &&
          value === selectedStatus
        ) {
          active = true;
        }

        if (active) {
          activateChip(chip);
        } else {
          deactivateChip(chip);
        }

        chip.addEventListener(
          "click",
          () => {
            document
              .querySelectorAll(
                `.filter-chip[data-group="${group}"]`
              )
              .forEach((c) => {
                deactivateChip(c);
              });

            activateChip(chip);

            if (group === "order-type") {
              selectedOrderType =
                value;
            }

            if (group === "payment") {
              selectedPaymentMethod =
                value;
            }

            if (group === "status") {
              selectedStatus =
                value;
            }
          }
        );
      });
  };

  // ── CLOSE FILTER MODAL ────────────────────────────────────────────────
  window.closeFilterModal =
    function () {
      const modal =
        document.getElementById(
          "filter-modal-overlay"
        );

      if (modal) {
        modal.remove();
      }
    };

  // ── APPLY FILTER ───────────────────────────────────────────────────────
  window.applyFilter = function () {
    const from =
      document.getElementById(
        "filter-date-from"
      )?.value || "";

    const to =
      document.getElementById(
        "filter-date-to"
      )?.value || "";

      
selectedDateFrom = from;
selectedDateTo = to;

    const rows =
      document.querySelectorAll(
        "#orders-table tbody tr"
      );

    rows.forEach((row) => {
      let show = true;

      const dateCell = row.cells[1];
      const orderTypeCell =
        row.cells[2];
      const paymentCell =
        row.cells[3];
const statusCell = row.cells[5];

      if (dateCell) {
        const rawText =
          dateCell.textContent.trim();

const parsed = Date.parse(rawText);
const rowDate = isNaN(parsed) ? null : new Date(parsed);

        if (!isNaN(rowDate)) {
          const rowDateOnly =
            rowDate
              .toISOString()
              .split("T")[0];

          if (
            from &&
            rowDateOnly < from
          ) {
            show = false;
          }

          if (
            to &&
            rowDateOnly > to
          ) {
            show = false;
          }
        }
      }

      if (
        selectedOrderType !== "all" &&
        orderTypeCell
      ) {
        const txt =
          orderTypeCell.textContent
            .trim()
            .toLowerCase();

        if (
          txt !== selectedOrderType
        ) {
          show = false;
        }
      }

      if (
        selectedPaymentMethod !==
          "all" &&
        paymentCell
      ) {
        const txt =
          paymentCell.textContent
            .trim()
            .toLowerCase();

        if (
          txt !==
          selectedPaymentMethod
        ) {
          show = false;
        }
      }

      if (
        selectedStatus !== "all" &&
        statusCell
      ) {
        const txt =
          statusCell.textContent
            .trim()
            .toLowerCase();

        if (txt !== selectedStatus) {
          show = false;
        }
      }

      row.style.display = show
        ? ""
        : "none";
    });

    closeFilterModal();
  };


// ── CLEAR FILTER ───────────────────────────────────────────────────────
window.clearFilter = function () {
  selectedOrderType = "all";
  selectedPaymentMethod = "all";
  selectedStatus = "all";

  selectedDateFrom = "";
  selectedDateTo = "";

  document
    .querySelectorAll(
      "#orders-table tbody tr"
    )
    .forEach((r) => {
      r.style.display = "";
    });

  closeFilterModal();
};

  // ── SIDEBAR TREE ───────────────────────────────────────────────────────
  window.toggleYear = function (yr) {
    const months =
      document.getElementById(
        "ym-" + yr
      );

    const arrow =
      document.getElementById(
        "ya-" + yr
      );

    if (!months) return;

    const open =
      months.style.display !==
      "none";

    months.style.display = open
      ? "none"
      : "block";

    if (arrow) {
      arrow.textContent = open
        ? "›"
        : "▾";
    }
  };

  window.toggleMonth = function (
    yr,
    num
  ) {
    const children =
      document.getElementById(
        "mc-" + yr + "-" + num
      );

    const arrow =
      document.getElementById(
        "ma-" + yr + "-" + num
      );

    if (!children) return;

    const open =
      children.style.display !==
      "none";

    children.style.display = open
      ? "none"
      : "block";

    if (arrow) {
      arrow.textContent = open
        ? "›"
        : "▾";
    }
  };

  // ── ANNUAL INCOME MODAL ────────────────────────────────────────────────
  function buildAnnualModal() {
    const overlay =
      document.createElement("div");

    overlay.id = "annual-overlay";

    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    overlay.addEventListener(
      "click",
      (e) => {
        if (e.target === overlay)
          overlay.remove();
      }
    );

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

    const labels = MONTHLY_DATA.map(
      (m) => mNames[m.mo - 1]
    );

    const values = MONTHLY_DATA.map(
      (m) =>
        parseFloat(m.total_sales)
    );

    const total = values.reduce(
      (a, b) => a + b,
      0
    );

    overlay.innerHTML = `
      <div style="
        background: #fff;
        border-radius: 20px;
        padding: 28px 30px;
        width: 560px;
        max-width: 95vw;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        position: relative;
        font-family: Poppins, sans-serif;
      ">

        <button onclick="document.getElementById('annual-overlay').remove()" style="
          position: absolute;
          top: 16px;
          right: 18px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #888;
        ">
          ✕
        </button>

        <h2 style="
          font-size:18px;
          font-weight:700;
          color:#1C3924;
          margin-bottom:4px;
        ">
          📁 Annual Income — ${SELECTED_YEAR}
        </h2>

        <p style="
          font-size:13px;
          color:#888;
          margin-bottom:18px;
        ">
          Total:
          <strong style="color:#1C3924;">
            ₱${total.toLocaleString()}
          </strong>
        </p>

        <canvas id="annualChart" height="160"></canvas>

        <div id="annual-month-list" style="
          margin-top:18px;
          display:flex;
          flex-direction:column;
          gap:6px;
          max-height:200px;
          overflow-y:auto;
        "></div>

      </div>
    `;

    document.body.appendChild(
      overlay
    );

    const ctx =
      document.getElementById(
        "annualChart"
      );

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
            const idx =
              elements[0].index;

            const month =
              MONTHLY_DATA[idx].mo;

            window.location.href =
              `?page=statistics&sidebar=1&year=${SELECTED_YEAR}&month=${month}&section=orders`;
          }
        },

        plugins: {
          legend: {
            display: false,
          },

          tooltip: {
            callbacks: {
              label: (ctx) =>
                `₱${ctx.parsed.y.toLocaleString()}`,

              afterLabel: () =>
                "Click to view orders",
            },
          },

          datalabels: false,
        },

        scales: {
          y: {
            ticks: {
              callback: (v) =>
                `₱${(
                  v / 1000
                ).toFixed(0)}k`,

              font: {
                family: "Poppins",
                size: 11,
              },

              color: "#5A6B5E",
            },

            grid: {
              color:
                "rgba(0,0,0,0.05)",
            },

            beginAtZero: true,
          },

          x: {
            ticks: {
              font: {
                family: "Poppins",
                size: 11,
              },

              color: "#5A6B5E",
            },

            grid: {
              display: false,
            },
          },
        },
      },
    });

    const list =
      document.getElementById(
        "annual-month-list"
      );

    MONTHLY_DATA.forEach((m) => {
      const item =
        document.createElement("a");

      item.href =
        `?page=statistics&sidebar=1&year=${SELECTED_YEAR}&month=${m.mo}&section=orders`;

      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-radius: 10px;
        background: #fdf9ee;
        text-decoration: none;
        border: 1px solid #e8e0c8;
        transition: background 0.15s;
      `;

      item.innerHTML = `
        <span style="
          font-size:13px;
          font-weight:500;
          color:#1C3924;
        ">
          📂 ${mNames[m.mo - 1]}
        </span>

        <span style="
          font-size:13px;
          font-weight:700;
          color:#1C3924;
        ">
          ₱${parseFloat(
            m.total_sales
          ).toLocaleString()}
        </span>
      `;

      item.onmouseover = () =>
        (item.style.background =
          "#f5edcf");

      item.onmouseout = () =>
        (item.style.background =
          "#fdf9ee");

      list.appendChild(item);
    });
  }

  // ── TREE ANNUAL CLICK ──────────────────────────────────────────────────
  function initAnnualClick() {
    const annualEl =
      document.querySelector(
        ".tree-annual"
      );

    if (!annualEl) return;

    annualEl.style.cursor =
      "pointer";

    annualEl.style.borderRadius =
      "8px";

    annualEl.style.transition =
      "background 0.15s";

    annualEl.addEventListener(
      "mouseenter",
      () =>
        (annualEl.style.background =
          "rgba(216,195,111,0.2)")
    );

    annualEl.addEventListener(
      "mouseleave",
      () =>
        (annualEl.style.background =
          "")
    );

    annualEl.addEventListener(
      "click",
      buildAnnualModal
    );
  }

  // ── SIDEBAR OPEN / CLOSE ───────────────────────────────────────────────
  window.openSidebar = function () {
    const sidebar =
      document.getElementById(
        "stats-sidebar"
      );

    const openBtn =
      document.getElementById(
        "open-sidebar"
      );

    if (sidebar) {
      sidebar.classList.add(
        "stats-sidebar--open"
      );
    }

    if (openBtn) {
      openBtn.style.display =
        "none";
    }
  };

  window.closeSidebar =
    function () {
      const sidebar =
        document.getElementById(
          "stats-sidebar"
        );

      const openBtn =
        document.getElementById(
          "open-sidebar"
        );

      if (sidebar) {
        sidebar.classList.remove(
          "stats-sidebar--open"
        );
      }

      if (openBtn) {
        openBtn.style.display =
          "flex";
      }
    };

  // ── PROFILE DROPDOWN ───────────────────────────────────────────────────
  const profileBtn =
    document.getElementById(
      "profile-btn"
    );

  const dropdown =
    document.getElementById(
      "profile-dropdown"
    );

  const logoutBtn =
    document.getElementById(
      "logout-btn"
    );

  if (profileBtn && dropdown) {
    profileBtn.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();

        dropdown.classList.toggle(
          "open"
        );
      }
    );

    document.addEventListener(
      "click",
      () =>
        dropdown.classList.remove(
          "open"
        )
    );
  }

  if (logoutBtn) {
    logoutBtn.addEventListener(
      "click",
      () => {
        window.location.href =
          logoutBtn.dataset
            .logoutUrl;
      }
    );
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

    const ampm =
      h >= 12 ? "PM" : "AM";

    h = h % 12 || 12;

    const m = String(
      now.getMinutes()
    ).padStart(2, "0");

    const dayEl =
      document.getElementById(
        "current-day"
      );

    const dateEl =
      document.getElementById(
        "current-date"
      );

    if (dayEl) {
      dayEl.textContent =
        days[now.getDay()];
    }

    if (dateEl) {
      dateEl.textContent =
        `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} at ${h}:${m} ${ampm}`;
    }
  }

  updateClock();
  setInterval(updateClock, 1000);

  // ── INIT ───────────────────────────────────────────────────────────────
  if (
    typeof SIDEBAR_OPEN !==
      "undefined" &&
    SIDEBAR_OPEN
  ) {
    const openBtn =
      document.getElementById(
        "open-sidebar"
      );

    if (openBtn) {
      openBtn.style.display =
        "none";
    }
  }

  renderTrendChart("weekly");
  renderBarChart("weekly");
  renderSectionBarChart();
  initAnnualClick();

  /* ── ORDER OVERVIEW MODAL ───────────────────────────── */

window.openOrderModal = function(orderData) {

  if (document.getElementById("order-modal-overlay")) return;

  const overlay = document.createElement("div");
  overlay.className = "order-modal-overlay";
  overlay.id = "order-modal-overlay";

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOrderModal();
  });

  const itemsHTML = (orderData.items || []).map(item => `
    <div class="order-item">
      <span>${item.qty}x ${item.name}</span>
      <span>₱${Number(item.price).toLocaleString()}</span>
    </div>
  `).join("");

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

      <div class="order-items">
        ${itemsHTML}
      </div>

      <div class="order-divider"></div>

      <div class="order-summary">

        <div class="summary-row">
          <span>Mode of Payment</span>
          <span>${orderData.payment}</span>
        </div>

        <div class="summary-row">
          <span>Subtotal</span>
          <span>₱${orderData.subtotal}</span>
        </div>

        <div class="summary-row">
          <span>Discount</span>
          <span>${orderData.discount || "-"}</span>
        </div>

        <div class="summary-total">
          <span>Total</span>
          <span class="total-amount">₱${orderData.total}</span>
        </div>

      </div>

      <div class="order-footer">
        Ordered on ${orderData.ordered_at} • Served on ${orderData.served_at}
      </div>

      <div class="order-close-wrap">
        <button class="order-close-btn" onclick="closeOrderModal()">Close</button>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);
};

window.closeOrderModal = function() {
  const modal = document.getElementById("order-modal-overlay");
  if (modal) modal.remove();
};


/* ── AUTO ATTACH TO TABLE ROWS ───────────────────────── */

document.querySelectorAll("#orders-table tbody tr").forEach(row => {

  row.style.cursor = "pointer";

row.addEventListener("click", () => {
let items = [];

try {
  const raw = row.getAttribute("data-items");

  if (raw) {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      items = parsed.map(i => ({
        qty: i.qty,
        name: i.name,
        price: i.price
      }));
    }
  }

} catch (e) {
  console.error("Invalid JSON:", e);
}

  const orderData = {
    id: row.cells[0]?.textContent.trim() || "—",
    date: row.cells[1]?.textContent.trim() || "",
    type: row.cells[2]?.textContent.trim() || "",
    payment: row.cells[3]?.textContent.trim() || "",
    total: (row.cells[4]?.textContent || "0").replace(/[₱,]/g, ""),
    status: row.cells[5]?.textContent.trim() || "",

    subtotal: row.cells[4]?.textContent.replace("₱","") || "0",

    ordered_at: row.cells[1]?.textContent.trim(),
    served_at: row.cells[1]?.textContent.trim(),

    items: items
  };

  openOrderModal(orderData);
});

});
})();