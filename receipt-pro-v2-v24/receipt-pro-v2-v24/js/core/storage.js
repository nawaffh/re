/**
 * =========================================================
 * Receipt Pro - Local Storage Service (Multi User)
 * =========================================================
 * كل مستخدم يملك مساحة بيانات مستقلة بالكامل.
 * الحسابات والسندات والتحويلات والعملاء والإعدادات لا تتشارك بين المستخدمين.
 */

(() => {
    'use strict';

    const GLOBAL_KEYS = {
        users: 'rpv2_users',
        session: 'rpv2_session',
        migration: 'rpv2_multi_user_migrated_v1',
    };

    const LEGACY_KEYS = {
        user: 'rpv2_user',
        accounts: 'rpv2_accounts',
        receipts: 'rpv2_receipts',
        transfers: 'rpv2_transfers',
        customers: 'rpv2_customers',
        settings: 'rpv2_settings',
    };

    const USER_SECTIONS = [
        'accounts',
        'receipts',
        'transfers',
        'customers',
        'settings',
    ];

    const DEFAULT_SETTINGS = {
        companyName: 'Receipt Pro',
        currency: 'SAR',
        theme: 'light',
        logo: '',
        taxNumber: '',
        phone: '',
        email: '',
        address: '',
        website: '',
        receiptFooter: 'شكراً لتعاملكم معنا',
        showSignature: true,
        showTaxNumber: true,
    };

    function uid(prefix = 'id') {
        const time = Date.now().toString(36);
        const random = Math.random().toString(36).slice(2, 9);
        return `${prefix}_${time}_${random}`;
    }

    function safeParse(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function readGlobal(key, fallback) {
        return safeParse(localStorage.getItem(key), fallback);
    }

    function writeGlobal(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function currentUserId() {
        return localStorage.getItem(GLOBAL_KEYS.session) || '';
    }

    function userKey(section, userId = currentUserId()) {
        if (!userId) return '';
        return `rpv2_user_${userId}_${section}`;
    }

    function readUser(section, fallback, userId = currentUserId()) {
        const key = userKey(section, userId);
        if (!key) return fallback;
        return safeParse(localStorage.getItem(key), fallback);
    }

    function writeUser(section, value, userId = currentUserId()) {
        const key = userKey(section, userId);
        if (!key) throw new Error('no-session');
        localStorage.setItem(key, JSON.stringify(value));
    }

    function money(value) {
        return Number(value || 0);
    }

    function normalizeUsername(value) {
        return String(value || '').trim().toLowerCase();
    }

    /**
     * ترحيل النسخة القديمة ذات المستخدم الواحد.
     * يتم مرة واحدة فقط: ننشئ المستخدم القديم في قائمة المستخدمين
     * وننقل بياناته العامة إلى مساحة خاصة به.
     */
    function migrateLegacyData() {
        if (localStorage.getItem(GLOBAL_KEYS.migration) === '1') return;

        const oldUser = safeParse(localStorage.getItem(LEGACY_KEYS.user), null);
        let users = readGlobal(GLOBAL_KEYS.users, []);

        if (oldUser && oldUser.username) {
            let migratedUser = users.find(
                (user) => normalizeUsername(user.username) === normalizeUsername(oldUser.username)
            );

            if (!migratedUser) {
                migratedUser = {
                    ...oldUser,
                    id: oldUser.id || uid('usr'),
                };
                users.push(migratedUser);
                writeGlobal(GLOBAL_KEYS.users, users);
            }

            USER_SECTIONS.forEach((section) => {
                const destination = userKey(section, migratedUser.id);
                if (localStorage.getItem(destination) !== null) return;

                const source = localStorage.getItem(LEGACY_KEYS[section]);
                if (source !== null) {
                    localStorage.setItem(destination, source);
                }
            });

            // المستخدم الذي كان داخل النظام يبقى داخل نفس حسابه بعد التحديث.
            localStorage.setItem(GLOBAL_KEYS.session, migratedUser.id);
        }

        // نحذف مفاتيح البيانات العامة حتى لا تظهر مستقبلًا لأي مستخدم جديد.
        Object.values(LEGACY_KEYS).forEach((key) => localStorage.removeItem(key));
        localStorage.setItem(GLOBAL_KEYS.migration, '1');
    }

    migrateLegacyData();

    const RPStore = {
        uid,

        // -----------------------------------------------------
        // Users & session
        // -----------------------------------------------------
        getUsers() {
            return readGlobal(GLOBAL_KEYS.users, []);
        },

        getUser() {
            const id = currentUserId();
            if (!id) return null;
            return this.getUsers().find((user) => user.id === id) || null;
        },

        getCurrentUserId() {
            return currentUserId();
        },

        usernameExists(username) {
            const normalized = normalizeUsername(username);
            return this.getUsers().some(
                (user) => normalizeUsername(user.username) === normalized
            );
        },

        registerUser(data) {
            const username = String(data.username || '').trim();
            const password = String(data.password || '');
            const name = String(data.name || username).trim();

            if (!username || !password) {
                return { ok: false, reason: 'required' };
            }

            if (this.usernameExists(username)) {
                return { ok: false, reason: 'exists' };
            }

            const users = this.getUsers();
            const user = {
                id: uid('usr'),
                name: name || username,
                username,
                password,
                createdAt: new Date().toISOString(),
            };

            users.push(user);
            writeGlobal(GLOBAL_KEYS.users, users);
            localStorage.setItem(GLOBAL_KEYS.session, user.id);

            // مستخدم جديد = بيانات جديدة وفارغة تمامًا.
            writeUser('accounts', [], user.id);
            writeUser('receipts', [], user.id);
            writeUser('transfers', [], user.id);
            writeUser('customers', [], user.id);
            writeUser('settings', { ...DEFAULT_SETTINGS }, user.id);

            return { ok: true, user };
        },

        login(username, password) {
            const normalized = normalizeUsername(username);
            const user = this.getUsers().find(
                (item) =>
                    normalizeUsername(item.username) === normalized &&
                    item.password === String(password || '')
            );

            if (!user) return { ok: false };

            localStorage.setItem(GLOBAL_KEYS.session, user.id);
            return { ok: true, user };
        },

        // توافق مع أي كود قديم يستعمل setUser.
        setUser(user) {
            const users = this.getUsers();
            const index = users.findIndex((item) => item.id === user.id);

            if (index >= 0) users[index] = { ...users[index], ...user };
            else users.push({ ...user, id: user.id || uid('usr') });

            writeGlobal(GLOBAL_KEYS.users, users);
            localStorage.setItem(GLOBAL_KEYS.session, users[index >= 0 ? index : users.length - 1].id);
        },

        clearUser() {
            // تسجيل خروج فقط، لا نحذف المستخدم ولا بياناته.
            localStorage.removeItem(GLOBAL_KEYS.session);
        },

        // -----------------------------------------------------
        // Settings (per user)
        // -----------------------------------------------------
        getSettings() {
            return {
                ...DEFAULT_SETTINGS,
                ...readUser('settings', {}),
            };
        },

        saveSettings(settings) {
            writeUser('settings', {
                ...DEFAULT_SETTINGS,
                ...settings,
            });
        },

        // -----------------------------------------------------
        // User collections
        // -----------------------------------------------------
        getAccounts() {
            return readUser('accounts', []);
        },

        saveAccounts(accounts) {
            writeUser('accounts', accounts);
        },

        getReceipts() {
            return readUser('receipts', []);
        },

        saveReceipts(receipts) {
            writeUser('receipts', receipts);
        },

        getTransfers() {
            return readUser('transfers', []);
        },

        saveTransfers(transfers) {
            writeUser('transfers', transfers);
        },

        getCustomers() {
            return readUser('customers', []);
        },

        saveCustomers(customers) {
            writeUser('customers', customers);
        },

        // -----------------------------------------------------
        // Accounts
        // -----------------------------------------------------
        addAccount(data) {
            const accounts = this.getAccounts();
            const account = {
                id: uid('acc'),
                name: String(data.name || '').trim(),
                type: data.type || 'bank',
                bankName: String(data.bankName || '').trim(),
                openingBalance: money(data.openingBalance),
                note: String(data.note || '').trim(),
                createdAt: new Date().toISOString(),
            };

            accounts.unshift(account);
            this.saveAccounts(accounts);
            return account;
        },

        updateAccount(id, data) {
            const accounts = this.getAccounts();
            const index = accounts.findIndex((account) => account.id === id);
            if (index < 0) return null;

            accounts[index] = {
                ...accounts[index],
                ...data,
                name: String(data.name ?? accounts[index].name).trim(),
                bankName: String(data.bankName ?? accounts[index].bankName ?? '').trim(),
                note: String(data.note ?? accounts[index].note ?? '').trim(),
                openingBalance: money(data.openingBalance ?? accounts[index].openingBalance),
            };

            this.saveAccounts(accounts);
            return accounts[index];
        },

        deleteAccount(id) {
            const account = this.getAccount(id);
            if (!account) return { ok: false, reason: 'not-found' };

            // نحفظ اسم الحساب كسجل تاريخي داخل العمليات القديمة ثم نحذف الحساب نفسه.
            const receipts = this.getReceipts().map((receipt) => {
                if (receipt.accountId !== id) return receipt;
                return {
                    ...receipt,
                    accountNameSnapshot: receipt.accountNameSnapshot || account.name,
                    accountDeleted: true,
                };
            });

            const transfers = this.getTransfers().map((transfer) => {
                const updated = { ...transfer };

                if (transfer.fromAccountId === id) {
                    updated.fromAccountNameSnapshot =
                        transfer.fromAccountNameSnapshot || account.name;
                    updated.fromAccountDeleted = true;
                }

                if (transfer.toAccountId === id) {
                    updated.toAccountNameSnapshot =
                        transfer.toAccountNameSnapshot || account.name;
                    updated.toAccountDeleted = true;
                }

                return updated;
            });

            this.saveReceipts(receipts);
            this.saveTransfers(transfers);
            this.saveAccounts(this.getAccounts().filter((item) => item.id !== id));

            return { ok: true };
        },

        getAccount(id) {
            return this.getAccounts().find((account) => account.id === id) || null;
        },

        getReceiptAccountName(receipt) {
            return (
                this.getAccount(receipt.accountId)?.name ||
                (receipt.accountNameSnapshot
                    ? `${receipt.accountNameSnapshot} — خارجي / محذوف`
                    : 'حساب خارجي / محذوف')
            );
        },

        getTransferAccountName(transfer, side) {
            if (side === 'from') {
                return (
                    this.getAccount(transfer.fromAccountId)?.name ||
                    (transfer.fromAccountNameSnapshot
                        ? `${transfer.fromAccountNameSnapshot} — خارجي / محذوف`
                        : 'حساب خارجي / محذوف')
                );
            }

            return (
                this.getAccount(transfer.toAccountId)?.name ||
                (transfer.toAccountNameSnapshot
                    ? `${transfer.toAccountNameSnapshot} — خارجي / محذوف`
                    : 'حساب خارجي / محذوف')
            );
        },

        // -----------------------------------------------------
        // Receipts
        // -----------------------------------------------------
        addReceipt(data) {
            const receipts = this.getReceipts();
            const receipt = {
                id: uid('rcp'),
                number: data.number || this.nextReceiptNumber(),
                type: data.type,
                accountId: data.accountId,
                accountNameSnapshot: this.getAccount(data.accountId)?.name || '',
                customerId: data.customerId || '',
                customerName: String(data.customerName || '').trim(),
                amount: money(data.amount),
                date: data.date || new Date().toISOString().slice(0, 10),
                details: String(data.details || '').trim(),
                note: String(data.note || '').trim(),
                createdAt: new Date().toISOString(),
            };

            receipts.unshift(receipt);
            this.saveReceipts(receipts);
            return receipt;
        },

        updateReceipt(id, data) {
            const receipts = this.getReceipts();
            const index = receipts.findIndex((receipt) => receipt.id === id);
            if (index < 0) return null;

            const nextAccountId = data.accountId ?? receipts[index].accountId;
            receipts[index] = {
                ...receipts[index],
                ...data,
                accountNameSnapshot:
                    this.getAccount(nextAccountId)?.name ||
                    receipts[index].accountNameSnapshot ||
                    '',
                amount: money(data.amount ?? receipts[index].amount),
            };

            this.saveReceipts(receipts);
            return receipts[index];
        },

        deleteReceipt(id) {
            this.saveReceipts(this.getReceipts().filter((receipt) => receipt.id !== id));
        },

        nextReceiptNumber() {
            const next = this.getReceipts().length + 1;
            return `R-${String(next).padStart(5, '0')}`;
        },

        // -----------------------------------------------------
        // Transfers
        // -----------------------------------------------------
        addTransfer(data) {
            const transfers = this.getTransfers();
            const transfer = {
                id: uid('trf'),
                fromAccountId: data.fromAccountId,
                toAccountId: data.toAccountId,
                fromAccountNameSnapshot: this.getAccount(data.fromAccountId)?.name || '',
                toAccountNameSnapshot: this.getAccount(data.toAccountId)?.name || '',
                amount: money(data.amount),
                date: data.date || new Date().toISOString().slice(0, 10),
                note: String(data.note || '').trim(),
                createdAt: new Date().toISOString(),
            };

            transfers.unshift(transfer);
            this.saveTransfers(transfers);
            return transfer;
        },

        deleteTransfer(id) {
            this.saveTransfers(this.getTransfers().filter((transfer) => transfer.id !== id));
        },

        // -----------------------------------------------------
        // Customers
        // -----------------------------------------------------
        addCustomer(data) {
            const customers = this.getCustomers();
            const customer = {
                id: uid('cus'),
                name: String(data.name || '').trim(),
                phone: String(data.phone || '').trim(),
                email: String(data.email || '').trim(),
                note: String(data.note || '').trim(),
                createdAt: new Date().toISOString(),
            };

            customers.unshift(customer);
            this.saveCustomers(customers);
            return customer;
        },

        updateCustomer(id, data) {
            const customers = this.getCustomers();
            const index = customers.findIndex((customer) => customer.id === id);
            if (index < 0) return null;
            customers[index] = { ...customers[index], ...data };
            this.saveCustomers(customers);
            return customers[index];
        },

        deleteCustomer(id) {
            this.saveCustomers(this.getCustomers().filter((customer) => customer.id !== id));
        },

        // -----------------------------------------------------
        // Calculations
        // -----------------------------------------------------
        accountBalance(id) {
            const account = this.getAccount(id);
            if (!account) return 0;

            let balance = money(account.openingBalance);

            this.getReceipts().forEach((receipt) => {
                if (receipt.accountId !== id) return;
                balance += receipt.type === 'receive'
                    ? money(receipt.amount)
                    : -money(receipt.amount);
            });

            this.getTransfers().forEach((transfer) => {
                if (transfer.fromAccountId === id) balance -= money(transfer.amount);
                if (transfer.toAccountId === id) balance += money(transfer.amount);
            });

            return balance;
        },

        accountMovementCount(id) {
            const receiptsCount = this.getReceipts().filter(
                (receipt) => receipt.accountId === id
            ).length;

            const transfersCount = this.getTransfers().filter(
                (transfer) =>
                    transfer.fromAccountId === id || transfer.toAccountId === id
            ).length;

            return receiptsCount + transfersCount;
        },

        totalBalance() {
            return this.getAccounts().reduce(
                (total, account) => total + this.accountBalance(account.id),
                0
            );
        },

        totals() {
            let receive = 0;
            let pay = 0;

            this.getReceipts().forEach((receipt) => {
                if (receipt.type === 'receive') receive += money(receipt.amount);
                else pay += money(receipt.amount);
            });

            return {
                receive,
                pay,
                count: this.getReceipts().length,
                customers: this.getCustomers().length,
                accounts: this.getAccounts().length,
                balance: this.totalBalance(),
            };
        },

        // -----------------------------------------------------
        // Backup / Restore - current user only
        // -----------------------------------------------------
        exportData() {
            return {
                version: 3,
                exportedAt: new Date().toISOString(),
                user: this.getUser(),
                settings: this.getSettings(),
                accounts: this.getAccounts(),
                receipts: this.getReceipts(),
                transfers: this.getTransfers(),
                customers: this.getCustomers(),
            };
        },

        importData(data) {
            if (!data || ![2, 3].includes(data.version)) {
                throw new Error('invalid');
            }

            // الاستيراد يدخل البيانات في المستخدم الحالي فقط.
            ['settings', 'accounts', 'receipts', 'transfers', 'customers'].forEach((section) => {
                if (data[section] !== undefined) writeUser(section, data[section]);
            });
        },

        resetAll() {
            const userId = currentUserId();
            if (!userId) return;

            USER_SECTIONS.forEach((section) => {
                localStorage.removeItem(userKey(section, userId));
            });

            // نرجع إعدادات المستخدم فقط إلى الافتراضي ونبقي حساب تسجيل دخوله موجودًا.
            writeUser('accounts', [], userId);
            writeUser('receipts', [], userId);
            writeUser('transfers', [], userId);
            writeUser('customers', [], userId);
            writeUser('settings', { ...DEFAULT_SETTINGS }, userId);
            this.clearUser();
        },
    };

    window.RPStore = RPStore;
})();
