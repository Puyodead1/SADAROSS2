const puppeteer = require("puppeteer"),
  fs = require("fs"),
  agents = require("browser-agents"),
  links = require("./data/links");

const keywords = [
  "contact support",
  "has been locked",
  "has been blocked",
  "call apple support",
  "microsoft warning alert",
  "call us immediately",
  "microsoft toll free",
  "do not ignore",
  "do not ignore this critical error",
  "access will be disabled",
  "prevent further damage",
  "prevent further damage to our network",
  "alerted us that it has been infected",
  "infected with pornographic spyware",
  "information is being stolen",
  "prevent your computer from being disabled",
  "windows was blocked",
  "call for support",
  "malicious pornographic spyware",
  "riskware detected",
  "error # 0x",
  "do not ignore this critical alert",
  "expert engineers can walk you through the removal process",
  "over the phone to protect your identity",
  "or from any information loss"
];

// const links = [
//   "gmil.com",
//   "cortexoverlayer.xyz",
//   "youtuber.com",
//   "uoutube.com",
//   "outube.com",
//   "flacebook.com",
//   "ggmail.com",
//   "goooogle.com",
//   "fastsuppirt.com"
// ];

/**
 * Get current date and time
 */
async function getDateTime() {
  let date = new Date();

  let hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + hour;

  let min = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;

  let sec = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;

  let year = date.getFullYear();

  let month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;

  let day = date.getDate();
  day = (day < 10 ? "0" : "") + day;

  return year + "-" + month + "-" + day + "-" + hour + "-" + min + "-" + sec;
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 * @author https://stackoverflow.com/a/6274381
 */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function init() {
  const regex = new RegExp(keywords.join("|"));
  const shuffled_links = shuffle(links);
  const browser = await puppeteer.launch({
    /**
     * Required on linux systems in headless mode
     */
    args: ["--no-sandbox"],
    /**
     * headless sets whether a browser page is displayed or not
     * set to false to see a browser window
     * set to true to run invisible
     */
    headless: false
  });
  for (link of shuffled_links) {
    link = `http://${link}`;
    const page = await browser.newPage();
    await page.setUserAgent(agents.random());
    await page.setViewport({
      width: 1920,
      height: 1080
    });
    try {
      await page.goto(link);
    } catch (err) {
      console.error(err.message);
      await page.close();
      continue;
    }

    try {
      await page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: 1000
      });
    } catch (err) {
      await page.keyboard.press("Escape");
    }

    await page.on("dialog", d => {
      d.dismiss();
    });

    try {
      const page_data = await page.content();

      // if (regex.test(page_data.toLowerCase())) {
      //   console.log(`One or more matches for site: ${await page.url()}`);
      // }

      const matches = page_data.toLowerCase().match(regex);
      if (matches) {
        console.log(
          `Matched Keyword for site: ${await page.url()}; keyword: ${
            matches[0]
          }`
        );
        await page.screenshot({
          path: `./images/${await getDateTime()}.png`
        });
      }
    } catch (err) {
      console.error(err.message);
      await page.close();
      continue;
    }

    await page.close();
  }
}

init();
