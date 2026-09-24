/**
 * =========================================================
 * Receipt Pro - Shared UI & Helpers
 * =========================================================
 * يحتوي على الأشياء المشتركة بين جميع الصفحات:
 * - القائمة الجانبية
 * - الشريط العلوي
 * - الوضع الليلي
 * - Toast / Modal
 * - تنسيق العملات
 * - تصدير Excel
 */

(() => {
    'use strict';

    const NAV_ITEMS = [
        ['dashboard', 'dashboard.html', 'fa-house', 'لوحة التحكم'],
        ['accounts', 'accounts.html', 'fa-building-columns', 'الحسابات'],
        ['receipt', 'receipt.html', 'fa-file-circle-plus', 'سند جديد'],
        ['receipts', 'receipts.html', 'fa-receipt', 'السندات'],
        ['transfers', 'transfers.html', 'fa-right-left', 'التحويلات'],
        ['customers', 'customers.html', 'fa-users', 'العملاء'],
        ['reports', 'reports.html', 'fa-chart-line', 'التقارير'],
        ['settings', 'settings.html', 'fa-gear', 'الإعدادات'],
    ];

    function formatMoney(value) {
        const formatted = new Intl.NumberFormat('ar-SA', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(Number(value || 0));

        return `${formatted} ر.س`;
    }

    function escapeHtml(value) {
        const characters = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
        };

        return String(value ?? '').replace(
            /[&<>'"]/g,
            (character) => characters[character]
        );
    }

    function buildSidebar(activePage) {
        const navigation = NAV_ITEMS.map(([key, href, icon, label]) => `
            <a class="nav-link ${activePage === key ? 'active' : ''}" href="${href}">
                <span class="nav-icon"><i class="fa-solid ${icon}"></i></span>
                <span>${label}</span>
            </a>
        `).join('');

        return `
            <div class="sidebar-overlay" id="sidebarOverlay"></div>

            <aside class="sidebar" id="sidebar">
                <div class="sidebar-head">
                    <a class="brand" href="dashboard.html">
                        <span class="brand-mark"><i class="fa-solid fa-receipt"></i></span>
                        <span>
                            <b>Receipt Pro</b>
                            <small>إدارة مالية ذكية</small>
                        </span>
                    </a>

                    <button class="icon-btn close-sidebar" id="closeSidebar" aria-label="إغلاق القائمة">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="nav-caption">الرئيسية</div>
                <nav class="sidebar-nav">${navigation}</nav>

                <div class="sidebar-spacer"></div>

                <button class="nav-link nav-button" id="themeToggle">
                    <span class="nav-icon"><i class="fa-solid fa-moon"></i></span>
                    <span>تبديل المظهر</span>
                </button>

                <button class="nav-link nav-button danger-link" id="logoutBtn">
                    <span class="nav-icon"><i class="fa-solid fa-arrow-right-from-bracket"></i></span>
                    <span>تسجيل الخروج</span>
                </button>

                <div class="sidebar-foot">
                    <span class="live-dot"></span>
                    <div>
                        <b>النظام جاهز</b>
                        <small>يتم الحفظ على هذا الجهاز</small>
                    </div>
                </div>
            </aside>
        `;
    }

    function buildTopbar(title, subtitle, actionHtml = '') {
        const user = RPStore.getUser();
        const displayName = user?.name || user?.username || 'المستخدم';

        return `
            <header class="topbar">
                <div class="topbar-start">
                    <button class="icon-btn menu-btn" id="menuBtn" aria-label="فتح القائمة">
                        <i class="fa-solid fa-bars"></i>
                    </button>

                    <div>
                        <h1>${escapeHtml(title)}</h1>
                        <p>${escapeHtml(subtitle || '')}</p>
                    </div>
                </div>

                <div class="topbar-actions">
                    ${actionHtml}

                    <div class="user-chip">
                        <span><i class="fa-solid fa-user"></i></span>
                        <div>
                            <b>${escapeHtml(displayName)}</b>
                            <small>حساب رئيسي</small>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }

    function initLayout({ active, title, subtitle, actionHtml = '' }) {
        const isLoginPage = location.pathname.endsWith('login.html');

        if (!RPStore.getUser() && !isLoginPage) {
            location.href = 'login.html';
            return;
        }

        document.body.insertAdjacentHTML('afterbegin', buildSidebar(active));

        const main = document.querySelector('.main');
        if (main) {
            main.insertAdjacentHTML(
                'afterbegin',
                buildTopbar(title, subtitle, actionHtml)
            );
        }

        bindLayoutEvents();
        applyTheme();
    }

    function bindLayoutEvents() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        function openSidebar() {
            sidebar?.classList.add('open');
            overlay?.classList.add('show');
            document.body.classList.add('lock');
        }

        function closeSidebar() {
            sidebar?.classList.remove('open');
            overlay?.classList.remove('show');
            document.body.classList.remove('lock');
        }

        document.getElementById('menuBtn')?.addEventListener('click', openSidebar);
        document.getElementById('closeSidebar')?.addEventListener('click', closeSidebar);
        overlay?.addEventListener('click', closeSidebar);

        document.getElementById('themeToggle')?.addEventListener('click', () => {
            const enableDark = !document.body.classList.contains('dark');
            const settings = RPStore.getSettings();
            RPStore.saveSettings({ ...settings, theme: enableDark ? 'dark' : 'light' });
            applyTheme();
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            RPStore.clearUser();
            location.href = 'login.html';
        });
    }

    function applyTheme() {
        const darkMode = RPStore.getSettings().theme === 'dark';
        document.body.classList.toggle('dark', darkMode);
    }

    function toast(message, type = 'success') {
        let toastElement = document.getElementById('appToast');

        if (!toastElement) {
            toastElement = document.createElement('div');
            toastElement.id = 'appToast';
            toastElement.className = 'toast';
            document.body.appendChild(toastElement);
        }

        const icon = type === 'error'
            ? 'fa-circle-xmark'
            : type === 'warning'
                ? 'fa-triangle-exclamation'
                : 'fa-circle-check';

        toastElement.className = `toast ${type}`;
        toastElement.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escapeHtml(message)}</span>
        `;

        requestAnimationFrame(() => toastElement.classList.add('show'));

        clearTimeout(toastElement._timer);
        toastElement._timer = setTimeout(() => {
            toastElement.classList.remove('show');
        }, 2600);
    }

    function modal(html) {
        let overlay = document.getElementById('appModal');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'appModal';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = html;
        overlay.classList.add('show');
        document.body.classList.add('lock');

        overlay.addEventListener(
            'click',
            (event) => {
                if (event.target === overlay) closeModal();
            },
            { once: true }
        );
    }

    function closeModal() {
        document.getElementById('appModal')?.classList.remove('show');
        document.body.classList.remove('lock');
    }

    function exportExcel(rows, columns, filename = 'receipt-pro-export') {
        if (!Array.isArray(rows) || rows.length === 0) {
            toast('لا توجد بيانات لتصديرها', 'warning');
            return;
        }

        function safeCell(value) {
            let text = String(value ?? '');

            // حماية من Excel Formula Injection
            if (/^[=+\-@]/.test(text)) {
                text = `'${text}`;
            }

            return escapeHtml(text);
        }

        const tableHead = columns
            .map((column) => `<th>${safeCell(column.label)}</th>`)
            .join('');

        const tableBody = rows
            .map((row) => `
                <tr>
                    ${columns.map((column) => {
                        const value = typeof column.value === 'function'
                            ? column.value(row)
                            : row[column.value];

                        return `<td style="mso-number-format:'\\@'">${safeCell(value)}</td>`;
                    }).join('')}
                </tr>
            `)
            .join('');

        const html = `
            <!DOCTYPE html>
            <html dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        table { border-collapse: collapse; font-family: Tahoma, Arial; }
                        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; }
                        th { background: #eaf2ff; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <table>
                        <thead><tr>${tableHead}</tr></thead>
                        <tbody>${tableBody}</tbody>
                    </table>
                </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], {
            type: 'application/vnd.ms-excel;charset=utf-8',
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xls`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('تم تجهيز ملف Excel');
    }

    window.ReceiptPro = {
        initLayout,
        fmt: formatMoney,
        esc: escapeHtml,
        toast,
        modal,
        closeModal,
        applyTheme,
        exportExcel,
    };
})();
