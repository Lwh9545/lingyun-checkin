import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:5173/#/settings', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 3000));

const result = await page.evaluate(() => {
  const r = [];

  // 1. All right-side controls height check
  r.push('=== 右侧控件高度检查 ===');
  const controls = document.querySelectorAll('.switch, .btn-secondary, .status-badge, .check-btn, .download-btn');
  const seen = new Set();
  controls.forEach((c, i) => {
    if (seen.has(c)) return;
    seen.add(c);
    const rect = c.getBoundingClientRect();
    const h = Math.round(rect.height);
    const w = Math.round(rect.width);
    const cls = c.className.substring(0, 30);
    r.push(`Ctrl${i}: h=${h}px w=${w}px class="${cls}"`);
  });

  // 2. Setting item vertical centering
  r.push('');
  r.push('=== 设置项垂直居中检查 ===');
  const items = document.querySelectorAll('.data-card .setting-item, .auto-card .setting-item');
  items.forEach((item, i) => {
    const label = item.querySelector('.setting-label-wrapper');
    const ctrl = item.querySelector('.switch, .btn-secondary, .status-badge');
    if (label && ctrl) {
      const lr = label.getBoundingClientRect();
      const cr = ctrl.getBoundingClientRect();
      const labelCenter = (lr.top + lr.bottom) / 2;
      const ctrlCenter = (cr.top + cr.bottom) / 2;
      const diff = Math.round(labelCenter - ctrlCenter);
      r.push(`Item${i}: labelCenter=${Math.round(labelCenter)} ctrlCenter=${Math.round(ctrlCenter)} diff=${diff}px`);
    }
  });

  // 3. Grid layout check
  r.push('');
  r.push('=== Grid布局检查 ===');
  const da = document.querySelector('.data-actions');
  if (da) {
    const cs = getComputedStyle(da);
    r.push(`display=${cs.display}, columns=${cs.gridTemplateColumns}`);
    const btns = da.querySelectorAll('.btn-secondary');
    btns.forEach((b, i) => {
      const rect = b.getBoundingClientRect();
      r.push(`Btn${i}: w=${Math.round(rect.width)}px h=${Math.round(rect.height)}px text="${b.textContent.trim()}"`);
    });
  }

  return r.join('\n');
});

console.log(result);

await browser.close();