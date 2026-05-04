import puppeteer from 'puppeteer';
puppeteer.launch({ headless: true, args: ['--no-sandbox'] }).then(async browser => {
  const page = await browser.newPage();
  await page.goto("https://www.leadershiponline.co.za/magazine/326/mobile/", { waitUntil: 'networkidle2' });
  const html = await page.content();
  console.log(html.substring(0, 1000));
  
  // also extract span's text
  const text = await page.evaluate(() => document.body.innerText);
  console.log("TEXT EXTRACTED:", text.substring(0, 1000));

  await browser.close();
}).catch(console.error);
