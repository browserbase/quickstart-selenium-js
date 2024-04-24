import http from "http";
import webdriver from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

let sessionId: string;

async function createSession() {
  const response = await fetch(`https://www.browserbase.com/v1/sessions`, {
    method: "POST",
    headers: {
      'x-bb-api-key': `${process.env.BROWSERBASE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId: process.env.BROWSERBASE_PROJECT_ID,
    }),
  });
  const json = await response.json();
  return json;
}

async function retrieveDebugConnectionURL(sessionId: string) {
  const response = await fetch(
    `https://www.browserbase.com/v1/sessions/${sessionId}/debug`,
    {
      method: "GET",
      headers: {
        'x-bb-api-key': `${process.env.BROWSERBASE_API_KEY}`,
      },
    },
  );
  const json = await response.json();
  return json.debuggerFullscreenUrl;
}

(async () => {
  const { id } = await createSession();
  sessionId = id;

  console.log("Starting remote browser...")

  const customHttpAgent = new http.Agent({});
  (customHttpAgent as any).addRequest = (req: any, options: any) => {
    // Session ID needs to be set here
    req.setHeader("session-id", id);
    req.setHeader("x-bb-api-key", process.env.BROWSERBASE_API_KEY);
    (http.Agent.prototype as any).addRequest.call(customHttpAgent, req, options);
  };

  const options = new chrome.Options();
  // We set a debuggerAddress so the server-side WebDriver can connect to Browserbase.
  options.debuggerAddress("localhost:9223");

  // Selenium only supports HTTP
  const driver = new webdriver.Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .usingHttpAgent(customHttpAgent)
    .usingServer(
      `http://connect.browserbase.com/webdriver`
    )
    .build();

  await driver.get("https://www.browserbase.com");

  const debugUrl = await retrieveDebugConnectionURL(sessionId);
  console.log(`Session started, live debug accessible here: ${debugUrl}.`);

  console.log("Taking a screenshot!")
  await driver.takeScreenshot()

  console.log("Shutting down...")
  await driver.quit();
})().catch((error) => {
  console.log(
    `Session failed, replay is accessible here: https://www.browserbase.com/sessions/${sessionId}.`,
  );
  console.error(error.message);
});