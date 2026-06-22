const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const DATABASE_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(ROOT, "server-data.json");
const DATABASE_DIR = path.dirname(DATABASE_PATH);
const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL).replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_STATE_ID = cleanEnv(process.env.SUPABASE_STATE_ID) || "grracing";
const MAX_BODY_BYTES = 1024 * 1024;
const resetTokens = new Map();
const eventClients = new Set();
let mutationQueue = Promise.resolve();

function cleanEnv(value){
  return String(value === null || value === undefined ? "" : value).trim();
}

function emptyDatabase(){
  return { version:1, accounts:[], sessions:[], orders:[] };
}

async function supabaseRequest(pathname, options = {}){
  const response = await fetch(`${SUPABASE_URL}/rest/v1${pathname}`, {
    method:options.method || "GET",
    headers:Object.assign({
      "apikey":SUPABASE_SERVICE_ROLE_KEY,
      "Authorization":`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type":"application/json"
    }, options.headers || {}),
    body:options.body
  });

  const text = await response.text();
  let data = null;

  try{
    data = text ? JSON.parse(text) : null;
  }catch(error){
    data = text;
  }

  if(!response.ok){
    const message = data && data.message ? data.message : `Supabase request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function loadDatabase(){
  if(USE_SUPABASE){
    const rows = await supabaseRequest(`/app_state?id=eq.${encodeURIComponent(SUPABASE_STATE_ID)}&select=data`);
    const database = rows && rows[0] && rows[0].data ? rows[0].data : emptyDatabase();

    return {
      version:1,
      accounts:Array.isArray(database.accounts) ? database.accounts : [],
      sessions:Array.isArray(database.sessions) ? database.sessions : [],
      orders:Array.isArray(database.orders) ? database.orders : []
    };
  }

  try{
    const parsed = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
    return {
      version:1,
      accounts:Array.isArray(parsed.accounts) ? parsed.accounts : [],
      sessions:Array.isArray(parsed.sessions) ? parsed.sessions : [],
      orders:Array.isArray(parsed.orders) ? parsed.orders : []
    };
  }catch(error){
    const database = emptyDatabase();
    await saveDatabase(database);
    return database;
  }
}

async function saveDatabase(database){
  if(USE_SUPABASE){
    await supabaseRequest("/app_state", {
      method:"POST",
      headers:{
        "Prefer":"resolution=merge-duplicates"
      },
      body:JSON.stringify({
        id:SUPABASE_STATE_ID,
        data:database,
        updated_at:new Date().toISOString()
      })
    });
    return;
  }

  fs.mkdirSync(DATABASE_DIR, { recursive:true });
  const temporaryPath = `${DATABASE_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(database, null, 2), "utf8");
  fs.renameSync(temporaryPath, DATABASE_PATH);
}

function databaseStatus(){
  return {
    backend:USE_SUPABASE ? "supabase" : "file",
    supabaseConfigured:USE_SUPABASE,
    configuredPath:Boolean(process.env.DATABASE_PATH),
    persistentPath:DATABASE_PATH.startsWith(`${path.sep}var${path.sep}data${path.sep}`),
    exists:fs.existsSync(DATABASE_PATH)
  };
}

function clean(value){
  return String(value === null || value === undefined ? "" : value).trim();
}

function normalizeUsername(value){
  return clean(value).toLowerCase();
}

function normalizeSsm(value){
  return clean(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizePhone(value){
  return clean(value).replace(/\D/g, "");
}

function validPhone(value){
  return /^60\d{8,10}$/.test(normalizePhone(value));
}

function normalizeCustomerCode(value){
  return clean(value).toUpperCase();
}

function passwordHash(password, salt){
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function passwordMatches(password, account){
  const receivedHash = account.passwordAlgorithm === "legacy-sha256"
    ? crypto.createHash("sha256").update(`${account.passwordSalt}:${password}`).digest("hex")
    : passwordHash(password, account.passwordSalt);
  const received = Buffer.from(receivedHash, "hex");
  const expected = Buffer.from(account.passwordHash, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function publicAccount(account){
  return {
    id:account.id,
    customerCode:account.customerCode || "",
    companyName:account.companyName,
    ssmNumber:account.ssmNumber,
    tinNumber:account.tinNumber,
    businessAddress1:account.businessAddress1,
    businessAddress2:account.businessAddress2,
    businessAddress3:account.businessAddress3,
    whatsappNumber:account.whatsappNumber,
    contactPerson:account.contactPerson,
    contactNumber:account.contactNumber,
    username:account.username,
    createdAt:account.createdAt
  };
}

function json(response, status, body){
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type":"application/json; charset=utf-8",
    "Content-Length":Buffer.byteLength(payload),
    "Cache-Control":"no-store",
    "Access-Control-Allow-Origin":"*"
  });
  response.end(payload);
}

function readJson(request){
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if(Buffer.byteLength(body) > MAX_BODY_BYTES){
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try{
        resolve(body ? JSON.parse(body) : {});
      }catch(error){
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });
}

function getBearerToken(request){
  const header = clean(request.headers.authorization);
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function getSessionContext(request, database){
  const token = getBearerToken(request);
  if(!token) return null;

  const session = database.sessions.find(item => item.token === token);
  if(!session) return null;

  const account = database.accounts.find(item => item.id === session.accountId);
  if(!account) return null;

  return { token, session, account };
}

function enqueueMutation(task){
  const queued = mutationQueue.then(task, task);
  mutationQueue = queued.catch(() => {});
  return queued;
}

function requireSession(request, response, database){
  const context = getSessionContext(request, database);
  if(!context){
    json(response, 401, { error:"Please log in again." });
    return null;
  }
  return context;
}

function broadcast(type, payload){
  const packet = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for(const client of eventClients){
    try{
      client.write(packet);
    }catch(error){
      eventClients.delete(client);
    }
  }
}

function cleanExpiredResetTokens(){
  const now = Date.now();
  for(const [token, entry] of resetTokens){
    if(entry.expiresAt <= now) resetTokens.delete(token);
  }
}

function mimeType(filePath){
  const extension = path.extname(filePath).toLowerCase();
  return ({
    ".html":"text/html; charset=utf-8",
    ".js":"text/javascript; charset=utf-8",
    ".css":"text/css; charset=utf-8",
    ".json":"application/json; charset=utf-8",
    ".webmanifest":"application/manifest+json; charset=utf-8",
    ".png":"image/png",
    ".jpg":"image/jpeg",
    ".jpeg":"image/jpeg",
    ".pdf":"application/pdf"
  })[extension] || "application/octet-stream";
}

function serveStatic(request, response, url){
  let relativePath = decodeURIComponent(url.pathname);
  if(relativePath === "/") relativePath = "/index.html";

  const filePath = path.resolve(ROOT, `.${relativePath}`);
  if(!filePath.startsWith(`${ROOT}${path.sep}`) && filePath !== path.join(ROOT, "index.html")){
    json(response, 403, { error:"Forbidden." });
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if(error || !stats.isFile()){
      json(response, 404, { error:"File not found." });
      return;
    }

    response.writeHead(200, {
      "Content-Type":mimeType(filePath),
      "Cache-Control":"no-store, no-cache, must-revalidate",
      "Pragma":"no-cache",
      "Expires":"0"
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

async function handleApi(request, response, url){
  const database = await loadDatabase();
  const method = request.method || "GET";
  const pathname = url.pathname;

  if(method === "GET" && pathname === "/api/health"){
    json(response, 200, {
      ok:true,
      serverTime:new Date().toISOString(),
      database:databaseStatus()
    });
    return;
  }

  if(method === "GET" && pathname === "/api/events"){
    response.writeHead(200, {
      "Content-Type":"text/event-stream",
      "Cache-Control":"no-cache",
      "Connection":"keep-alive",
      "Access-Control-Allow-Origin":"*"
    });
    response.write(`event: connected\ndata: ${JSON.stringify({ serverTime:new Date().toISOString() })}\n\n`);
    eventClients.add(response);
    request.on("close", () => eventClients.delete(response));
    return;
  }

  if(method === "POST" && pathname === "/api/signup"){
    const body = await readJson(request);
    const companyName = clean(body.companyName);
    const ssmNumber = clean(body.ssmNumber);
    const ssmKey = normalizeSsm(ssmNumber);
    const tinNumber = clean(body.tinNumber);
    const businessAddress1 = clean(body.businessAddress1);
    const businessAddress2 = clean(body.businessAddress2);
    const businessAddress3 = clean(body.businessAddress3);
    const whatsappNumber = normalizePhone(body.whatsappNumber);
    const contactPerson = clean(body.contactPerson);
    const contactNumber = normalizePhone(body.contactNumber);
    const username = clean(body.username);
    const usernameKey = normalizeUsername(username);
    const password = String(body.password || "");

    if(!companyName || !ssmKey || !tinNumber || !businessAddress1 || !businessAddress2 || !businessAddress3 || !whatsappNumber || !contactPerson || !contactNumber || !usernameKey || !password){
      json(response, 400, { error:"Please complete every field." });
      return;
    }
    if(!validPhone(whatsappNumber)){
      json(response, 400, { error:"Please enter a valid WhatsApp number. Example: 60123456789" });
      return;
    }
    if(!validPhone(contactNumber)){
      json(response, 400, { error:"Please enter a valid contact number. Example: 60123456789" });
      return;
    }
    if(database.accounts.some(account => account.usernameKey === usernameKey)){
      json(response, 409, { error:"This username is already registered." });
      return;
    }
    if(database.accounts.some(account => account.whatsappNumber === whatsappNumber)){
      json(response, 409, { error:"This WhatsApp number is already registered." });
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const account = {
      id:crypto.randomUUID(),
      customerCode:"",
      companyName,
      ssmNumber,
      ssmKey,
      tinNumber,
      businessAddress1,
      businessAddress2,
      businessAddress3,
      whatsappNumber,
      contactPerson,
      contactNumber,
      username,
      usernameKey,
      passwordSalt:salt,
      passwordHash:passwordHash(password, salt),
      passwordAlgorithm:"scrypt",
      createdAt:new Date().toISOString()
    };
    database.accounts.push(account);
    await saveDatabase(database);
    broadcast("accounts", { action:"created", account:publicAccount(account) });
    json(response, 201, { account:publicAccount(account) });
    return;
  }

  if(method === "POST" && pathname === "/api/import-local-accounts"){
    const body = await readJson(request);
    const incoming = Array.isArray(body.accounts) ? body.accounts : [];
    let imported = 0;

    for(const item of incoming){
      const companyName = clean(item.companyName);
      const ssmNumber = clean(item.ssmNumber);
      const ssmKey = normalizeSsm(ssmNumber);
      const tinNumber = clean(item.tinNumber);
      const businessAddress1 = clean(item.businessAddress1);
      const businessAddress2 = clean(item.businessAddress2);
      const businessAddress3 = clean(item.businessAddress3);
      const whatsappNumber = normalizePhone(item.whatsappNumber);
      const contactPerson = clean(item.contactPerson);
      const contactNumber = normalizePhone(item.contactNumber);
      const username = clean(item.username);
      const usernameKey = normalizeUsername(username);
      const passwordSalt = clean(item.passwordSalt);
      const importedHash = clean(item.passwordHash);
      const plainPassword = String(item.password || "");
      let accountSalt = passwordSalt;
      let accountHash = importedHash;
      let accountAlgorithm = "legacy-sha256";

      if(
        !companyName || !ssmKey || !validPhone(whatsappNumber) || !usernameKey
      ){
        continue;
      }

      if(plainPassword){
        accountSalt = crypto.randomBytes(16).toString("hex");
        accountHash = passwordHash(plainPassword, accountSalt);
        accountAlgorithm = "scrypt";
      }else if(!passwordSalt || !/^[a-f0-9]{64}$/i.test(importedHash)){
        continue;
      }

      if(database.accounts.some(account =>
        account.usernameKey === usernameKey || account.whatsappNumber === whatsappNumber
      )){
        continue;
      }

      database.accounts.push({
        id:crypto.randomUUID(),
        customerCode:clean(item.customerCode),
        companyName,
        ssmNumber,
        ssmKey,
        tinNumber,
        businessAddress1,
        businessAddress2,
        businessAddress3,
        whatsappNumber,
        contactPerson,
        contactNumber,
        username,
        usernameKey,
        passwordSalt:accountSalt,
        passwordHash:accountHash,
        passwordAlgorithm:accountAlgorithm,
        createdAt:clean(item.createdAt) || new Date().toISOString()
      });
      imported += 1;
    }

    if(imported > 0){
      await saveDatabase(database);
      broadcast("accounts", { action:"imported", count:imported });
    }
    json(response, 200, { imported });
    return;
  }

  if(method === "POST" && pathname === "/api/login"){
    const body = await readJson(request);
    const usernameKey = normalizeUsername(body.username);
    const password = String(body.password || "");
    const account = database.accounts.find(item => item.usernameKey === usernameKey);

    if(!account || !password || !passwordMatches(password, account)){
      json(response, 401, { error:"Username or password is incorrect." });
      return;
    }

    if(account.passwordAlgorithm === "legacy-sha256"){
      const upgradedSalt = crypto.randomBytes(16).toString("hex");
      account.passwordSalt = upgradedSalt;
      account.passwordHash = passwordHash(password, upgradedSalt);
      account.passwordAlgorithm = "scrypt";
    }

    const session = {
      id:crypto.randomUUID(),
      token:crypto.randomBytes(32).toString("hex"),
      accountId:account.id,
      deviceInfo:clean(body.deviceInfo) || clean(request.headers["user-agent"]) || "Unknown device",
      createdAt:new Date().toISOString(),
      lastSeenAt:new Date().toISOString()
    };
    database.sessions.push(session);
    await saveDatabase(database);
    json(response, 200, {
      token:session.token,
      sessionId:session.id,
      account:publicAccount(account)
    });
    return;
  }

  if(method === "GET" && pathname === "/api/session"){
    const context = requireSession(request, response, database);
    if(!context) return;
    json(response, 200, {
      sessionId:context.session.id,
      account:publicAccount(context.account)
    });
    return;
  }

  if(method === "POST" && pathname === "/api/logout"){
    const token = getBearerToken(request);
    database.sessions = database.sessions.filter(session => session.token !== token);
    await saveDatabase(database);
    json(response, 200, { ok:true });
    return;
  }

  if(method === "POST" && pathname === "/api/forgot/verify"){
    cleanExpiredResetTokens();
    const body = await readJson(request);
    const ssmKey = normalizeSsm(body.ssmNumber);
    const whatsappNumber = normalizePhone(body.whatsappNumber);
    const account = database.accounts.find(item =>
      item.ssmKey === ssmKey && item.whatsappNumber === whatsappNumber
    );

    if(!account){
      json(response, 404, { error:"SSM number and registered WhatsApp number do not match." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, { accountId:account.id, expiresAt:Date.now() + 15 * 60 * 1000 });
    json(response, 200, { resetToken:token });
    return;
  }

  if(method === "POST" && pathname === "/api/forgot/reset"){
    cleanExpiredResetTokens();
    const body = await readJson(request);
    const entry = resetTokens.get(clean(body.resetToken));
    const password = String(body.password || "");

    if(!entry || !password){
      json(response, 400, { error:"Password reset session is invalid or expired." });
      return;
    }

    const account = database.accounts.find(item => item.id === entry.accountId);
    if(!account){
      json(response, 404, { error:"Account no longer exists." });
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    account.passwordSalt = salt;
    account.passwordHash = passwordHash(password, salt);
    account.passwordAlgorithm = "scrypt";
    resetTokens.delete(clean(body.resetToken));
    await saveDatabase(database);
    json(response, 200, { username:account.username });
    return;
  }

  if(method === "GET" && pathname === "/api/accounts"){
    json(response, 200, { accounts:database.accounts.map(publicAccount) });
    return;
  }

  if(method === "PATCH" && pathname.startsWith("/api/accounts/")){
    const accountId = decodeURIComponent(pathname.slice("/api/accounts/".length));
    const account = database.accounts.find(item => item.id === accountId);
    if(!account){
      json(response, 404, { error:"Account not found." });
      return;
    }

    const body = await readJson(request);
    const customerCode = normalizeCustomerCode(body.customerCode);
    if(customerCode && database.accounts.some(item =>
      item.id !== accountId && normalizeCustomerCode(item.customerCode) === customerCode
    )){
      json(response, 409, { error:"This customer code is already used." });
      return;
    }

    account.customerCode = customerCode;
    await saveDatabase(database);
    broadcast("accounts", { action:"updated", account:publicAccount(account) });
    json(response, 200, { account:publicAccount(account) });
    return;
  }

  if(method === "DELETE" && pathname.startsWith("/api/accounts/")){
    const accountId = decodeURIComponent(pathname.slice("/api/accounts/".length));
    const account = database.accounts.find(item => item.id === accountId);
    if(!account){
      json(response, 404, { error:"Account not found." });
      return;
    }

    database.accounts = database.accounts.filter(item => item.id !== accountId);
    database.sessions = database.sessions.filter(session => session.accountId !== accountId);
    await saveDatabase(database);
    broadcast("accounts", { action:"removed", accountId });
    json(response, 200, { ok:true });
    return;
  }

  if(method === "GET" && pathname === "/api/orders"){
    const orders = [...database.orders]
      .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
      .slice(0, 500);
    json(response, 200, { orders });
    return;
  }

  if(method === "POST" && pathname === "/api/orders"){
    const context = requireSession(request, response, database);
    if(!context) return;
    const body = await readJson(request);
    const items = Array.isArray(body.items) ? body.items : [];
    const totalOrder = Number(body.totalOrder || 0);

    if(items.length === 0 || !Number.isFinite(totalOrder) || totalOrder <= 0){
      json(response, 400, { error:"Order is empty." });
      return;
    }

    const order = {
      id:crypto.randomUUID(),
      accountId:context.account.id,
      customerName:context.account.companyName,
      username:context.account.username,
      items,
      totalOrder,
      message:clean(body.message),
      submittedAt:new Date().toISOString(),
      deviceInfo:clean(body.deviceInfo) || context.session.deviceInfo,
      sessionId:context.session.id
    };
    database.orders.push(order);
    await saveDatabase(database);
    broadcast("orders", { action:"created", order });
    json(response, 201, { order });
    return;
  }

  json(response, 404, { error:"API route not found." });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  try{
    if(request.method === "OPTIONS"){
      response.writeHead(204, {
        "Access-Control-Allow-Origin":"*",
        "Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":"Content-Type,Authorization"
      });
      response.end();
      return;
    }

    if(url.pathname.startsWith("/api/")){
      if(request.method === "POST" || request.method === "PATCH" || request.method === "DELETE"){
        await enqueueMutation(() => handleApi(request, response, url));
      }else{
        await handleApi(request, response, url);
      }
    }else{
      serveStatic(request, response, url);
    }
  }catch(error){
    console.error(error);
    if(!response.headersSent){
      json(response, 500, { error:error.message || "Server error." });
    }else{
      response.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("TYRE EXPRESS shared server is running.");
  console.log(`PC:    http://localhost:${PORT}`);

  const addresses = [];
  for(const interfaces of Object.values(os.networkInterfaces())){
    for(const item of interfaces || []){
      if(item.family === "IPv4" && !item.internal) addresses.push(item.address);
    }
  }
  for(const address of addresses){
    console.log(`Phone: http://${address}:${PORT}`);
  }
  console.log("");
  console.log("Keep this window open while PC and phones use the app.");
});
