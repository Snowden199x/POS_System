(function () {
    'use strict';

    // ── FILTER ─────────────────────────────────────────────
    let currentFilter = 'all';

    function filterOrders(type, el) {
        currentFilter = type;
        document.querySelectorAll('.filter').forEach(btn => btn.classList.remove('active'));
        if (el) el.classList.add('active');
        const val = searchInput ? searchInput.value.trim() : '';
        let visible = 0;
        document.querySelectorAll('.order-card').forEach(card => {
            const beeper = (card.querySelector('.order-id')?.dataset.beeper || '').trim();
            const items  = Array.from(card.querySelectorAll('.order-row span:first-child'))
                .map(el => el.textContent.toLowerCase().replace(/^\d+x\s*/i, '')).join(' ');
            const match = (currentFilter === 'all' || card.dataset.type === currentFilter)
                       && (val === '' || beeper === val || items.includes(val.toLowerCase()));
            card.style.display = match ? 'flex' : 'none';
            if (match) visible++;
        });
        showEmpty(visible === 0);
    }
    window.filterOrders = filterOrders;

    // ── MARK AS SERVED ─────────────────────────────────────
    function markServed(btn) {
        const card    = btn.closest('.order-card');
        const orderId = btn.dataset.id;
        btn.disabled = true; btn.textContent = 'Saving...';
        fetch('modules/orders/serve_order.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0'; card.style.transform = 'scale(0.95)';
                setTimeout(() => { card.remove(); showEmpty(document.querySelectorAll('.order-card').length === 0); }, 300);
            } else {
                btn.disabled = false; btn.textContent = 'Mark as served';
                alert('Failed: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(() => { btn.disabled = false; btn.textContent = 'Mark as served'; alert('Network error.'); });
    }
    window.markServed = markServed;

    function showEmpty(show) {
        let empty = document.getElementById('empty');
        if (!empty && show) {
            empty = document.createElement('div');
            empty.id = 'empty'; empty.className = 'orders-empty';
            empty.textContent = 'No pending orders yet.';
            document.getElementById('orders-grid').appendChild(empty);
        }
        if (empty) empty.style.display = show ? 'block' : 'none';
    }

    // ── SEARCH ─────────────────────────────────────────────
    const searchInput = document.getElementById('orderSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const val = this.value.trim().toLowerCase();
            let visible = 0;
            document.querySelectorAll('.order-card').forEach(card => {
                const beeper = (card.querySelector('.order-id')?.dataset.beeper || '').trim();
                const items  = Array.from(card.querySelectorAll('.order-row span:first-child'))
                    .map(el => el.textContent.toLowerCase().replace(/^\d+x\s*/i, '')).join(' ');
                const match = (currentFilter === 'all' || card.dataset.type === currentFilter)
                           && (val === '' || beeper === val || items.includes(val));
                card.style.display = match ? 'flex' : 'none';
                if (match) visible++;
            });
            showEmpty(visible === 0);
        });
    }

    // ── PROFILE DROPDOWN ───────────────────────────────────
    const profileBtn = document.getElementById('profile-btn');
    const dropdown   = document.getElementById('profile-dropdown');
    const logoutBtn  = document.getElementById('logout-btn');
    if (profileBtn && dropdown) {
        profileBtn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('open'); });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }
    if (logoutBtn) logoutBtn.addEventListener('click', () => { window.location.href = logoutBtn.dataset.logoutUrl; });

    // ── ORDER MENU (⋮) ─────────────────────────────────────
    document.querySelectorAll('.order-menu-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            document.querySelectorAll('.order-menu').forEach(m => { if (m !== this.nextElementSibling) m.classList.remove('open'); });
            this.nextElementSibling.classList.toggle('open');
        });
    });
    document.addEventListener('click', () => document.querySelectorAll('.order-menu').forEach(m => m.classList.remove('open')));

    // ══════════════════════════════════════════════════════
    //  EDIT MODAL STATE
    // ══════════════════════════════════════════════════════
    const epm = {
        orderId:         null,
        items:           [],
        orderType:       'dine-in',
        paymentMethod:   'cash',
        discountEnabled: false,
        originalGcashRef: '',
    };
    let originalTotal   = 0;

    // ── DOM ────────────────────────────────────────────────
    const editModal       = document.getElementById('editModal');
    const epmClose        = document.getElementById('editModalClose');
    const epmTypeWrap     = document.getElementById('epm-type-wrap');
    const epmTypeInput    = document.getElementById('epm-type');
    const epmBeeper       = document.getElementById('epm-beeper');
    const epmItemsList    = document.getElementById('epm-items-list');
    const epmAddBtn       = document.getElementById('epm-add-btn');
    const epmMenuPicker   = document.getElementById('epm-menu-picker');
    const epmPickerGrid   = document.getElementById('epm-picker-grid');
    const epmDiscToggle   = document.getElementById('epm-discount-toggle');
    const epmDiscVal      = document.getElementById('epm-discount-val');
    const epmSubtotalVal  = document.getElementById('epm-subtotal-val');
    const epmTotalVal     = document.getElementById('epm-total-val');
    const epmPaymentWrap  = document.getElementById('epm-payment-wrap');
    const epmPaymentInput = document.getElementById('epm-payment');
    const epmAmountWrap   = document.getElementById('epm-amount-wrap');
    const epmAmountInput  = document.getElementById('epm-amount-input');
    const epmTotalBtn     = document.getElementById('epm-total-btn');
    const epmSaveBtn      = document.getElementById('epm-save-btn');
    const epmOrderId      = document.getElementById('epm-order-id');
    const epmGcashSection = document.getElementById('epm-gcash-section');
    const epmGcashOrig    = document.getElementById('epm-gcash-orig');

    // ── HELPERS ────────────────────────────────────────────
    function getItemDiscount(price) {
        if (typeof DISCOUNT_MAP !== 'undefined' && DISCOUNT_MAP[price] !== undefined) return DISCOUNT_MAP[price];
        return Math.floor(price * 0.20);
    }

    function calcEpmTotals() {
        let subtotal = 0;
        epm.items.forEach(item => { subtotal += item.price * item.qty; });
        let disc = 0;
        if (epm.discountEnabled && epm.items.length > 0) {
            const cheapest = epm.items.reduce((m, o) => o.price < m.price ? o : m, epm.items[0]);
            disc = getItemDiscount(cheapest.price);
        }
        return { subtotal, disc, total: subtotal - disc };
    }

    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // ── RENDER ITEMS ───────────────────────────────────────
    function renderEpmItems() {
        epmItemsList.innerHTML = '';
        if (epm.items.length === 0) {
            epmItemsList.innerHTML = `<div class="order-empty" style="display:flex;">
                <svg class="order-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <span class="order-empty__text">No items yet</span></div>`;
        } else {
            const cheapest = epm.items.reduce((m, o) => o.price < m.price ? o : m, epm.items[0]);
            epm.items.forEach(item => {
                const disc     = (epm.discountEnabled && item.id === cheapest.id) ? getItemDiscount(item.price) : 0;
                const effPrice = item.price - disc;
                const row      = document.createElement('div');
                row.className  = 'order-item';
                row.dataset.id = item.id;
                row.innerHTML  = `
                    <div style="flex:1;min-width:0;">
                        <span class="order-item__name">${escHtml(item.name)}</span>
                        <span class="order-item__price-sub">Php ${effPrice}</span>
                    </div>
                    <div class="order-item__qty">
                        <button class="qty-btn" data-action="dec">−</button>
                        <span class="qty-num">${item.qty}</span>
                        <button class="qty-btn" data-action="inc">+</button>
                    </div>
                    <button class="order-item__remove">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>`;
                row.querySelector('[data-action="dec"]').addEventListener('click', () => {
                    const o = epm.items.find(x => x.id === item.id); if (!o) return;
                    o.qty--;
                    if (o.qty <= 0) epm.items = epm.items.filter(x => x.id !== item.id);
                    renderEpmItems(); updateEpmTotals();
                });
                row.querySelector('[data-action="inc"]').addEventListener('click', () => {
                    const o = epm.items.find(x => x.id === item.id);
                    if (o) { o.qty++; renderEpmItems(); updateEpmTotals(); }
                });
                row.querySelector('.order-item__remove').addEventListener('click', () => {
                    epm.items = epm.items.filter(x => x.id !== item.id);
                    renderEpmItems(); updateEpmTotals();
                });
                epmItemsList.appendChild(row);
            });
        }
        updateEpmTotals();
    }

    // ── TOTALS ─────────────────────────────────────────────
    function updateEpmTotals() {
        const { subtotal, disc, total } = calcEpmTotals();
        epmSubtotalVal.textContent = `Php ${subtotal.toLocaleString()}`;
        epmDiscVal.textContent     = disc > 0 ? `−Php ${disc.toLocaleString()}` : 'Php 0';
        epmTotalVal.textContent    = `Php ${total.toFixed(2)}`;
        epmTotalBtn.textContent    = `Place order – Php ${total.toFixed(2)}`;
        syncEpmPaymentUI();
    }

    function syncEpmPaymentUI() {
        const isGcash = epm.paymentMethod === 'gcash';
        epmAmountWrap.style.display   = isGcash ? 'none' : '';
        epmGcashSection.style.display = isGcash ? '' : 'none';
    }

    // ── MENU PICKER ────────────────────────────────────────
    function renderPickerGrid() {
        epmPickerGrid.innerHTML = '';
        const items = (typeof MENU_ITEMS !== 'undefined') ? MENU_ITEMS : [];
        items.forEach(item => {
            const card = document.createElement('button');
            card.type = 'button'; card.className = 'epm-picker-card';
            card.innerHTML = `<img src="${BASE_URL}${escHtml(item.image)}" alt="${escHtml(item.name)}" onerror="this.style.display='none'">
                <span class="epm-picker-name">${escHtml(item.name)}</span>
                <span class="epm-picker-price">Php ${item.price}</span>`;
            card.addEventListener('click', () => {
                const ex = epm.items.find(o => o.id === item.id);
                if (ex) { ex.qty++; } else { epm.items.push({ id: item.id, name: item.name, price: item.price, qty: 1 }); }
                card.style.transform = 'scale(0.94)';
                setTimeout(() => { card.style.transform = ''; }, 200);
                renderEpmItems(); updateEpmTotals();
            });
            epmPickerGrid.appendChild(card);
        });
    }

    epmAddBtn.addEventListener('click', () => {
        const open = epmMenuPicker.classList.toggle('open');
        epmAddBtn.textContent = open ? 'close ✕' : 'add order +';
        if (open) renderPickerGrid();
    });

    // ── TYPE BUTTONS ───────────────────────────────────────
    epmTypeWrap.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            epmTypeWrap.querySelectorAll('.type-btn').forEach(b => b.classList.remove('type-btn--active'));
            this.classList.add('type-btn--active');
            epm.orderType = this.dataset.type; epmTypeInput.value = this.dataset.type;
        });
    });

    // ── PAYMENT BUTTONS ────────────────────────────────────
    epmPaymentWrap.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            epmPaymentWrap.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('payment-btn--active'));
            this.classList.add('payment-btn--active');
            epm.paymentMethod = this.dataset.method; epmPaymentInput.value = this.dataset.method;
            syncEpmPaymentUI();
        });
    });

    // ── DISCOUNT TOGGLE ────────────────────────────────────
    epmDiscToggle.addEventListener('change', () => {
        epm.discountEnabled = epmDiscToggle.checked; renderEpmItems(); updateEpmTotals();
    });

    // ── OPEN EDIT ──────────────────────────────────────────
    document.querySelectorAll('.edit-order-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            epmMenuPicker.classList.remove('open'); epmAddBtn.textContent = 'add order +';

            epm.orderId           = this.dataset.id;
            epm.orderType         = this.dataset.type;
            epm.paymentMethod     = this.dataset.payment;
            epm.discountEnabled   = parseFloat(this.dataset.discount) > 0;
            epm.originalGcashRef  = this.dataset.gcashRef || '';
            originalTotal         = parseFloat(this.dataset.total) || 0;

            try { epm.items = JSON.parse(this.dataset.items) || []; } catch(e) { epm.items = []; }

            epmOrderId.value      = epm.orderId;
            epmTypeInput.value    = epm.orderType;
            epmPaymentInput.value = epm.paymentMethod;
            epmBeeper.value       = this.dataset.beeper;
            epmAmountInput.value  = '';
            if (epmGcashOrig) epmGcashOrig.value = epm.originalGcashRef || '—';

            epmTypeWrap.querySelectorAll('.type-btn').forEach(b =>
                b.classList.toggle('type-btn--active', b.dataset.type === epm.orderType));
            epmPaymentWrap.querySelectorAll('.payment-btn').forEach(b =>
                b.classList.toggle('payment-btn--active', b.dataset.method === epm.paymentMethod));
            epmDiscToggle.checked = epm.discountEnabled;

            renderEpmItems();
            syncEpmPaymentUI();
            editModal.classList.add('show');
        });
    });

    // ── CLOSE EDIT ─────────────────────────────────────────
    function closeEditModal() {
        editModal.classList.remove('show');
        epmMenuPicker.classList.remove('open');
        epmAddBtn.textContent = 'add order +';
    }
    window.closeEditModal = closeEditModal;
    epmClose.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', function (e) { if (e.target === this) closeEditModal(); });

    // ── SUBMIT SAVE ────────────────────────────────────────
    function submitEditOrder({ subtotal, disc, total, beeper, gcashExtraRef, gcashExtraAmount, refundAmount }) {
        const amountPaid = epm.paymentMethod === 'cash'
            ? (parseFloat(epmAmountInput.value) || total)
            : total;

        const payload = {
            order_id:            parseInt(epm.orderId),
            beeper_number:       beeper,
            order_type:          epm.orderType,
            payment_method:      epm.paymentMethod,
            amount_paid:         amountPaid,
            subtotal,
            discount:            disc,
            total,
            gcash_ref:           gcashExtraRef  || null,
            gcash_extra_amount:  gcashExtraAmount || 0,
            refund_amount:       refundAmount    || 0,
            items: epm.items.map(o => ({ id: o.id, name: o.name, price: o.price, qty: o.qty })),
        };

        epmSaveBtn.disabled = true; epmSaveBtn.textContent = 'Saving...';

        fetch('modules/orders/update_order.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) { location.reload(); }
            else {
                alert('Failed: ' + (data.message || 'Unknown error'));
                epmSaveBtn.disabled = false; epmSaveBtn.textContent = 'Save Changes';
            }
        })
        .catch(() => {
            alert('Network error.');
            epmSaveBtn.disabled = false; epmSaveBtn.textContent = 'Save Changes';
        });
    }

    // ── GCASH DIFF MODAL ───────────────────────────────────
    // Shows when GCash order and total has changed
    function showGcashDiffModal(newTotal, diff, origTotal, origRef, onConfirm) {
        if (document.getElementById('gcash-diff-overlay')) return;
        const isAddition = diff > 0;
        const absDiff    = Math.abs(diff).toFixed(2);

        const overlay = document.createElement('div');
        overlay.id = 'gcash-diff-overlay';
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);
            display:flex;align-items:center;justify-content:center;z-index:99999;
            backdrop-filter:blur(3px);font-family:'Poppins',sans-serif;padding:20px;`;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        overlay.innerHTML = `
            <div style="background:#FEFCE0;border-radius:24px;padding:28px 30px;
                width:420px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.18);">

                <div style="text-align:center;margin-bottom:20px;">
                    <div style="width:52px;height:52px;border-radius:50%;background:rgba(0,112,192,0.1);
                        display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0070C0" stroke-width="2.2">
                            <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                        </svg>
                    </div>
                    <h3 style="font-size:17px;font-weight:700;color:#1C3924;margin-bottom:8px;">
                        GCash ${isAddition ? 'Additional Payment' : 'Refund'}
                    </h3>
                    <div style="font-size:13px;color:#5A6B5E;line-height:1.7;">
                        Original ref: <strong>${escHtml(origRef || '—')}</strong><br>
                        Original total: <strong>₱${origTotal.toLocaleString()}</strong><br>
                        New total: <strong>₱${parseFloat(newTotal).toFixed(2)}</strong><br>
                        ${isAddition
                            ? `<span style="color:#0070C0;font-weight:600;">Additional: ₱${absDiff}</span>`
                            : `<span style="color:#C0392B;font-weight:600;">Refund: ₱${absDiff}</span>`
                        }
                    </div>
                </div>

                ${isAddition ? `
                <div style="margin-bottom:16px;">
                    <label style="font-size:12.5px;font-weight:600;color:#1C3924;display:block;margin-bottom:6px;">
                        GCash Ref # for additional ₱${absDiff}
                    </label>
                    <input id="gcash-extra-ref-input" type="text" placeholder="Enter 13-digit reference number"
                    maxlength="13" inputmode="numeric"
                    style="width:100%;padding:10px 14px;border-radius:12px;border:1.5px solid #D8C36F;
                    font-family:'Poppins',sans-serif;font-size:13.5px;color:#1C3924;
                    background:#fff;outline:none;box-sizing:border-box;">
                </div>` : `
                <div style="margin-bottom:16px;background:rgba(192,57,43,0.06);border-radius:12px;padding:14px 16px;">
                    <p style="font-size:13px;font-weight:600;color:#C0392B;margin:0;">
                        💸 Return ₱${absDiff} cash to the customer.
                    </p>
                    <p style="font-size:12px;color:#5A6B5E;margin:6px 0 0;">
                        The refund will be recorded in the system.
                    </p>
                </div>`}

                <div style="display:flex;gap:10px;">
                    <button onclick="document.getElementById('gcash-diff-overlay').remove()"
                        style="flex:1;padding:11px;border-radius:999px;border:1.5px solid #D0C9A8;
                        background:#fff;color:#1C3924;font-family:'Poppins',sans-serif;
                        font-size:13px;font-weight:600;cursor:pointer;">
                        Cancel
                    </button>
                    <button id="gcash-diff-confirm"
                        style="flex:1;padding:11px;border-radius:999px;border:none;
                        background:${isAddition ? '#0070C0' : '#C0392B'};color:#fff;
                        font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">
                        ${isAddition ? 'Confirm & Save' : 'Refund & Save'}
                    </button>
                </div>
            </div>`;

        document.body.appendChild(overlay);

        // Strip non-digits and enforce 13 digits
        const extraRefInput = document.getElementById('gcash-extra-ref-input');
        if (extraRefInput) {
            extraRefInput.addEventListener('input', () => {
                extraRefInput.value = extraRefInput.value.replace(/\D/g, '').slice(0, 13);
            });
        }

        document.getElementById('gcash-diff-confirm').addEventListener('click', () => {
            const refInput = document.getElementById('gcash-extra-ref-input');
            if (refInput) {
                // Strip non-digits
                refInput.value = refInput.value.replace(/\D/g, '').slice(0, 13);
            }
            if (isAddition && refInput && refInput.value.replace(/\D/g,'').length !== 13) {
                refInput.style.borderColor = '#C0392B';
                refInput.focus();
                let errMsg = document.getElementById('gcash-extra-ref-error');
                if (!errMsg) {
                    errMsg = document.createElement('p');
                    errMsg.id = 'gcash-extra-ref-error';
                    errMsg.style.cssText = 'color:#C0392B;font-size:12px;margin:4px 0 0;font-family:Poppins,sans-serif;';
                    refInput.parentNode.appendChild(errMsg);
                }
                const cur = refInput.value.replace(/\D/g,'').length;
                errMsg.textContent = cur === 0 ? 'GCash reference number is required.' : `${cur}/13 digits — must be exactly 13.`;
                return;
            }
            const extraRef    = refInput ? refInput.value.trim() : null;
            const extraAmount = isAddition ? parseFloat(absDiff) : 0;
            const refundAmt   = isAddition ? 0 : parseFloat(absDiff);
            overlay.remove();
            onConfirm(extraRef, extraAmount, refundAmt);
        });
    }

    // ── SAVE BUTTON ────────────────────────────────────────
    epmSaveBtn.addEventListener('click', function () {
        const { subtotal, disc, total } = calcEpmTotals();
        const beeper = parseInt(epmBeeper.value) || 0;

        if (!beeper || beeper < 1) {
            epmBeeper.focus(); epmBeeper.style.borderColor = '#d9534f';
            setTimeout(() => { epmBeeper.style.borderColor = ''; }, 1500); return;
        }
        if (epm.items.length === 0) { alert('Please add at least one item.'); return; }

        const isGcash = epm.paymentMethod === 'gcash';
        const diff    = total - originalTotal;

        // GCash with price change — show the extra modal
        if (isGcash && Math.abs(diff) >= 1) {
            closeEditModal();
            showGcashDiffModal(total, diff, originalTotal, epm.originalGcashRef, (extraRef, extraAmount, refundAmt) => {
                submitEditOrder({ subtotal, disc, total, beeper, gcashExtraRef: extraRef, gcashExtraAmount: extraAmount, refundAmount: refundAmt });
            });
            return;
        }

        // Cash or no price change
        submitEditOrder({ subtotal, disc, total, beeper, gcashExtraRef: null, gcashExtraAmount: 0, refundAmount: 0 });
    });

    // ══════════════════════════════════════════════════════
    //  VOID MODAL
    // ══════════════════════════════════════════════════════
    const voidModal      = document.getElementById('voidModal');
    const confirmVoidBtn = document.getElementById('confirmVoidBtn');
    const voidModalMsg   = document.getElementById('voidModalMsg');
    let voidOrderId      = null;

    function closeVoidModal() { voidModal.classList.remove('show'); }
    window.closeVoidModal = closeVoidModal;
    voidModal.addEventListener('click', function (e) { if (e.target === this) closeVoidModal(); });

    document.querySelectorAll('.void-order-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            voidOrderId = this.dataset.id;
            const label = this.dataset.label;
            const total = parseFloat(this.dataset.total) || 0;
            voidModalMsg.innerHTML = `You're about to void <strong>${label}</strong> (₱${total.toLocaleString()}).<br><br>
                It will be marked as <strong style="color:#D8C36F;">Voided</strong> and appear in Statistics under Voids. This cannot be undone.`;
            voidModal.classList.add('show');
        });
    });

    if (confirmVoidBtn) {
        confirmVoidBtn.addEventListener('click', function () {
            confirmVoidBtn.disabled = true; confirmVoidBtn.textContent = 'Voiding...';
            fetch('modules/orders/void_order.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: voidOrderId })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const card = document.querySelector(`.order-card[data-id="${voidOrderId}"]`);
                    closeVoidModal();
                    if (card) {
                        card.style.transition = 'opacity 0.3s, transform 0.3s';
                        card.style.opacity = '0'; card.style.transform = 'scale(0.95)';
                        setTimeout(() => { card.remove(); showEmpty(document.querySelectorAll('.order-card').length === 0); }, 300);
                    }
                } else {
                    alert('Failed to void: ' + (data.message || 'Unknown error'));
                    confirmVoidBtn.disabled = false; confirmVoidBtn.textContent = 'Yes, Void it';
                }
            })
            .catch(() => { alert('Network error.'); confirmVoidBtn.disabled = false; confirmVoidBtn.textContent = 'Yes, Void it'; });
        });
    }

    // ── CLOCK ──────────────────────────────────────────────
    function updateClock() {
        const now    = new Date();
        const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        let h = now.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
        const m = String(now.getMinutes()).padStart(2, '0');
        const dayEl = document.getElementById('current-day'); const dateEl = document.getElementById('current-date');
        if (dayEl)  dayEl.textContent  = days[now.getDay()];
        if (dateEl) dateEl.textContent = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} at ${h}:${m} ${ampm}`;
    }
    updateClock(); setInterval(updateClock, 1000);

})();