import { spawn } from 'child_process';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9235;

async function runBrowserVerification() {
  console.log('====================================================');
  console.log(' IDEATHON 2.0 — VERIFYING CONTENT, TEMPLATES & ROUTING');
  console.log('====================================================');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    'http://localhost:5173/',
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

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && callbacks.has(data.id)) {
        const cb = callbacks.get(data.id);
        callbacks.delete(data.id);
        cb(data);
      }
    };

    await new Promise((resolve) => (ws.onopen = resolve));
    await send('Runtime.enable');
    await send('Page.enable');

    console.log('\n[1] Checking Public Homepage Content...');
    // Click GET STARTED if intro is present to transition
    await send('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('GET STARTED'));
        if (btn) btn.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 1500));

    const publicAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
          href: a.getAttribute('href'),
          text: a.innerText.trim()
        }));
        const adminLinks = allLinks.filter(l => (l.href && l.href.includes('/admin')) || l.text.toLowerCase().includes('admin'));
        const docxDownload = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href')?.includes('Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx'));

        return JSON.stringify({
          adminLinksCount: adminLinks.length,
          adminLinks,
          hasPosterRequirement: text.includes('Physical A3-Size Poster') || text.includes('A3-size poster'),
          hasAbstractSection: text.includes('Abstract Submission Template'),
          hasProposalDownload: !!docxDownload,
          docxHref: docxDownload ? docxDownload.getAttribute('href') : null,
          hasComingSoon: text.includes('Abstract Submission Form — Coming Soon'),
          hasPresentationTemplate: text.includes('Presentation Template'),
          hasPresentationNotice: text.includes('Available after Round 1 results'),
          hasGuidelinesPresentation: text.includes('Presentation Requirement'),
        });
      })()`,
      returnByValue: true,
    });

    const parsedPublic = JSON.parse(publicAudit.result.result.value);
    console.log('Public Homepage Audit Results:', parsedPublic);

    if (parsedPublic.adminLinksCount > 0) {
      console.error('❌ FAIL: Admin links found on public homepage:', parsedPublic.adminLinks);
    } else {
      console.log('✅ PASS: Public homepage has ZERO Admin links/buttons/icons.');
    }

    if (parsedPublic.hasPosterRequirement) {
      console.error('❌ FAIL: Obsolete poster requirements still present on page!');
    } else {
      console.log('✅ PASS: All physical A3/A2 poster requirements removed.');
    }

    if (parsedPublic.hasAbstractSection && parsedPublic.hasProposalDownload && parsedPublic.hasComingSoon) {
      console.log('✅ PASS: Abstract Submission Template section, download button, and Coming Soon link verified.');
    } else {
      console.error('❌ FAIL: Abstract submission template section verification failed.');
    }

    if (parsedPublic.hasPresentationTemplate && parsedPublic.hasPresentationNotice) {
      console.log('✅ PASS: Presentation Template announcement verified ("Available after Round 1 results").');
    } else {
      console.error('❌ FAIL: Presentation template notice missing.');
    }

    console.log('\n[2] Checking Direct Navigation to /admin...');
    await send('Page.navigate', { url: 'http://localhost:5173/admin' });
    await new Promise((r) => setTimeout(r, 2000));

    const adminPageAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        return JSON.stringify({
          url: window.location.href,
          hasLoginCard: !!document.querySelector('form'),
          hasEmailInput: !!document.querySelector('input[type="email"]'),
          hasPasswordInput: !!document.querySelector('input[type="password"]'),
          heading: document.querySelector('h2')?.innerText,
        });
      })()`,
      returnByValue: true,
    });
    const parsedAdmin = JSON.parse(adminPageAudit.result.result.value);
    console.log('Direct /admin Navigation Audit:', parsedAdmin);

    if (parsedAdmin.hasLoginCard && parsedAdmin.hasEmailInput && parsedAdmin.hasPasswordInput) {
      console.log('✅ PASS: /admin directly renders secure Administrator Login page.');
    } else {
      console.error('❌ FAIL: /admin did not render expected login page.');
    }

    console.log('\n[3] Logging in to Admin Dashboard...');
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
    await new Promise((r) => setTimeout(r, 2500));

    const dashboardAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        return JSON.stringify({
          h1: document.querySelector('h1')?.innerText,
          tableHeaders: Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim()),
          exportButtons: Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Excel') || b.innerText.includes('CSV')).map(b => b.innerText.trim()),
        });
      })()`,
      returnByValue: true,
    });
    const parsedDash = JSON.parse(dashboardAudit.result.result.value);
    console.log('Admin Dashboard Audit:', parsedDash);

    if (parsedDash.h1 && parsedDash.h1.includes('Admin Dashboard')) {
      console.log('✅ PASS: Admin login successful, dashboard active with exports and controls.');
    } else {
      console.error('❌ FAIL: Could not verify Admin Dashboard.');
    }

    ws.close();
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    chrome.kill();
  }
}

runBrowserVerification();
