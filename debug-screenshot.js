const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5173/#/settings');
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'C:/Users/10983/Desktop/灵韵打卡/DEBUG-screenshot.png', fullPage: true });

  // Get positions
  const data = await page.evaluate(() => {
    const results = [];

    // All switches
    document.querySelectorAll('.switch').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const parent = el.closest('.time-row, .setting-item');
      let parentInfo = 'no-parent';
      if (parent) {
        const pr = parent.getBoundingClientRect();
        const label = parent.querySelector('.time-label, .setting-label');
        if (label) {
          const lr = label.getBoundingClientRect();
          parentInfo = `labelTop=${Math.round(lr.top)} labelBottom=${Math.round(lr.bottom)} labelCenter=${Math.round((lr.top+lr.bottom)/2)} parentTop=${Math.round(pr.top)} parentHeight=${Math.round(pr.height)}`;
        }
      }
      results.push(`SWITCH${i}: top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} center=${Math.round((r.top+r.bottom)/2)} height=${Math.round(r.height)} left=${Math.round(r.left)} right=${Math.round(r.right)} | ${parentInfo}`);
    });

    // All inputs
    document.querySelectorAll('.time-input, .number-input').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      results.push(`INPUT${i}: top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} center=${Math.round((r.top+r.bottom)/2)} height=${Math.round(r.height)} left=${Math.round(r.left)}`);
    });

    // All buttons
    document.querySelectorAll('.btn-secondary, .btn-confirm, .btn-cancel').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      results.push(`BTN${i}: top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} center=${Math.round((r.top+r.bottom)/2)} height=${Math.round(r.height)} left=${Math.round(r.left)} text="${el.textContent.trim().substring(0,20)}"`);
    });

    // All badges
    document.querySelectorAll('.status-badge').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      results.push(`BADGE${i}: top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} center=${Math.round((r.top+r.bottom)/2)} height=${Math.round(r.height)} left=${Math.round(r.left)}`);
    });

    // All cards
    document.querySelectorAll('.settings-card').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      results.push(`CARD${i}: left=${Math.round(r.left)} right=${Math.round(r.right)} width=${Math.round(r.width)}`);
    });

    return results.join('\n');
  });

  fs.writeFileSync('C:/Users/10983/Desktop/灵韵打卡/DEBUG-data.txt', data);
  console.log('Data written to DEBUG-data.txt');
  console.log(data);

  await browser.close();
})();
