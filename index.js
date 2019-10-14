const puppeteer = require("puppeteer"),
  fs = require("fs"),
  links = require("./data/links"),
  config = require("./config"),
  keywords = require("./data/keywords"),
  agents = require("browser-agents");

let useragents = [];

/**
 * Catch any unhandled rejection errors
 */
process.on("unhandledRejection", err => {
  console.error(err);
});

/**
 * Catch any uncought exeption errors
 */
process.on("uncaughtException", err => {
  console.error(err);
});

/**
 * Sleep function
 * @param time (in ms)
 */
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

/**
 * Logs to normal log file
 * @param {string} message
 */
async function log(message) {
  const time = await getDateTime();
  fs.appendFile("./logs/log.log", `[${time}] ` + message + "\n", err => {
    if (err) throw err;
  });
}

/**
 * Logs to scanned url log file
 * @param {string} message
 */
async function logURL(message) {
  const time = await getDateTime();
  fs.appendFile(
    "./logs/scanned-urls.log",
    `[${time}] ` + message + "\n",
    err => {
      if (err) throw err;
    }
  );
}

/**
 * Checks if logs directory exists, creates if not
 */
function check_log_dir() {
  if (!fs.existsSync("./logs")) {
    log("Log directory not found! Creating...");
    fs.mkdir("./logs", err => {
      if (err) {
        log("Failed to create log directory! " + err.message);
        throw err;
      } else log("Log directory created!");
    });
  }
}

async function main() {
  // make sure logs folder exists
  check_log_dir();

  // shuffle links list
  const shuffled_links = await shuffle(links);

  // Initalize Browser
  const browser = await puppeteer.launch({
    args: ["--no-sandbox"], // Required on linux systems using headless mode
    headless: config.HEADLESS
  });

  // keep track of iterations (used for changing user agent)
  let iterations = 0;

  // loop links
  for (link of shuffled_links) {
    // append http to the links so puppeteer can go to them
    link = `http://${link}`;

    // Initalize Page
    const page = await browser.newPage();

    // Catch page errors
    // page.on("error", err => {
    //   throw err;
    // });
    // page.on("pageerror", err => {
    //   throw err;
    // });

    // Set custom user agent
    if (iterations >= 5) {
      await page.setUserAgent(agents.random());
      iterations = 0;
      console.log("new useragent set.");
    } else {
      await page.setUserAgent(agents.random());
    }

    // set size (used for when images are taken)
    await page.setViewport({
      width: 1920,
      height: 1080
    });

    // Go to link, catch errors
    try {
      await page.goto(link).then(() => {
        iterations++;
      });
    } catch (err) {
      // This is for all other general errors to catch and log
      if (err) {
        console.error(`[${link}] ${err.message}`);
        log(`[${link}] ${err.message}`);
        await page.close();
        continue;
      }
    }

    // First blacklist check BEFORE Redirection
    let domain = await page.url().split("/")[2];
    for (blacklisted_domain of config.BLACKLIST) {
      if (domain.includes(blacklisted_domain)) {
        console.log(`[${domain}] Domain is blacklisted! Skipping! 1`);
        log(`[${domain}] Domain is blacklisted! Skipping!`);
        await page.close();
        continue;
      }
    }

    // Sleep
    if (!page.isClosed()) {
      await sleep(15000);
    }

    // wait for page navigation (wait for load complete)
    // try {
    //   await page.waitForNavigation({
    //     waitUntil: "networkidle2",
    //     timeout: 15000
    //   });
    // } catch (err) {
    //   if (err) {
    //     console.error(`[${link}] ${err.message}`);
    //     log(`[${link}] ${err.message}`);
    //     continue;
    //   }
    // }

    // Black list check AFTER redirections
    // let domain = await page.url().split(".");
    let domain1 = await page.url().split("/")[2];
    for (blacklisted_domain of config.BLACKLIST) {
      if (domain1.includes(blacklisted_domain)) {
        console.log(`[${domain1}] Domain is blacklisted! Skipping! 2`);
        log(`[${domain1}] Domain is blacklisted! Skipping!`);
        continue;
      }
    }

    // Write to log file
    logURL(`Original Link: ${link}; Final URL: ${await page.url()}`);

    try {
      const page_data = await page.content();
      for (var category in keywords) {
        let category_keywords = keywords[category];
        for (keyword of category_keywords) {
          // const regex = new RegExp(`/ ${keyword} /gi`);
          // const matches = page_data.match(regex);
          // if (matches) {
          //   console.log(
          //     `[${await page.url()}] POSSIBLE MATCH; Keyword: ${keyword}; Category: ${category}; Matches: ${matches}`
          //   );
          // }
          if (page_data.toLowerCase().includes(` ${keyword} `)) {
            console.log(
              `[${await page.url()}] POSSIBLE MATCH; Keyword: ${keyword}; Category: ${category}`
            );
            await page.screenshot({
              path: `./images/${await getDateTime()}.png`
            });
          }
        }
      }
    } catch (err) {
      if (err) {
        console.error(`[${link}] ${err.message}`);
        log(`[${link}] ${err.message}`);
        try {
          await page.close();
        } catch (err) {
          console.error(`[${link}] ${err.message}`);
          log(`[${link}] ${err.message}`);
        }
        continue;
      }
    }

    // Close page
    try {
      await page.close();
    } catch (err) {
      if (err) {
        console.error(`[${link}] ${err.message}`);
        log(`[${link}] ${err.message}`);
        await page.close();
        continue;
      }
    }
  }
}

main();
