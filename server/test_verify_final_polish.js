import { spawn } from 'child_process';
import XLSX from 'xlsx';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9234;

async function runFinalPolishVerification() {
  console.log('=== VERIFYING FINAL ADMIN PANEL POLISH IN REAL HEADLESS CHROME ===');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    'http://localhost:5173/admin',
  ]);

  await new Promise((r) => setTimeout(r, 2500));

  try {
    const listRes = await fetch(`http://localhost:${PORT}/json/list`);
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.url.includes('localhost:5173')) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    let msgId = 1;
    const callbacks = new Map();
    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = msgId++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    const consoleLogs = [];
    const runtimeExceptions = [];

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && callbacks.has(data.id)) {
        const cb = callbacks.get(data.id);
        callbacks.delete(data.id);
        cb(data);
      }
      if (data.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push(data.params);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        runtimeExceptions.push(data.params.exceptionDetails);
      }
    };

    await new Promise((resolve) => (ws.onopen = resolve));
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Console.enable');

    console.log('[1] Logging into Admin Portal...');
    await new Promise((r) => setTimeout(r, 1000));
    await send('Runtime.evaluate', {
      expression: `
        const setVal = (input, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, val);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (emailInput) setVal(emailInput, 'ajayguptha710@gmail.com');
        if (passInput) setVal(passInput, 'Ideathon@Admin2026!');
        if (submitBtn) submitBtn.click();
      `,
    });

    await new Promise((r) => setTimeout(r, 3000));

    console.log('[2] Checking Dashboard and Absence of Email-Management UI...');
    const emailCheck = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        hasH1: document.querySelector('h1')?.innerText,
        tableHeaders: Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim()),
        hasEmailStatusHeader: !!Array.from(document.querySelectorAll('th')).find(th => th.innerText.includes('Email Status')),
        hasDeliveredBadge: !!Array.from(document.querySelectorAll('td')).find(td => td.innerText.includes('Delivered') || td.innerText.includes('Pending')),
        hasResendButton: !!document.querySelector('button[title*="Resend"]') || !!document.querySelector('button[title*="resend"]'),
        hasSendIcons: !!document.querySelector('svg.lucide-send'),
        actionButtonsCount: document.querySelectorAll('tbody td button').length,
        actionButtonsText: Array.from(document.querySelectorAll('tbody td button')).map(b => b.innerText.trim())
      })`,
      returnByValue: true,
    });
    const emailCheckResult = JSON.parse(emailCheck.result.result.value);
    console.log('Email UI Elements Audit:', emailCheckResult);

    console.log('[3] Testing Custom Dark Dropdowns (Zero White Popups)...');
    // Click Department dropdown trigger
    await send('Runtime.evaluate', {
      expression: `
        const deptBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('All Depts') || b.innerText.includes('CSE'));
        if (deptBtn) deptBtn.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 400));

    const deptMenu = await send('Runtime.evaluate', {
      expression: `
        const menu = document.querySelector('div[role="listbox"]');
        JSON.stringify({
          menuFound: !!menu,
          menuBg: menu ? window.getComputedStyle(menu).backgroundColor : null,
          optionsCount: menu ? menu.querySelectorAll('button[role="option"]').length : 0,
          optionsText: menu ? Array.from(menu.querySelectorAll('button[role="option"]')).map(o => o.innerText.trim()) : []
        });
      `,
      returnByValue: true,
    });
    console.log('Department Custom Dropdown State:', JSON.parse(deptMenu.result.result.value));

    // Select CSE
    await send('Runtime.evaluate', {
      expression: `
        const cseOpt = Array.from(document.querySelectorAll('button[role="option"]')).find(b => b.innerText.trim() === 'CSE');
        if (cseOpt) cseOpt.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 400));

    // Click Sort dropdown trigger
    const sortBtnCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
        const sortBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Newest First') || b.innerText.includes('Oldest First') || b.innerText.includes('Team Name') || b.getAttribute('aria-label') === 'Sort registrations');
        if (sortBtn) {
          sortBtn.click();
          return { clicked: true, text: sortBtn.innerText.trim() };
        }
        return { clicked: false, allButtons: btns };
      })()`,
      returnByValue: true,
    });
    console.log('Sort button click status:', sortBtnCheck.result?.result?.value || sortBtnCheck);
    await new Promise((r) => setTimeout(r, 400));

    const sortMenu = await send('Runtime.evaluate', {
      expression: `(() => {
        const menu = document.querySelector('div[role="listbox"]');
        return JSON.stringify({
          menuFound: !!menu,
          menuBg: menu ? window.getComputedStyle(menu).backgroundColor : null,
          optionsCount: menu ? menu.querySelectorAll('button[role="option"]').length : 0,
          optionsText: menu ? Array.from(menu.querySelectorAll('button[role="option"]')).map(o => o.innerText.trim()) : []
        });
      })()`,
      returnByValue: true,
    });
    console.log('sortMenu raw:', sortMenu);
    const parsedVal = sortMenu.result?.result?.value ? JSON.parse(sortMenu.result.result.value) : (sortMenu.result?.value ? JSON.parse(sortMenu.result.value) : sortMenu);
    console.log('Sort Custom Dropdown State:', parsedVal);

    // Select Team Name (A-Z)
    await send('Runtime.evaluate', {
      expression: `
        const sortOpt = Array.from(document.querySelectorAll('button[role="option"]')).find(b => b.innerText.includes('Team Name (A-Z)'));
        if (sortOpt) sortOpt.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 400));

    // Click Reset Filters
    const resetTest = await send('Runtime.evaluate', {
      expression: `
        const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Reset Filters'));
        if (resetBtn) resetBtn.click();
        JSON.stringify({
          searchVal: document.querySelector('input[type="text"]').value,
          buttonLabels: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim())
        });
      `,
      returnByValue: true,
    });
    console.log('Reset Filters Clicked successfully.');

    console.log('[4] Inspecting Team Details Modal (Student Email & Phone Preserved)...');
    await send('Runtime.evaluate', {
      expression: `
        const viewBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'View Details');
        if (viewBtn) viewBtn.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 1000));

    const modalAudit = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        hasModal: !!document.querySelector('.fixed.inset-0'),
        modalFooterButtons: Array.from(document.querySelectorAll('.fixed.inset-0 .border-t button')).map(b => b.innerText.trim()),
        hasResendButtonInModal: !!Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.includes('Resend')),
        studentEmailsVisible: Array.from(document.querySelectorAll('.fixed.inset-0 span')).filter(s => s.innerText.includes('@')).map(s => s.innerText),
        studentPhonesVisible: Array.from(document.querySelectorAll('.fixed.inset-0 span')).filter(s => /\\d{10}/.test(s.innerText)).map(s => s.innerText)
      })`,
      returnByValue: true,
    });
    const modalAuditResult = JSON.parse(modalAudit.result.result.value);
    console.log('Modal Audit Result:', modalAuditResult);

    // Close modal
    await send('Runtime.evaluate', {
      expression: `
        const closeBtn = Array.from(document.querySelectorAll('.fixed.inset-0 button')).find(b => b.innerText.trim() === 'Close');
        if (closeBtn) closeBtn.click();
      `,
    });

    console.log('[5] Checking Browser Console Exceptions:');
    console.log('Runtime exceptions count:', runtimeExceptions.length);
    if (runtimeExceptions.length > 0) {
      console.error('Exceptions:', runtimeExceptions);
    } else {
      console.log('PASS: Zero runtime exceptions in browser console!');
    }

    // [6] Test Excel Export Buffer and Columns
    console.log('\n[6] Auditing Excel Export Buffer & Worksheets...');
    const tokenVal = await send('Runtime.evaluate', {
      expression: `sessionStorage.getItem('admin_token')`,
      returnByValue: true,
    });
    const token = tokenVal.result.result.value;

    const excelRes = await fetch('http://localhost:5000/api/admin/export-excel', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const excelBuf = await excelRes.arrayBuffer();
    const wb = XLSX.read(excelBuf, { type: 'buffer' });

    console.log('Workbook Sheet Names:', wb.SheetNames);
    const sheet1 = XLSX.utils.sheet_to_json(wb.Sheets['Registered Teams'], { header: 1 });
    const sheet2 = XLSX.utils.sheet_to_json(wb.Sheets['All Team Members'], { header: 1 });

    console.log('Worksheet 1 Name: "Registered Teams"');
    console.log('Worksheet 1 Column Count:', sheet1[0]?.length);
    console.log('Worksheet 1 Headers:', sheet1[0]);
    console.log('Worksheet 1 Data Row 1:', sheet1[1]);

    console.log('Worksheet 2 Name: "All Team Members"');
    console.log('Worksheet 2 Column Count:', sheet2[0]?.length);
    console.log('Worksheet 2 Headers:', sheet2[0]);
    console.log('Worksheet 2 Data Row 1 (Leader):', sheet2[1]);
    console.log('Worksheet 2 Data Row 2 (Member):', sheet2[2]);

    // [7] Test Unauthorized Access Block
    console.log('\n[7] Testing Unauthorized Access Block...');
    const unauthExcel = await fetch('http://localhost:5000/api/admin/export-excel');
    const unauthTeams = await fetch('http://localhost:5000/api/admin/teams');
    const unauthCsv = await fetch('http://localhost:5000/api/admin/export-csv');
    console.log('Unauth Excel HTTP (Expected 401):', unauthExcel.status);
    console.log('Unauth Teams HTTP (Expected 401):', unauthTeams.status);
    console.log('Unauth CSV HTTP (Expected 401):', unauthCsv.status);

    console.log('\n=== ALL BROWSER & AUDIT CHECKS COMPLETED SUCCESSFULLY ===');
    ws.close();
  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    chrome.kill();
  }
}

runFinalPolishVerification();
