let products = [];
let cart = {};
let currentCategory = "ALL";
let currentYearFilter = "";
let currentSizeFilter = "";
let customerName = "";
let customerUsername = "";
let passwordResetUsername = "";
let branchNames = [];
let branchSettingOpen = false;
let branchSettingVisibleCount = 10;
let activeBranchSku = "";
let quickBranchSku = "";
let latestProductsJsonText = "";

const APP_ASSET_VERSION = "202606192130";
const ORDER_WHATSAPP_NUMBER = "60126151633";

const ACCOUNTS_STORAGE_KEY = "grRacingCustomerAccounts";
const CURRENT_USER_STORAGE_KEY = "grRacingCurrentUser";
const ORDERS_STORAGE_KEY = "grRacingSavedOrders";
const BRANCH_NAMES_STORAGE_KEY = "tyreOneBranchNames";

const DEFAULT_BRANCH_SLOT_COUNT = 10;
const BRANCH_SLOT_EXPAND_COUNT = 5;

const mainBrandCategories = [
  "APLUS VIETNAM",
  "APLUS",
  "ROCKBLADE",
  "HILO",
  "ARDENT",
  "RAUFFAN",
  "CROSSMAXX",
  "NEOLIN",
  "ROTALLA"
];

const brandCategories = [
  "ALL",
  "APLUS VIETNAM",
  "APLUS",
  "ROCKBLADE",
  "HILO",
  "ARDENT",
  "RAUFFAN",
  "CROSSMAXX",
  "NEOLIN",
  "ROTALLA",
  "OTHERS"
];

function $(id){
  return document.getElementById(id);
}

function cleanValue(value){
  if(value === null || value === undefined) return "";
  return String(value).trim();
}

function escapeHtml(value){
  return cleanValue(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJsString(value){
  return cleanValue(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function cssEscapeValue(value){
  if(window.CSS && CSS.escape){
    return CSS.escape(cleanValue(value));
  }

  return cleanValue(value).replace(/"/g, '\\"');
}

function parsePositiveInteger(value){
  const qty = parseInt(String(value || "").trim(), 10);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

function normalizeWhatsappNumber(value){
  return cleanValue(value).replace(/\D/g, "");
}

function isValidWhatsappNumber(value){
  return /^60\d{8,10}$/.test(normalizeWhatsappNumber(value));
}

function readJsonStorage(key, fallback){
  try{
    const value = JSON.parse(localStorage.getItem(key) || "");
    return value === null || value === undefined ? fallback : value;
  }catch(error){
    return fallback;
  }
}

function writeJsonStorage(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function getAccounts(){
  const accounts = readJsonStorage(ACCOUNTS_STORAGE_KEY, []);
  return Array.isArray(accounts) ? accounts : [];
}

function saveAccounts(accounts){
  writeJsonStorage(ACCOUNTS_STORAGE_KEY, Array.isArray(accounts) ? accounts : []);
}

function getSavedOrders(){
  const orders = readJsonStorage(ORDERS_STORAGE_KEY, []);
  return Array.isArray(orders) ? orders : [];
}

function saveSavedOrders(orders){
  writeJsonStorage(ORDERS_STORAGE_KEY, Array.isArray(orders) ? orders : []);
}

function makeId(prefix){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

function getDeviceInfo(){
  return `${navigator.platform || "Unknown"} | ${navigator.userAgent || ""}`;
}

function getCurrentUser(){
  return readJsonStorage(CURRENT_USER_STORAGE_KEY, null);
}

function setCurrentUser(user){
  writeJsonStorage(CURRENT_USER_STORAGE_KEY, user);
}

function clearCurrentUser(){
  localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
}

function showOnlyLoginView(viewId){
  ["loginView", "signupView", "forgotPasswordView", "resetPasswordView"].forEach(id => {
    const el = $(id);
    if(el) el.classList.toggle("hidden", id !== viewId);
  });
}

function showLoginView(){
  showOnlyLoginView("loginView");
}

function showSignupView(){
  showOnlyLoginView("signupView");
}

function showForgotPasswordView(){
  showOnlyLoginView("forgotPasswordView");
}

function showResetPasswordView(){
  showOnlyLoginView("resetPasswordView");
}

function clearLoginMessages(){
  ["loginError", "loginStatus", "signupError", "forgotPasswordError", "resetPasswordError"].forEach(id => {
    const el = $(id);
    if(el) el.textContent = "";
  });
}

function showLoginScreen(){
  $("loginScreen").classList.remove("hidden");
}

function hideLoginScreen(){
  $("loginScreen").classList.add("hidden");
}

function applyLoggedInUser(user){
  customerName = cleanValue(user.companyName || user.customerName || user.name || user.username);
  customerUsername = cleanValue(user.username);
  hideLoginScreen();
}

function requireLogin(){
  const currentUser = getCurrentUser();

  if(currentUser && currentUser.username){
    applyLoggedInUser(currentUser);
    return true;
  }

  showLoginScreen();
  return false;
}

function handleLogin(event){
  event.preventDefault();
  clearLoginMessages();

  const username = cleanValue($("loginUsername").value);
  const password = cleanValue($("loginPassword").value);

  if(!username || !password){
    $("loginError").textContent = "Please enter username and password.";
    return;
  }

  const account = getAccounts().find(acc => cleanValue(acc.username).toLowerCase() === username.toLowerCase());

  if(!account || cleanValue(account.password) !== password){
    $("loginError").textContent = "Wrong username or password.";
    return;
  }

  const user = {
    id: account.id,
    companyName: account.companyName,
    ssmNumber: account.ssmNumber,
    whatsappNumber: account.whatsappNumber,
    username: account.username,
    loginAt: new Date().toISOString(),
    deviceInfo: getDeviceInfo()
  };

  setCurrentUser(user);
  applyLoggedInUser(user);
  $("loginPassword").value = "";
  renderAndStayTop();
}

function handleSignup(event){
  event.preventDefault();
  clearLoginMessages();

  const companyName = cleanValue($("signupCompanyName").value);
  const ssmNumber = cleanValue($("signupSsmNumber").value);
  const whatsappNumber = normalizeWhatsappNumber($("signupWhatsappNumber").value);
  const username = cleanValue($("signupUsername").value);
  const password = cleanValue($("signupPassword").value);
  const confirmPassword = cleanValue($("signupConfirmPassword").value);

  if(!companyName || !ssmNumber || !whatsappNumber || !username || !password || !confirmPassword){
    $("signupError").textContent = "Please complete every field.";
    return;
  }

  if(!isValidWhatsappNumber(whatsappNumber)){
    $("signupError").textContent = "Please enter a valid WhatsApp number. Example: 60123456789";
    return;
  }

  if(password !== confirmPassword){
    $("signupError").textContent = "Password and confirm password do not match.";
    return;
  }

  const accounts = getAccounts();

  if(accounts.some(acc => normalizeWhatsappNumber(acc.whatsappNumber) === whatsappNumber)){
    $("signupError").textContent = "WhatsApp number already registered.";
    return;
  }

  const account = {
    id: makeId("acc"),
    companyName,
    ssmNumber,
    whatsappNumber,
    username,
    password,
    createdAt: new Date().toISOString(),
    deviceInfo: getDeviceInfo()
  };

  accounts.push(account);
  saveAccounts(accounts);

  $("loginUsername").value = username;
  $("loginPassword").value = password;
  $("loginStatus").textContent = "Account created. You can login now.";
  $("signupForm").reset();
  showLoginView();
}

function handleForgotVerify(event){
  event.preventDefault();
  clearLoginMessages();

  const ssmNumber = cleanValue($("forgotSsmNumber").value);
  const whatsappNumber = normalizeWhatsappNumber($("forgotWhatsappNumber").value);

  const account = getAccounts().find(acc =>
    cleanValue(acc.ssmNumber).toLowerCase() === ssmNumber.toLowerCase() &&
    normalizeWhatsappNumber(acc.whatsappNumber) === whatsappNumber
  );

  if(!account){
    $("forgotPasswordError").textContent = "Account not found on this device.";
    return;
  }

  passwordResetUsername = account.username;
  showResetPasswordView();
}

function handlePasswordReset(event){
  event.preventDefault();
  clearLoginMessages();

  const password = cleanValue($("resetPassword").value);
  const confirmPassword = cleanValue($("resetConfirmPassword").value);

  if(!password || !confirmPassword){
    $("resetPasswordError").textContent = "Please enter and confirm new password.";
    return;
  }

  if(password !== confirmPassword){
    $("resetPasswordError").textContent = "Password and confirm password do not match.";
    return;
  }

  const accounts = getAccounts();
  const account = accounts.find(acc => acc.username === passwordResetUsername);

  if(!account){
    $("resetPasswordError").textContent = "Reset account not found.";
    return;
  }

  account.password = password;
  saveAccounts(accounts);

  $("loginUsername").value = account.username;
  $("loginPassword").value = password;
  $("loginStatus").textContent = "Password reset done. You can login now.";
  $("resetPasswordForm").reset();
  passwordResetUsername = "";
  showLoginView();
}

function openLogoutConfirm(){
  $("logoutConfirmOverlay").classList.remove("hidden");
}

function closeLogoutConfirm(){
  $("logoutConfirmOverlay").classList.add("hidden");
}

function performLogout(){
  closeLogoutConfirm();

  clearCurrentUser();
  localStorage.removeItem(BRANCH_NAMES_STORAGE_KEY);

  customerName = "";
  customerUsername = "";
  cart = {};
  branchNames = new Array(DEFAULT_BRANCH_SLOT_COUNT).fill("");
  branchSettingOpen = false;
  branchSettingVisibleCount = DEFAULT_BRANCH_SLOT_COUNT;
  activeBranchSku = "";
  quickBranchSku = "";

  resetFiltersToAll();
  resetBarsToLeft();
  renderCart();
  updateCartCountOnly();
  renderProducts();
  closePhotoViewer();

  $("loginUsername").value = "";
  $("loginPassword").value = "";
  clearLoginMessages();
  showLoginView();
  showLoginScreen();
}

function formatRegistrationDate(value){
  if(!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

function showCatalogueScreen(){
  $("appShell").classList.remove("hidden");
  requireLogin();
}

function getProductSku(product){
  return cleanValue(product.__sku);
}

function getProductCategoryBrand(product){
  return cleanValue(
    product["CategoryBrand"] ||
    product["CATEGORY_BRAND"] ||
    product["Category Brand"] ||
    product["Brand"] ||
    product["BRAND"] ||
    product["brand"]
  ).toUpperCase();
}

function getProductDisplayBrand(product){
  return cleanValue(
    product["DisplayBrand"] ||
    product["DISPLAY_BRAND"] ||
    product["Display Brand"] ||
    product["CategoryBrand"] ||
    product["CATEGORY_BRAND"] ||
    product["Category Brand"] ||
    product["Brand"] ||
    product["BRAND"] ||
    product["brand"]
  ).toUpperCase();
}

function getProductDescription(product){
  return cleanValue(
    product["Product Descriptions"] ||
    product["PRODUCT DESCRIPTIONS"] ||
    product["Product Description"] ||
    product["product descriptions"] ||
    product["description"] ||
    product["Description"]
  );
}

function getProductPhotoText(product){
  return cleanValue(
    product["PHOTO"] ||
    product["Photo"] ||
    product["photo"] ||
    product["Image"] ||
    product["image"]
  );
}

function normalizePhotoUrl(url){
  url = cleanValue(url);
  if(!url) return "";

  if(url.includes("/d/")){
    const fileId = url.split("/d/")[1].split("/")[0];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200&cache=${Date.now()}`;
  }

  if(url.includes("id=")){
    const fileId = url.split("id=")[1].split("&")[0];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200&cache=${Date.now()}`;
  }

  return url;
}

function getProductPhotoUrl(product){
  return normalizePhotoUrl(
    product["PHOTO_URL"] ||
    product["Photo URL"] ||
    product["photoUrl"] ||
    product["photo_url"] ||
    getProductPhotoText(product)
  );
}

function getProductPrice(product){
  return cleanValue(product["PRICE"] || product["Price"] || product["price"]);
}

function getProductStatus(product){
  return cleanValue(product["STATUS"] || product["Status"] || product["status"]);
}

function getProductRowColor(product){
  return cleanValue(product["rowColor"] || product["ROW_COLOR"] || product["Row Color"]);
}

function getStatusBgColor(product){
  return cleanValue(product["statusBgColor"] || product["STATUS_BG_COLOR"] || product["Status Bg Color"]);
}

function getStatusFontColor(product){
  return cleanValue(product["statusFontColor"] || product["STATUS_FONT_COLOR"] || product["Status Font Color"]);
}

function getProductSizeFilter(product){
  const desc = getProductDescription(product).toUpperCase();

  let match = desc.match(/R\s?(\d{2})/);
  if(match) return "R" + match[1];

  match = desc.match(/(\d{2})R/);
  if(match) return "R" + match[1];

  return "";
}

function getProductYear(product){
  const allText = `${getProductDescription(product)} ${getProductStatus(product)}`.toUpperCase();
  const match = allText.match(/Y\s?(20|21|22|23|24|25|26)/);
  return match ? "Y" + match[1] : "";
}

function shouldShowProduct(product){
  const brand = getProductCategoryBrand(product);
  const description = getProductDescription(product);
  const photo = getProductPhotoText(product);
  const photoUrl = getProductPhotoUrl(product);
  const price = getProductPrice(product);
  const status = getProductStatus(product);
  const statusText = status.toLowerCase();

  if(!brand && !description && !photo && !photoUrl && !price && !status) return false;
  if(statusText.includes("sold out")) return false;
  if(statusText.includes("not available")) return false;
  if(statusText.includes("no stock")) return false;
  if(statusText.includes("out of stock")) return false;
  if(statusText.includes("#n/a")) return false;

  return true;
}

function assignInternalSkus(){
  products.forEach((product, index) => {
    const existingSku = cleanValue(product.__sku || product.sku || product.SKU);
    if(existingSku){
      product.__sku = existingSku;
      return;
    }

    product.__sku = [
      index,
      getProductCategoryBrand(product),
      getProductDescription(product),
      getProductPhotoText(product),
      getProductPrice(product),
      getProductStatus(product)
    ].join("-");
  });
}

async function loadProducts(){
  try{
    const response = await fetch(`products.json?refresh=${Date.now()}`, { cache:"no-store" });
    latestProductsJsonText = await response.text();
    products = JSON.parse(latestProductsJsonText);

    if(!Array.isArray(products)){
      products = [];
    }

    assignInternalSkus();
    renderProducts();
    updateActiveButtons();
    updateClearSearchButton();
    resetBarsToLeft();
  }catch(error){
    console.error("Cannot load products.json:", error);
    $("productGrid").innerHTML = `
      <div style="background:white;padding:20px;border-radius:10px;font-weight:bold;color:#b00020;">
        products.json error. Please export products.json again.
      </div>
    `;
  }
}

async function autoRefreshProducts(){
  try{
    const response = await fetch(`products.json?refresh=${Date.now()}`, { cache:"no-store" });
    const newText = await response.text();

    if(newText === latestProductsJsonText) return;

    latestProductsJsonText = newText;
    products = JSON.parse(newText);
    if(!Array.isArray(products)) products = [];

    assignInternalSkus();

    Object.keys(cart).forEach(sku => {
      const stillExists = products.some(product => getProductSku(product) === sku && shouldShowProduct(product));
      if(!stillExists) delete cart[sku];
    });

    renderCart();
    updateCartCountOnly();
    renderProducts();
    resetBarsToLeft();
  }catch(error){
    console.log("Auto refresh failed:", error);
  }
}

function getFilteredProducts(){
  const searchText = cleanValue($("search").value).toUpperCase();

  return products.filter(product => {
    if(!shouldShowProduct(product)) return false;

    const brand = getProductCategoryBrand(product);
    const description = getProductDescription(product).toUpperCase();
    const displayBrand = getProductDisplayBrand(product);

    if(currentCategory === "OTHERS"){
      if(mainBrandCategories.includes(brand)) return false;
    }else if(currentCategory !== "ALL"){
      if(brand !== currentCategory) return false;
    }

    if(currentSizeFilter && getProductSizeFilter(product) !== currentSizeFilter) return false;
    if(currentYearFilter && getProductYear(product) !== currentYearFilter) return false;

    if(searchText){
      const searchable = `${brand} ${displayBrand} ${description}`.toUpperCase();
      if(!searchable.includes(searchText)) return false;
    }

    return true;
  });
}

function renderProducts(){
  const grid = $("productGrid");
  const filtered = getFilteredProducts();

  if(filtered.length === 0){
    grid.innerHTML = `<div class="emptyUserList">No products found.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(product => renderProductCard(product)).join("");
  updateAllProductOrderAreas();
}

function renderProductCard(product){
  const sku = getProductSku(product);
  const brand = getProductDisplayBrand(product);
  const desc = getProductDescription(product);
  const price = getProductPrice(product);
  const status = getProductStatus(product);
  const rowColor = getProductRowColor(product);
  const statusBg = getStatusBgColor(product);
  const statusColor = getStatusFontColor(product);

  const rowStyle = rowColor ? `style="background:${escapeHtml(rowColor)}"` : "";
  const statusStyle = [
    statusBg ? `background:${statusBg}` : "",
    statusColor ? `color:${statusColor}` : ""
  ].filter(Boolean).join(";");

  return `
    <div class="card" data-sku="${escapeHtml(sku)}" ${rowStyle} onclick="openPhotoViewerBySku('${escapeJsString(sku)}')">
      <div class="info">
        <div class="desc">
          <span class="brandName">${escapeHtml(brand)}</span>
          ${escapeHtml(desc)}
        </div>

        <div class="price">${price ? escapeHtml(price) : "Ask price"}</div>

        <div class="stockBox">
          <span class="stock" style="${escapeHtml(statusStyle)}">${escapeHtml(status || "-")}</span>
        </div>

        <div class="orderArea" data-order-area="${escapeHtml(sku)}" onclick="event.stopPropagation()"></div>
      </div>
    </div>
  `;
}

function updateAllProductOrderAreas(){
  document.querySelectorAll("[data-order-area]").forEach(area => {
    updateProductOrderArea(area.dataset.orderArea);
  });
}

function updateProductOrderArea(sku){
  const area = document.querySelector(`[data-order-area="${cssEscapeValue(sku)}"]`);
  if(!area) return;

  const qty = getCartQty(sku);

  if(quickBranchSku === sku && hasConfiguredBranchNames()){
    area.innerHTML = renderQuickBranchDropdown(sku);
    return;
  }

  if(qty <= 0){
    area.innerHTML = `<button type="button" onclick="addToCartFromProduct('${escapeJsString(sku)}')">Add</button>`;
    return;
  }

  area.innerHTML = `
    <div>
      <div class="qtyControls">
        <button type="button" onclick="changeQty('${escapeJsString(sku)}', -1)">-</button>
        <input class="qtyInput" type="number" min="0" inputmode="numeric" value="${qty}" onchange="setQtyFromInput('${escapeJsString(sku)}', this.value)">
        <button type="button" onclick="changeQty('${escapeJsString(sku)}', 1)">+</button>
      </div>
      ${getBranchPreviewHtml(sku)}
    </div>
  `;
}

function getProductBySku(sku){
  return products.find(product => getProductSku(product) === sku);
}

function addToCartFromProduct(sku){
  if(hasConfiguredBranchNames() && getCartQty(sku) === 0){
    const previousQuickSku = quickBranchSku;
    quickBranchSku = quickBranchSku === sku ? "" : sku;

    if(previousQuickSku && previousQuickSku !== sku){
      updateProductOrderArea(previousQuickSku);
    }

    updateProductOrderArea(sku);
    focusQuickBranchDropdown(sku);
    return;
  }

  changeQty(sku, 1);
}

function changeQty(sku, delta){
  const nextQty = Math.max(0, getCartQty(sku) + delta);
  setCartQty(sku, nextQty);
  renderCart();
  updateProductOrderArea(sku);
  updateCartCountOnly();
}

function setQtyFromInput(sku, value){
  setCartQty(sku, parsePositiveInteger(value));
  renderCart();
  updateProductOrderArea(sku);
  updateCartCountOnly();
}

function normalizeCartItem(sku){
  const item = cart[sku];

  if(!item) return null;

  if(typeof item === "number"){
    cart[sku] = { qty:item, branches:{} };
    return cart[sku];
  }

  if(typeof item === "object"){
    item.qty = parsePositiveInteger(item.qty);
    if(!item.branches || typeof item.branches !== "object") item.branches = {};
    return item;
  }

  return null;
}

function getCartItem(sku){
  return normalizeCartItem(sku);
}

function getCartQty(sku){
  const item = getCartItem(sku);
  return item ? item.qty : 0;
}

function getCartBranches(sku){
  const item = getCartItem(sku);
  return item ? item.branches : {};
}

function setCartQty(sku, qty){
  qty = parsePositiveInteger(qty);

  if(qty <= 0){
    delete cart[sku];
    if(activeBranchSku === sku) activeBranchSku = "";
    if(quickBranchSku === sku) quickBranchSku = "";
    return;
  }

  const item = getCartItem(sku) || { qty:0, branches:{} };
  item.qty = qty;
  cart[sku] = item;
}

function getCartSkus(){
  return Object.keys(cart).filter(sku => getCartQty(sku) > 0);
}

function getCartTotalQty(){
  return getCartSkus().reduce((total, sku) => total + getCartQty(sku), 0);
}

function updateCartCountOnly(){
  $("cartCount").textContent = getCartTotalQty();
}

function renderCart(){
  const skus = getCartSkus();
  updateCartCountOnly();

  if(skus.length === 0){
    $("cartItems").innerHTML = `<div class="emptyUserList">Cart is empty.</div>`;
    return;
  }

  $("cartItems").innerHTML = skus.map(sku => {
    const product = getProductBySku(sku);
    if(!product) return "";

    const qty = getCartQty(sku);
    const brand = getProductDisplayBrand(product);
    const desc = getProductDescription(product);

    return `
      <div class="cartRow" data-sku="${escapeHtml(sku)}">
        <b>${escapeHtml(brand)} ${escapeHtml(desc)}</b>
        <small>Qty: ${qty} PCS</small>
        ${getBranchPreviewHtml(sku)}
        <div class="qtyControls">
          <button type="button" onclick="changeQty('${escapeJsString(sku)}', -1)">-</button>
          <input class="qtyInput" type="number" min="0" inputmode="numeric" value="${qty}" onchange="setQtyFromInput('${escapeJsString(sku)}', this.value)">
          <button type="button" onclick="changeQty('${escapeJsString(sku)}', 1)">+</button>
          <button class="remove" type="button" onclick="removeFromCart('${escapeJsString(sku)}')">Remove</button>
        </div>
        <div class="cartActionRow">
          <button class="branchButton" type="button" onclick="toggleBranchSplit('${escapeJsString(sku)}')">Branch</button>
        </div>
        ${renderBranchSplitPanel(sku)}
      </div>
    `;
  }).join("");
}

function removeFromCart(sku){
  delete cart[sku];
  renderCart();
  updateProductOrderArea(sku);
}

function loadBranchNames(){
  try{
    const raw = localStorage.getItem(BRANCH_NAMES_STORAGE_KEY);
    branchNames = normalizeBranchNameSlots(JSON.parse(raw || "[]"));
  }catch(error){
    branchNames = new Array(DEFAULT_BRANCH_SLOT_COUNT).fill("");
  }

  resetBranchSettingVisibleCount();
}

function saveBranchNames(){
  localStorage.setItem(BRANCH_NAMES_STORAGE_KEY, JSON.stringify(branchNames));
}

function normalizeBranchNameSlots(list){
  const source = Array.isArray(list) ? list : [];
  const slots = new Array(getExpandedBranchSlotCount(source.length)).fill("");
  const seen = new Set();

  source.forEach((name, index) => {
    const cleaned = cleanValue(name);
    const normalized = cleaned.toUpperCase();

    if(!cleaned || seen.has(normalized)) return;

    seen.add(normalized);
    slots[index] = cleaned;
  });

  return slots;
}

function getExpandedBranchSlotCount(requiredCount){
  const baseCount = Math.max(DEFAULT_BRANCH_SLOT_COUNT, parsePositiveInteger(requiredCount));

  if(baseCount <= DEFAULT_BRANCH_SLOT_COUNT) return DEFAULT_BRANCH_SLOT_COUNT;

  return DEFAULT_BRANCH_SLOT_COUNT + (
    Math.ceil((baseCount - DEFAULT_BRANCH_SLOT_COUNT) / BRANCH_SLOT_EXPAND_COUNT) * BRANCH_SLOT_EXPAND_COUNT
  );
}

function ensureBranchSlotCount(requiredCount){
  const targetCount = getExpandedBranchSlotCount(requiredCount);

  while(branchNames.length < targetCount){
    branchNames.push("");
  }
}

function getConfiguredBranchNames(){
  return branchNames.filter(name => cleanValue(name));
}

function hasConfiguredBranchNames(){
  return getConfiguredBranchNames().length > 0;
}

function getLastConfiguredBranchIndex(){
  for(let i = branchNames.length - 1; i >= 0; i--){
    if(cleanValue(branchNames[i])) return i;
  }

  return -1;
}

function resetBranchSettingVisibleCount(){
  branchSettingVisibleCount = getExpandedBranchSlotCount(getLastConfiguredBranchIndex() + 1);
}

function openBranchSettings(){
  branchSettingOpen = !branchSettingOpen;

  if(branchSettingOpen){
    resetBranchSettingVisibleCount();
  }

  renderBranchSettingPanel();
}

function closeBranchSettings(){
  branchSettingOpen = false;
  resetBranchSettingVisibleCount();
  renderBranchSettingPanel();
}

function showMoreBranchSettings(){
  branchSettingVisibleCount += BRANCH_SLOT_EXPAND_COUNT;
  ensureBranchSlotCount(branchSettingVisibleCount);
  renderBranchSettingPanel();
}

function renderBranchSettingPanel(){
  const panel = $("branchSettingPanel");

  if(!branchSettingOpen){
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }

  panel.classList.remove("hidden");

  ensureBranchSlotCount(branchSettingVisibleCount);

  const rows = [];

  for(let i = 0; i < branchSettingVisibleCount; i++){
    rows.push(`
      <div class="branchInputRow">
        <label>Branch ${i + 1}</label>
        <input type="text" maxlength="40" value="${escapeHtml(branchNames[i] || "")}" placeholder="Branch name" data-branch-index="${i}">
      </div>
    `);
  }

  panel.innerHTML = `
    <h3>Branch Setting</h3>
    ${rows.join("")}
    <button type="button" onclick="showMoreBranchSettings()">Add More Branch</button>
    <div class="branchEditorActions">
      <button type="button" onclick="saveBranchSettings()">Save Branch Names</button>
      <button type="button" onclick="closeBranchSettings()">Cancel</button>
    </div>
  `;
}

function saveBranchSettings(){
  const inputs = document.querySelectorAll("#branchSettingPanel input[data-branch-index]");
  branchNames = normalizeBranchNameSlots(Array.from(inputs).map(input => cleanValue(input.value)));
  resetBranchSettingVisibleCount();
  saveBranchNames();

  const configured = getConfiguredBranchNames();

  Object.keys(cart).forEach(sku => {
    const item = getCartItem(sku);
    if(!item) return;

    Object.keys(item.branches).forEach(name => {
      if(!configured.includes(name)) delete item.branches[name];
    });

    const total = getBranchQtyTotal(item.branches);

    if(total > 0){
      item.qty = total;
    }else{
      item.branches = {};
    }
  });

  quickBranchSku = "";
  activeBranchSku = "";
  branchSettingOpen = false;
  renderBranchSettingPanel();
  renderCart();
  renderProducts();
}

function getBranchQtyTotal(branchMap){
  return Object.values(branchMap || {}).reduce((total, qty) => total + parsePositiveInteger(qty), 0);
}

function getBranchPreviewHtml(sku){
  const parts = Object.entries(getCartBranches(sku))
    .filter(([, qty]) => parsePositiveInteger(qty) > 0)
    .map(([name, qty]) => `${escapeHtml(name)}: ${parsePositiveInteger(qty)}`);

  if(parts.length === 0) return "";

  return `<div class="branchPreview">${parts.join(" | ")}</div>`;
}

function renderQuickBranchDropdown(sku){
  const branches = getCartBranches(sku);
  const rows = getConfiguredBranchNames().map(name => `
    <div class="branchQtyRow">
      <label>${escapeHtml(name)}</label>
      <div class="branchQtyControl">
        <button type="button" class="branchQtyStepper" onclick="changeBranchQtyInput(this, -1)">-</button>
        <input type="number" min="0" inputmode="numeric" value="${branches[name] || ""}" data-branch-name="${escapeHtml(name)}" placeholder="0">
        <button type="button" class="branchQtyStepper" onclick="changeBranchQtyInput(this, 1)">+</button>
      </div>
    </div>
  `);

  return `
    <div class="quickBranchDropdown">
      <h4>Branch Qty</h4>
      ${rows.join("")}
      <div class="branchEditorActions">
        <button type="button" onclick="saveQuickBranchDropdown('${escapeJsString(sku)}')">Save</button>
        <button type="button" onclick="cancelQuickBranchDropdown('${escapeJsString(sku)}')">Cancel</button>
      </div>
    </div>
  `;
}

function focusQuickBranchDropdown(sku){
  setTimeout(() => {
    const area = document.querySelector(`[data-order-area="${cssEscapeValue(sku)}"]`);
    const first = area ? area.querySelector("input[data-branch-name]") : null;
    if(first){
      first.focus();
      first.select();
    }
  }, 60);
}

function changeBranchQtyInput(button, delta){
  const control = button.closest(".branchQtyControl");
  const input = control ? control.querySelector("input[data-branch-name]") : null;
  if(!input) return;

  input.value = String(Math.max(0, parsePositiveInteger(input.value) + delta));
}

function saveQuickBranchDropdown(sku){
  const area = document.querySelector(`[data-order-area="${cssEscapeValue(sku)}"]`);
  if(!area) return;

  const inputs = area.querySelectorAll(".quickBranchDropdown input[data-branch-name]");
  const branches = {};
  let total = 0;

  inputs.forEach(input => {
    const name = cleanValue(input.dataset.branchName);
    const qty = parsePositiveInteger(input.value);

    if(name && qty > 0){
      branches[name] = qty;
      total += qty;
    }
  });

  if(total <= 0){
    alert("Please enter branch quantity.");
    return;
  }

  cart[sku] = { qty:total, branches };
  quickBranchSku = "";
  renderCart();
  updateProductOrderArea(sku);
  updateCartCountOnly();
}

function cancelQuickBranchDropdown(sku){
  if(quickBranchSku === sku) quickBranchSku = "";
  updateProductOrderArea(sku);
}

function toggleBranchSplit(sku){
  if(!hasConfiguredBranchNames()){
    alert("Please set branch names first.");
    branchSettingOpen = true;
    renderBranchSettingPanel();
    return;
  }

  activeBranchSku = activeBranchSku === sku ? "" : sku;
  renderCart();
}

function renderBranchSplitPanel(sku){
  if(activeBranchSku !== sku || !hasConfiguredBranchNames()) return "";

  const branches = getCartBranches(sku);
  const rows = getConfiguredBranchNames().map(name => `
    <div class="branchQtyRow">
      <label>${escapeHtml(name)}</label>
      <div class="branchQtyControl">
        <button type="button" class="branchQtyStepper" onclick="changeBranchQtyInput(this, -1)">-</button>
        <input type="number" min="0" inputmode="numeric" value="${branches[name] || ""}" data-branch-name="${escapeHtml(name)}" placeholder="0">
        <button type="button" class="branchQtyStepper" onclick="changeBranchQtyInput(this, 1)">+</button>
      </div>
    </div>
  `);

  return `
    <div class="branchSplitPanel">
      <h4>Branch Split</h4>
      ${rows.join("")}
      <div class="branchSplitTotal">Cart Qty: ${getCartQty(sku)} PCS</div>
      <div class="branchEditorActions">
        <button type="button" onclick="saveBranchSplit('${escapeJsString(sku)}')">Save Branch Split</button>
        <button type="button" onclick="cancelBranchSplit('${escapeJsString(sku)}')">Cancel</button>
      </div>
    </div>
  `;
}

function saveBranchSplit(sku){
  const row = document.querySelector(`.cartRow[data-sku="${cssEscapeValue(sku)}"]`);
  if(!row) return;

  const inputs = row.querySelectorAll(".branchSplitPanel input[data-branch-name]");
  const branches = {};
  let total = 0;

  inputs.forEach(input => {
    const name = cleanValue(input.dataset.branchName);
    const qty = parsePositiveInteger(input.value);

    if(name && qty > 0){
      branches[name] = qty;
      total += qty;
    }
  });

  if(total <= 0){
    delete cart[sku];
    activeBranchSku = "";
    renderCart();
    updateProductOrderArea(sku);
    return;
  }

  cart[sku] = { qty:total, branches };
  activeBranchSku = "";
  renderCart();
  updateProductOrderArea(sku);
  updateCartCountOnly();
}

function cancelBranchSplit(sku){
  if(activeBranchSku === sku) activeBranchSku = "";
  renderCart();
}

function buildWhatsAppMessage(){
  const skus = getCartSkus();
  const lines = [];

  lines.push(`Customer: ${customerName || customerUsername || "-"}`);
  lines.push(`Username: ${customerUsername || "-"}`);
  lines.push("");

  skus.forEach((sku, index) => {
    const product = getProductBySku(sku);
    if(!product) return;

    const brand = getProductDisplayBrand(product);
    const desc = getProductDescription(product);
    const qty = getCartQty(sku);
    const branches = Object.entries(getCartBranches(sku)).filter(([, qtyValue]) => parsePositiveInteger(qtyValue) > 0);

    lines.push(`${index + 1}. ${brand}`);
    lines.push(desc);
    lines.push(`Order Qty (Pcs): ${qty}`);

    if(branches.length > 0){
      lines.push("Branch Split:");
      branches.forEach(([name, branchQty]) => {
        lines.push(`- ${name}: ${parsePositiveInteger(branchQty)} PCS`);
      });
    }

    lines.push("");
  });

  lines.push(`TOTAL ORDER: ${getCartTotalQty()} PCS`);

  return lines.join("\n");
}

function sendWhatsappOrder(){
  if(!requireLogin()) return;

  if(getCartTotalQty() <= 0){
    alert("Cart is empty.");
    return;
  }

  const message = buildWhatsAppMessage();

  const savedOrder = {
    id: makeId("order"),
    customerName,
    username: customerUsername,
    submittedAt: new Date().toISOString(),
    totalOrder: getCartTotalQty(),
    items: getCartSkus().map(sku => {
      const product = getProductBySku(sku);
      return {
        sku,
        brand: product ? getProductDisplayBrand(product) : "",
        description: product ? getProductDescription(product) : "",
        qty: getCartQty(sku),
        branches: getCartBranches(sku)
      };
    }),
    message,
    deviceInfo: getDeviceInfo()
  };

  const orders = getSavedOrders();
  orders.push(savedOrder);
  saveSavedOrders(orders);

  const whatsappUrl = `https://wa.me/${ORDER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");

  cart = {};
  activeBranchSku = "";
  quickBranchSku = "";
  renderCart();
  renderProducts();
}

function brandLogoMissing(img){
  const button = img.closest("button");
  if(button) button.classList.add("logoMissing");
  img.style.display = "none";
}

function updateActiveButtons(){
  document.querySelectorAll(".brandCategoryButton").forEach(button => {
    button.classList.toggle("active", button.dataset.category === currentCategory);
  });

  document.querySelectorAll(".pcdMenu button").forEach(button => {
    button.classList.toggle("active", cleanValue(button.textContent) === currentSizeFilter);
  });

  $("yearButton").classList.toggle("active", !!currentYearFilter);
  $("yearButton").textContent = currentYearFilter || "YEAR";

  document.querySelectorAll("#yearDropdown button").forEach(button => {
    const text = cleanValue(button.textContent);
    const active = currentYearFilter ? text === currentYearFilter : text === "ALL YEAR";
    button.classList.toggle("active", active);
  });
}

function showCategory(category){
  currentCategory = brandCategories.includes(category) ? category : "ALL";
  quickBranchSku = "";
  updateActiveButtons();
  renderAndStayTop();
}

function showSize(size){
  currentSizeFilter = currentSizeFilter === size ? "" : size;
  updateActiveButtons();
  renderAndStayTop();
}

function showYear(year){
  currentYearFilter = year;
  $("yearDropdown").classList.add("hidden");
  updateActiveButtons();
  renderAndStayTop();
}

function clearYear(){
  currentYearFilter = "";
  $("yearDropdown").classList.add("hidden");
  updateActiveButtons();
  renderAndStayTop();
}

function showYearDropdown(event){
  event.preventDefault();
  event.stopPropagation();

  const dropdown = $("yearDropdown");
  const rect = $("yearButton").getBoundingClientRect();

  dropdown.style.left = `${Math.max(8, rect.left)}px`;
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.classList.toggle("hidden");
  updateActiveButtons();
}

function resetFiltersToAll(){
  currentCategory = "ALL";
  currentYearFilter = "";
  currentSizeFilter = "";
}

function updateClearSearchButton(){
  $("clearSearchButton").classList.toggle("hidden", !cleanValue($("search").value));
}

function resetBarsToLeft(){
  const sizeBar = document.querySelector(".pcdMenu");
  const brandBar = $("brandCategoryBar");

  [sizeBar, brandBar].forEach(el => {
    if(!el) return;
    el.scrollLeft = 0;
    requestAnimationFrame(() => { el.scrollLeft = 0; });
    setTimeout(() => { el.scrollLeft = 0; }, 100);
  });
}

function goBackToTop(){
  const grid = $("productGrid");
  const cartPanel = $("cartPanel");

  if(grid) grid.scrollTop = 0;
  if(cartPanel && !cartPanel.classList.contains("hidden")) cartPanel.scrollTop = 0;

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function renderAndStayTop(){
  renderProducts();
  goBackToTop();
}

function refreshApp(){
  cart = {};
  activeBranchSku = "";
  quickBranchSku = "";
  resetFiltersToAll();

  $("search").value = "";
  updateClearSearchButton();

  renderCart();
  updateActiveButtons();
  resetBarsToLeft();
  loadProducts();
  goBackToTop();
}

function openPhotoViewerBySku(sku){
  const product = getProductBySku(sku);
  if(!product) return;

  const photoUrl = getProductPhotoUrl(product);

  if(!photoUrl){
    alert("No photo for this product.");
    return;
  }

  $("viewerTitle").textContent = `${getProductDisplayBrand(product)} ${getProductDescription(product)}`;
  $("viewerImage").src = photoUrl;
  $("photoViewer").classList.remove("hidden");
}

function closePhotoViewer(){
  $("photoViewer").classList.add("hidden");
  $("viewerImage").src = "";
}

function openCart(){
  $("cartPanel").classList.remove("hidden");
  renderBranchSettingPanel();
  renderCart();
}

function closeCart(){
  $("cartPanel").classList.add("hidden");
  activeBranchSku = "";
  renderCart();
}

function bindEvents(){
  $("loginForm").addEventListener("submit", handleLogin);
  $("signupForm").addEventListener("submit", handleSignup);
  $("forgotPasswordForm").addEventListener("submit", handleForgotVerify);
  $("resetPasswordForm").addEventListener("submit", handlePasswordReset);

  $("showSignupButton").addEventListener("click", () => {
    clearLoginMessages();
    showSignupView();
  });

  $("backToLoginButton").addEventListener("click", () => {
    clearLoginMessages();
    showLoginView();
  });

  $("showForgotPasswordButton").addEventListener("click", () => {
    clearLoginMessages();
    showForgotPasswordView();
  });

  $("forgotBackToLoginButton").addEventListener("click", () => {
    clearLoginMessages();
    showLoginView();
  });

  $("resetBackToLoginButton").addEventListener("click", () => {
    clearLoginMessages();
    showLoginView();
  });

  $("logoutButton").addEventListener("click", openLogoutConfirm);
  $("logoutConfirmCancel").addEventListener("click", closeLogoutConfirm);
  $("logoutConfirmOk").addEventListener("click", performLogout);

  $("refreshAppButton").addEventListener("click", refreshApp);
  $("cartButton").addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("branchSettingButton").addEventListener("click", openBranchSettings);
  $("sendWhatsapp").addEventListener("click", sendWhatsappOrder);

  $("search").addEventListener("input", () => {
    updateClearSearchButton();
    renderProducts();
  });

  $("clearSearchButton").addEventListener("click", () => {
    $("search").value = "";
    updateClearSearchButton();
    renderAndStayTop();
  });

  $("topTapZone").addEventListener("click", goBackToTop);

  document.addEventListener("click", event => {
    if(!event.target.closest("#yearButton") && !event.target.closest("#yearDropdown")){
      $("yearDropdown").classList.add("hidden");
    }
  });
}

function boot(){
  bindEvents();
  loadBranchNames();
  renderCart();
  loadProducts();

  setInterval(autoRefreshProducts, 60000);

  showCatalogueScreen();
}

document.addEventListener("DOMContentLoaded", boot);
