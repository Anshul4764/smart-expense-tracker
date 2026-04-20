
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const financePath = path.join(__dirname, "..", "routes", "finance.js");
const portfolioPath = path.join(__dirname, "..", "routes", "portfolio.js");
const serverPath = path.join(__dirname, "..", "server.js");

assert(fs.existsSync(financePath), "finance route should exist");
assert(fs.existsSync(portfolioPath), "portfolio route should exist");
assert(fs.existsSync(serverPath), "server file should exist");

console.log("Smoke test passed");
