(function () {
    'use strict';

    const PER_PAGE = 8;
    let currentPage    = 1;
    let currentType    = 'all';   // 'all' | 'dine-in' | 'take-out'
    let currentDay     = 'all';   // 'all' | 'YYYY-MM-DD'
    let searchVal      = '';

    // ── Get cards that pass ALL active filters ─────────────────────────
    function getFilteredCards() {
        return Array.from(document.querySelectorAll('.served-card')).filter(card => {
            // Type filter
            const typeMatch = currentType === 'all' || card.dataset.type === currentType;

            // Day filter (business date stored in data-biz-date)
            const dayMatch  = currentDay  === 'all' || card.dataset.bizDate === currentDay;

            // Search filter
            const textMatch = searchVal === '' ||
                card.textContent.toLowerCase().includes(searchVal);

            return typeMatch && dayMatch && textMatch;
        });
    }

    // ── Pagination render ──────────────────────────────────────────────
    function renderPage(page) {
        currentPage = page;
        const filtered   = getFilteredCards();
        const total      = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * PER_PAGE;
        const end   = start + PER_PAGE;

        // Hide all cards first
        document.querySelectorAll('.served-card').forEach(c => c.style.display = 'none');

        // Show only the current page slice
        filtered.forEach((card, idx) => {
            card.style.display = (idx >= start && idx < end) ? 'flex' : 'none';
        });

        showEmpty(total === 0);
        renderPagination(currentPage, totalPages);
    }

    function renderPagination(page, totalPages) {
        const container = document.getElementById('pagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        html += `<button class="pagination__arrow" id="pg-prev" ${page === 1 ? 'disabled' : ''}>&#8592;</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="pagination__btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button class="pagination__arrow" id="pg-next" ${page === totalPages ? 'disabled' : ''}>&#8594;</button>`;

        container.innerHTML = html;

        container.querySelector('#pg-prev')?.addEventListener('click', () => renderPage(currentPage - 1));
        container.querySelector('#pg-next')?.addEventListener('click', () => renderPage(currentPage + 1));
        container.querySelectorAll('.pagination__btn').forEach(btn => {
            btn.addEventListener('click', () => renderPage(parseInt(btn.dataset.page)));
        });
    }

    // ── Type filter button clicks ─────────────────────────────────────
    document.querySelectorAll('.served-filter[data-group="type"]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.served-filter[data-group="type"]')
                .forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentType = this.dataset.filter;
            renderPage(1);
        });
    });

    // ── Day dropdown ────────────────────────────────────────────────────
    const dayBtn    = document.getElementById('served-day-btn');
    const dayMenu   = document.getElementById('served-day-menu');
    const dayLabel  = document.getElementById('served-day-label');
    const dayArrow  = dayBtn ? dayBtn.querySelector('.served-day-dropdown__arrow') : null;

    if (dayBtn && dayMenu) {
        // Toggle open/close
        dayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dayMenu.classList.contains('open');
            dayMenu.classList.toggle('open', !isOpen);
            if (dayArrow) dayArrow.textContent = isOpen ? '▼' : '▲';
        });

        // Close on outside click
        document.addEventListener('click', () => {
            dayMenu.classList.remove('open');
            if (dayArrow) dayArrow.textContent = '▼';
        });

        // Option click
        dayMenu.querySelectorAll('.served-day-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = opt.dataset.value;
                currentDay = val;

                // Update label
                if (dayLabel) dayLabel.textContent = val === 'all' ? 'Date' : opt.textContent.trim();

                // Update active state
                dayMenu.querySelectorAll('.served-day-option').forEach(o =>
                    o.classList.toggle('served-day-option--active', o.dataset.value === val));

                // Update button active style
                if (val === 'all') {
                    dayBtn.classList.remove('served-day-dropdown__btn--active');
                } else {
                    dayBtn.classList.add('served-day-dropdown__btn--active');
                }

                dayMenu.classList.remove('open');
                if (dayArrow) dayArrow.textContent = '▼';
                renderPage(1);
            });
        });
    }

    // ── Search ─────────────────────────────────────────────────────────
    const searchInput = document.getElementById('servedSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            searchVal = this.value.toLowerCase().trim();
            renderPage(1);
        });
    }

    // ── Empty state ────────────────────────────────────────────────────
    function showEmpty(show) {
        let empty = document.getElementById('served-empty');
        if (!empty && show) {
            empty = document.createElement('div');
            empty.id        = 'served-empty';
            empty.className = 'served-empty';
            empty.innerHTML = `
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <line x1="9" y1="12" x2="15" y2="12"/>
                    <line x1="9" y1="16" x2="13" y2="16"/>
                </svg>
                <p>No served orders yet.</p>`;
            document.getElementById('served-grid').appendChild(empty);
        }
        if (empty) empty.style.display = show ? 'flex' : 'none';
    }

    // ── Profile dropdown ───────────────────────────────────────────────
    const profileBtn = document.getElementById('profile-btn');
    const dropdown   = document.getElementById('profile-dropdown');
    const logoutBtn  = document.getElementById('logout-btn');

    if (profileBtn && dropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = logoutBtn.dataset.logoutUrl;
        });
    }

    // ── Clock ──────────────────────────────────────────────────────────
    function updateClock() {
        const now    = new Date();
        const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
        let h        = now.getHours();
        const ampm   = h >= 12 ? 'PM' : 'AM';
        h            = h % 12 || 12;
        const m      = String(now.getMinutes()).padStart(2, '0');

        const dayEl  = document.getElementById('current-day');
        const dateEl = document.getElementById('current-date');
        if (dayEl)  dayEl.textContent  = days[now.getDay()];
        if (dateEl) dateEl.textContent =
            `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} at ${h}:${m} ${ampm}`;
    }

    updateClock();
    setInterval(updateClock, 1000);

    // ── Init ───────────────────────────────────────────────────────────
    renderPage(1);

})();