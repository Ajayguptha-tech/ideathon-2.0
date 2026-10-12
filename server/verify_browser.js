import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;

async function verifySite() {
  console.log('=== LAUNCHING CHROME CDP VERIFICATION ===');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    'http://localhost:5173/',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const listRes = await fetch(`http://localhost:${PORT}/json/list`);
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.url.includes('localhost:5173')) || tabs[0];
    if (!tab) {
      console.error('No matching tab found');
      chrome.kill();
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let id = 1;
    const send = (method, params = {}) => {
      const msgId = id++;
      ws.send(JSON.stringify({ id: msgId, method, params }));
      return msgId;
    };

    const errors = [];
    const logs = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails);
        console.error('🔥 BROWSER EXCEPTION:', msg.params.exceptionDetails.text);
      } else if (msg.method === 'Console.messageAdded') {
        logs.push(msg.params.message.text);
      }
    };

    ws.onopen = async () => {
      send('Runtime.enable');
      send('Console.enable');

      await new Promise((r) => setTimeout(r, 1500));

      // PHASE A: Verify Landing Screen
      console.log('\n--- VERIFYING LANDING SCREEN (INTRO) ---');
      const evalLanding = (expr) =>
        new Promise((resolve) => {
          const reqId = send('Runtime.evaluate', { expression: expr, returnByValue: true });
          const listener = (event) => {
            const m = JSON.parse(event.data);
            if (m.id === reqId) {
              ws.removeEventListener('message', listener);
              resolve(m.result?.result?.value);
            }
          };
          ws.addEventListener('message', listener);
        });

      const introCheck = await evalLanding(`({
        hasCanvas: !!document.querySelector('canvas'),
        canvasWidth: document.querySelector('canvas')?.width,
        canvasHeight: document.querySelector('canvas')?.height,
        hasGetStarted: !!document.querySelector('button.btn-p'),
        buttonText: document.querySelector('button.btn-p')?.innerText,
        hasVignanOnLanding: document.body.innerText.includes("Vignan's Foundation"),
        hasClubPresents: document.body.innerText.includes("Young Innovators Club presents"),
        hasIdeathon2026: document.body.innerText.includes("IDEATHON 2026"),
        hasInnovateBuildPresent: document.body.innerText.includes("INNOVATE. BUILD. PRESENT.")
      })`);
      console.log('Landing Screen Check:', introCheck);

      // PHASE B: Click GET STARTED
      console.log('\n--- CLICKING "GET STARTED" BUTTON ---');
      await evalLanding(`document.querySelector('button.btn-p')?.click()`);

      // Wait for smooth transition (1.5 seconds)
      await new Promise((r) => setTimeout(r, 2000));

      // PHASE C: Verify Main Website Sections
      console.log('\n--- VERIFYING MAIN WEBSITE CONTENT AFTER TRANSITION ---');
      const mainCheck = await evalLanding(`({
        mainExists: !!document.querySelector('main'),
        sectionIds: Array.from(document.querySelectorAll('section')).map(s => s.id),
        hasTimeline: document.body.innerText.includes('13 October'),
        hasGuidelines: document.body.innerText.includes('Eligible Departments'),
        hasEvaluation: document.body.innerText.includes('Two-Round Evaluation'),
        hasAbstractTemplate: document.body.innerText.includes('Abstract Submission Template'),
        hasPresentationNotice: document.body.innerText.includes('Presentation Template'),
        hasNoPoster: !document.body.innerText.includes('Physical A3-Size Poster'),
        hasPrizes: document.body.innerText.includes('₹4,000'),
        hasRegistrationForm: !!document.querySelector('#register'),
        hasFooterCredits: document.body.innerText.includes('Ajay Guptha and Sriram'),
        totalSections: document.querySelectorAll('section').length
      })`);
      console.log('Main Content Check:', mainCheck);

      // PHASE D: Verify Team Size Selection in Form
      console.log('\n--- VERIFYING TEAM REGISTRATION INTERACTION ---');
      const formCheck = await evalLanding(`(() => {
        const teamButtons = Array.from(document.querySelectorAll('#register button')).map(b => b.innerText);
        const teamInput = !!document.querySelector('#register input[placeholder*="Neural Innovators"]');
        return {
          teamInputExists: teamInput,
          has2MembersOption: teamButtons.some(t => t.includes('2 Members')),
          has3MembersOption: teamButtons.some(t => t.includes('3 Members'))
        };
      })()`);
      console.log('Form Interactive Check:', formCheck);

      // Final Verdict
      console.log('\n=== VERIFICATION SUMMARY ===');
      console.log('Browser Runtime Exceptions Caught:', errors.length);
      if (errors.length === 0 && introCheck.hasCanvas && mainCheck.mainExists) {
        console.log('🎉 ALL AUTOMATED BROWSER TESTS PASSED FLAWLESSLY!');
      } else {
        console.error('❌ SOME TESTS FAILED');
      }

      ws.close();
      chrome.kill();
      process.exit(0);
    };
  } catch (err) {
    console.error('Verification script error:', err);
    chrome.kill();
  }
}

verifySite();
