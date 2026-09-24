/**
 * Receipt Pro - Settings Page
 * إعدادات هوية المنشأة، الطباعة، النسخ الاحتياطي واستعادة البيانات.
 */

(() => {
    'use strict';

    ReceiptPro.initLayout({
        active: 'settings',
        title: 'الإعدادات',
        subtitle: 'هوية الشركة والطباعة والنسخ الاحتياطي',
    });

    let settings = RPStore.getSettings();
    let pendingLogo = settings.logo || '';

    const form = document.getElementById('settingsForm');
    const logoFile = document.getElementById('logoFile');
    const logoPreview = document.getElementById('logoPreview');
    const removeLogoButton = document.getElementById('removeLogo');
    const printPreview = document.getElementById('settingsPrintPreview');

    const showSignature = document.getElementById('showSignature');
    const showTaxNumber = document.getElementById('showTaxNumber');

    const companyName = document.getElementById('companyName');
    const currency = document.getElementById('currency');
    const taxNumber = document.getElementById('taxNumber');
    const phone = document.getElementById('phone');
    const email = document.getElementById('email');
    const website = document.getElementById('website');
    const address = document.getElementById('address');
    const receiptFooter = document.getElementById('receiptFooter');

    const exportDataButton = document.getElementById('exportData');
    const importFile = document.getElementById('importFile');
    const resetAllButton = document.getElementById('resetAll');

    const textFieldIds = [
        'companyName',
        'currency',
        'taxNumber',
        'phone',
        'email',
        'website',
        'address',
        'receiptFooter',
    ];

    function loadSettingsIntoForm() {
        textFieldIds.forEach((id) => {
            const element = document.getElementById(id);
            if (!element) return;

            const fallback = id === 'companyName' ? 'Receipt Pro' : '';
            element.value = settings[id] || fallback;
        });

        showSignature.checked = settings.showSignature !== false;
        showTaxNumber.checked = settings.showTaxNumber !== false;
    }

    function renderLogoPreview() {
        logoPreview.innerHTML = pendingLogo
            ? `<img src="${pendingLogo}" alt="شعار الشركة">`
            : '<i class="fa-solid fa-image"></i>';
    }

    function renderPrintPreview() {
        const name = companyName.value.trim() || 'Receipt Pro';
        const tax = taxNumber.value.trim();
        const tel = phone.value.trim();
        const mail = email.value.trim();
        const addr = address.value.trim();
        const web = website.value.trim();
        const footer = receiptFooter.value.trim() || 'شكراً لتعاملكم معنا';

        printPreview.innerHTML = `
            <div class="mini-print-paper">
                <div class="mini-brand">
                    <div class="mini-logo">
                        ${pendingLogo
                            ? `<img src="${pendingLogo}" alt="شعار الشركة">`
                            : '<i class="fa-solid fa-receipt"></i>'}
                    </div>

                    <div>
                        <h3>${ReceiptPro.esc(name)}</h3>
                        <p>${ReceiptPro.esc(addr || 'عنوان المنشأة')}</p>
                    </div>

                    <div class="mini-doc">
                        <b>سند قبض</b>
                        <span>R-00001</span>
                    </div>
                </div>

                <div class="mini-contact">
                    ${tel ? `<span><i class="fa-solid fa-phone"></i> ${ReceiptPro.esc(tel)}</span>` : ''}
                    ${mail ? `<span><i class="fa-solid fa-envelope"></i> ${ReceiptPro.esc(mail)}</span>` : ''}
                    ${web ? `<span><i class="fa-solid fa-globe"></i> ${ReceiptPro.esc(web)}</span>` : ''}
                    ${showTaxNumber.checked && tax
                        ? `<span><i class="fa-solid fa-hashtag"></i> ضريبي: ${ReceiptPro.esc(tax)}</span>`
                        : ''}
                </div>

                <div class="mini-amount">
                    <span>المبلغ</span>
                    <strong>1,250 ر.س</strong>
                </div>

                <div class="mini-lines">
                    <div><span>العميل</span><b>اسم العميل</b></div>
                    <div><span>الحساب</span><b>الحساب الرئيسي</b></div>
                    <div class="full"><span>البيان</span><b>مثال لمحتوى السند وتفاصيل العملية.</b></div>
                </div>

                ${showSignature.checked
                    ? '<div class="mini-sign"><span>توقيع المستلم</span><span>المحاسب</span></div>'
                    : ''}

                <div class="mini-footer">${ReceiptPro.esc(footer)}</div>
            </div>
        `;
    }

    function readSettingsFromForm() {
        return {
            ...settings,
            companyName: companyName.value.trim() || 'Receipt Pro',
            currency: currency.value,
            taxNumber: taxNumber.value.trim(),
            phone: phone.value.trim(),
            email: email.value.trim(),
            website: website.value.trim(),
            address: address.value.trim(),
            receiptFooter: receiptFooter.value.trim(),
            logo: pendingLogo,
            showSignature: showSignature.checked,
            showTaxNumber: showTaxNumber.checked,
        };
    }

    function handleLogoUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            ReceiptPro.toast('حجم الشعار يجب أن يكون أقل من 2MB', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            pendingLogo = reader.result;
            renderLogoPreview();
            renderPrintPreview();
        };
        reader.readAsDataURL(file);
    }

    function removeLogo() {
        pendingLogo = '';
        logoFile.value = '';
        renderLogoPreview();
        renderPrintPreview();
    }

    function exportBackup() {
        const json = JSON.stringify(RPStore.exportData(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    async function importBackup(event) {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            const data = JSON.parse(await file.text());
            RPStore.importData(data);

            ReceiptPro.toast('تم استيراد النسخة');
            setTimeout(() => location.reload(), 500);
        } catch {
            ReceiptPro.toast('ملف النسخة غير صالح', 'error');
        }
    }

    function resetAllData() {
        const confirmed = confirm('سيتم حذف جميع البيانات. هل أنت متأكد؟');
        if (!confirmed) return;

        RPStore.resetAll();
        location.href = 'login.html';
    }

    loadSettingsIntoForm();
    renderLogoPreview();
    renderPrintPreview();

    form.querySelectorAll('input, textarea, select').forEach((element) => {
        element.addEventListener('input', renderPrintPreview);
        element.addEventListener('change', renderPrintPreview);
    });

    logoFile.addEventListener('change', handleLogoUpload);
    removeLogoButton.addEventListener('click', removeLogo);

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        settings = readSettingsFromForm();
        RPStore.saveSettings(settings);
        ReceiptPro.toast('تم حفظ إعدادات الشركة والطباعة');
    });

    exportDataButton.addEventListener('click', exportBackup);
    importFile.addEventListener('change', importBackup);
    resetAllButton.addEventListener('click', resetAllData);
})();
