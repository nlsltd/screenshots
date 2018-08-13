const args = process.argv;
const saveDir =
  args.indexOf("-o") > 0
    ? args[args.indexOf("-o") + 1]
    : `${process.cwd()}/png`;
const configFile =
  args.indexOf("-c") > 0
    ? args[args.indexOf("-c") + 1]
    : `${process.cwd()}/config.json`;
const puppeteer = require("puppeteer");
const fs = require("fs");
const wait = 4;

let defaults = {
  url: "http://localhost:3000",
  saveDir,
  pngPrefix: "screenshot_",
  viewPort: { width: 1920, height: 1080 }
};

console.log(configFile);
try {
  const config = require(configFile);
  if (config) {
    conf = { ...defaults, ...config };
  }
} catch (err) {
  exitGracefully(err);
}

function checkSaveLocation(dirname) {
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, 0766, function (err) {
      if (err) {
        console.log(err);
        response.send("ERROR! Cannot create the directory! \n");
      }
    });
  }
}

let counter = 1;

async function screenshots() {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport(conf.viewPort);
    await page.addScriptTag({ path: "./over.js" });
    await checkSaveLocation(conf.saveDir);
    try {
      await page.goto(conf.url);
    } catch (err) {
      await exitGracefully(err, browser);
    }
    //no transitions
    await page.$$eval("page *", function (eles) {
      eles.forEach(ele => {
        ele.style.animationDuration = "1ms";
        ele.style.animationDelay = 0;
        ele.style.transition = "all 1ms linear";
      });
    });
    //screensaver
    try {
      await page.click(conf.screensaver);
      await page.waitFor(wait);
      await doScreenshot(page);
    } catch (err) {
      console.log(`No node found for selector: ${conf.screensaver}`);
    }
    try {
      await doClicks(page);
    } catch (err) {
      console.log(err);
    }
    await browser.close();
  } catch (err) {
    await exitGracefully(err);
  }
}

screenshots();

async function doClicks(page) {
  if (conf.clicks.length > 0) {
    for (const click of conf.clicks) {
      if (typeof click === "string") {
        await page.click(click);
        await doScreenshot(page);
      } else {
        if (click.node) {
          console.log(click.node);
          await page.click(click.node);
        }
        if (click.wait) {
          await page.waitFor(click.wait);
        }
        if (!click.skip) {
          await doScreenshot(page);
        }
      }
    }
  } else {
    throw "you have not supplied c list of events.";
  }
}

async function doScreenshot(page) {
  await page.screenshot({
    path: `${conf.saveDir}/${conf.pngPrefix}${counter}.png`
  });
  console.log(`Saved: ${conf.pngPrefix}${counter}.png`);
  counter++;
}

async function exitGracefully(err, browser = false) {
  if (browser) {
    await browser.close;
    console.log(`${err}
  ${"\t"}screenshots terminated`);
    process.exit(1);
  } else {
    console.log(`${err}
  ${"\t"}screenshots terminated`);
    process.exit(1);
  }
}
