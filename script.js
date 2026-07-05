/* ============================================================
   ALBOWRY CARPENTRY LLC — MASTER INVOICE ENGINE v3.1
   BLUE THEME EDITION | Company Logo Integrated
   ============================================================ */

'use strict';

// ═══════════════════════════════════════════════════════
// 🌐 GLOBAL STATE
// ═══════════════════════════════════════════════════════
const APP_STATE = {
    rowCount: 0,
    allInvoices: [],
    allClients: [],
    currentEditId: null,
    cachedLogoBase64: null,
    isDirty: false,
    version: '3.1.0'
};

let rowCount = 0;
let allInvoices = [];
let allClients = [];
let currentEditId = null;
let cachedLogoBase64 = null;

// ═══════════════════════════════════════════════════════
// 🚀 INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    console.log('%c🚀 ALBOWRY INVOICE PRO v' + APP_STATE.version + ' | BLUE THEME', 'color:#1a4d8f;font-size:18px;font-weight:bold;background:#ffd700;padding:8px;border-radius:4px;');
    
    try {
        loadSettings();
        loadInvoices();
        loadClients();
        initForm();
        populateCurrencies();
        updateDashboard();
        renderClientsPage();
        setupKeyboardShortcuts();
        setupAutoSave();
        setupBeforeUnload();
        await fetchAndCacheLogo();
        applyLogoToUI();
        
        setTimeout(() => {
            const ls = document.getElementById('loadingScreen');
            if (ls) ls.style.display = 'none';
        }, 1500);
        
        console.log('%c✅ System ready!', 'color:#28a745;font-weight:bold;');
    } catch(err) {
        console.error('❌ Init error:', err);
    }
});

// ═══════════════════════════════════════════════════════
// ⌨️ KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (document.getElementById('page-create').classList.contains('active')) saveInvoice();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            quickNewInvoice();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (document.getElementById('page-create').classList.contains('active')) printPDF();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            if (document.getElementById('page-create').classList.contains('active')) downloadPDF();
        }
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });
}

function setupAutoSave() {
    setInterval(() => {
        if (APP_STATE.isDirty && document.getElementById('page-create').classList.contains('active')) {
            try {
                const data = getData();
                localStorage.setItem('albowry_draft', JSON.stringify(data));
                APP_STATE.isDirty = false;
            } catch(e) {}
        }
    }, 30000);
    document.addEventListener('input', () => { APP_STATE.isDirty = true; });
}

function setupBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
        if (APP_STATE.isDirty && document.getElementById('page-create').classList.contains('active')) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes.';
        }
    });
}

// ═══════════════════════════════════════════════════════
// 🖼️ LOGO — COMPANY LOGO PRIORITY
// ═══════════════════════════════════════════════════════
async function fetchAndCacheLogo() {
    // 🥇 PRIORITY 1: company-logo.png (HIGH-QUALITY, for PDF & Web)
    const logoFiles = [
        'company-logo.png',
        'company-logo.PNG',
        './company-logo.png',
        'icon-512.png'  // Fallback
    ];

    for (const file of logoFiles) {
        try {
            const r = await fetch(file);
            if (r.ok) {
                const blob = await r.blob();
                const base64 = await blobToBase64(blob);
                cachedLogoBase64 = base64;
                APP_STATE.cachedLogoBase64 = base64;
                localStorage.setItem('albowry_logo_b64', base64);
                console.log('✅ Logo loaded from: ' + file);
                return;
            }
        } catch(e) { /* try next */ }
    }

    // 🥈 PRIORITY 2: Cached in localStorage
    const cached = localStorage.getItem('albowry_logo_b64');
    if (cached && cached.startsWith('data:image')) {
        cachedLogoBase64 = cached;
        APP_STATE.cachedLogoBase64 = cached;
        console.log('✅ Logo loaded from cache');
        return;
    }

    // 🥉 PRIORITY 3: From Apps Script (if available)
    try {
        if (typeof CONFIG !== 'undefined' && CONFIG.scriptURL) {
            const r = await fetch(CONFIG.scriptURL + '?action=logo');
            const data = await r.json();
            if (data.status === 'success' && data.logo) {
                cachedLogoBase64 = data.logo;
                APP_STATE.cachedLogoBase64 = data.logo;
                localStorage.setItem('albowry_logo_b64', data.logo);
                console.log('✅ Logo loaded from Apps Script');
                return;
            }
        }
    } catch(e) { console.log('⚠️ Apps Script logo failed'); }

    console.warn('⚠️ No logo found! Add company-logo.png to root folder');
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Apply logo to all UI elements (sidebar, topbar, loading, etc.)
function applyLogoToUI() {
    if (!cachedLogoBase64) return;
    
    // Apply to all img elements with class .app-logo or id containing "logo"
    const logoTargets = document.querySelectorAll('.app-logo, #sidebarLogo, #topbarLogo, #loadingLogo, #aboutLogo, [data-logo="company"]');
    logoTargets.forEach(el => {
        if (el.tagName === 'IMG') {
            el.src = cachedLogoBase64;
        } else {
            el.style.backgroundImage = `url(${cachedLogoBase64})`;
            el.style.backgroundSize = 'contain';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.backgroundPosition = 'center';
        }
    });
    
    console.log('✅ Logo applied to ' + logoTargets.length + ' UI elements');
}

// ═══════════════════════════════════════════════════════
// ⚙️ SETTINGS
// ═══════════════════════════════════════════════════════
function getSettings() {
    try {
        const saved = localStorage.getItem('albowry_settings');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
        compName: CONFIG.company.name,
        email: CONFIG.company.email,
        phone: CONFIG.company.phone,
        trn: CONFIG.company.trn,
        web: CONFIG.company.website,
        addr: `${CONFIG.company.address}, ${CONFIG.company.emirate}, ${CONFIG.company.country}`,
        vat: CONFIG.invoice.defaultVAT,
        prefix: CONFIG.invoice.prefix,
        nextNum: CONFIG.invoice.startNumber,
        dueDays: CONFIG.invoice.dueDays,
        bankName: CONFIG.bank.name,
        accName: CONFIG.bank.accountName,
        accNo: CONFIG.bank.accountNumber,
        iban: CONFIG.bank.iban,
        swift: CONFIG.bank.swift,
        branch: CONFIG.bank.branch,
        terms: CONFIG.invoice.paymentTerms,
        thankYou: CONFIG.invoice.thankYou
    };
}

function loadSettings() {
    const s = getSettings();
    const map = {
        setCompName: s.compName, setEmail: s.email, setPhone: s.phone,
        setTrn: s.trn, setWeb: s.web, setAddr: s.addr, setVat: s.vat,
        setPrefix: s.prefix, setNextNum: s.nextNum, setDueDays: s.dueDays,
        setBankName: s.bankName, setAccName: s.accName, setAccNo: s.accNo,
        setIban: s.iban, setSwift: s.swift, setBranch: s.branch,
        setTerms: s.terms, setThankYou: s.thankYou
    };
    for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    }
}

function saveSettings() {
    const s = {
        compName: document.getElementById('setCompName').value.trim(),
        email: document.getElementById('setEmail').value.trim(),
        phone: document.getElementById('setPhone').value.trim(),
        trn: document.getElementById('setTrn').value.trim(),
        web: document.getElementById('setWeb').value.trim(),
        addr: document.getElementById('setAddr').value.trim(),
        vat: parseFloat(document.getElementById('setVat').value) || 5,
        prefix: document.getElementById('setPrefix').value.trim() || 'ABC-',
        nextNum: parseInt(document.getElementById('setNextNum').value) || 1,
        dueDays: parseInt(document.getElementById('setDueDays').value) || 30,
        bankName: document.getElementById('setBankName').value.trim(),
        accName: document.getElementById('setAccName').value.trim(),
        accNo: document.getElementById('setAccNo').value.trim(),
        iban: document.getElementById('setIban').value.trim(),
        swift: document.getElementById('setSwift').value.trim(),
        branch: document.getElementById('setBranch').value.trim(),
        terms: document.getElementById('setTerms').value.trim(),
        thankYou: document.getElementById('setThankYou').value.trim()
    };
    localStorage.setItem('albowry_settings', JSON.stringify(s));
    showStatus('✅ Settings saved successfully!', 'success');
    showToast('⚙️ Settings Updated', 'success');
}

// ═══════════════════════════════════════════════════════
// 🔢 INVOICE NUMBER
// ═══════════════════════════════════════════════════════
function getNextInvNumber() {
    const s = getSettings();
    return s.prefix + String(s.nextNum).padStart(4, '0');
}

function incrementInvCounter() {
    const s = getSettings();
    s.nextNum++;
    localStorage.setItem('albowry_settings', JSON.stringify(s));
    const el = document.getElementById('setNextNum');
    if (el) el.value = s.nextNum;
}

function editInvNumber() {
    const el = document.getElementById('invNo');
    if (el.readOnly) {
        el.readOnly = false;
        el.style.cursor = 'text';
        el.focus();
        el.select();
        showToast('✏️ Now you can edit', 'info');
    } else {
        el.readOnly = true;
        el.style.cursor = 'pointer';
    }
}

function resetInvNumber() {
    const el = document.getElementById('invNo');
    el.value = getNextInvNumber();
    el.readOnly = true;
    showToast('🔄 Reset done', 'info');
}

// ═══════════════════════════════════════════════════════
// 📝 FORM INIT
// ═══════════════════════════════════════════════════════
function initForm() {
    const s = getSettings();
    document.getElementById('invNo').value = getNextInvNumber();
    const today = new Date();
    const due = new Date();
    due.setDate(today.getDate() + s.dueDays);
    document.getElementById('invDate').value = fmtDate(today);
    document.getElementById('dueDate').value = fmtDate(due);
    document.getElementById('fromName').value = s.compName;
    document.getElementById('fromEmail').value = s.email;
    document.getElementById('fromPhone').value = s.phone;
    document.getElementById('fromTrn').value = s.trn;
    document.getElementById('fromWeb').value = s.web;
    document.getElementById('fromAddr').value = s.addr;
    document.getElementById('notes').value = s.thankYou;
    document.getElementById('terms').value = s.terms;
    document.getElementById('bankName').value = s.bankName;
    document.getElementById('accName').value = s.accName;
    document.getElementById('accNo').value = s.accNo;
    document.getElementById('iban').value = s.iban;
    document.getElementById('swift').value = s.swift;
    document.getElementById('branch').value = s.branch;
    clearClientFields();
    document.getElementById('poRef').value = '';
    document.getElementById('invStatus').value = 'pending';
    document.getElementById('extraDisc').value = '0';
    document.getElementById('itemsBody').innerHTML = '';
    rowCount = 0;
    currentEditId = null;
    addItem(); addItem();
    APP_STATE.isDirty = false;
}

function resetForm() {
    if (confirm('⚠️ Clear all fields?\n\nUnsaved changes will be lost.')) {
        initForm();
        showStatus('🔄 Form cleared', 'success');
    }
}

function clearClientFields() {
    ['toName', 'toContact', 'toEmail', 'toPhone', 'toTrn', 'toAddr'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function quickNewInvoice() {
    initForm();
    showPage('create', document.querySelector('[data-page="create"]'));
    setTimeout(() => document.getElementById('toName').focus(), 300);
}

// ═══════════════════════════════════════════════════════
// 💱 CURRENCY
// ═══════════════════════════════════════════════════════
function populateCurrencies() {
    const sel = document.getElementById('currency');
    if (!sel) return;
    sel.innerHTML = CONFIG.currencies.map(c =>
        `<option value="${c.code}" ${c.code === 'AED' ? 'selected' : ''}>${c.flag} ${c.code} — ${c.name}</option>`
    ).join('');
}

function getCurrencyWord(code) {
    const map = {
        AED: 'Dirhams', USD: 'Dollars', EUR: 'Euros', GBP: 'Pounds',
        SAR: 'Riyals', INR: 'Rupees', PKR: 'Rupees', QAR: 'Riyals',
        OMR: 'Rials', KWD: 'Dinars', BHD: 'Dinars', EGP: 'Pounds', JOD: 'Dinars'
    };
    return map[code] || code;
}

// ═══════════════════════════════════════════════════════
// 📦 ITEMS
// ═══════════════════════════════════════════════════════
function addItem(data) {
    rowCount++;
    const id = rowCount;
    const s = getSettings();
    const vat = data ? data.vat : s.vat;
    const tr = document.createElement('tr');
    tr.id = 'row-' + id;
    tr.innerHTML = `
        <td class="row-num">${id}</td>
        <td><input class="td-input" type="text" placeholder="Item description..." value="${escapeHtml(data ? data.desc : '')}"></td>
        <td><input class="td-input num" type="number" min="0" step="0.01" value="${data ? data.qty : 1}" oninput="calcRow(this)"></td>
        <td><select class="td-select">${CONFIG.units.map(u => `<option value="${u}" ${data && data.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></td>
        <td><input class="td-input num" type="number" min="0" step="0.01" value="${data ? data.price : 0}" oninput="calcRow(this)"></td>
        <td><input class="td-input num" type="number" min="0" max="100" step="0.01" value="${data ? data.disc : 0}" oninput="calcRow(this)"></td>
        <td><input class="td-input num" type="number" min="0" max="100" step="0.01" value="${vat}" oninput="calcRow(this)"></td>
        <td class="row-amount" id="amt-${id}">0.00</td>
        <td><div class="row-actions">
            <button class="row-action-btn dup" title="Duplicate" onclick="dupItem(${id})">📋</button>
            <button class="row-action-btn delete" title="Delete" onclick="delItem(${id})">🗑️</button>
        </div></td>`;
    document.getElementById('itemsBody').appendChild(tr);
    if (data) calcRow(tr.querySelector('.td-input.num'));
    calcAll();
    updateItemsCount();
}

function dupItem(id) {
    const row = document.getElementById('row-' + id);
    if (!row) return;
    const inp = row.querySelectorAll('.td-input');
    const sel = row.querySelector('.td-select');
    addItem({
        desc: inp[0].value,
        qty: parseFloat(inp[1].value) || 1,
        unit: sel.value,
        price: parseFloat(inp[2].value) || 0,
        disc: parseFloat(inp[3].value) || 0,
        vat: parseFloat(inp[4].value) || 5
    });
    showToast('📋 Item duplicated', 'success');
}

function delItem(id) {
    const rows = document.querySelectorAll('#itemsBody tr');
    if (rows.length <= 1) {
        showToast('⚠️ At least one item required', 'error');
        return;
    }
    const row = document.getElementById('row-' + id);
    if (row) row.remove();
    reNumberRows();
    calcAll();
    updateItemsCount();
}

function reNumberRows() {
    let n = 1;
    document.querySelectorAll('#itemsBody tr').forEach(tr => {
        tr.querySelector('.row-num').textContent = n++;
    });
}

function updateItemsCount() {
    const el = document.getElementById('itemsCountLabel');
    if (el) el.textContent = document.querySelectorAll('#itemsBody tr').length;
}

// ═══════════════════════════════════════════════════════
// 🧮 CALCULATIONS
// ═══════════════════════════════════════════════════════
function calcRow(el) {
    const tr = el.closest('tr');
    const inp = tr.querySelectorAll('.td-input');
    const qty = parseFloat(inp[1].value) || 0;
    const price = parseFloat(inp[2].value) || 0;
    const disc = parseFloat(inp[3].value) || 0;
    const vat = parseFloat(inp[4].value) || 0;
    const sub = qty * price;
    const discAmt = sub * disc / 100;
    const afterDisc = sub - discAmt;
    const vatAmt = afterDisc * vat / 100;
    const total = afterDisc + vatAmt;
    const id = tr.id.split('-')[1];
    document.getElementById('amt-' + id).textContent = total.toFixed(2);
    calcAll();
}

function calcAll() {
    const cur = document.getElementById('currency').value;
    let subtotal = 0, discTotal = 0, taxable = 0, vatTotal = 0;
    document.querySelectorAll('#itemsBody tr').forEach(tr => {
        const inp = tr.querySelectorAll('.td-input');
        if (inp.length >= 5) {
            const qty = parseFloat(inp[1].value) || 0;
            const price = parseFloat(inp[2].value) || 0;
            const disc = parseFloat(inp[3].value) || 0;
            const vat = parseFloat(inp[4].value) || 0;
            const sub = qty * price;
            const da = sub * disc / 100;
            const ad = sub - da;
            const va = ad * vat / 100;
            subtotal += sub;
            discTotal += da;
            taxable += ad;
            vatTotal += va;
        }
    });
    const edv = parseFloat(document.getElementById('extraDisc').value) || 0;
    const edt = document.getElementById('extraDiscType').value;
    const preGrand = taxable + vatTotal;
    const extraDA = edt === 'pct' ? preGrand * edv / 100 : edv;
    const grand = Math.max(0, preGrand - extraDA);
    document.getElementById('subtotal').textContent = `${cur} ${fmtNum(subtotal)}`;
    document.getElementById('itemDiscTotal').textContent = `- ${cur} ${fmtNum(discTotal)}`;
    document.getElementById('taxableAmt').textContent = `${cur} ${fmtNum(taxable)}`;
    document.getElementById('vatAmt').textContent = `${cur} ${fmtNum(vatTotal)}`;
    document.getElementById('grandTotal').textContent = `${cur} ${fmtNum(grand)}`;
    document.getElementById('amountWords').textContent = numberToWords(grand) + ' ' + getCurrencyWord(cur) + ' Only';
}

// ═══════════════════════════════════════════════════════
// 🔤 NUMBER TO WORDS
// ═══════════════════════════════════════════════════════
function numberToWords(n) {
    if (n === 0) return 'Zero';
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    function convert(num) {
        if (num < 20) return ones[num];
        if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' ' + ones[num%10] : '');
        if (num < 1000) return ones[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' and ' + convert(num%100) : '');
        if (num < 100000) return convert(Math.floor(num/1000)) + ' Thousand' + (num%1000 ? ' ' + convert(num%1000) : '');
        if (num < 10000000) return convert(Math.floor(num/100000)) + ' Lakh' + (num%100000 ? ' ' + convert(num%100000) : '');
        return convert(Math.floor(num/10000000)) + ' Crore' + (num%10000000 ? ' ' + convert(num%10000000) : '');
    }
    const intPart = Math.floor(n);
    const decPart = Math.round((n - intPart) * 100);
    let result = convert(intPart);
    if (decPart > 0) result += ' and ' + convert(decPart) + ' Fils';
    return result;
}

// ═══════════════════════════════════════════════════════
// 📤 GATHER DATA
// ═══════════════════════════════════════════════════════
function getData() {
    const cur = document.getElementById('currency').value;
    const items = [];
    document.querySelectorAll('#itemsBody tr').forEach((tr, i) => {
        const inp = tr.querySelectorAll('.td-input');
        const sel = tr.querySelector('.td-select');
        if (inp.length >= 5) {
            const desc = inp[0].value;
            const qty = parseFloat(inp[1].value) || 0;
            const unit = sel ? sel.value : 'PCS';
            const price = parseFloat(inp[2].value) || 0;
            const disc = parseFloat(inp[3].value) || 0;
            const vat = parseFloat(inp[4].value) || 0;
            const sub = qty * price;
            const da = sub * disc / 100;
            const ad = sub - da;
            const va = ad * vat / 100;
            const total = ad + va;
            items.push({ no: i+1, desc, qty, unit, price, disc, vat, sub, discAmt: da, afterDisc: ad, vatAmt: va, total });
        }
    });
    const subtotal = items.reduce((a,b) => a + b.sub, 0);
    const itemDiscTotal = items.reduce((a,b) => a + b.discAmt, 0);
    const taxable = items.reduce((a,b) => a + b.afterDisc, 0);
    const vatTotal = items.reduce((a,b) => a + b.vatAmt, 0);
    const edv = parseFloat(document.getElementById('extraDisc').value) || 0;
    const edt = document.getElementById('extraDiscType').value;
    const preGrand = taxable + vatTotal;
    const extraDA = edt === 'pct' ? preGrand * edv / 100 : edv;
    const grand = Math.max(0, preGrand - extraDA);
    return {
        invNo: document.getElementById('invNo').value,
        invDate: document.getElementById('invDate').value,
        dueDate: document.getElementById('dueDate').value,
        currency: cur,
        status: document.getElementById('invStatus').value,
        poRef: document.getElementById('poRef').value,
        fromName: document.getElementById('fromName').value,
        fromEmail: document.getElementById('fromEmail').value,
        fromPhone: document.getElementById('fromPhone').value,
        fromTrn: document.getElementById('fromTrn').value,
        fromWeb: document.getElementById('fromWeb').value,
        fromAddr: document.getElementById('fromAddr').value,
        toName: document.getElementById('toName').value,
        toContact: document.getElementById('toContact').value,
        toEmail: document.getElementById('toEmail').value,
        toPhone: document.getElementById('toPhone').value,
        toTrn: document.getElementById('toTrn').value,
        toAddr: document.getElementById('toAddr').value,
        items,
        subtotal: subtotal.toFixed(2),
        itemDiscTotal: itemDiscTotal.toFixed(2),
        taxable: taxable.toFixed(2),
        vatTotal: vatTotal.toFixed(2),
        extraDiscAmt: extraDA.toFixed(2),
        grandTotal: grand.toFixed(2),
        amountWords: numberToWords(grand) + ' ' + getCurrencyWord(cur) + ' Only',
        notes: document.getElementById('notes').value,
        terms: document.getElementById('terms').value,
        bankName: document.getElementById('bankName').value,
        accName: document.getElementById('accName').value,
        accNo: document.getElementById('accNo').value,
        iban: document.getElementById('iban').value,
        swift: document.getElementById('swift').value,
        branch: document.getElementById('branch').value
    };
}

// ═══════════════════════════════════════════════════════
// 💾 INVOICE SAVE
// ═══════════════════════════════════════════════════════
function saveInvoice() {
    const d = getData();
    if (!d.toName || !d.toName.trim()) {
        showStatus('⚠️ Please enter client name!', 'error');
        document.getElementById('toName').focus();
        return;
    }
    if (d.items.length === 0 || d.items.every(i => !i.desc)) {
        showStatus('⚠️ Please add at least one item!', 'error');
        return;
    }
    d.savedAt = new Date().toISOString();
    d.id = currentEditId || 'inv_' + Date.now();
    const existing = allInvoices.findIndex(x => x.id === d.id);
    if (existing >= 0) {
        allInvoices[existing] = d;
        showStatus(`✅ Invoice ${d.invNo} updated!`, 'success');
    } else {
        allInvoices.push(d);
        incrementInvCounter();
        showStatus(`✅ Invoice ${d.invNo} saved!`, 'success');
    }
    localStorage.setItem('albowry_invoices', JSON.stringify(allInvoices));
    APP_STATE.allInvoices = allInvoices;
    APP_STATE.isDirty = false;
    updateDashboard();
    renderInvoiceList();
    if (d.toName) autoSaveClientFromInvoice(d);
    showToast('💾 Invoice Saved', 'success');
}

function loadInvoices() {
    try {
        const saved = localStorage.getItem('albowry_invoices');
        allInvoices = saved ? JSON.parse(saved) : [];
        APP_STATE.allInvoices = allInvoices;
    } catch(e) { allInvoices = []; }
    const el = document.getElementById('invCount');
    if (el) el.textContent = allInvoices.length;
}

function deleteInvoice(id) {
    const inv = allInvoices.find(x => x.id === id);
    if (!inv) return;
    if (!confirm(`⚠️ Delete "${inv.invNo}"?\n\nClient: ${inv.toName}\nAmount: ${inv.currency} ${inv.grandTotal}`)) return;
    allInvoices = allInvoices.filter(x => x.id !== id);
    localStorage.setItem('albowry_invoices', JSON.stringify(allInvoices));
    updateDashboard();
    renderInvoiceList();
    showToast(`🗑️ Deleted ${inv.invNo}`, 'success');
}

function loadInvoiceForEdit(id) {
    const inv = allInvoices.find(x => x.id === id);
    if (!inv) return;
    currentEditId = id;
    document.getElementById('invNo').value = inv.invNo;
    document.getElementById('invDate').value = inv.invDate;
    document.getElementById('dueDate').value = inv.dueDate;
    document.getElementById('currency').value = inv.currency;
    document.getElementById('invStatus').value = inv.status || 'pending';
    document.getElementById('poRef').value = inv.poRef || '';
    document.getElementById('fromName').value = inv.fromName;
    document.getElementById('fromEmail').value = inv.fromEmail;
    document.getElementById('fromPhone').value = inv.fromPhone;
    document.getElementById('fromTrn').value = inv.fromTrn;
    document.getElementById('fromWeb').value = inv.fromWeb || '';
    document.getElementById('fromAddr').value = inv.fromAddr;
    document.getElementById('toName').value = inv.toName;
    document.getElementById('toContact').value = inv.toContact || '';
    document.getElementById('toEmail').value = inv.toEmail;
    document.getElementById('toPhone').value = inv.toPhone;
    document.getElementById('toTrn').value = inv.toTrn;
    document.getElementById('toAddr').value = inv.toAddr;
    document.getElementById('notes').value = inv.notes;
    document.getElementById('terms').value = inv.terms;
    document.getElementById('bankName').value = inv.bankName;
    document.getElementById('accName').value = inv.accName;
    document.getElementById('accNo').value = inv.accNo || '';
    document.getElementById('iban').value = inv.iban;
    document.getElementById('swift').value = inv.swift;
    document.getElementById('branch').value = inv.branch || '';
    document.getElementById('itemsBody').innerHTML = '';
    rowCount = 0;
    inv.items.forEach(item => addItem(item));
    showPage('create', document.querySelector('[data-page="create"]'));
    showStatus(`✏️ Editing ${inv.invNo}`, 'loading');
    setTimeout(() => document.getElementById('statusBar').style.display = 'none', 3000);
}

function duplicateInvoice(id) {
    const inv = allInvoices.find(x => x.id === id);
    if (!inv) return;
    loadInvoiceForEdit(id);
    currentEditId = null;
    document.getElementById('invNo').value = getNextInvNumber();
    showStatus(`📋 Duplicated. Save to create copy.`, 'success');
}

// ═══════════════════════════════════════════════════════
// 📊 DASHBOARD
// ═══════════════════════════════════════════════════════
function updateDashboard() {
    loadInvoices();
    document.getElementById('statTotal').textContent = allInvoices.length;
    const rev = allInvoices.reduce((a,b) => a + parseFloat(b.grandTotal || 0), 0);
    document.getElementById('statRevenue').textContent = 'AED ' + fmtNum(rev, 0);
    document.getElementById('statPending').textContent = allInvoices.filter(x => x.status === 'pending').length;
    document.getElementById('statOverdue').textContent = allInvoices.filter(x => x.status === 'overdue').length;
    const recent = allInvoices.slice(-5).reverse();
    const container = document.getElementById('recentInvoices');
    if (recent.length === 0) {
        container.className = 'empty-state';
        container.innerHTML = `<div class="empty-icon">📄</div><div class="empty-title">No invoices yet</div><div class="empty-text">Create your first invoice!</div><button class="topbar-btn btn-gold" onclick="quickNewInvoice()" style="margin-top:16px;">➕ Create First Invoice</button>`;
        return;
    }
    container.className = '';
    container.innerHTML = `<table class="invoice-list-table"><thead><tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${recent.map(inv => `<tr onclick="loadInvoiceForEdit('${inv.id}')"><td style="font-weight:700;color:var(--primary);font-family:var(--fontMono);">${inv.invNo}</td><td style="font-weight:600;">${escapeHtml(inv.toName || '—')}</td><td>${inv.invDate}</td><td style="font-weight:700;font-family:var(--fontMono);">${inv.currency} ${inv.grandTotal}</td><td><span class="inv-status ${inv.status || 'pending'}">${(inv.status || 'pending').toUpperCase()}</span></td></tr>`).join('')}</tbody></table>`;
}

// ═══════════════════════════════════════════════════════
// 📋 INVOICE LIST
// ═══════════════════════════════════════════════════════
function renderInvoiceList(list) {
    const container = document.getElementById('invoiceListContainer');
    const invoices = list || allInvoices;
    if (invoices.length === 0) {
        container.className = 'empty-state';
        container.innerHTML = `<div class="empty-icon">📂</div><div class="empty-title">No invoices found</div><div class="empty-text">Try adjusting filters</div>`;
        return;
    }
    const sorted = [...invoices].reverse();
    container.className = '';
    container.innerHTML = `<table class="invoice-list-table"><thead><tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Status</th><th style="text-align:center">Actions</th></tr></thead><tbody>${sorted.map(inv => `<tr><td style="font-weight:700;color:var(--primary);font-family:var(--fontMono);cursor:pointer;" onclick="loadInvoiceForEdit('${inv.id}')">${inv.invNo}</td><td style="font-weight:600;cursor:pointer;" onclick="loadInvoiceForEdit('${inv.id}')">${escapeHtml(inv.toName || '—')}</td><td>${inv.invDate}</td><td>${inv.dueDate || '—'}</td><td style="font-weight:700;font-family:var(--fontMono);">${inv.currency} ${inv.grandTotal}</td><td><span class="inv-status ${inv.status || 'pending'}">${(inv.status || 'pending').toUpperCase()}</span></td><td style="text-align:center;white-space:nowrap;"><button class="row-action-btn" title="Edit" onclick="loadInvoiceForEdit('${inv.id}')">✏️</button><button class="row-action-btn dup" title="Duplicate" onclick="duplicateInvoice('${inv.id}')">📋</button><button class="row-action-btn delete" title="Delete" onclick="deleteInvoice('${inv.id}')">🗑️</button></td></tr>`).join('')}</tbody></table>`;
}

function searchInvoices(q) {
    if (!q || !q.trim()) { renderInvoiceList(); return; }
    const lower = q.toLowerCase();
    const filtered = allInvoices.filter(inv =>
        (inv.invNo || '').toLowerCase().includes(lower) ||
        (inv.toName || '').toLowerCase().includes(lower) ||
        (inv.toEmail || '').toLowerCase().includes(lower) ||
        (inv.poRef || '').toLowerCase().includes(lower)
    );
    renderInvoiceList(filtered);
    if (!document.getElementById('page-invoices').classList.contains('active')) {
        showPage('invoices', document.querySelector('[data-page="invoices"]'));
    }
}

function filterInvoiceList() {
    const status = document.getElementById('filterStatus').value;
    if (!status) { renderInvoiceList(); return; }
    renderInvoiceList(allInvoices.filter(inv => (inv.status || 'pending') === status));
}

// ═══════════════════════════════════════════════════════
// 👥 CLIENTS
// ═══════════════════════════════════════════════════════
function loadClients() {
    try {
        const saved = localStorage.getItem('albowry_clients');
        allClients = saved ? JSON.parse(saved) : [];
    } catch(e) { allClients = []; }
    const el = document.getElementById('clientCount');
    if (el) el.textContent = allClients.length;
}

function saveCurrentClient() {
    const name = document.getElementById('toName').value.trim();
    if (!name) {
        showStatus('⚠️ Enter client name first!', 'error');
        return;
    }
    const client = {
        id: 'cli_' + Date.now(),
        name: name,
        contact: document.getElementById('toContact').value.trim(),
        email: document.getElementById('toEmail').value.trim(),
        phone: document.getElementById('toPhone').value.trim(),
        trn: document.getElementById('toTrn').value.trim(),
        addr: document.getElementById('toAddr').value.trim(),
        savedAt: new Date().toISOString(),
        invoiceCount: 0
    };
    const existing = allClients.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing >= 0) {
        client.id = allClients[existing].id;
        client.invoiceCount = allClients[existing].invoiceCount || 0;
        allClients[existing] = client;
        showStatus(`✅ Client "${name}" updated!`, 'success');
    } else {
        allClients.push(client);
        showStatus(`✅ Client "${name}" saved!`, 'success');
    }
    localStorage.setItem('albowry_clients', JSON.stringify(allClients));
    loadClients();
    renderClientsPage();
    showToast(`👤 ${name} saved`, 'success');
}

function autoSaveClientFromInvoice(invoice) {
    const name = invoice.toName;
    if (!name) return;
    const existing = allClients.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing >= 0) {
        allClients[existing].invoiceCount = (allClients[existing].invoiceCount || 0) + 1;
        allClients[existing].contact = invoice.toContact || allClients[existing].contact;
        allClients[existing].email = invoice.toEmail || allClients[existing].email;
        allClients[existing].phone = invoice.toPhone || allClients[existing].phone;
        allClients[existing].trn = invoice.toTrn || allClients[existing].trn;
        allClients[existing].addr = invoice.toAddr || allClients[existing].addr;
    } else {
        allClients.push({
            id: 'cli_' + Date.now(), name: name,
            contact: invoice.toContact, email: invoice.toEmail,
            phone: invoice.toPhone, trn: invoice.toTrn, addr: invoice.toAddr,
            savedAt: new Date().toISOString(), invoiceCount: 1
        });
    }
    localStorage.setItem('albowry_clients', JSON.stringify(allClients));
    loadClients();
}

function clientNameSearch(val) {
    const box = document.getElementById('clientSuggest');
    if (!val || val.length < 1) { box.classList.remove('active'); return; }
    const lower = val.toLowerCase();
    const matches = allClients.filter(c => c.name.toLowerCase().includes(lower)).slice(0, 8);
    if (matches.length === 0) { box.classList.remove('active'); return; }
    box.innerHTML = matches.map(c => `<div class="client-suggest-item" onclick="fillClient('${c.id}')"><div class="cs-name">${escapeHtml(c.name)}</div><div class="cs-meta">${escapeHtml(c.email || '')}${c.phone ? ' • ' + escapeHtml(c.phone) : ''}${c.invoiceCount ? ' • ' + c.invoiceCount + ' invoices' : ''}</div></div>`).join('');
    box.classList.add('active');
}

function fillClient(id) {
    const c = allClients.find(x => x.id === id);
    if (!c) return;
    document.getElementById('toName').value = c.name;
    document.getElementById('toContact').value = c.contact || '';
    document.getElementById('toEmail').value = c.email || '';
    document.getElementById('toPhone').value = c.phone || '';
    document.getElementById('toTrn').value = c.trn || '';
    document.getElementById('toAddr').value = c.addr || '';
    document.getElementById('clientSuggest').classList.remove('active');
    showToast(`✅ Loaded: ${c.name}`, 'success');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('#toName') && !e.target.closest('#clientSuggest')) {
        const box = document.getElementById('clientSuggest');
        if (box) box.classList.remove('active');
    }
});

function openClientPicker() {
    renderClientPicker(allClients);
    document.getElementById('clientPickerModal').classList.add('active');
}

function closeClientPicker() {
    document.getElementById('clientPickerModal').classList.remove('active');
}

function renderClientPicker(list) {
    const el = document.getElementById('clientPickerList');
    if (list.length === 0) {
        el.innerHTML = `<div class="empty-state" style="padding:40px 20px;"><div class="empty-icon">👤</div><div class="empty-title">No clients</div></div>`;
        return;
    }
    el.innerHTML = list.map(c => `<div class="client-card" onclick="fillClient('${c.id}');closeClientPicker();"><div class="cc-info"><div class="cc-name">${escapeHtml(c.name)}</div><div class="cc-meta">📧 ${escapeHtml(c.email || '—')} • 📞 ${escapeHtml(c.phone || '—')}</div>${c.addr ? '<div class="cc-meta">📍 ' + escapeHtml(c.addr) + '</div>' : ''}</div></div>`).join('');
}

function filterClientPicker(q) {
    if (!q) { renderClientPicker(allClients); return; }
    const lower = q.toLowerCase();
    renderClientPicker(allClients.filter(c => c.name.toLowerCase().includes(lower) || (c.email || '').toLowerCase().includes(lower) || (c.phone || '').toLowerCase().includes(lower)));
}

function renderClientsPage() {
    const el = document.getElementById('clientsContainer');
    if (!el) return;
    if (allClients.length === 0) {
        el.className = 'empty-state';
        el.innerHTML = `<div class="empty-icon">👤</div><div class="empty-title">No clients saved</div><div class="empty-text">Save from invoice form!</div><button class="topbar-btn btn-gold" onclick="goToCreateForClient()" style="margin-top:16px;">➕ Add First Client</button>`;
        return;
    }
    el.className = '';
    el.innerHTML = allClients.map(c => `<div class="client-card"><div class="cc-info"><div class="cc-name">${escapeHtml(c.name)}</div><div class="cc-meta">📧 ${escapeHtml(c.email || '—')}</div><div class="cc-meta">📞 ${escapeHtml(c.phone || '—')}</div>${c.addr ? '<div class="cc-meta">📍 ' + escapeHtml(c.addr) + '</div>' : ''}${c.trn ? '<div class="cc-meta">🆔 TRN: ' + escapeHtml(c.trn) + '</div>' : ''}${c.invoiceCount ? '<div class="cc-meta" style="color:var(--primary);font-weight:700;">📄 ' + c.invoiceCount + ' invoices</div>' : ''}</div><div class="cc-actions"><button class="row-action-btn dup" onclick="useClient('${c.id}')" title="New invoice">➕</button><button class="row-action-btn" onclick="editClient('${c.id}')" title="Edit">✏️</button><button class="row-action-btn delete" onclick="deleteClient('${c.id}')" title="Delete">🗑️</button></div></div>`).join('');
}

function useClient(id) {
    quickNewInvoice();
    setTimeout(() => fillClient(id), 400);
}

function editClient(id) {
    const c = allClients.find(x => x.id === id);
    if (!c) return;
    quickNewInvoice();
    setTimeout(() => {
        fillClient(id);
        showStatus('✏️ Edit and click "Save Client"', 'loading');
        setTimeout(() => document.getElementById('statusBar').style.display = 'none', 4000);
    }, 300);
}

function deleteClient(id) {
    const c = allClients.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`⚠️ Delete "${c.name}"?`)) return;
    allClients = allClients.filter(x => x.id !== id);
    localStorage.setItem('albowry_clients', JSON.stringify(allClients));
    loadClients();
    renderClientsPage();
    showToast(`🗑️ ${c.name} deleted`, 'success');
}

function goToCreateForClient() {
    quickNewInvoice();
    setTimeout(() => {
        document.getElementById('toName').focus();
        showStatus('💡 Fill details and click "Save Client"', 'loading');
        setTimeout(() => document.getElementById('statusBar').style.display = 'none', 5000);
    }, 300);
}

// ═══════════════════════════════════════════════════════
// 📤 EXPORT / IMPORT
// ═══════════════════════════════════════════════════════
function exportAllJSON() {
    const backup = {
        version: APP_STATE.version,
        exported: new Date().toISOString(),
        company: CONFIG.company.name,
        invoices: allInvoices,
        clients: allClients,
        settings: getSettings()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Albowry-Backup-${fmtDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`💾 Exported ${allInvoices.length} invoices`, 'success');
}

function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            let counts = { inv: 0, cli: 0 };
            if (data.invoices && Array.isArray(data.invoices)) {
                allInvoices = [...allInvoices, ...data.invoices];
                localStorage.setItem('albowry_invoices', JSON.stringify(allInvoices));
                counts.inv = data.invoices.length;
            }
            if (data.clients && Array.isArray(data.clients)) {
                allClients = [...allClients, ...data.clients];
                localStorage.setItem('albowry_clients', JSON.stringify(allClients));
                counts.cli = data.clients.length;
            }
            if (Array.isArray(data)) {
                allInvoices = [...allInvoices, ...data];
                localStorage.setItem('albowry_invoices', JSON.stringify(allInvoices));
                counts.inv = data.length;
            }
            updateDashboard();
            renderInvoiceList();
            loadClients();
            renderClientsPage();
            showToast(`✅ Imported ${counts.inv} invoices`, 'success');
        } catch(err) {
            showToast('❌ Invalid file', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ═══════════════════════════════════════════════════════
// 🧭 NAVIGATION
// ═══════════════════════════════════════════════════════
function showPage(page, navEl) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
    const titles = {
        dashboard: ['Dashboard', 'Overview of your invoices'],
        create: ['Create Invoice', 'Fill in the invoice details'],
        invoices: ['All Invoices', 'View and manage invoices'],
        clients: ['Saved Clients', 'Manage client database'],
        settings: ['Settings', 'Company and system settings']
    };
    if (titles[page]) {
        document.getElementById('pageTitle').textContent = titles[page][0];
        document.getElementById('pageSubtitle').textContent = titles[page][1];
    }
    if (page === 'invoices') renderInvoiceList();
    if (page === 'dashboard') updateDashboard();
    if (page === 'clients') renderClientsPage();
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('themeIcon').textContent = isDark ? '🌙' : '☀️';
    document.getElementById('themeText').textContent = isDark ? 'Dark Mode' : 'Light Mode';
    localStorage.setItem('albowry_theme', isDark ? 'light' : 'dark');
    showToast(isDark ? '☀️ Light Mode' : '🌙 Dark Mode', 'success');
}

(function() {
    const t = localStorage.getItem('albowry_theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    setTimeout(() => {
        if (t === 'dark') {
            const ti = document.getElementById('themeIcon');
            const tt = document.getElementById('themeText');
            if (ti) ti.textContent = '☀️';
            if (tt) tt.textContent = 'Light Mode';
        }
    }, 100);
})();

// ═══════════════════════════════════════════════════════
// 🔳 QR & BARCODE
// ═══════════════════════════════════════════════════════
function makeQR(text) {
    try {
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        const size = qr.getModuleCount();
        const canvas = document.createElement('canvas');
        const s = 4;
        canvas.width = size * s;
        canvas.height = size * s;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a4d8f';
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (qr.isDark(r, c)) ctx.fillRect(c * s, r * s, s, s);
            }
        }
        return canvas.toDataURL('image/png');
    } catch(e) { return null; }
}

function makeBarcode(text) {
    const canvas = document.getElementById('barcodeCanvas');
    try {
        JsBarcode(canvas, text, {
            format: 'CODE128', width: 1.5, height: 35, displayValue: true,
            fontSize: 11, font: 'monospace', textMargin: 3, margin: 5,
            background: '#ffffff', lineColor: '#1a4d8f'
        });
        return canvas.toDataURL('image/png');
    } catch(e) { return null; }
}

// ═══════════════════════════════════════════════════════
// 📄 PDF GENERATION (BLUE THEME + COMPANY LOGO)
// ═══════════════════════════════════════════════════════
async function buildPDF(returnBase64) {
    const { jsPDF } = window.jspdf;
    const d = getData();
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const W = 210, H = 297, M = 12;
    const cW = W - M * 2;
    
    // BLUE THEME COLORS
    const C = {
        dark:    [26, 77, 143],
        dark2:   [12, 54, 114],
        gold:    [255, 215, 0],
        gold2:   [255, 225, 53],
        white:   [255, 255, 255],
        black:   [0, 0, 0],
        gray:    [100, 110, 120],
        gray2:   [70, 75, 80],
        ltgray:  [245, 246, 248],
        red:     [220, 53, 69],
        border:  [220, 224, 228],
        green:   [40, 167, 69]
    };

    // Ensure logo is loaded
    if (!cachedLogoBase64) {
        await fetchAndCacheLogo();
    }

    // HEADER
    doc.setFillColor(...C.dark);
    doc.rect(0, 0, W, 48, 'F');
    doc.setFillColor(...C.gold);
    doc.rect(0, 48, W, 1.5, 'F');

    // 🖼️ COMPANY LOGO — Large, high-quality
    try {
        if (cachedLogoBase64) {
            // White circular background for logo (better visibility)
            doc.setFillColor(...C.white);
            doc.roundedRect(M, 6, 38, 38, 4, 4, 'F');
            doc.addImage(cachedLogoBase64, 'PNG', M + 2, 8, 34, 34, '', 'FAST');
        } else {
            // Fallback: text placeholder
            doc.setFillColor(...C.gold);
            doc.roundedRect(M, 6, 38, 38, 4, 4, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(...C.dark);
            doc.text('ABC', M + 19, 30, { align: 'center' });
        }
    } catch(e) { console.warn('Logo render error:', e); }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...C.white);
    doc.text(d.fromName || 'ALBOWRY CARPENTRY LLC', 54, 17);
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.gold);
    doc.text(CONFIG.company.tagline, 54, 23);
    
    doc.setFontSize(7);
    doc.setTextColor(200, 220, 240);
    let cy = 29;
    if (d.fromAddr) { doc.text(d.fromAddr, 54, cy); cy += 4.5; }
    if (d.fromPhone) { doc.text('Tel: ' + d.fromPhone, 54, cy); cy += 4.5; }
    if (d.fromEmail) { doc.text('Email: ' + d.fromEmail, 54, cy); cy += 4.5; }
    if (d.fromWeb) { doc.text('Web: ' + d.fromWeb, 54, cy); }

    const barcodeImg = makeBarcode(d.invNo);
    if (barcodeImg) doc.addImage(barcodeImg, 'PNG', W - M - 52, 4, 52, 20, '', 'FAST');

    doc.setFillColor(...C.gold);
    doc.roundedRect(W - M - 52, 26, 52, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.dark);
    doc.text('TAX INVOICE', W - M - 26, 32, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(200, 220, 240);
    doc.setFont('helvetica', 'normal');
    doc.text('Invoice: ' + d.invNo, W - M - 52, 38);
    doc.text('Date: ' + d.invDate, W - M - 52, 42);
    doc.text('Due: ' + d.dueDate, W - M - 52, 46);

    // BILL FROM / TO
    let y = 55;
    const halfW = (cW - 8) / 2;

    doc.setFillColor(...C.ltgray);
    doc.roundedRect(M, y, halfW, 42, 3, 3, 'F');
    doc.setFillColor(...C.dark);
    doc.roundedRect(M, y, halfW, 8, 3, 3, 'F');
    doc.rect(M, y + 5, halfW, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.text('BILL FROM', M + 5, y + 5.5);
    doc.setTextColor(...C.dark);
    doc.setFontSize(9.5);
    doc.text(d.fromName, M + 5, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    let fy = y + 22;
    if (d.fromAddr) { const l = doc.splitTextToSize(d.fromAddr, halfW - 10); doc.text(l, M + 5, fy); fy += l.length * 4; }
    if (d.fromPhone) { doc.text('T: ' + d.fromPhone, M + 5, fy); fy += 4; }
    if (d.fromEmail) { doc.text('E: ' + d.fromEmail, M + 5, fy); fy += 4; }
    if (d.fromTrn) { doc.setTextColor(...C.dark); doc.setFont('helvetica', 'bold'); doc.text('TRN: ' + d.fromTrn, M + 5, fy); }

    const toX = M + halfW + 8;
    doc.setFillColor(...C.ltgray);
    doc.roundedRect(toX, y, halfW, 42, 3, 3, 'F');
    doc.setFillColor(...C.gold);
    doc.roundedRect(toX, y, halfW, 8, 3, 3, 'F');
    doc.rect(toX, y + 5, halfW, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.dark);
    doc.text('BILL TO', toX + 5, y + 5.5);
    doc.setTextColor(...C.dark);
    doc.setFontSize(9.5);
    doc.text(d.toName || 'Client Name', toX + 5, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    let ty = y + 22;
    if (d.toContact) { doc.text('Attn: ' + d.toContact, toX + 5, ty); ty += 4; }
    if (d.toAddr) { const l = doc.splitTextToSize(d.toAddr, halfW - 10); doc.text(l, toX + 5, ty); ty += l.length * 4; }
    if (d.toPhone) { doc.text('T: ' + d.toPhone, toX + 5, ty); ty += 4; }
    if (d.toEmail) { doc.text('E: ' + d.toEmail, toX + 5, ty); ty += 4; }
    if (d.toTrn) { doc.setTextColor(...C.red); doc.setFont('helvetica', 'bold'); doc.text('TRN: ' + d.toTrn, toX + 5, ty); }

    if (d.poRef) { doc.setFontSize(7); doc.setTextColor(...C.gray); doc.setFont('helvetica', 'normal'); doc.text('PO / Ref: ' + d.poRef, M, y + 46); }

    // ITEMS TABLE
    y += 50;
    const heads = [['#', 'Description', 'Qty', 'Unit', 'Rate (' + d.currency + ')', 'Disc%', 'VAT%', 'Amount (' + d.currency + ')']];
    const rows = d.items.map(item => [
        item.no, item.desc, item.qty, item.unit,
        item.price.toFixed(2), item.disc > 0 ? item.disc + '%' : '-',
        item.vat + '%', item.total.toFixed(2)
    ]);

    doc.autoTable({
        head: heads, body: rows, startY: y, margin: { left: M, right: M },
        styles: { fontSize: 7.5, cellPadding: 5, font: 'helvetica', textColor: [40, 45, 50], lineColor: C.border, lineWidth: 0.3 },
        headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 58 },
            2: { halign: 'center', cellWidth: 14 },
            3: { halign: 'center', cellWidth: 16 },
            4: { halign: 'right', cellWidth: 24 },
            5: { halign: 'center', cellWidth: 14 },
            6: { halign: 'center', cellWidth: 14 },
            7: { halign: 'right', cellWidth: 28 }
        },
        alternateRowStyles: { fillColor: C.ltgray },
        didDrawCell: function(data) {
            if (data.section === 'head' && data.column.index === 7) {
                doc.setFillColor(...C.gold);
                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                doc.setTextColor(...C.dark);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.text('Amount', data.cell.x + data.cell.width / 2, data.cell.y + 5.5, { align: 'center' });
                doc.setFontSize(5.5);
                doc.text('(' + d.currency + ')', data.cell.x + data.cell.width / 2, data.cell.y + 9, { align: 'center' });
            }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 6;
    const bankH = 48;

    doc.setFillColor(...C.ltgray);
    doc.roundedRect(M, finalY, 90, bankH, 3, 3, 'F');
    doc.setFillColor(...C.dark);
    doc.roundedRect(M, finalY, 90, 8, 3, 3, 'F');
    doc.rect(M, finalY + 5, 90, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.text('PAYMENT DETAILS', M + 5, finalY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    let by = finalY + 15;
    [['Bank', d.bankName], ['Account', d.accName], ['Acc No', d.accNo], ['IBAN', d.iban], ['SWIFT', d.swift], ['Branch', d.branch]].forEach(([label, val]) => {
        if (val) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C.gray2);
            doc.text(label + ':', M + 5, by);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.gray);
            doc.text(val, M + 25, by);
            by += 5;
        }
    });

    const totX = W - M - 82;
    doc.setFillColor(...C.ltgray);
    doc.roundedRect(totX, finalY, 82, bankH, 3, 3, 'F');
    doc.setFontSize(7.5);
    let tY = finalY + 10;
    function drawTotRow(label, value, color) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...(color || C.gray));
        doc.text(label, totX + 5, tY);
        doc.setTextColor(...(color || C.dark));
        doc.setFont('helvetica', 'bold');
        doc.text(value, totX + 77, tY, { align: 'right' });
        tY += 6.5;
    }
    drawTotRow('Subtotal:', d.currency + ' ' + d.subtotal);
    if (parseFloat(d.itemDiscTotal) > 0) drawTotRow('Discount:', '- ' + d.currency + ' ' + d.itemDiscTotal, C.red);
    drawTotRow('Taxable:', d.currency + ' ' + d.taxable);
    drawTotRow('VAT:', d.currency + ' ' + d.vatTotal);
    if (parseFloat(d.extraDiscAmt) > 0) drawTotRow('Extra Disc:', '- ' + d.currency + ' ' + d.extraDiscAmt, C.red);

    doc.setFillColor(...C.dark);
    doc.roundedRect(totX, tY - 2, 82, 12, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text('GRAND TOTAL', totX + 5, tY + 6);
    doc.setTextColor(...C.gold);
    doc.setFontSize(10);
    doc.text(d.currency + ' ' + d.grandTotal, totX + 77, tY + 6, { align: 'right' });

    const wordsY = Math.max(finalY + bankH + 4, tY + 14);
    doc.setFillColor(...C.ltgray);
    doc.roundedRect(M, wordsY, cW, 10, 3, 3, 'F');
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.8);
    doc.line(M, wordsY, M, wordsY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...C.gray);
    doc.text('AMOUNT IN WORDS:', M + 4, wordsY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.dark);
    doc.text(d.amountWords, M + 4, wordsY + 8.5);

    const qrText = `Company: ${d.fromName}\nInvoice: ${d.invNo}\nDate: ${d.invDate}\nTotal: ${d.currency} ${d.grandTotal}\nVAT: ${d.currency} ${d.vatTotal}`;
    const qrImg = makeQR(qrText);
    const qrSize = 28;
    const qrX = W - M - qrSize;
    const qrY = wordsY + 14;
    if (qrImg) doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFontSize(5.5);
    doc.setTextColor(...C.gray);
    doc.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });

    let noteY = wordsY + 15;
    const noteW = cW - qrSize - 10;
    if (d.notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...C.dark);
        doc.text('Notes:', M, noteY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray);
        doc.setFontSize(6.5);
        const nl = doc.splitTextToSize(d.notes, noteW);
        doc.text(nl, M, noteY + 4);
        noteY += 4 + nl.length * 3.5;
    }
    if (d.terms) {
        noteY += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...C.dark);
        doc.text('Terms & Conditions:', M, noteY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray);
        doc.setFontSize(6.5);
        const tl = doc.splitTextToSize(d.terms, noteW);
        doc.text(tl, M, noteY + 4);
        noteY += 4 + tl.length * 3.5;
    }

    noteY = Math.max(noteY + 8, qrY + qrSize + 6);
    doc.setDrawColor(...C.dark);
    doc.setLineWidth(0.4);
    doc.line(W - M - 60, noteY, W - M, noteY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gray);
    doc.text('Authorized Signature & Stamp', W - M - 30, noteY + 4, { align: 'center' });

    // FOOTER — with small logo watermark
    doc.setFillColor(...C.dark);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setFillColor(...C.gold);
    doc.rect(0, H - 14, W, 1.2, 'F');
    
    // Small logo in footer
    if (cachedLogoBase64) {
        try {
            doc.addImage(cachedLogoBase64, 'PNG', M, H - 11, 8, 8, '', 'FAST');
        } catch(e) {}
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(200, 220, 240);
    doc.text(CONFIG.invoice.footer, W / 2, H - 8, { align: 'center' });
    doc.setTextColor(...C.gold);
    doc.setFontSize(6);
    doc.text(d.fromName + '  |  ' + (d.fromAddr || 'Dubai, UAE') + '  |  ' + (d.fromEmail || ''), W / 2, H - 3.5, { align: 'center' });

    if (returnBase64) return doc.output('datauristring');
    return doc;
}

// ═══════════════════════════════════════════════════════
// 📄 PDF ACTIONS
// ═══════════════════════════════════════════════════════
async function downloadPDF() {
    try {
        showStatus('⏳ Generating PDF...', 'loading');
        const d = getData();
        const doc = await buildPDF(false);
        doc.save('Albowry-Invoice-' + d.invNo + '.pdf');
        showStatus('✅ PDF downloaded!', 'success');
        showToast('📄 PDF Downloaded', 'success');
    } catch(e) {
        showStatus('❌ Error: ' + e.message, 'error');
    }
}

async function previewPDF() {
    try {
        showStatus('⏳ Generating preview...', 'loading');
        const doc = await buildPDF(false);
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
        showStatus('✅ Preview opened!', 'success');
    } catch(e) {
        showStatus('❌ Preview failed', 'error');
    }
}

async function printPDF() {
    try {
        showStatus('⏳ Preparing print...', 'loading');
        const doc = await buildPDF(false);
        const blobUrl = doc.output('bloburl');
        const printWin = window.open(blobUrl, '_blank');
        if (printWin) {
            printWin.addEventListener('load', () => {
                setTimeout(() => printWin.print(), 700);
            });
            showStatus('✅ Print dialog opening...', 'success');
        } else {
            showStatus('⚠️ Allow pop-ups for printing', 'error');
        }
    } catch(e) {
        showStatus('❌ Print failed', 'error');
    }
}

async function saveToDrive() {
    const d = getData();
    if (!d.toName || !d.toName.trim()) {
        showStatus('⚠️ Enter client name first!', 'error');
        return;
    }
    const btn = document.getElementById('driveBtn');
    const originalHTML = btn.innerHTML;
    try {
        showStatus('⏳ Uploading to Drive...', 'loading');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Uploading...';
        const pdfUri = await buildPDF(true);
        const b64 = pdfUri.split(',')[1];
        const payload = {
            action: 'saveInvoice',
            fileName: 'Albowry-Invoice-' + d.invNo + '.pdf',
            pdfBase64: b64,
            invoiceData: JSON.stringify(d)
        };
        const resp = await fetch(CONFIG.scriptURL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await resp.json();
        if (result.status === 'success') {
            showStatus(`✅ Uploaded! <a href="${result.fileUrl}" target="_blank">📂 Open File</a>`, 'success');
            saveInvoice();
            showToast('☁️ Saved to Drive', 'success');
        } else {
            showStatus('❌ ' + result.message, 'error');
        }
    } catch(e) {
        showStatus('❌ Upload failed. Check internet.', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = originalHTML;
}

// ═══════════════════════════════════════════════════════
// 💬 WHATSAPP
// ═══════════════════════════════════════════════════════
function shareWhatsApp() {
    const d = getData();
    if (!d.toName) {
        showStatus('⚠️ Enter client details first!', 'error');
        return;
    }
    const message = `*Invoice from ${d.fromName}*\n\n📄 Invoice: ${d.invNo}\n📅 Date: ${d.invDate}\n⏰ Due: ${d.dueDate}\n\n👤 Client: ${d.toName}\n💰 Amount: *${d.currency} ${d.grandTotal}*\n\n${d.amountWords}\n\nPlease contact us for any queries.\nThank you!`;
    const phone = (d.toPhone || '').replace(/[^0-9]/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showToast('💬 WhatsApp opened', 'success');
}

// ═══════════════════════════════════════════════════════
// 🗑️ DANGER ZONE
// ═══════════════════════════════════════════════════════
function clearAllInvoices() {
    if (!confirm(`⚠️ DELETE ALL ${allInvoices.length} INVOICES?`)) return;
    const c = prompt('Type "DELETE ALL" to confirm:');
    if (c !== 'DELETE ALL') { showToast('❌ Cancelled', 'error'); return; }
    allInvoices = [];
    localStorage.removeItem('albowry_invoices');
    updateDashboard();
    renderInvoiceList();
    showToast('🗑️ All invoices deleted', 'success');
}

function clearAllClients() {
    if (!confirm(`⚠️ DELETE ALL ${allClients.length} CLIENTS?`)) return;
    allClients = [];
    localStorage.removeItem('albowry_clients');
    loadClients();
    renderClientsPage();
    showToast('🗑️ All clients deleted', 'success');
}

function resetAllData() {
    if (!confirm('⚠️ FACTORY RESET?\n\nDelete EVERYTHING?')) return;
    const c = prompt('Type "RESET EVERYTHING" to confirm:');
    if (c !== 'RESET EVERYTHING') { showToast('❌ Cancelled', 'error'); return; }
    localStorage.clear();
    showToast('💥 Reset complete. Reloading...', 'success');
    setTimeout(() => location.reload(), 1500);
}

// ═══════════════════════════════════════════════════════
// ℹ️ ABOUT
// ═══════════════════════════════════════════════════════
function showAboutModal() {
    document.getElementById('aboutModal').classList.add('active');
}

// ═══════════════════════════════════════════════════════
// 📢 NOTIFICATIONS
// ═══════════════════════════════════════════════════════
function showStatus(msg, type) {
    const el = document.getElementById('statusBar');
    if (!el) return;
    el.innerHTML = (type === 'loading' ? '<span class="spinner"></span>' : '') + ' ' + msg;
    el.className = 'status-bar ' + type;
    el.style.display = 'flex';
    if (type === 'success') setTimeout(() => el.style.display = 'none', 6000);
}

function showToast(msg, type) {
    const existing = document.getElementById('appToast');
    if (existing) existing.remove();
    const colors = {
        success: 'linear-gradient(135deg, #28a745, #20c997)',
        error: 'linear-gradient(135deg, #dc3545, #e74c3c)',
        info: 'linear-gradient(135deg, #1a4d8f, #2266b3)'
    };
    const toast = document.createElement('div');
    toast.id = 'appToast';
    toast.style.cssText = `position:fixed;top:24px;right:24px;padding:14px 24px;background:${colors[type] || colors.success};color:white;border-radius:12px;font-family:var(--font);font-size:0.9rem;font-weight:600;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,0.2);animation:toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1);max-width:350px;`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    if (!document.getElementById('toastAnimStyle')) {
        const style = document.createElement('style');
        style.id = 'toastAnimStyle';
        style.textContent = `@keyframes toastIn { from { opacity: 0; transform: translateX(400px); } to { opacity: 1; transform: translateX(0); } } @keyframes toastOut { to { opacity: 0; transform: translateX(400px); } }`;
        document.head.appendChild(style);
    }
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ═══════════════════════════════════════════════════════
// 🛠️ UTILITIES
// ═══════════════════════════════════════════════════════
function fmtDate(d) { return d.toISOString().split('T')[0]; }

function fmtNum(n, decimals = 2) {
    return Number(n).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

console.log('%c✨ Script v3.1 loaded with Company Logo support!', 'color:#28a745;font-weight:bold;');
// ═══════════════════════════════════════════════════════
// 📱 PWA INSTALL PROMPT + APP MODE
// ═══════════════════════════════════════════════════════

let deferredPrompt = null;

// Detect app install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('💾 Install prompt ready');
    
    // Show custom install banner after 3 seconds
    setTimeout(() => {
        if (!isStandalone()) showInstallBanner();
    }, 3000);
});

// Detect if app is installed
window.addEventListener('appinstalled', () => {
    console.log('✅ App installed successfully!');
    hideInstallBanner();
    showToast('🎉 App installed! Open from home screen', 'success');
    deferredPrompt = null;
});

// Check if running as standalone (installed app)
function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           window.navigator.standalone === true;
}

// Show install banner
function showInstallBanner() {
    // Check if already dismissed
    if (localStorage.getItem('installBannerDismissed') === 'true') return;
    if (isStandalone()) return;
    
    // Create banner if doesn't exist
    let banner = document.getElementById('installBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'installBanner';
        banner.className = 'install-banner';
        banner.innerHTML = `
            <div class="install-info">
                📱 <strong>Install Albowry App</strong>
                <small>Get faster access • Works offline • No browser</small>
            </div>
            <button class="btn-install" onclick="triggerInstall()">Install</button>
            <button class="btn-dismiss" onclick="dismissInstallBanner()">✕</button>
        `;
        document.body.appendChild(banner);
    }
    banner.classList.add('show');
}

function hideInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('show');
}

function dismissInstallBanner() {
    hideInstallBanner();
    localStorage.setItem('installBannerDismissed', 'true');
}

// Trigger install
async function triggerInstall() {
    if (!deferredPrompt) {
        showToast('ℹ️ Use browser menu to install', 'info');
        return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('✅ User accepted install');
        showToast('📱 Installing...', 'success');
    } else {
        console.log('❌ User dismissed install');
    }
    
    deferredPrompt = null;
    hideInstallBanner();
}

// Add app mode badge
window.addEventListener('load', () => {
    if (isStandalone()) {
        console.log('%c📱 Running as APP', 'color:#28a745;font-weight:bold;font-size:14px;');
        const badge = document.createElement('div');
        badge.className = 'app-mode-badge';
        badge.textContent = '📱 APP';
        document.body.appendChild(badge);
        
        // Hide after 3 seconds
        setTimeout(() => badge.style.display = 'none', 3000);
    } else {
        console.log('%c🌐 Running in Browser', 'color:#0d6efd;font-weight:bold;');
    }
});

// Handle URL shortcuts (from manifest shortcuts)
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page) {
        setTimeout(() => {
            const navEl = document.querySelector(`[data-page="${page}"]`);
            if (navEl) showPage(page, navEl);
        }, 1000);
    }
});

// Prevent context menu in app mode
if (isStandalone()) {
    document.addEventListener('contextmenu', (e) => {
        if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            e.preventDefault();
        }
    });
}

// Prevent zoom on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
}, false);

console.log('%c✨ App Mode ready!', 'color:#28a745;font-weight:bold;');s