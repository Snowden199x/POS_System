(function () {
  "use strict";

  const GREEN       = "#1C3924";
  const GOLD        = "#C99813";
  const GOLD_T      = "rgba(216,195,111,0.18)";
  const MODAL_BG    = "#F4EFD7";
  const CHIP_BORDER = "#DDD3AF";

  // ── TREND LINE CHART ───────────────────────────────────────────────────
  let trendChart = null;

  function buildTrendData(mode) {
    if (mode === "weekly") {
      return {
        labels: WEEKLY_DATA.map((w) => {
          const s = new Date(w.week_start), e = new Date(w.week_end);
          const fmt = (d) => `${d.toLocaleString("en",{month:"short"})} ${d.getDate()}`;
          return `${fmt(s)} – ${fmt(e)}`;
        }),
        values: WEEKLY_DATA.map((w) => parseFloat(w.total_sales)),
      };
    } else {
      const mNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
      data: { labels, datasets: [{ data: values, borderColor: GREEN,
        backgroundColor: GOLD_T, pointBackgroundColor: GREEN,
        pointRadius: 5, pointHoverRadius: 7, tension: 0.3, fill: true, borderWidth: 2 }] },
      options: {
        responsive: true,
        plugins: { legend:{display:false},
          tooltip:{callbacks:{label:(ctx)=>`₱${ctx.parsed.y.toLocaleString()}`}},
          datalabels:false },
        scales: {
          y: { ticks:{callback:(v)=>`₱${(v/1000).toFixed(0)}k`,font:{family:"Poppins",size:11},color:"#5A6B5E"},
            grid:{color:"rgba(0,0,0,0.05)"},beginAtZero:true },
          x: { ticks:{font:{family:"Poppins",size:11},color:"#5A6B5E"},grid:{display:false} },
        },
      },
    });
  }
  window.switchTrend = (mode) => renderTrendChart(mode);

  // ── SALES PER DAY BAR ──────────────────────────────────────────────────
  let barChart = null;

  function renderBarChart() {
    const ctx = document.getElementById("barChart");
    if (!ctx) return;
    const labels = DAILY_DATA.map((d) => {
      const dt = new Date(d.sale_date + "T00:00:00");
      return `${dt.toLocaleString("en",{month:"short"})} ${dt.getDate()}`;
    });
    const values = DAILY_DATA.map((d) => parseFloat(d.total_sales));
    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data: values, backgroundColor: GOLD,
        borderRadius: 8, borderSkipped: false, maxBarThickness: 48 }] },
      options: {
        responsive: true,
        plugins: { legend:{display:false},
          tooltip:{callbacks:{label:(ctx)=>`₱${ctx.parsed.y.toLocaleString()}`}},
          datalabels:false },
        scales: {
          y: { ticks:{callback:(v)=>`₱${(v/1000).toFixed(0)}k`,font:{family:"Poppins",size:11},color:"#5A6B5E"},
            grid:{color:"rgba(0,0,0,0.05)"},beginAtZero:true },
          x: { ticks:{font:{family:"Poppins",size:11},color:"#5A6B5E"},grid:{display:false} },
        },
      },
    });
  }

  // ── SECTION BAR CHART ──────────────────────────────────────────────────
  let sectionBarChart = null;

  function renderSectionBarChart() {
    const ctx = document.getElementById("sectionBarChart");
    if (!ctx) return;
    if (!BAR_DATA || BAR_DATA.length === 0) { ctx.parentElement.style.display = "none"; return; }
    const labels = BAR_DATA.map((d) => {
      const dt = new Date(d.d + "T00:00:00");
      return `${dt.toLocaleString("en",{month:"short"})} ${dt.getDate()}`;
    });
    const values = BAR_DATA.map((d) => parseInt(d.cnt));
    if (sectionBarChart) sectionBarChart.destroy();
    sectionBarChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data:values, backgroundColor:GOLD,
        borderRadius:6, borderSkipped:false, maxBarThickness:29 }] },
      options: {
        responsive: true,
        plugins: { legend:{display:false},
          tooltip:{callbacks:{label:(ctx)=>`${ctx.parsed.y} orders`}},
          datalabels:false },
        scales: {
          y: { ticks:{stepSize:1,font:{family:"Poppins",size:11},color:"#5A6B5E"},
            grid:{color:"rgba(0,0,0,0.05)"},beginAtZero:true },
          x: { ticks:{font:{family:"Poppins",size:10},color:"#5A6B5E",maxRotation:0,padding:8},
            grid:{display:false} },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  EXCEL EXPORT — with Merge All Branches toggle
  // ══════════════════════════════════════════════════════════════════════
  const AJAX_URL = "/Github/POS_SYSTEM/modules/statistics/statistics_ajax.php";

  window.openExcelModal = function () {
    if (document.getElementById("excel-year-picker")) return;

    const currentYear  = typeof SELECTED_YEAR  !== "undefined" ? SELECTED_YEAR  : new Date().getFullYear();
    const currentMonth = typeof SELECTED_MONTH !== "undefined" ? SELECTED_MONTH : new Date().getMonth() + 1;

    const mNames = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];

    const yearOptions = [2024,2025,2026,2027,2028].map((y) =>
      `<option value="${y}" ${y===currentYear?"selected":""}>${y}</option>`).join("");

    const overlay = document.createElement("div");
    overlay.id = "excel-year-picker";
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;`;
    overlay.addEventListener("click",(e)=>{ if(e.target===overlay) overlay.remove(); });

    overlay.innerHTML = `
      <div style="background:#F4EFD7;border-radius:24px;padding:28px 32px;width:380px;
        font-family:Poppins,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <h3 style="margin:0 0 6px;color:#1C3924;font-size:17px;">📊 Export Excel Report</h3>
        <p style="margin:0 0 20px;font-size:13px;color:#888;">Choose year and optionally filter by month</p>

        <label style="font-size:13px;font-weight:600;color:#1C3924;display:block;margin-bottom:6px;">Year</label>
        <select id="ep-year" style="width:100%;margin-bottom:16px;padding:10px 14px;border-radius:12px;
          border:1.5px solid #DDD3AF;font-family:Poppins,sans-serif;font-size:13px;background:white;color:#1C3924;outline:none;">
          ${yearOptions}
        </select>

        <label style="font-size:13px;font-weight:600;color:#1C3924;display:block;margin-bottom:6px;">
          Month
          <span style="font-weight:400;color:#888;font-size:12px;">(optional)</span>
        </label>

        <div id="ep-month-dropdown" style="position:relative;margin-bottom:16px;">
          <button id="ep-month-btn" type="button" style="width:100%;padding:10px 14px;border-radius:12px;
            border:1.5px solid #DDD3AF;font-family:Poppins,sans-serif;font-size:13px;
            background:white;color:#1C3924;outline:none;cursor:pointer;text-align:left;
            display:flex;justify-content:space-between;align-items:center;">
            <span id="ep-month-label">${currentMonth === 0 ? "All months" : mNames[currentMonth - 1]}</span>
            <span style="font-size:10px;color:#888;">▼</span>
          </button>
          <div id="ep-month-list" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;
            background:white;border:1.5px solid #DDD3AF;border-radius:12px;overflow:hidden;
            z-index:999;box-shadow:0 8px 24px rgba(0,0,0,0.12);">
            <div style="max-height:160px;overflow-y:auto;scrollbar-width:thin;">
              ${[{v:0,l:"All months"}, ...mNames.map((n,i)=>({v:i+1,l:n}))]
                .map(opt => `<div class="ep-month-opt" data-value="${opt.v}"
                  style="padding:10px 14px;font-family:Poppins,sans-serif;font-size:13px;color:#1C3924;
                  cursor:pointer;background:${opt.v===currentMonth?'#f5edcf':'white'};
                  font-weight:${opt.v===currentMonth?'600':'400'};">
                  ${opt.l}</div>`).join('')}
            </div>
          </div>
        </div>
        <input type="hidden" id="ep-month" value="${currentMonth}">

        <!-- ── MERGE ALL BRANCHES TOGGLE ── -->
        <div style="display:flex;align-items:center;justify-content:space-between;
            padding:12px 14px;background:#fff;border:1.5px solid #DDD3AF;
            border-radius:12px;margin-bottom:22px;">
            <div>
                <div style="font-size:13px;font-weight:600;color:#1C3924;">Merge all branches</div>
                <div style="font-size:11.5px;color:#888;margin-top:2px;">Include data from all branch accounts</div>
            </div>
            <label style="position:relative;display:inline-block;width:34px;height:19px;flex-shrink:0;cursor:pointer;">
                <input type="checkbox" id="ep-merge-toggle" style="opacity:0;width:0;height:0;">
                <span id="ep-merge-slider" style="position:absolute;inset:0;background:#D0C9A8;
                    border-radius:999px;transition:background 0.2s;">
                    <span id="ep-merge-knob" style="position:absolute;width:13px;height:13px;
                        left:3px;top:3px;background:#fff;border-radius:50%;
                        transition:transform 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.1);display:block;"></span>
                </span>
            </label>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button onclick="document.getElementById('excel-year-picker').remove()"
            style="padding:10px 18px;border-radius:999px;border:1.5px solid #DDD3AF;
            background:#F8F4E4;color:#1C3924;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">Cancel</button>
          <button id="ep-download-btn"
            style="padding:10px 22px;border-radius:999px;border:none;background:#1C3924;
            color:white;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">Download</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // ── Month dropdown ──────────────────────────────────────────────────
    const monthBtn    = document.getElementById("ep-month-btn");
    const monthList   = document.getElementById("ep-month-list");
    const monthHidden = document.getElementById("ep-month");
    const monthLbl    = document.getElementById("ep-month-label");

    monthBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = monthList.style.display !== "none";
      monthList.style.display = isOpen ? "none" : "block";
      monthBtn.querySelector("span:last-child").textContent = isOpen ? "▼" : "▲";
    });

    monthList.querySelectorAll(".ep-month-opt").forEach((opt) => {
      opt.addEventListener("mouseover", () => { opt.style.background = "#fdf9ee"; });
      opt.addEventListener("mouseout",  () => {
        opt.style.background = parseInt(opt.dataset.value) === parseInt(monthHidden.value) ? "#f5edcf" : "white";
      });
      opt.addEventListener("click", () => {
        const val = parseInt(opt.dataset.value);
        monthHidden.value = val;
        monthLbl.textContent = val === 0 ? "All months" : mNames[val - 1];
        monthList.querySelectorAll(".ep-month-opt").forEach((o) => {
          const isSelected = parseInt(o.dataset.value) === val;
          o.style.background = isSelected ? "#f5edcf" : "white";
          o.style.fontWeight = isSelected ? "600"     : "400";
        });
        monthList.style.display = "none";
        monthBtn.querySelector("span:last-child").textContent = "▼";
      });
    });

    document.addEventListener("click", function closeMD(e) {
      if (!document.getElementById("ep-month-dropdown")?.contains(e.target)) {
        if (monthList) monthList.style.display = "none";
        if (monthBtn) monthBtn.querySelector("span:last-child").textContent = "▼";
        document.removeEventListener("click", closeMD);
      }
    });

    // ── Merge toggle visual ─────────────────────────────────────────────
    const mergeToggle = document.getElementById("ep-merge-toggle");
    const mergeSlider = document.getElementById("ep-merge-slider");
    const mergeKnob   = document.getElementById("ep-merge-knob");
    if (mergeToggle) {
      mergeToggle.addEventListener("change", () => {
        const on = mergeToggle.checked;
        mergeSlider.style.background = on ? "#1C3924" : "#D0C9A8";
        mergeKnob.style.transform    = on ? "translateX(15px)" : "";
      });
    }

    // ── Download button ─────────────────────────────────────────────────
    document.getElementById("ep-download-btn").addEventListener("click", () => {
      const year  = parseInt(document.getElementById("ep-year").value);
      const month = parseInt(document.getElementById("ep-month").value);
      const merge = mergeToggle?.checked ? 1 : 0;
      const btn   = document.getElementById("ep-download-btn");
      btn.disabled = true; btn.textContent = "Preparing...";

      fetch(`${AJAX_URL}?excel_report=1&year=${year}&month=${month}&filter_month=${month}&merge=${merge}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      .then((r) => {
        return r.text().then((text) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.substring(0, 200)}`);
          try { return JSON.parse(text); }
          catch (e) { throw new Error("Server returned non-JSON: " + text.substring(0, 300)); }
        });
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        buildAllSheetsExcel(data, year, month);
        document.getElementById("excel-year-picker")?.remove();
      })
      .catch((err) => {
        console.error("Excel error:", err);
        btn.disabled = false; btn.textContent = "Download";
        alert("Failed to generate report: " + err.message);
      });
    });
  };

  // ── Format date string ─────────────────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr || dateStr === "—") return "—";
    const d = new Date(dateStr.includes("-") && dateStr.length <= 10
      ? dateStr + "T00:00:00"
      : dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("en-PH", { month:"long", day:"numeric", year:"numeric" });
  }

  function ucfirst(str) { return str ? str.charAt(0).toUpperCase()+str.slice(1) : ""; }
  function fmtMoney(val) {
    return parseFloat(val||0).toLocaleString('en-PH', {minimumFractionDigits:0, maximumFractionDigits:2});
  }

  // ── Build Excel workbook ───────────────────────────────────────────────
  function buildAllSheetsExcel(data, year, filterMonth) {
    const wb    = XLSX.utils.book_new();
    const mFull = ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"];
    // NOTE: dailyMonth can legitimately be 0 ("All Months"), so we must check
    // for undefined/null explicitly instead of using `||`, which treats 0 as falsy
    // and used to silently fall back to the real current month.
    const dailyMonth = (data.daily_month !== undefined && data.daily_month !== null)
      ? data.daily_month
      : (data.month !== undefined && data.month !== null ? data.month : new Date().getMonth() + 1);

    function makeSheet(titleText, headers, rows, colWidths, statusColIdx) {
      function safeCell(v) {
        if (v === null || v === undefined || v === "") return { v: "", t: "s" };
        if (typeof v === "number") return { v, t: "n" };
        return { v: String(v), t: "s" };
      }
      const safeRows = rows.map(row => row.map(safeCell));
      const aoa = [[titleText], [], headers, ...safeRows];
      const ws  = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"]   = colWidths.map((w)=>({wch:w}));
      ws["!merges"] = [{s:{r:0,c:0},e:{r:0,c:headers.length-1}}];

      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R=range.s.r; R<=range.e.r; R++) {
        for (let C=range.s.c; C<=range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({r:R,c:C});
          if (!ws[addr]) ws[addr]={v:"",t:"s"};
          if (!ws[addr].s) ws[addr].s={};
          ws[addr].s.border = {
            top:{style:"thin",color:{rgb:"D0C8A0"}},bottom:{style:"thin",color:{rgb:"D0C8A0"}},
            left:{style:"thin",color:{rgb:"D0C8A0"}},right:{style:"thin",color:{rgb:"D0C8A0"}},
          };
          ws[addr].s.font      = {name:"Calibri",sz:11};
          ws[addr].s.alignment = {vertical:"center"};
          if (R===0) {
            ws[addr].s.fill      = {fgColor:{rgb:"1C3924"}};
            ws[addr].s.font      = {name:"Calibri",sz:13,bold:true,color:{rgb:"FFFFFF"}};
            ws[addr].s.alignment = {horizontal:"center",vertical:"center"};
          } else if (R===2) {
            ws[addr].s.fill      = {fgColor:{rgb:"1C3924"}};
            ws[addr].s.font      = {name:"Calibri",sz:11,bold:true,color:{rgb:"FFFFFF"}};
            ws[addr].s.alignment = {horizontal:"center",vertical:"center",wrapText:true};
          } else if (R>2) {
            ws[addr].s.fill      = {fgColor:{rgb:R%2===0?"FFFBEF":"FFFFFF"}};
            ws[addr].s.alignment = {horizontal:"center",vertical:"center",wrapText:true};
            if (statusColIdx!==null && C===statusColIdx) {
              const val=(ws[addr].v||"").toString().toLowerCase();
              if (val==="served")  { ws[addr].s.font={name:"Calibri",sz:11,bold:true,color:{rgb:"2D6A2D"}}; ws[addr].s.fill={fgColor:{rgb:"EFFAD4"}}; }
              if (val==="pending") { ws[addr].s.font={name:"Calibri",sz:11,bold:true,color:{rgb:"A88A20"}}; ws[addr].s.fill={fgColor:{rgb:"FFF8DC"}}; }
              if (val==="voided")  { ws[addr].s.font={name:"Calibri",sz:11,bold:true,color:{rgb:"980E0E"}}; ws[addr].s.fill={fgColor:{rgb:"FFE8E8"}}; }
            }
          }
        }
      }
      ws["!rows"]=[];
      for (let R=range.s.r; R<=range.e.r; R++) {
        if (R===0) ws["!rows"][R]={hpt:28};
        else if (R===2) ws["!rows"][R]={hpt:22};
        else ws["!rows"][R]={hpt:18};
      }
      return ws;
    }

    const isMerged    = data.merged || false;
    const filterLabel = filterMonth>0 ? ` — ${mFull[filterMonth-1]} ${year}` : ` — ${year}`;
    const mergeLabel  = isMerged ? " [All Branches]" : "";

    // ── SHEET 1: ORDERS (merged includes Branch column) ─────────────────
    const orderHeaders = isMerged
      ? ["Branch","Order ID","Beeper #","Items","Order Type","Payment",
         "GCash Ref #","Extra GCash Ref #","Extra GCash Amt",
         "Subtotal","Discount","Refund","Total","Change",
         "Status","Date Ordered","Date Served"]
      : ["Order ID","Beeper #","Items","Order Type","Payment",
         "GCash Ref #","Extra GCash Ref #","Extra GCash Amt",
         "Subtotal","Discount","Refund","Total","Change",
         "Status","Date Ordered","Date Served"];

    const orderRows = (data.orders||[]).map((o)=>{
      const base = [
        o.id, o.beeper_number, o.items_str||"",
        o.order_type==="dine-in"?"Dine In":"Take Out",
        ucfirst(o.payment_method),
        o.gcash_reference        || "—",
        o.gcash_reference_extra  || "—",
        fmtMoney(o.gcash_extra_amount||0),
        fmtMoney(o.subtotal||0),
        fmtMoney(o.discount||0),
        fmtMoney(o.refund_amount||0),
        fmtMoney(o.total||0),
        fmtMoney(o.change_amount||0),
        ucfirst(o.status),
        o.created_at ? formatDate(o.created_at.split(" ")[0]) : "—",
        o.served_at  ? formatDate(o.served_at.split(" ")[0])  : "—",
      ];
      return isMerged ? [o.branch_name || "—", ...base] : base;
    });

    const orderColWidths = isMerged
      ? [20,10,10,40,12,12,20,20,14,12,12,12,12,12,12,22,22]
      : [10,10,40,12,12,20,20,14,12,12,12,12,12,12,22,22];

    const ws1 = makeSheet(
      `TWIST & ROLL POS — Orders${filterLabel}${mergeLabel}`,
      orderHeaders, orderRows, orderColWidths, isMerged ? 14 : 13
    );
    XLSX.utils.book_append_sheet(wb, ws1, "Orders");

    // ── PER-BRANCH SHEETS (merge mode only) ───────────────────────────
    if (isMerged && data.branches_data && data.branches_data.length > 0) {
      const branchOnlyHeaders = [
        "Order ID","Beeper #","Items","Order Type","Payment",
        "GCash Ref #","Subtotal","Discount","Total","Status","Date Ordered","Date Served"
      ];
      data.branches_data.forEach((branch) => {
        const bRows = (branch.orders||[]).map((o)=>[
          o.id, o.beeper_number, o.items_str||"",
          o.order_type==="dine-in"?"Dine In":"Take Out",
          ucfirst(o.payment_method),
          o.gcash_reference || "—",
          fmtMoney(o.subtotal||0),
          fmtMoney(o.discount||0),
          fmtMoney(o.total||0),
          ucfirst(o.status),
          o.created_at ? formatDate(o.created_at.split(" ")[0]) : "—",
          o.served_at  ? formatDate(o.served_at.split(" ")[0])  : "—",
        ]);
        // Sheet name max 31 chars
        const sheetName = branch.branch_name.substring(0, 31);
        const bws = makeSheet(
          `${branch.branch_name} — Orders${filterLabel}`,
          branchOnlyHeaders, bRows,
          [10,10,40,12,12,20,12,12,12,12,22,22], 9
        );
        XLSX.utils.book_append_sheet(wb, bws, sheetName);
      });
    }

    // ── SHEET 2: DAILY SUMMARY ────────────────────────────────────────
    const dailyHeaders = ["Date","Total Orders","Served","Voided","Total Sales (₱)","Total Discounts (₱)"];
    const dailyRows = (data.daily||[]).map((d)=>[
      formatDate(d.d),
      parseInt(d.total_orders||0), parseInt(d.served||0), parseInt(d.voided||0),
      fmtMoney(d.total_sales||0), fmtMoney(d.total_discounts||0),
    ]);
    const dailySummaryLabel = dailyMonth > 0
      ? `${mFull[dailyMonth-1]} ${year}`
      : `All Months ${year}`;
    const ws2 = makeSheet(
      `TWIST & ROLL POS — Daily Summary — ${dailySummaryLabel}${mergeLabel}`,
      dailyHeaders, dailyRows, [22,14,10,10,18,20], null
    );
    XLSX.utils.book_append_sheet(wb, ws2, "Daily Summary");

    // ── SHEET 3: WEEKLY ───────────────────────────────────────────────
    const weeklyHeaders = ["Week #","Week Start","Week End","Total Orders","Served","Voided","Total Sales (₱)","Total Discounts (₱)"];
    const weeklyRows = (data.weekly||[]).map((w,i)=>[
      i+1, formatDate(w.week_start), formatDate(w.week_end),
      parseInt(w.total_orders||0), parseInt(w.served||0), parseInt(w.voided||0),
      fmtMoney(w.total_sales||0), fmtMoney(w.total_discounts||0),
    ]);
    const ws3 = makeSheet(
      `TWIST & ROLL POS — Weekly Summary${filterLabel}${mergeLabel}`,
      weeklyHeaders, weeklyRows, [8,22,22,14,10,10,18,20], null
    );
    XLSX.utils.book_append_sheet(wb, ws3, "Weekly Summary");

    // ── SHEET 4: MONTHLY ──────────────────────────────────────────────
    const monthlyHeaders = ["Month","Total Orders","Served","Voided","Total Sales (₱)","Total Discounts (₱)","Avg Order (₱)"];
    const byMo = {};
    (data.monthly||[]).forEach((m)=>{ byMo[parseInt(m.mo)]=m; });
    const monthlyFull = [];
    for (let mo=1; mo<=12; mo++) {
      const m=byMo[mo];
      monthlyFull.push(m
        ? [mFull[mo-1],parseInt(m.total_orders||0),parseInt(m.served||0),
           parseInt(m.voided||0),fmtMoney(m.total_sales||0),fmtMoney(m.total_discounts||0),fmtMoney(m.avg_order||0)]
        : [mFull[mo-1],0,0,0,'0','0','0']
      );
    }
    const ws4 = makeSheet(
      `TWIST & ROLL POS — Monthly Summary — ${year}${mergeLabel}`,
      monthlyHeaders, monthlyFull, [14,14,10,10,18,20,16], null
    );
    XLSX.utils.book_append_sheet(wb, ws4, "Monthly Summary");

    // ── SHEET 5: ANNUAL ───────────────────────────────────────────────
    const annualHeaders = ["Year","Total Orders","Served","Voided","Total Sales (₱)","Total Discounts (₱)"];
    const annualRows = (data.annual||[]).map((a)=>[
      a.yr, parseInt(a.total_orders||0), parseInt(a.served||0),
      parseInt(a.voided||0), fmtMoney(a.total_sales||0), fmtMoney(a.total_discounts||0),
    ]);
    const ws5 = makeSheet(
      `TWIST & ROLL POS — Annual Summary${mergeLabel}`,
      annualHeaders, annualRows, [10,14,10,10,18,20], null
    );
    XLSX.utils.book_append_sheet(wb, ws5, "Annual Summary");

    // ── SHEET 6: TOP ITEMS ────────────────────────────────────────────
    const topHeaders = ["Rank","Item Name","Total Qty Sold","Total Revenue (₱)"];
    const topRows = (data.top_items||[]).map((item,i)=>[
      i+1, item.name, parseInt(item.total_qty||0), fmtMoney(item.total_revenue||0),
    ]);
    const topItemsLabel = dailyMonth > 0
      ? `${mFull[dailyMonth-1]} ${year}`
      : `All Months ${year}`;
    const ws6 = makeSheet(
      `TWIST & ROLL POS — Top Items — ${topItemsLabel}${mergeLabel}`,
      topHeaders, topRows, [8,30,16,20], null
    );
    XLSX.utils.book_append_sheet(wb, ws6, "Top Items");

    // ── DOWNLOAD ──────────────────────────────────────────────────────
    const d=new Date();
    const ds=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
    const monthSuffix=filterMonth>0?`_${mFull[filterMonth-1]}`:"";
    const mergeSuffix=isMerged?"_AllBranches":"";
    XLSX.writeFile(wb, `TwistandRoll_Report_${year}${monthSuffix}${mergeSuffix}_${ds}.xlsx`);
  }

  // ── FILTER ─────────────────────────────────────────────────────────────
  let selectedOrderType="all", selectedPaymentMethod="all",
      selectedStatus="all", selectedDateFrom="", selectedDateTo="";

  function activateChip(c)   { c.style.background=GOLD; c.style.color="#fff"; c.style.borderColor=GOLD; }
  function deactivateChip(c) { c.style.background="#F8F4E4"; c.style.color=GOLD; c.style.borderColor=CHIP_BORDER; }

  window.filterTable = function () {
    if (document.getElementById("filter-modal-overlay")) return;

    const _urlParams  = new URLSearchParams(window.location.search);
    const _curSection = (_urlParams.get('section') || '').toLowerCase();
    const _showStatus = (_curSection === 'orders' || _curSection === '');

    const overlay = document.createElement("div");
    overlay.id = "filter-modal-overlay";
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px);`;
    overlay.addEventListener("click",(e)=>{ if(e.target===overlay) closeFilterModal(); });

    overlay.innerHTML = `
      <div style="width:520px;max-width:92vw;background:${MODAL_BG};border-radius:28px;overflow:hidden;box-shadow:0 25px 70px rgba(0,0,0,0.18);font-family:Poppins,sans-serif;">
        <div style="padding:20px 26px 14px;font-size:18px;font-weight:700;color:${GREEN};">Filter</div>
        <div style="height:1px;background:#D9D2B8;"></div>
        <div style="padding:24px 32px 22px;display:flex;flex-direction:column;gap:20px;">
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="font-size:14px;font-weight:600;color:${GREEN};width:140px;">Date</div>
            <div style="flex:1;display:flex;align-items:center;gap:8px;">
              <input type="date" id="filter-date-from" value="${selectedDateFrom}"
                style="flex:1;height:38px;border-radius:10px;border:1.5px solid ${CHIP_BORDER};padding:0 10px;font-family:Poppins,sans-serif;background:white;color:${GREEN};">
              <span style="font-size:12px;color:#777;">to</span>
              <input type="date" id="filter-date-to" value="${selectedDateTo}"
                style="flex:1;height:38px;border-radius:10px;border:1.5px solid ${CHIP_BORDER};padding:0 10px;font-family:Poppins,sans-serif;background:white;color:${GREEN};">
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="font-size:14px;font-weight:600;color:${GREEN};width:140px;">Order type</div>
            <div style="display:flex;gap:8px;">
              <button class="filter-chip" data-group="order-type" data-value="all">All</button>
              <button class="filter-chip" data-group="order-type" data-value="dine in">Dine in</button>
              <button class="filter-chip" data-group="order-type" data-value="take out">Take out</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="font-size:14px;font-weight:600;color:${GREEN};width:140px;">Payment</div>
            <div style="display:flex;gap:8px;">
              <button class="filter-chip" data-group="payment" data-value="all">All</button>
              <button class="filter-chip" data-group="payment" data-value="cash">Cash</button>
              <button class="filter-chip" data-group="payment" data-value="gcash">GCash</button>
            </div>
          </div>
          ${_showStatus ? `
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="font-size:14px;font-weight:600;color:${GREEN};width:140px;">Status</div>
            <div style="display:flex;gap:8px;">
              <button class="filter-chip" data-group="status" data-value="all">All</button>
              <button class="filter-chip" data-group="status" data-value="pending">Pending</button>
              <button class="filter-chip" data-group="status" data-value="served">Served</button>
              <button class="filter-chip" data-group="status" data-value="voided">Voided</button>
            </div>
          </div>` : ''}
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px;">
            <button onclick="clearFilter()"
              style="height:40px;padding:0 16px;border-radius:999px;border:1.5px solid ${CHIP_BORDER};background:#F8F4E4;color:${GREEN};font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">↺ Reset</button>
            <button onclick="applyFilter()"
              style="height:40px;padding:0 20px;border:none;border-radius:999px;background:${GREEN};color:white;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">Apply</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    document.querySelectorAll(".filter-chip").forEach((chip)=>{
      chip.style.cssText += `height:36px;min-width:72px;padding:0 12px;border-radius:10px;border:1.5px solid ${CHIP_BORDER};background:#F8F4E4;color:${GOLD};font-family:Poppins,sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:0.15s ease;`;
      const group=chip.dataset.group, value=chip.dataset.value;
      if ((group==="order-type"&&value===selectedOrderType)||(group==="payment"&&value===selectedPaymentMethod)||(group==="status"&&value===selectedStatus)) activateChip(chip);
      else deactivateChip(chip);
      chip.addEventListener("click",()=>{
        document.querySelectorAll(`.filter-chip[data-group="${group}"]`).forEach((c)=>deactivateChip(c));
        activateChip(chip);
        if (group==="order-type") selectedOrderType=value;
        if (group==="payment")    selectedPaymentMethod=value;
        if (group==="status")     selectedStatus=value;
      });
    });
  };

  window.closeFilterModal = function () { document.getElementById("filter-modal-overlay")?.remove(); };

  window.applyFilter = function () {
    const from=document.getElementById("filter-date-from")?.value||"";
    const to  =document.getElementById("filter-date-to")?.value||"";
    selectedDateFrom=from; selectedDateTo=to;
    getAllTableRows().forEach((row)=>{
      let show=true;
      const dc=row.cells[1], otc=row.cells[2], pc=row.cells[3], sc=row.cells[5];
      if (dc) {
        const parsed=Date.parse(dc.textContent.trim());
        if (!isNaN(parsed)) {
          const rd=new Date(parsed).toISOString().split("T")[0];
          if (from&&rd<from) show=false;
          if (to&&rd>to)     show=false;
        }
      }
      if (selectedOrderType!=="all"     && otc && otc.textContent.trim().toLowerCase()!==selectedOrderType)     show=false;
      if (selectedPaymentMethod!=="all" && pc  && pc.textContent.trim().toLowerCase()!==selectedPaymentMethod)  show=false;
      if (selectedStatus!=="all"        && sc  && sc.textContent.trim().toLowerCase()!==selectedStatus)         show=false;
      row.dataset.filtered=show?"1":"0";
    });
    renderTablePage(1); closeFilterModal();
  };

  window.clearFilter = function () {
    selectedOrderType="all"; selectedPaymentMethod="all";
    selectedStatus="all"; selectedDateFrom=""; selectedDateTo="";
    getAllTableRows().forEach((r)=>{ r.dataset.filtered="1"; });
    renderTablePage(1); closeFilterModal();
  };

  // ── TABLE PAGINATION ───────────────────────────────────────────────────
  const TABLE_PER_PAGE=10; let tablePage=1;

  function getAllTableRows() {
    return Array.from(document.querySelectorAll("#orders-table tbody tr"))
      .filter((r)=>!r.querySelector(".table-empty"));
  }

  function renderTablePage(page) {
    tablePage=page;
    const all=getAllTableRows();
    const filtered=all.filter((r)=>r.dataset.filtered!=="0");
    const total=Math.max(1,Math.ceil(filtered.length/TABLE_PER_PAGE));
    if (tablePage>total) tablePage=total;
    const start=(tablePage-1)*TABLE_PER_PAGE, end=start+TABLE_PER_PAGE;
    all.forEach((r)=>(r.style.display="none"));
    filtered.forEach((r,i)=>{ r.style.display=(i>=start&&i<end)?"":"none"; });
    renderPagination(tablePage,total,filtered.length);
  }

  function renderPagination(page,totalPages,total) {
    let container=document.getElementById("orders-table-pagination");
    if (!container) {
      container=document.createElement("div");
      container.id="orders-table-pagination"; container.className="table-pagination";
      document.querySelector(".orders-list-wrap")?.appendChild(container);
    }
    if (totalPages<=1) { container.innerHTML=""; return; }
    const pd=page===1?"disabled":"", nd=page===totalPages?"disabled":"";
    const delta=2; let nums=[];
    for (let i=Math.max(1,page-delta);i<=Math.min(totalPages,page+delta);i++) nums.push(i);
    let btns="";
    if (nums[0]>1) { btns+=`<button class="tpg-btn" data-p="1">1</button>`; if(nums[0]>2) btns+=`<span class="tpg-ellipsis">…</span>`; }
    nums.forEach((p)=>{ btns+=`<button class="tpg-btn ${p===page?"tpg-btn--active":""}" data-p="${p}">${p}</button>`; });
    if (nums[nums.length-1]<totalPages) { if(nums[nums.length-1]<totalPages-1) btns+=`<span class="tpg-ellipsis">…</span>`; btns+=`<button class="tpg-btn" data-p="${totalPages}">${totalPages}</button>`; }
    const showing=total===0?"No orders found":`Showing ${(page-1)*TABLE_PER_PAGE+1}–${Math.min(page*TABLE_PER_PAGE,total)} of ${total} orders`;
    container.innerHTML=`<div class="tpg-info">${showing}</div>
      <div class="tpg-controls">
        <button class="tpg-arrow" id="tpg-prev" ${pd}>&#8592;</button>${btns}
        <button class="tpg-arrow" id="tpg-next" ${nd}>&#8594;</button>
      </div>`;
    container.querySelector("#tpg-prev")?.addEventListener("click",()=>renderTablePage(tablePage-1));
    container.querySelector("#tpg-next")?.addEventListener("click",()=>renderTablePage(tablePage+1));
    container.querySelectorAll(".tpg-btn").forEach((b)=>b.addEventListener("click",()=>renderTablePage(parseInt(b.dataset.p))));
  }

  // ── SIDEBAR ────────────────────────────────────────────────────────────
  window.toggleMonth = function (yr,num) {
    const ch=document.getElementById("mc-"+yr+"-"+num), ar=document.getElementById("ma-"+yr+"-"+num);
    if (!ch) return;
    const open=ch.style.display!=="none";
    ch.style.display=open?"none":"block";
    if (ar) ar.textContent=open?"›":"▾";
  };

  // ── ANNUAL MODAL ───────────────────────────────────────────────────────
  function buildAnnualModal() {
    const overlay=document.createElement("div");
    overlay.id="annual-overlay";
    overlay.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;display:flex;align-items:center;justify-content:center;`;
    overlay.addEventListener("click",(e)=>{ if(e.target===overlay) overlay.remove(); });
    const mNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const labels=MONTHLY_DATA.map((m)=>mNames[m.mo-1]);
    const values=MONTHLY_DATA.map((m)=>parseFloat(m.total_sales));
    const total=values.reduce((a,b)=>a+b,0);
    overlay.innerHTML=`
      <div style="background:#fff;border-radius:20px;padding:28px 30px;width:560px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);position:relative;font-family:Poppins,sans-serif;">
        <button onclick="document.getElementById('annual-overlay').remove()" style="position:absolute;top:16px;right:18px;background:none;border:none;font-size:20px;cursor:pointer;color:#888;">✕</button>
        <h2 style="font-size:18px;font-weight:700;color:#1C3924;margin-bottom:4px;">📁 Annual Income — ${SELECTED_YEAR}</h2>
        <p style="font-size:13px;color:#888;margin-bottom:18px;">Total: <strong style="color:#1C3924;">₱${total.toLocaleString()}</strong></p>
        <canvas id="annualChart" height="160"></canvas>
        <div id="annual-month-list" style="margin-top:18px;display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;"></div>
      </div>`;
    document.body.appendChild(overlay);
    new Chart(document.getElementById("annualChart"),{
      type:"bar",
      data:{labels,datasets:[{data:values,backgroundColor:GOLD,borderRadius:6,borderSkipped:false,maxBarThickness:36}]},
      options:{
        responsive:true,
        onClick:(e,els)=>{ if(els.length>0){const mo=MONTHLY_DATA[els[0].index].mo;window.location.href=`?page=statistics&sidebar=1&year=${SELECTED_YEAR}&month=${mo}&section=orders`;} },
        plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>`₱${ctx.parsed.y.toLocaleString()}`,afterLabel:()=>"Click to view orders"}},datalabels:false},
        scales:{y:{ticks:{callback:(v)=>`₱${(v/1000).toFixed(0)}k`,font:{family:"Poppins",size:11},color:"#5A6B5E"},grid:{color:"rgba(0,0,0,0.05)"},beginAtZero:true},x:{ticks:{font:{family:"Poppins",size:11},color:"#5A6B5E"},grid:{display:false}}},
      },
    });
    const list=document.getElementById("annual-month-list");
    MONTHLY_DATA.forEach((m)=>{
      const item=document.createElement("a");
      item.href=`?page=statistics&sidebar=1&year=${SELECTED_YEAR}&month=${m.mo}&section=orders`;
      item.style.cssText=`display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:10px;background:#fdf9ee;text-decoration:none;border:1px solid #e8e0c8;transition:background 0.15s;`;
      item.innerHTML=`<span style="font-size:13px;font-weight:500;color:#1C3924;">📂 ${mNames[m.mo-1]}</span><span style="font-size:13px;font-weight:700;color:#1C3924;">₱${parseFloat(m.total_sales).toLocaleString()}</span>`;
      item.onmouseover=()=>(item.style.background="#f5edcf"); item.onmouseout=()=>(item.style.background="#fdf9ee");
      list.appendChild(item);
    });
  }

  function initAnnualClick() {
    const el=document.querySelector(".tree-annual");
    if (!el) return;
    el.style.cursor="pointer"; el.style.borderRadius="8px"; el.style.transition="background 0.15s";
    el.addEventListener("mouseenter",()=>(el.style.background="rgba(216,195,111,0.2)"));
    el.addEventListener("mouseleave",()=>(el.style.background=""));
    el.addEventListener("click",buildAnnualModal);
  }

  window.openSidebar  = function () { document.getElementById("stats-sidebar")?.classList.add("stats-sidebar--open"); const b=document.getElementById("open-sidebar"); if(b) b.style.display="none"; };
  window.closeSidebar = function () { document.getElementById("stats-sidebar")?.classList.remove("stats-sidebar--open"); const b=document.getElementById("open-sidebar"); if(b) b.style.display="flex"; };

  // ── PROFILE / CLOCK ────────────────────────────────────────────────────
  const profileBtn=document.getElementById("profile-btn"), dropdown=document.getElementById("profile-dropdown"), logoutBtn=document.getElementById("logout-btn");
  if (profileBtn&&dropdown) { profileBtn.addEventListener("click",(e)=>{ e.stopPropagation(); dropdown.classList.toggle("open"); }); document.addEventListener("click",()=>dropdown.classList.remove("open")); }
  if (logoutBtn) logoutBtn.addEventListener("click",()=>{ window.location.href=logoutBtn.dataset.logoutUrl; });

  function updateClock() {
    const now=new Date();
    const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
    let h=now.getHours(); const ampm=h>=12?"PM":"AM"; h=h%12||12;
    const m=String(now.getMinutes()).padStart(2,"0");
    const de=document.getElementById("current-day"), dte=document.getElementById("current-date");
    if (de)  de.textContent=days[now.getDay()];
    if (dte) dte.textContent=`${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} at ${h}:${m} ${ampm}`;
  }
  updateClock(); setInterval(updateClock,1000);

  // ── INIT ───────────────────────────────────────────────────────────────
  if (typeof SIDEBAR_OPEN!=="undefined"&&SIDEBAR_OPEN) { const b=document.getElementById("open-sidebar"); if(b) b.style.display="none"; }
  renderTrendChart("weekly");
  renderBarChart();
  renderSectionBarChart();
  initAnnualClick();
  getAllTableRows().forEach((r)=>{ r.dataset.filtered="1"; });
  renderTablePage(1);

  // ── ORDER OVERVIEW MODAL ───────────────────────────────────────────────
  window.openOrderModal = function (orderData) {
    if (document.getElementById("order-modal-overlay")) return;
    const overlay=document.createElement("div");
    overlay.className="order-modal-overlay"; overlay.id="order-modal-overlay";
    overlay.addEventListener("click",(e)=>{ if(e.target===overlay) closeOrderModal(); });

    const itemsHTML=(orderData.items||[]).map((item)=>`
      <div class="order-item">
        <span>${item.qty}x ${item.name}</span>
        <span>Php ${Number(item.price*item.qty).toLocaleString("en-PH",{minimumFractionDigits:0})}</span>
      </div>`).join("");

    const isGcash=(orderData.payment||"").toLowerCase()==="gcash";
    let gcashRows="";
    if (isGcash) {
      if (orderData.gcash_reference) gcashRows+=`<div class="summary-row"><span>GCash Ref #</span><span style="font-weight:600;">${orderData.gcash_reference}</span></div>`;
      if (orderData.gcash_reference_extra) gcashRows+=`<div class="summary-row"><span>Extra Ref # <span style="font-size:11px;color:#0070C0;">(+₱${Number(orderData.gcash_extra_amount||0).toLocaleString()})</span></span><span style="font-weight:600;color:#0070C0;">${orderData.gcash_reference_extra}</span></div>`;
    }

    const discountAmt=parseFloat(orderData.discount)||0;
    const refundAmt  =parseFloat(orderData.refund_amount)||0;
    const discountRow=discountAmt>0?`<div class="summary-row"><span>Discount</span><span style="color:#C0392B;font-weight:600;">−Php ${Number(discountAmt).toLocaleString("en-PH",{minimumFractionDigits:0})}</span></div>`:"";
    const refundRow  =refundAmt>0  ?`<div class="summary-row"><span>Refund</span><span style="color:#C0392B;font-weight:600;">−Php ${Number(refundAmt).toLocaleString("en-PH",{minimumFractionDigits:0})}</span></div>`:"";

    const footerLine=orderData.served_at&&orderData.served_at!==orderData.ordered_at
      ?`Ordered: ${orderData.ordered_at} &nbsp;·&nbsp; Served: ${orderData.served_at}`
      :`Ordered: ${orderData.ordered_at}`;

    overlay.innerHTML=`
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
        <div class="order-items">${itemsHTML||'<p style="color:#aaa;font-size:13px;text-align:center;">No items found</p>'}</div>
        <div class="order-divider"></div>
        <div class="order-summary">
          <div class="summary-row"><span>Mode of Payment</span><span>${orderData.payment||"—"}</span></div>
          ${gcashRows}
          <div class="summary-row"><span>Subtotal</span><span>Php ${Number(orderData.subtotal).toLocaleString("en-PH",{minimumFractionDigits:0})}</span></div>
          ${discountRow}${refundRow}
          <div class="summary-total">
            <span>Total</span>
            <span class="total-amount">Php ${Number(orderData.total).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
          </div>
        </div>
        <div class="order-footer">${footerLine}</div>
        <div class="order-close-wrap"><button class="order-close-btn" onclick="closeOrderModal()">Close</button></div>
      </div>`;
    document.body.appendChild(overlay);
  };

  window.closeOrderModal = function () { document.getElementById("order-modal-overlay")?.remove(); };

  // ── ROW CLICK HANDLERS ─────────────────────────────────────────────────
  document.querySelectorAll("#orders-table tbody tr").forEach((row)=>{
    if (row.querySelector(".table-empty")) return;
    row.style.cursor="pointer";
    row.addEventListener("click",()=>{
      let items=[];
      try { const raw=row.getAttribute("data-items"); if(raw){const p=JSON.parse(raw);if(Array.isArray(p))items=p.map((i)=>({qty:i.qty,name:i.name,price:i.price}));} } catch(e) {}
      openOrderModal({
        id:                    row.cells[0]?.textContent.trim()||"—",
        date:                  row.cells[1]?.textContent.trim()||"",
        type:                  row.cells[2]?.textContent.trim()||"",
        payment:               row.cells[3]?.textContent.trim()||"",
        status:                row.cells[5]?.textContent.trim()||"",
        items,
        subtotal:              parseFloat(row.getAttribute("data-subtotal")||"0"),
        discount:              parseFloat(row.getAttribute("data-discount")||"0"),
        refund_amount:         parseFloat(row.getAttribute("data-refund-amount")||"0"),
        total:                 parseFloat((row.cells[4]?.textContent||"0").replace(/[₱,\s]/g,"")),
        ordered_at:            row.getAttribute("data-ordered-at")||row.cells[1]?.textContent.trim()||"",
        served_at:             row.getAttribute("data-served-at")||"",
        gcash_reference:       row.getAttribute("data-gcash-ref")||"",
        gcash_reference_extra: row.getAttribute("data-gcash-ref-extra")||"",
        gcash_extra_amount:    parseFloat(row.getAttribute("data-gcash-extra-amount")||"0"),
      });
    });
  });

})();