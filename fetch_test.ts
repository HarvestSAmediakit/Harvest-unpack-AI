import * as cheerio from "cheerio";
fetch("https://www.leadershiponline.co.za/magazine/326/mobile/").then(r => r.text()).then(t => {
  const $ = cheerio.load(t);
  console.log($("body").text().substring(0, 1000));
});
