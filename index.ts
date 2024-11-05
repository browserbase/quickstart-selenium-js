import http from "http";
import { Builder } from "selenium-webdriver";
import Browserbase from "@browserbasehq/sdk";

const PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;
const API_KEY = process.env.BROWSERBASE_API_KEY;

if (!API_KEY) {
  throw new Error("BROWSERBASE_API_KEY is not set");
}

if (!PROJECT_ID) {
  throw new Error("BROWSERBASE_PROJECT_ID is not set");
}

const bb = new Browserbase({
  apiKey: API_KEY,
});

const session = await bb.sessions.create({
  projectId: PROJECT_ID,
});
console.log(`Session created, id: ${session.id}`);

console.log("Starting remote browser...");

const customHttpAgent = new http.Agent({});
(customHttpAgent as any).addRequest = (req: any, options: any) => {
  // Session ID needs to be set here
  req.setHeader("x-bb-signing-key", session.signingKey);
  (http.Agent.prototype as any).addRequest.call(customHttpAgent, req, options);
};

// Selenium only supports HTTP
const driver = new Builder()
  .forBrowser("chrome")
  .usingHttpAgent(customHttpAgent)
  .usingServer(session.seleniumRemoteUrl)
  .build();

await driver.get("https://www.browserbase.com");

const debugUrl = await bb.sessions.debug(session.id);
console.log(
  `Session started, live debug accessible here: ${debugUrl.debuggerUrl}.`,
);

console.log("Taking a screenshot!");
await driver.takeScreenshot();

console.log("Shutting down...");
await driver.quit();

console.log(
  `Session complete! View replay at https://browserbase.com/sessions/${session.id}`,
);

