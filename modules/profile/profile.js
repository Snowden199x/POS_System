(function () {
  "use strict";

  // ── CLOCK ──────────────────────────────────────────────────────────────
  function updateClock() {
    const now    = new Date();
    const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    let h        = now.getHours();
    const ampm   = h >= 12 ? "PM" : "AM";
    h            = h % 12 || 12;
    const m      = String(now.getMinutes()).padStart(2, "0");
    const dayEl  = document.getElementById("current-day");
    const dateEl = document.getElementById("current-date");
    if (dayEl)  dayEl.textContent  = days[now.getDay()];
    if (dateEl) dateEl.textContent = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} at ${h}:${m} ${ampm}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ── PROFILE DROPDOWN ───────────────────────────────────────────────────
  const profileBtn   = document.getElementById("profile-btn");
  const dropdown     = document.getElementById("profile-dropdown");
  const logoutBtn    = document.getElementById("logout-btn");
  const dangerLogout = document.getElementById("danger-logout-btn");

  if (profileBtn && dropdown) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });
    document.addEventListener("click", () => dropdown.classList.remove("open"));
  }
  if (logoutBtn)    logoutBtn.addEventListener("click",    () => { window.location.href = logoutBtn.dataset.logoutUrl; });
  if (dangerLogout) dangerLogout.addEventListener("click", () => { window.location.href = dangerLogout.dataset.logoutUrl; });

  // ── EDIT PROFILE TOGGLE ────────────────────────────────────────────────
  const accountView   = document.getElementById("account-view");
  const accountEdit   = document.getElementById("account-edit");
  const openEditBtn   = document.getElementById("open-edit-btn");
  const inlineEditBtn = document.getElementById("inline-edit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  function showEditMode() {
    if (accountView)   accountView.style.display  = "none";
    if (accountEdit)   accountEdit.style.display  = "block";
    if (inlineEditBtn) inlineEditBtn.style.display = "none";
  }
  function showViewMode() {
    if (accountView)   accountView.style.display  = "block";
    if (accountEdit)   accountEdit.style.display  = "none";
    if (inlineEditBtn) inlineEditBtn.style.display = "flex";
  }

  if (openEditBtn)   openEditBtn.addEventListener("click",   showEditMode);
  if (inlineEditBtn) inlineEditBtn.addEventListener("click", showEditMode);
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", showViewMode);

  // ── SCROLL TO SECURITY CARD ────────────────────────────────────────────
  const openPwBtn    = document.getElementById("open-pw-btn");
  const securityCard = document.getElementById("security-card");

  if (openPwBtn && securityCard) {
    openPwBtn.addEventListener("click", () => {
      securityCard.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstInput = securityCard.querySelector('input[type="password"]');
      if (firstInput) setTimeout(() => firstInput.focus(), 400);
    });
  }

  // ── SCROLL TO RECEIPT CARD ─────────────────────────────────────────────
  const openReceiptBtn = document.getElementById("open-receipt-btn");
  const receiptCard    = document.getElementById("receipt-card");

  if (openReceiptBtn && receiptCard) {
    openReceiptBtn.addEventListener("click", () => {
      receiptCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ── PASSWORD VISIBILITY TOGGLE ─────────────────────────────────────────
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      const visible = input.type === "text";
      btn.innerHTML = visible
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
             <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
             <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
             <circle cx="12" cy="12" r="3"/>
           </svg>`;
    });
  });

  // ── LIVE PASSWORD REQUIREMENTS ─────────────────────────────────────────
  const pwNewInput  = document.getElementById("pw-new");
  const pwConfirm   = document.getElementById("pw-confirm");
  const pwReqs      = document.getElementById("pw-requirements");
  const pwMatch     = document.getElementById("pw-match");
  const pwSubmitBtn = document.getElementById("pw-submit-btn");

  const rules = [
    { id: "req-length",  test: (v) => v.length >= 8      },
    { id: "req-upper",   test: (v) => /[A-Z]/.test(v)    },
    { id: "req-number",  test: (v) => /[0-9]/.test(v)    },
    { id: "req-special", test: (v) => /[\W_]/.test(v)    },
  ];

  function checkRequirements() {
    const val       = pwNewInput ? pwNewInput.value : "";
    const hasValue  = val.length > 0;
    let   allPassed = true;

    if (pwReqs) pwReqs.style.display = hasValue ? "block" : "none";

    rules.forEach((rule) => {
      const el   = document.getElementById(rule.id);
      if (!el) return;
      const pass = rule.test(val);
      if (!pass) allPassed = false;
      const icon = el.querySelector(".pw-req__icon");
      if (pass) {
        el.classList.add("pw-req--pass"); el.classList.remove("pw-req--fail");
        if (icon) icon.textContent = "✓";
      } else {
        el.classList.add("pw-req--fail"); el.classList.remove("pw-req--pass");
        if (icon) icon.textContent = "✗";
      }
    });

    checkMatch();
    updateSubmitBtn(allPassed);
  }

  function checkMatch() {
    if (!pwConfirm || !pwNewInput || !pwMatch) return;
    const newVal     = pwNewInput.value;
    const confirmVal = pwConfirm.value;
    if (!confirmVal) { pwMatch.style.display = "none"; return; }
    pwMatch.style.display = "flex";
    if (newVal === confirmVal) {
      pwMatch.className = "pw-match pw-match--ok";
      pwMatch.innerHTML = `<span class="pw-req__icon">✓</span> Passwords match`;
    } else {
      pwMatch.className = "pw-match pw-match--err";
      pwMatch.innerHTML = `<span class="pw-req__icon">✗</span> Passwords do not match`;
    }
  }

  function updateSubmitBtn(allRulesPassed) {
    if (!pwSubmitBtn) return;
    const confirmVal = pwConfirm ? pwConfirm.value : "";
    const newVal     = pwNewInput ? pwNewInput.value : "";
    const canSubmit  = allRulesPassed && newVal === confirmVal && confirmVal.length > 0;
    pwSubmitBtn.disabled      = !canSubmit;
    pwSubmitBtn.style.opacity = canSubmit ? "1" : "0.5";
    pwSubmitBtn.style.cursor  = canSubmit ? "pointer" : "not-allowed";
  }

  if (pwNewInput) {
    if (pwReqs)  pwReqs.style.display  = "none";
    if (pwMatch) pwMatch.style.display = "none";
    pwNewInput.addEventListener("input", checkRequirements);
  }
  if (pwConfirm) {
    pwConfirm.addEventListener("input", () => {
      checkMatch();
      const val       = pwNewInput ? pwNewInput.value : "";
      const allPassed = rules.every((r) => r.test(val));
      updateSubmitBtn(allPassed);
    });
  }
  if (pwSubmitBtn) {
    pwSubmitBtn.disabled      = true;
    pwSubmitBtn.style.opacity = "0.5";
    pwSubmitBtn.style.cursor  = "not-allowed";
  }

  // ── AVATAR UPLOAD ──────────────────────────────────────────────────────
  const camBtn      = document.getElementById("avatar-cam-btn");
  const avatarInput = document.getElementById("avatar-input");
  const avatarWrap  = document.querySelector(".avatar-wrap");

  if (camBtn && avatarInput) {
    camBtn.addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        let img = avatarWrap.querySelector(".avatar-img");
        const placeholder = avatarWrap.querySelector(".avatar-placeholder");
        if (placeholder) placeholder.remove();
        if (!img) {
          img = document.createElement("img");
          img.className = "avatar-img"; img.alt = "Avatar";
          avatarWrap.insertBefore(img, avatarWrap.firstChild);
        }
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      const avatarForm = document.getElementById("avatar-form");
      if (avatarForm) avatarForm.submit();
    });
  }

  // ── STORE LOGO UPLOAD ───────────────────────────────────────────────────
  const logoUploadBtn = document.getElementById("logo-upload-btn");
  const logoInput     = document.getElementById("logo-input");
  const logoPreviewImg = document.getElementById("logo-preview-img");

  if (logoUploadBtn && logoInput) {
    logoUploadBtn.addEventListener("click", () => logoInput.click());
    logoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (logoPreviewImg) logoPreviewImg.src = ev.target.result;
        const rpLogo = document.getElementById("rp-logo");
        if (rpLogo) rpLogo.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      const logoForm = document.getElementById("logo-form");
      if (logoForm) logoForm.submit();
    });
  }

  // ── FACEBOOK QR CODE ─────────────────────────────────────────────────────
  function renderFbQr(url) {
    const qrWrap = document.getElementById("rp-qr-wrap");
    const qrBox  = document.getElementById("rp-qr");
    if (!qrWrap || !qrBox) return;

    if (!url) {
      qrWrap.style.display = "none";
      return;
    }
    qrWrap.style.display = "";
    qrBox.innerHTML = "";
    if (typeof qrcode !== "function") return; // library not loaded, skip quietly

    try {
      const qr = qrcode(0, "M"); // type 0 = auto-detect smallest size
      qr.addData(url);
      qr.make();
      qrBox.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true });
    } catch (err) {
      qrWrap.style.display = "none";
    }
  }

  const initialFbUrl = document.getElementById("rp-qr-wrap")?.dataset.fbUrl || "";
  renderFbQr(initialFbUrl);

  const fbUrlInput = document.querySelector('[name="fb_page_url"]');
  if (fbUrlInput) {
    fbUrlInput.addEventListener("input", () => renderFbQr(fbUrlInput.value.trim()));
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RECEIPT PREVIEW — live update as user types
  // ══════════════════════════════════════════════════════════════════════
  const receiptForm = document.getElementById("receipt-form");
  if (receiptForm) {

    // Helper: bind an input to a preview element's text content
    function bindText(inputName, previewId, prefix) {
      const input   = receiptForm.querySelector(`[name="${inputName}"]`);
      const preview = document.getElementById(previewId);
      if (!input || !preview) return;
      input.addEventListener("input", () => {
        const val = input.value.trim();
        preview.textContent = val ? (prefix || "") + val : "";
        preview.classList.toggle("rp-placeholder", !val);
      });
    }

    // Helper: bind a checkbox to show/hide a preview row
    function bindToggle(inputName, previewId) {
      const input   = receiptForm.querySelector(`[name="${inputName}"]`);
      const preview = document.getElementById(previewId);
      if (!input || !preview) return;
      input.addEventListener("change", () => {
        preview.style.display = input.checked ? "" : "none";
      });
    }

    bindText("store_name",     "rp-store-name");
    bindText("store_address",  "rp-address");
    bindText("store_contact",  "rp-contact");
    bindText("store_tin",      "rp-tin", "TIN: ");
    bindText("receipt_header", "rp-header");
    bindText("receipt_footer", "rp-footer");

    bindToggle("show_discount",   "rp-discount-row");
    bindToggle("show_cashier",    "rp-cashier-row");
    bindToggle("show_order_type", "rp-order-type-row");
    bindToggle("show_beeper",     "rp-beeper-row");

    // Dark mode — applies instantly, saved along with the rest of the form
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    if (darkModeToggle) {
      darkModeToggle.addEventListener("change", () => {
        document.documentElement.setAttribute("data-theme", darkModeToggle.checked ? "dark" : "light");
      });
    }
  }

})();