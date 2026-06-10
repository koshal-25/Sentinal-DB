const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure().errorText));

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  
  // Login
  const inputs = await page.$$('input');
  await inputs[0].type('admin01');
  await inputs[1].type('Demo@1234');
  await page.click('button[type="submit"]');

  // Wait for redirect and potential crash
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
})();
