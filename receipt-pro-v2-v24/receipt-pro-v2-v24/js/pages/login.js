/**
 * Receipt Pro - Login Page
 * يدعم عدة مستخدمين على نفس الجهاز، وكل مستخدم له بياناته المستقلة.
 */

(() => {
    'use strict';

    let mode = 'login';

    const tabs = [...document.querySelectorAll('.auth-tab')];
    const registerFields = [...document.querySelectorAll('.register-only')];
    const form = document.getElementById('authForm');
    const nameInput = document.getElementById('name');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passToggle');
    const submitButton = document.getElementById('submitBtn');
    const subtitle = document.getElementById('authSubtitle');

    // إذا فتح المستخدم صفحة الدخول يدويًا، لا نفرض عليه تحويلًا تلقائيًا؛
    // يمكنه تسجيل الدخول بحساب آخر أو إنشاء حساب جديد.

    function setMode(nextMode) {
        mode = nextMode;

        tabs.forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        registerFields.forEach((field) => {
            field.classList.toggle('hidden', mode !== 'register');
        });

        submitButton.textContent = mode === 'login' ? 'دخول' : 'إنشاء الحساب';
        subtitle.textContent = mode === 'login'
            ? 'سجّل الدخول إلى حسابك وبياناتك الخاصة.'
            : 'أنشئ مستخدمًا جديدًا ببيانات وحسابات مستقلة تمامًا.';
    }

    function showMessage(message) {
        alert(message);
    }

    function togglePasswordVisibility() {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';

        const icon = passwordToggle.querySelector('i');
        if (icon) {
            icon.className = isHidden
                ? 'fa-regular fa-eye-slash'
                : 'fa-regular fa-eye';
        }
    }

    function createUser(username, password, name) {
        const result = RPStore.registerUser({ username, password, name });

        if (!result.ok) {
            if (result.reason === 'exists') {
                showMessage('اسم المستخدم موجود مسبقًا. اختر اسمًا آخر أو سجّل الدخول.');
                return;
            }

            showMessage('أكمل اسم المستخدم وكلمة المرور.');
            return;
        }

        location.href = 'dashboard.html';
    }

    function loginUser(username, password) {
        const result = RPStore.login(username, password);

        if (!result.ok) {
            if (RPStore.getUsers().length === 0) {
                showMessage('لا يوجد أي مستخدم بعد. اختر إنشاء حساب أولًا.');
                return;
            }

            showMessage('اسم المستخدم أو كلمة المرور غير صحيحة.');
            return;
        }

        location.href = 'dashboard.html';
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => setMode(tab.dataset.mode));
    });

    passwordToggle.addEventListener('click', togglePasswordVisibility);

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const name = nameInput.value.trim();

        if (mode === 'register') {
            createUser(username, password, name);
            return;
        }

        loginUser(username, password);
    });
})();
