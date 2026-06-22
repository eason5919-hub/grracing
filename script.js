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

let categoryCardCache = {};
let cardBySku = {};

let latestProductsJsonText = "";
let refreshLock = false;
let authEventSource = null;
const APP_ASSET_VERSION = "202606201225";
const ORDER_WHATSAPP_NUMBER = "60126151633";
const API_BASE_URL = cleanValue(window.GR_RACING_API_BASE_URL || "").replace(/\/$/, "");
const ACCOUNTS_STORAGE_KEY = "grRacingCustomerAccounts";
const CURRENT_USER_STORAGE_KEY = "grRacingCurrentUser";
const AUTH_TOKEN_STORAGE_KEY = "grRacingAuthToken";
const LOCAL_ACCOUNT_IMPORT_STORAGE_KEY = "grRacingLocalAccountsImported";
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

function ensureAplusVietnamCategoryButton(){
  const brandBar = document.getElementById("brandCategoryBar") || document.querySelector(".categoryMenu");
  if(!brandBar){
    return;
  }

  let button = brandBar.querySelector('button[data-category="APLUS VIETNAM"]');

  if(!button){
    button = document.createElement("button");
    const allButton = brandBar.querySelector('button[data-category="ALL"]');

    if(allButton && allButton.nextSibling){
      brandBar.insertBefore(button, allButton.nextSibling);
    }else if(allButton){
      brandBar.appendChild(button);
    }else{
      brandBar.insertBefore(button, brandBar.firstChild);
    }
  }

  button.className = "brandCategoryButton";
  button.dataset.category = "APLUS VIETNAM";
  button.onclick = () => showCategory("APLUS VIETNAM");
  button.innerHTML = "";

  const img = document.createElement("img");
  img.src = `aplus-vietnam-logo.jpg?v=${APP_ASSET_VERSION}`;
  img.alt = "APLUS VIETNAM";
  img.onerror = function(){
    brandLogoMissing(img);
  };

  const span = document.createElement("span");
  span.textContent = "APLUS VIETNAM";

  button.appendChild(img);
  button.appendChild(span);
}

function ensureInteractionStyleFixes(){
  let style = document.getElementById("codexInteractionStyleFixes");
  if(!style){
    style = document.createElement("style");
    style.id = "codexInteractionStyleFixes";
    document.head.appendChild(style);
  }

  style.textContent = `
    .card {
      transition: filter 0.15s ease !important;
    }

    .card:active {
      transform: none !important;
    }

    .grid,
    main {
      padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;
    }

    @media (max-width: 800px) {
      .grid,
      main {
        padding-bottom: calc(170px + env(safe-area-inset-bottom, 0px)) !important;
      }
    }

    #branchSettingButton {
      width: 100%;
      margin: 12px 0 8px;
      background: var(--navy-soft);
    }

    .branchSettingPanel,
    .branchSplitPanel,
    .quickBranchDropdown {
      background: var(--cream);
      border: 1px solid var(--gold);
      border-radius: 12px;
      padding: 10px;
      margin: 8px 0;
      box-sizing: border-box;
    }

    .branchSettingPanel h3,
    .branchSplitPanel h4,
    .quickBranchDropdown h4 {
      margin: 0 0 10px;
      font-size: 15px;
    }

    .branchInputRow,
    .branchQtyRow {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .branchInputRow label,
    .branchQtyRow label {
      flex: 0 0 88px;
      font-size: 13px;
      font-weight: bold;
      word-break: break-word;
    }

    .branchInputRow input,
    .branchQtyRow input {
      flex: 1;
      min-width: 0;
      height: 40px;
      padding: 8px 10px;
      border: 1px solid var(--gold);
      border-radius: 9px;
      font-size: 16px;
      box-sizing: border-box;
      background: #fffdf7;
      color: var(--navy);
    }

    .branchQtyRow input {
      max-width: 110px;
      text-align: center;
      font-weight: bold;
    }

    .branchQtyControl {
      width: 100%;
    }

    .branchQtyStepper {
      display: none;
    }

    .branchEditorActions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .branchEditorActions button {
      flex: 1;
    }

    .branchButton {
      background: var(--navy-soft);
    }

    .cartActionRow {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .cartActionRow button {
      flex: 1;
    }

    .branchPreview {
      margin-top: 8px;
      color: var(--navy-soft);
      font-size: 12px;
      line-height: 1.35;
      font-weight: bold;
      word-break: break-word;
    }

    .branchSplitTotal {
      margin-top: 6px;
      font-size: 13px;
      font-weight: bold;
    }

    .qtyControls {
      width: 160px;
    }

    .qtyInput {
      width: 70px;
    }

    .cartRow .qtyInput {
      flex: 0 0 70px;
    }

    .confirmOverlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.58);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      z-index: 12000;
    }

    .confirmBox {
      width: min(420px, 100%);
      background: var(--cream);
      border: 1px solid var(--gold);
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
    }

    .confirmBox h3 {
      margin: 0 0 10px;
      font-size: 20px;
      color: var(--navy);
    }

    .confirmBox p {
      margin: 0 0 16px;
      line-height: 1.5;
      color: var(--navy-soft);
      font-size: 14px;
    }

    .confirmActions {
      display: flex;
      gap: 10px;
    }

    .confirmActions button {
      flex: 1;
    }

    #logoutConfirmCancel {
      background: var(--slate);
    }

    #logoutConfirmOk {
      background: var(--navy);
    }

    .card.quickBranchOpen {
      height: auto !important;
      min-height: 345px;
      overflow: visible;
    }

    .card.quickBranchOpen .info {
      grid-template-columns: minmax(0, 1fr) 120px 150px 208px !important;
      align-items: start;
    }

    .card.quickBranchOpen .orderArea {
      display: block;
      height: auto;
      width: 100%;
    }

    .quickBranchDropdown {
      width: 100%;
      min-width: 172px;
      max-width: 208px;
      margin: 0;
    }

    .quickBranchDropdown .branchQtyRow,
    .branchSplitPanel .branchQtyRow {
      display: grid;
      grid-template-columns: minmax(52px, 1fr) minmax(78px, 96px);
      align-items: center;
      gap: 10px;
    }

    .quickBranchDropdown .branchQtyRow label,
    .branchSplitPanel .branchQtyRow label {
      flex: none;
      min-width: 0;
    }

    .quickBranchDropdown .branchQtyRow input,
    .branchSplitPanel .branchQtyRow input {
      width: 100%;
      min-width: 78px;
      max-width: none;
      justify-self: end;
    }

    .quickBranchDropdown .branchEditorActions button {
      padding: 10px 8px;
      font-size: 12px;
    }

    @media (max-width: 600px) {
      .card.quickBranchOpen .info {
        grid-template-columns: 1fr !important;
        gap: 8px;
      }

      .branchInputRow,
      .branchQtyRow {
        align-items: flex-start;
        flex-direction: column;
        gap: 5px;
      }

      .quickBranchDropdown .branchQtyRow,
      .branchSplitPanel .branchQtyRow {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        align-items: center;
        gap: 8px;
      }

      .branchInputRow label,
      .branchQtyRow label {
        flex: 0 0 auto;
      }

      .quickBranchDropdown .branchQtyRow label,
      .branchSplitPanel .branchQtyRow label {
        flex: none;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 100%;
      }

      .branchQtyRow input {
        max-width: none;
        width: 100%;
      }

      .quickBranchDropdown .branchQtyRow input,
      .branchSplitPanel .branchQtyRow input {
        min-width: 0;
        max-width: none;
        width: 100%;
        justify-self: auto;
      }

      .quickBranchDropdown .branchQtyControl,
      .branchSplitPanel .branchQtyControl {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) 34px;
        align-items: center;
        gap: 8px;
        width: 100%;
      }

      .quickBranchDropdown .branchQtyStepper,
      .branchSplitPanel .branchQtyStepper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 40px;
        padding: 0;
        border: none;
        border-radius: 9px;
        background: var(--navy);
        color: var(--gold-light);
        font-size: 18px;
        font-weight: bold;
        line-height: 1;
      }

      .quickBranchDropdown {
        min-width: 0;
        max-width: none;
        width: 100%;
      }

      .qtyControls {
        width: 168px;
      }

      .qtyInput {
        width: 72px;
      }

      .cartRow .qtyInput {
        flex: 0 0 72px;
      }

      .card.quickBranchOpen {
        min-height: 345px;
      }
    }

    @media (max-width: 1100px) and (min-width: 601px) {
      .card.quickBranchOpen .info {
        grid-template-columns: minmax(0, 1fr) 85px 95px 100px 120px 208px !important;
      }
    }

    @media (max-width: 380px) {
      .card.quickBranchOpen {
        min-height: 405px;
      }
    }
  `;
}

function goBackToTop(){
  const grid = document.getElementById("productGrid");
  const cartPanel = document.getElementById("cartPanel");

  if(grid){
    grid.scrollTop = 0;
  }

  if(cartPanel && !cartPanel.classList.contains("hidden")){
    cartPanel.scrollTop = 0;
  }

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function resetBarsToLeft(){
  const sizeBar = document.querySelector(".pcdMenu");
  const brandBar = document.getElementById("brandCategoryBar") || document.querySelector(".categoryMenu");

  function forceLeft(el){
    if(!el) return;

    el.scrollLeft = 0;

    requestAnimationFrame(() => {
      el.scrollLeft = 0;
    });

    setTimeout(() => {
      el.scrollLeft = 0;
    }, 50);

    setTimeout(() => {
      el.scrollLeft = 0;
    }, 150);

    setTimeout(() => {
      el.scrollLeft = 0;
    }, 300);

    setTimeout(() => {
      el.scrollLeft = 0;
    }, 600);
  }

  forceLeft(sizeBar);
  forceLeft(brandBar);
}

function renderAndStayTop(){
  ensureAplusVietnamCategoryButton();
  updateActiveButtons();
  showCachedCategory();
  goBackToTop();
}

function brandLogoMissing(img){
  const button = img.closest("button");

  if(button){
    button.classList.add("logoMissing");
  }

  img.style.display = "none";
}

async function loadProducts(){
  try{
    const res = await fetch('products.json?refresh=' + Date.now(), {
      cache: 'no-store'
    });

    latestProductsJsonText = await res.text();
    products = JSON.parse(latestProductsJsonText);

    assignInternalSkus();
    buildProductCardsOnce();
    showCachedCategory();
    updateActiveButtons();
    updateClearSearchButton();
    resetBarsToLeft();
  }catch(err){
    console.error("Cannot load products.json:", err);

    const grid = document.getElementById("productGrid");
    if(grid){
      grid.innerHTML = `
        <div style="background:white;padding:20px;border-radius:10px;font-weight:bold;color:#b00020;">
          products.json error. Please export products.json again.
        </div>
      `;
    }
  }
}

async function autoRefreshProducts(){
  try{
    const res = await fetch('products.json?refresh=' + Date.now(), {
      cache: 'no-store'
    });

    const newText = await res.text();

    if(newText === latestProductsJsonText){
      return;
    }

    latestProductsJsonText = newText;
    products = JSON.parse(newText);

    assignInternalSkus();

    categoryCardCache = {};
    cardBySku = {};

    buildProductCardsOnce();

    Object.keys(cart).forEach(sku => {
      const stillExists = products.some(p => getProductSku(p) === sku && shouldShowProduct(p));

      if(!stillExists){
        delete cart[sku];

        if(activeBranchSku === sku){
          activeBranchSku = "";
        }

        if(quickBranchSku === sku){
          quickBranchSku = "";
        }
      }
    });

    renderCart();
    showCachedCategory();
    updateCartCountOnly();
    resetBarsToLeft();

    console.log("products.json updated automatically");

  }catch(err){
    console.log("Auto refresh failed:", err);
  }
}

function assignInternalSkus(){
  products.forEach((p, index) => {
    const existingSku = cleanValue(
      p.__sku ||
      p.sku ||
      p.SKU
    );

    if(existingSku){
      p.__sku = existingSku;
      return;
    }

    const brand = getProductCategoryBrand(p);
    const description = getProductDescription(p);
    const photo = getProductPhotoText(p);
    const price = getProductPrice(p);
    const status = getProductStatus(p);

    p.__sku = `${index}-${brand}-${description}-${photo}-${price}-${status}`;
  });
}

function cleanValue(value){
  if(value === null || value === undefined) return "";
  return String(value).trim();
}

function parsePositiveInteger(value){
  const qty = parseInt(String(value || "").trim(), 10);

  if(isNaN(qty) || qty <= 0){
    return 0;
  }

  return qty;
}

function sanitizeBranchNames(list){
  const seen = new Set();
  const result = [];

  (list || []).forEach(name => {
    const cleaned = cleanValue(name);
    const normalized = cleaned.toUpperCase();

    if(!cleaned || seen.has(normalized)){
      return;
    }

    seen.add(normalized);
    result.push(cleaned);
  });

  return result;
}

function getExpandedBranchSlotCount(requiredCount){
  const baseCount = Math.max(DEFAULT_BRANCH_SLOT_COUNT, parsePositiveInteger(requiredCount));

  if(baseCount <= DEFAULT_BRANCH_SLOT_COUNT){
    return DEFAULT_BRANCH_SLOT_COUNT;
  }

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

function normalizeBranchNameSlots(list){
  const source = Array.isArray(list) ? list : [];
  const slots = new Array(getExpandedBranchSlotCount(source.length)).fill("");
  const seen = new Set();

  source.forEach((name, index) => {
    const cleaned = cleanValue(name);
    const normalized = cleaned.toUpperCase();

    if(!cleaned || seen.has(normalized)){
      return;
    }

    seen.add(normalized);
    slots[index] = cleaned;
  });

  return slots;
}

function getConfiguredBranchNames(){
  return branchNames.filter(Boolean);
}

function hasConfiguredBranchNames(){
  return getConfiguredBranchNames().length > 0;
}

function getLastConfiguredBranchIndex(){
  for(let i = branchNames.length - 1; i >= 0; i--){
    if(cleanValue(branchNames[i])){
      return i;
    }
  }

  return -1;
}

function resetBranchSettingVisibleCount(){
  branchSettingVisibleCount = getExpandedBranchSlotCount(getLastConfiguredBranchIndex() + 1);
}

function getBranchQtyTotal(branchMap){
  return Object.values(branchMap || {}).reduce((total, qty) => {
    return total + parsePositiveInteger(qty);
  }, 0);
}

function loadBranchNames(){
  try{
    const raw = localStorage.getItem(BRANCH_NAMES_STORAGE_KEY);
    branchNames = normalizeBranchNameSlots(JSON.parse(raw || "[]"));
  }catch(err){
    branchNames = new Array(DEFAULT_BRANCH_SLOT_COUNT).fill("");
  }

  resetBranchSettingVisibleCount();
}

function saveBranchNames(){
  localStorage.setItem(BRANCH_NAMES_STORAGE_KEY, JSON.stringify(branchNames));
}

function normalizeCartItem(sku){
  const item = cart[sku];

  if(!item){
    return null;
  }

  if(typeof item === "number"){
    cart[sku] = {
      qty: item,
      branches: {}
    };

    return cart[sku];
  }

  if(typeof item === "object"){
    item.qty = parsePositiveInteger(item.qty);

    if(!item.branches || typeof item.branches !== "object"){
      item.branches = {};
    }

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

    if(activeBranchSku === sku){
      activeBranchSku = "";
    }

    if(quickBranchSku === sku){
      quickBranchSku = "";
    }

    return;
  }

  const item = getCartItem(sku) || { qty: 0, branches: {} };
  item.qty = qty;
  cart[sku] = item;
}

function hasBranchSplit(sku){
  return Object.values(getCartBranches(sku)).some(qty => Number(qty) > 0);
}

function getBranchTotal(sku){
  return getBranchQtyTotal(getCartBranches(sku));
}

function getBranchPreviewHtml(sku){
  const parts = Object.entries(getCartBranches(sku))
    .filter(([, qty]) => Number(qty) > 0)
    .map(([name, qty]) => `${escapeHtml(name)}: ${qty}`);

  if(parts.length === 0){
    return "";
  }

  return `<div class="branchPreview">${parts.join(" | ")}</div>`;
}

function scrollProductCardIntoView(sku){
  const card = cardBySku[sku];
  const grid = document.getElementById("productGrid");

  if(!card){
    return;
  }

  const scrollToCard = () => {
    if(grid && grid.scrollHeight > grid.clientHeight){
      const gridRect = grid.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const top = grid.scrollTop + (cardRect.top - gridRect.top) - 12;

      grid.scrollTo({
        top: Math.max(top, 0),
        behavior: "smooth"
      });

      return;
    }

    const header = document.getElementById("mainHeader");
    const brandBar = document.getElementById("brandCategoryBar") || document.querySelector(".categoryMenu");
    const headerBottom = Math.max(
      header ? header.getBoundingClientRect().bottom : 0,
      brandBar ? brandBar.getBoundingClientRect().bottom : 0
    );
    const rect = card.getBoundingClientRect();
    const top = window.scrollY + rect.top - headerBottom - 12;

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: "smooth"
    });
  };

  requestAnimationFrame(scrollToCard);
  setTimeout(scrollToCard, 220);
}

function scrollCartItemIntoView(sku){
  const cartPanel = document.getElementById("cartPanel");
  if(!cartPanel || cartPanel.classList.contains("hidden")){
    return;
  }

  const scrollToRow = () => {
    const row = cartPanel.querySelector(`.cartRow[data-sku="${cssEscapeValue(sku)}"]`);
    if(!row){
      return;
    }

    const panelRect = cartPanel.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const top = cartPanel.scrollTop + (rowRect.top - panelRect.top) - 12;

    cartPanel.scrollTo({
      top: Math.max(top, 0),
      behavior: "smooth"
    });
  };

  requestAnimationFrame(scrollToRow);
  setTimeout(scrollToRow, 180);
}

function isPhoneBranchEditorLayout(){
  return window.matchMedia("(max-width: 600px)").matches;
}

function restorePlainQtyProductCardAfterTyping(sku, shouldRestore){
  if(!shouldRestore || !isPhoneBranchEditorLayout() || hasConfiguredBranchNames()){
    return;
  }

  setTimeout(() => scrollProductCardIntoView(sku), 120);
  setTimeout(() => scrollProductCardIntoView(sku), 320);
}

function scrollWithinProductGrid(delta, behavior = "smooth"){
  if(Math.abs(delta) < 2){
    return;
  }

  const grid = document.getElementById("productGrid");

  if(grid && grid.scrollHeight > grid.clientHeight){
    grid.scrollTo({
      top: Math.max(grid.scrollTop + delta, 0),
      behavior
    });
    return;
  }

  window.scrollTo({
    top: Math.max(window.scrollY + delta, 0),
    behavior
  });
}

function keepQuickBranchEditorVisible(sku, input){
  if(!isPhoneBranchEditorLayout()){
    return;
  }

  const card = cardBySku[sku];
  if(!card){
    return;
  }

  const editor = card.querySelector(".quickBranchDropdown");
  if(!editor){
    return;
  }

  const header = document.getElementById("mainHeader");
  const brandBar = document.getElementById("brandCategoryBar") || document.querySelector(".categoryMenu");
  const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const safeTop = Math.max(
    header ? header.getBoundingClientRect().bottom : 0,
    brandBar ? brandBar.getBoundingClientRect().bottom : 0
  ) + 8;
  const safeBottom = Math.max(safeTop + 80, viewportHeight - 14);
  const targetRect = (input || editor).getBoundingClientRect();
  const nextRowAllowance = 56;
  const requiredBottom = targetRect.bottom + nextRowAllowance;

  if(requiredBottom > safeBottom){
    scrollWithinProductGrid(requiredBottom - safeBottom);
  }
}

function syncQuickBranchEditorPosition(sku, input){
  if(!isPhoneBranchEditorLayout()){
    return;
  }

  keepQuickBranchEditorVisible(sku, input);
  setTimeout(() => keepQuickBranchEditorVisible(sku, input), 140);
}

function handleQuickBranchInputFocus(sku, input){
  syncQuickBranchEditorPosition(sku, input);
}

function handleQuickBranchInputInput(sku, input){
  return;
}

function changeBranchQtyInput(button, sku, delta){
  const control = button.closest(".branchQtyControl");
  if(!control){
    return;
  }

  const input = control.querySelector("input[data-branch-name]");
  if(!input){
    return;
  }

  const currentQty = parsePositiveInteger(input.value);
  const nextQty = Math.max(0, currentQty + delta);

  input.value = String(nextQty);
}

function tapBranchQtyButton(event, button, sku, delta){
  event.preventDefault();
  event.stopPropagation();

  if(event.type === "pointerdown"){
    const pointerType = event.pointerType || "";
    if(pointerType && pointerType !== "touch" && pointerType !== "pen" && pointerType !== "mouse"){
      return;
    }
  }

  changeBranchQtyInput(button, sku, delta);
}

function restoreProductCardAfterBranchEdit(sku){
  const active = document.activeElement;
  if(active && typeof active.blur === "function" && active.closest && active.closest(".quickBranchDropdown")){
    active.blur();
  }

  scrollProductCardIntoView(sku);

  if(isPhoneBranchEditorLayout()){
    setTimeout(() => scrollProductCardIntoView(sku), 180);
    setTimeout(() => scrollProductCardIntoView(sku), 420);
  }
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

function openLogoutConfirm(){
  const overlay = document.getElementById("logoutConfirmOverlay");
  if(!overlay) return;

  overlay.classList.remove("hidden");

  const cancelButton = document.getElementById("logoutConfirmCancel");
  if(cancelButton){
    setTimeout(() => cancelButton.focus(), 30);
  }
}

function closeLogoutConfirm(){
  const overlay = document.getElementById("logoutConfirmOverlay");
  if(!overlay) return;

  overlay.classList.add("hidden");
}

function performLogout(options = {}){
  const skipServerLogout = Boolean(options.skipServerLogout);
  const message = cleanValue(options.message);

  closeLogoutConfirm();

  if(getAuthToken() && !skipServerLogout){
    apiRequest("/api/logout", { method:"POST" }).catch(error => {
      console.warn("Server logout skipped:", error);
    });
  }

  clearAuthToken();
  clearCurrentUser();
  localStorage.removeItem(BRANCH_NAMES_STORAGE_KEY);

  customerName = "";
  customerUsername = "";
  cart = {};
  branchNames = new Array(DEFAULT_BRANCH_SLOT_COUNT).fill("");
  branchSettingVisibleCount = DEFAULT_BRANCH_SLOT_COUNT;
  activeBranchSku = "";
  quickBranchSku = "";
  branchSettingOpen = false;

  resetFiltersToAll();
  resetBarsToLeft();

  document.getElementById('search').value = "";
  updateClearSearchButton();

  renderCart();
  closePhotoViewer();

  document.getElementById('loginUsername').value = "";
  document.getElementById('loginPassword').value = "";
  document.getElementById('loginError').textContent = "";
  document.getElementById('loginStatus').textContent = message;
  document.getElementById('cartPanel').classList.add('hidden');
  showLoginView();
  document.getElementById('loginScreen').classList.remove('hidden');

  updateAllProductOrderAreas();
  renderAndStayTop();
}

function saveBranchSettings(){
  const inputs = document.querySelectorAll("#branchSettingPanel input[data-branch-index]");
  const names = Array.from(inputs).map(input => cleanValue(input.value));
  branchNames = normalizeBranchNameSlots(names);
  resetBranchSettingVisibleCount();
  quickBranchSku = "";
  saveBranchNames();

  const configuredBranchNames = getConfiguredBranchNames();

  Object.keys(cart).forEach(sku => {
    const item = getCartItem(sku);
    if(!item) return;

    Object.keys(item.branches).forEach(name => {
      if(!configuredBranchNames.includes(name)){
        delete item.branches[name];
      }
    });

    const branchTotal = getBranchQtyTotal(item.branches);

    if(branchTotal > 0){
      item.qty = branchTotal;
    }else{
      item.branches = {};
    }
  });

  branchSettingOpen = false;
  renderCart();
  updateAllProductOrderAreas();
}

function focusQuickBranchDropdown(sku){
  setTimeout(() => {
    const card = cardBySku[sku];
    if(!card) return;

    const firstBranchQty = card.querySelector(".quickBranchDropdown input[data-branch-name]");
    if(firstBranchQty){
      firstBranchQty.focus();
      firstBranchQty.select();
      syncQuickBranchEditorPosition(sku, firstBranchQty);
    }
  }, 50);
}

function focusCartBranchSplit(sku){
  setTimeout(() => {
    const firstBranchQty = document.querySelector(`.cartRow[data-sku="${cssEscapeValue(sku)}"] .branchSplitPanel input[data-branch-name]`);
    if(firstBranchQty){
      firstBranchQty.focus();
      firstBranchQty.select();
    }
  }, 50);
}

function isCartPanelOpen(){
  const cartPanel = document.getElementById("cartPanel");
  return !!cartPanel && !cartPanel.classList.contains("hidden");
}

function openBranchQuantityEditor(sku){
  if(!hasConfiguredBranchNames() || getCartQty(sku) <= 0){
    return false;
  }

  if(isCartPanelOpen()){
    activeBranchSku = sku;
    quickBranchSku = "";
    branchSettingOpen = false;
    renderCart();
    updateProductOrderArea(sku);
    focusCartBranchSplit(sku);
    return true;
  }

  const previousQuickSku = quickBranchSku;
  activeBranchSku = "";
  quickBranchSku = sku;

  if(previousQuickSku && previousQuickSku !== sku){
    updateProductOrderArea(previousQuickSku);
  }

  updateProductOrderArea(sku);
  focusQuickBranchDropdown(sku);
  return true;
}

function addToCartFromProduct(sku){
  if(hasConfiguredBranchNames() && getCartQty(sku) === 0){
    const previousQuickSku = quickBranchSku;
    quickBranchSku = quickBranchSku === sku ? "" : sku;

    if(previousQuickSku && previousQuickSku !== sku){
      updateProductOrderArea(previousQuickSku);
    }

    updateProductOrderArea(sku);

    if(quickBranchSku === sku){
      focusQuickBranchDropdown(sku);
    }

    return;
  }

  changeQty(sku, 1);
}

function saveQuickBranchDropdown(sku){
  const card = cardBySku[sku];
  if(!card) return;

  const inputs = card.querySelectorAll(".quickBranchDropdown input[data-branch-name]");
  const branches = {};
  let total = 0;

  inputs.forEach(input => {
    const name = cleanValue(input.dataset.branchName);
    const qty = parsePositiveInteger(input.value);

    if(qty > 0){
      branches[name] = qty;
      total += qty;
    }
  });

  if(total <= 0){
    if(getCartQty(sku) > 0){
      delete cart[sku];
      quickBranchSku = "";
      renderCart();
      updateProductOrderArea(sku);
      restoreProductCardAfterBranchEdit(sku);
      return;
    }

    alert("Please enter branch quantity.");
    return;
  }

  cart[sku] = {
    qty: total,
    branches
  };

  quickBranchSku = "";
  renderCart();
  updateProductOrderArea(sku);
  restoreProductCardAfterBranchEdit(sku);
}

function cancelQuickBranchDropdown(sku){
  if(quickBranchSku === sku){
    quickBranchSku = "";
  }

  updateProductOrderArea(sku);
  restoreProductCardAfterBranchEdit(sku);
}

function renderBranchSettingPanel(){
  const panel = document.getElementById("branchSettingPanel");

  if(!panel){
    return;
  }

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
        <input
          type="text"
          maxlength="40"
          value="${escapeHtml(branchNames[i] || "")}"
          placeholder="Branch name"
          data-branch-index="${i}"
        >
      </div>
    `);
  }

  const addMoreButton = `<button type="button" onclick="showMoreBranchSettings()">Add More Branch</button>`;

  panel.innerHTML = `
    <h3>Branch Setting</h3>
    ${rows.join("")}
    ${addMoreButton}
    <div class="branchEditorActions">
      <button type="button" onclick="saveBranchSettings()">Save Branch Names</button>
      <button type="button" onclick="closeBranchSettings()">Cancel</button>
    </div>
  `;
}

function toggleBranchSplit(sku){
  if(!hasConfiguredBranchNames()){
    alert("Please set branch names first.");
    return;
  }

  activeBranchSku = activeBranchSku === sku ? "" : sku;
  renderCart();
}

function renderBranchSplitPanel(sku){
  if(activeBranchSku !== sku || !hasConfiguredBranchNames()){
    return "";
  }

  const branches = getCartBranches(sku);
  const rows = getConfiguredBranchNames().map(name => `
    <div class="branchQtyRow">
      <label>${escapeHtml(name)}</label>
      <div class="branchQtyControl">
        <button
          type="button"
          class="branchQtyStepper"
          onpointerdown="tapBranchQtyButton(event, this, '${escapeJsString(sku)}', -1)"
          onclick="event.preventDefault(); event.stopPropagation()"
        >-</button>
        <input
          type="number"
          min="0"
          inputmode="numeric"
          value="${branches[name] || ""}"
          data-branch-name="${escapeHtml(name)}"
          placeholder="0"
        >
        <button
          type="button"
          class="branchQtyStepper"
          onpointerdown="tapBranchQtyButton(event, this, '${escapeJsString(sku)}', 1)"
          onclick="event.preventDefault(); event.stopPropagation()"
        >+</button>
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

    if(qty > 0){
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

  const item = getCartItem(sku);
  if(!item) return;

  item.qty = total;
  item.branches = branches;
  activeBranchSku = "";
  renderCart();
  updateProductOrderArea(sku);
  scrollCartItemIntoView(sku);
}

function cancelBranchSplit(sku){
  if(activeBranchSku === sku){
    activeBranchSku = "";
  }

  renderCart();
  scrollCartItemIntoView(sku);
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

function getProductBrand(product){
  return getProductCategoryBrand(product);
}

function getProductDescription(product){
  return cleanValue(
    product["Product Descriptions"] ||
    product["PRODUCT DESCRIPTIONS"] ||
    product["Product Description"] ||
    product["product descriptions"] ||
    product["description"]
  );
}

function getProductPhotoText(product){
  return cleanValue(
    product["PHOTO"] ||
    product["Photo"] ||
    product["photo"]
  );
}

function getProductPhotoUrl(product){
  let url = cleanValue(
    product["PHOTO_URL"] ||
    product["Photo URL"] ||
    product["photoUrl"] ||
    product["photo_url"]
  );

  if(!url) return "";

  if(url.includes("/d/")){
    const fileId = url.split("/d/")[1].split("/")[0];
    return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1200&cache=" + Date.now();
  }

  if(url.includes("id=")){
    const fileId = url.split("id=")[1].split("&")[0];
    return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1200&cache=" + Date.now();
  }

  return url;
}

function getProductPrice(product){
  return cleanValue(
    product["PRICE"] ||
    product["Price"] ||
    product["price"]
  );
}

function getProductStatus(product){
  return cleanValue(
    product["STATUS"] ||
    product["Status"] ||
    product["status"]
  );
}

function getProductRowColor(product){
  return cleanValue(
    product["rowColor"] ||
    product["ROW_COLOR"] ||
    product["Row Color"]
  );
}

function getStatusBgColor(product){
  return cleanValue(
    product["statusBgColor"] ||
    product["STATUS_BG_COLOR"] ||
    product["Status Bg Color"]
  );
}

function getStatusFontColor(product){
  return cleanValue(
    product["statusFontColor"] ||
    product["STATUS_FONT_COLOR"] ||
    product["Status Font Color"]
  );
}

function getProductSizeFilter(product){
  const desc = getProductDescription(product).toUpperCase();

  let match = desc.match(/R\s?(\d{2})/);

  if(match){
    return "R" + match[1];
  }

  match = desc.match(/(\d{2})R/);

  if(match){
    return "R" + match[1];
  }

  return "";
}

function getProductYear(product){
  const allText = `
    ${getProductDescription(product)}
    ${getProductStatus(product)}
  `.toUpperCase();

  const match = allText.match(/Y\s?(20|21|22|23|24|25|26)/);

  if(match){
    return "Y" + match[1];
  }

  return "";
}

function shouldShowProduct(product){
  const brand = getProductCategoryBrand(product);
  const description = getProductDescription(product);
  const photo = getProductPhotoText(product);
  const photoUrl = getProductPhotoUrl(product);
  const price = getProductPrice(product);
  const status = getProductStatus(product);

  const statusText = status.toLowerCase();

  if(!brand && !description && !photo && !photoUrl && !price && !status){
    return false;
  }

  if(statusText.includes("sold out")){
    return false;
  }

  if(statusText.includes("not available")){
    return false;
  }

  if(statusText.includes("no stock")){
    return false;
  }

  if(statusText.includes("out of stock")){
    return false;
  }

  if(statusText.includes("#n/a")){
    return false;
  }

  return true;
}

function isValidWhatsappNumber(phone){
  phone = phone.replace(/\D/g, '');
  return /^60\d{8,10}$/.test(phone);
}

function normalizeWhatsappNumber(value){
  return cleanValue(value).replace(/\D/g, "");
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

function getAuthToken(){
  return cleanValue(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
}

function setAuthToken(token){
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, cleanValue(token));
}

function clearAuthToken(){
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function apiUrl(path){
  return `${API_BASE_URL}${path}`;
}

function needsPublicApiServer(){
  return window.location.hostname.endsWith("github.io") && !API_BASE_URL;
}

async function apiRequest(path, options = {}){
  if(needsPublicApiServer()){
    throw new Error("Online login server is not connected yet. Please set GR_RACING_API_BASE_URL to your public server URL.");
  }

  const headers = Object.assign({ "Content-Type":"application/json" }, options.headers || {});
  const token = getAuthToken();

  if(token){
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try{
    response = await fetch(apiUrl(path), Object.assign({}, options, {
      headers,
      cache:"no-store"
    }));
  }catch(error){
    throw new Error("Login server cannot be reached. Please check the public server URL.");
  }

  let data = {};

  try{
    data = await response.json();
  }catch(error){
    data = {};
  }

  if(!response.ok){
    if(response.status === 404 || response.status === 405){
      const error = new Error("Signup server not found. Please open the app from the PC server link with :8787.");
      error.status = response.status;
      throw error;
    }

    const error = new Error(data.error || "Server request failed.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function getAccounts(){
  const accounts = readJsonStorage(ACCOUNTS_STORAGE_KEY, []);
  return Array.isArray(accounts) ? accounts : [];
}

function saveAccounts(accounts){
  writeJsonStorage(ACCOUNTS_STORAGE_KEY, Array.isArray(accounts) ? accounts : []);
}

async function importLocalAccountsToServer(){
  if(localStorage.getItem(LOCAL_ACCOUNT_IMPORT_STORAGE_KEY) === "1"){
    return;
  }

  const accounts = getAccounts()
    .filter(account => account && account.username && account.password);

  if(accounts.length === 0){
    localStorage.setItem(LOCAL_ACCOUNT_IMPORT_STORAGE_KEY, "1");
    return;
  }

  const payload = accounts.map(account => ({
    companyName:account.companyName,
    ssmNumber:account.ssmNumber,
    whatsappNumber:account.whatsappNumber,
    username:account.username,
    password:account.password,
    createdAt:account.createdAt
  }));

  await apiRequest("/api/import-local-accounts", {
    method:"POST",
    body:JSON.stringify({ accounts:payload })
  });

  localStorage.setItem(LOCAL_ACCOUNT_IMPORT_STORAGE_KEY, "1");
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
    const el = document.getElementById(id);
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
    const el = document.getElementById(id);
    if(el) el.textContent = "";
  });
}

function showLoginScreen(){
  document.getElementById("loginScreen").classList.remove("hidden");
}

function hideLoginScreen(){
  document.getElementById("loginScreen").classList.add("hidden");
}

function applyLoggedInUser(user){
  customerName = cleanValue(user.companyName || user.customerName || user.name || user.username);
  customerUsername = cleanValue(user.username);
  hideLoginScreen();
}

function forceLogin(message){
  performLogout({
    skipServerLogout:true,
    message:message || "Please log in again."
  });
}

async function validateCurrentSession(options = {}){
  const token = getAuthToken();
  const currentUser = getCurrentUser();

  if(!token || !currentUser || !currentUser.username){
    clearAuthToken();
    clearCurrentUser();
    if(!options.silent){
      showLoginScreen();
    }
    return false;
  }

  try{
    const data = await apiRequest("/api/session");
    const user = Object.assign({}, data.account, {
      loginAt:currentUser.loginAt || new Date().toISOString(),
      deviceInfo:getDeviceInfo()
    });

    setCurrentUser(user);
    applyLoggedInUser(user);
    return true;
  }catch(error){
    if(error.status !== 401){
      applyLoggedInUser(currentUser);
      return true;
    }

    forceLogin("This account is no longer active. Please contact admin.");
    return false;
  }
}

function startAuthEventListener(){
  if(authEventSource || !window.EventSource || needsPublicApiServer()){
    return;
  }

  authEventSource = new EventSource(apiUrl("/api/events"));

  authEventSource.addEventListener("accounts", event => {
    let payload = {};

    try{
      payload = JSON.parse(event.data || "{}");
    }catch(error){
      payload = {};
    }

    const currentUser = getCurrentUser();

    if(
      payload.action === "removed" &&
      currentUser &&
      currentUser.id &&
      payload.accountId === currentUser.id
    ){
      forceLogin("This account was removed. Please contact admin.");
    }
  });

  authEventSource.onerror = () => {
    validateCurrentSession({ silent:true });
  };
}

function requireLogin(){
  const currentUser = getCurrentUser();

  if(currentUser && currentUser.username && getAuthToken()){
    applyLoggedInUser(currentUser);
    return true;
  }

  showLoginScreen();
  return false;
}

async function handleLogin(event){
  event.preventDefault();
  clearLoginMessages();

  const username = cleanValue(document.getElementById("loginUsername").value);
  const password = cleanValue(document.getElementById("loginPassword").value);

  if(!username || !password){
    document.getElementById("loginError").textContent = "Please enter username and password.";
    return;
  }

  try{
    await importLocalAccountsToServer();

    const data = await apiRequest("/api/login", {
      method:"POST",
      body:JSON.stringify({
        username,
        password,
        deviceInfo:getDeviceInfo()
      })
    });

    const user = Object.assign({}, data.account, {
      loginAt:new Date().toISOString(),
      deviceInfo:getDeviceInfo()
    });

    setAuthToken(data.token);
    setCurrentUser(user);
    applyLoggedInUser(user);
    document.getElementById("loginPassword").value = "";
    renderAndStayTop();
  }catch(error){
    document.getElementById("loginError").textContent = error.message || "Wrong username or password.";
  }
}

async function handleSignup(event){
  event.preventDefault();
  clearLoginMessages();

  const companyName = cleanValue(document.getElementById("signupCompanyName").value);
  const ssmNumber = cleanValue(document.getElementById("signupSsmNumber").value);
  const tinNumber = cleanValue(document.getElementById("signupTinNumber").value);
  const businessAddress1 = cleanValue(document.getElementById("signupBusinessAddress1").value);
  const businessAddress2 = cleanValue(document.getElementById("signupBusinessAddress2").value);
  const businessAddress3 = cleanValue(document.getElementById("signupBusinessAddress3").value);
  const whatsappNumber = normalizeWhatsappNumber(document.getElementById("signupWhatsappNumber").value);
  const contactPerson = cleanValue(document.getElementById("signupContactPerson").value);
  const contactNumber = normalizeWhatsappNumber(document.getElementById("signupContactNumber").value);
  const username = cleanValue(document.getElementById("signupUsername").value);
  const password = cleanValue(document.getElementById("signupPassword").value);
  const confirmPassword = cleanValue(document.getElementById("signupConfirmPassword").value);

  if(!companyName || !ssmNumber || !tinNumber || !businessAddress1 || !businessAddress2 || !businessAddress3 || !whatsappNumber || !contactPerson || !contactNumber || !username || !password || !confirmPassword){
    document.getElementById("signupError").textContent = "Please complete every field.";
    return;
  }

  if(!isValidWhatsappNumber(whatsappNumber)){
    document.getElementById("signupError").textContent = "Please enter a valid WhatsApp number. Example: 60123456789";
    return;
  }

  if(!isValidWhatsappNumber(contactNumber)){
    document.getElementById("signupError").textContent = "Please enter a valid contact number. Example: 60123456789";
    return;
  }

  if(password !== confirmPassword){
    document.getElementById("signupError").textContent = "Password and confirm password do not match.";
    return;
  }

  try{
    await apiRequest("/api/signup", {
      method:"POST",
      body:JSON.stringify({
        companyName,
        ssmNumber,
        tinNumber,
        businessAddress1,
        businessAddress2,
        businessAddress3,
        whatsappNumber,
        contactPerson,
        contactNumber,
        username,
        password
      })
    });

    document.getElementById("loginUsername").value = username;
    document.getElementById("loginPassword").value = password;
    document.getElementById("loginStatus").textContent = "Account created. You can login from any tab using the server.";
    document.getElementById("signupForm").reset();
    showLoginView();
  }catch(error){
    document.getElementById("signupError").textContent = error.message || "Unable to create account.";
  }
}

async function handleForgotVerify(event){
  event.preventDefault();
  clearLoginMessages();

  const ssmNumber = cleanValue(document.getElementById("forgotSsmNumber").value);
  const whatsappNumber = normalizeWhatsappNumber(document.getElementById("forgotWhatsappNumber").value);

  try{
    const data = await apiRequest("/api/forgot/verify", {
      method:"POST",
      body:JSON.stringify({
        ssmNumber,
        whatsappNumber
      })
    });

    passwordResetUsername = cleanValue(data.resetToken);
    showResetPasswordView();
  }catch(error){
    document.getElementById("forgotPasswordError").textContent = error.message || "Account not found.";
  }
}

async function handlePasswordReset(event){
  event.preventDefault();
  clearLoginMessages();

  const password = cleanValue(document.getElementById("resetPassword").value);
  const confirmPassword = cleanValue(document.getElementById("resetConfirmPassword").value);

  if(!password || !confirmPassword){
    document.getElementById("resetPasswordError").textContent = "Please enter and confirm new password.";
    return;
  }

  if(password !== confirmPassword){
    document.getElementById("resetPasswordError").textContent = "Password and confirm password do not match.";
    return;
  }

  try{
    const data = await apiRequest("/api/forgot/reset", {
      method:"POST",
      body:JSON.stringify({
        resetToken:passwordResetUsername,
        password
      })
    });

    document.getElementById("loginUsername").value = cleanValue(data.username);
    document.getElementById("loginPassword").value = password;
    document.getElementById("loginStatus").textContent = "Password reset done. You can login now.";
    document.getElementById("resetPasswordForm").reset();
    passwordResetUsername = "";
    showLoginView();
  }catch(error){
    document.getElementById("resetPasswordError").textContent = error.message || "Unable to reset password.";
  }
}

function togglePasswordVisibility(button){
  const input = document.getElementById(button.dataset.passwordToggle || "");
  if(!input) return;

  const shouldShow = input.type === "password";
  input.type = shouldShow ? "text" : "password";
  button.textContent = shouldShow ? "Hide" : "Show";
}

function bindLoginEvents(){
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("signupForm").addEventListener("submit", handleSignup);
  document.getElementById("forgotPasswordForm").addEventListener("submit", handleForgotVerify);
  document.getElementById("resetPasswordForm").addEventListener("submit", handlePasswordReset);

  document.querySelectorAll("[data-password-toggle]").forEach(button => {
    button.addEventListener("click", () => togglePasswordVisibility(button));
  });

  document.getElementById("showSignupButton").addEventListener("click", () => {
    clearLoginMessages();
    showSignupView();
  });

  document.getElementById("backToLoginButton").addEventListener("click", () => {
    clearLoginMessages();
    showLoginView();
  });

  document.getElementById("showForgotPasswordButton").addEventListener("click", () => {
    clearLoginMessages();
    showForgotPasswordView();
  });

  document.getElementById("forgotBackToLoginButton").addEventListener("click", () => {
    clearLoginMessages();
    showLoginView();
  });

  document.getElementById("resetBackToLoginButton").addEventListener("click", () => {
    clearLoginMessages();
    showLoginView();
  });
}

function resetFiltersToAll(){
  currentCategory = "ALL";
  currentYearFilter = "";
  currentSizeFilter = "";
}

function checkLogin(){
  return requireLogin();
}

document.getElementById('logoutButton').onclick = () => {
  openLogoutConfirm();
};

function showCategory(category){
  if(brandCategories.includes(category)){
    currentCategory = category;
  }

  renderAndStayTop();
}

function showYearDropdown(event){
  if(event){
    event.stopPropagation();
  }

  const dropdown = document.getElementById('yearDropdown');
  const yearButton = document.getElementById('yearButton');

  if(!dropdown || !yearButton) return;

  const rect = yearButton.getBoundingClientRect();

  dropdown.style.left = rect.left + "px";
  dropdown.style.top = (rect.bottom + 6) + "px";

  dropdown.classList.toggle('hidden');
}

function showYear(year){
  if(currentYearFilter === year){
    currentYearFilter = "";
  }else{
    currentYearFilter = year;
  }

  const dropdown = document.getElementById('yearDropdown');

  if(dropdown){
    dropdown.classList.add('hidden');
  }

  renderAndStayTop();
}

function clearYear(){
  currentYearFilter = "";

  const dropdown = document.getElementById('yearDropdown');

  if(dropdown){
    dropdown.classList.add('hidden');
  }

  renderAndStayTop();
}

function showSize(size){
  if(currentSizeFilter === size){
    currentSizeFilter = "";
  }else{
    currentSizeFilter = size;
  }

  renderAndStayTop();
}

function productMatchesBrand(product){
  if(currentCategory === "ALL"){
    return true;
  }

  const brand = getProductCategoryBrand(product);
  const desc = getProductDescription(product).toUpperCase();

  if(currentCategory === "OTHERS"){
    return !mainBrandCategories.some(mainBrand => {
      return brand === mainBrand || desc.includes(mainBrand);
    });
  }

  return brand === currentCategory || desc.includes(currentCategory);
}

function productMatchesYear(product){
  if(!currentYearFilter){
    return true;
  }

  const year = getProductYear(product);
  const desc = getProductDescription(product).toUpperCase();

  return year === currentYearFilter || desc.includes(currentYearFilter);
}

function productMatchesSize(product){
  if(!currentSizeFilter){
    return true;
  }

  const size = getProductSizeFilter(product);
  const desc = getProductDescription(product).toUpperCase();

  return size === currentSizeFilter || desc.includes(currentSizeFilter);
}

function escapeRegExp(value){
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getKnownProductBrands(){
  const brandSet = new Set(mainBrandCategories);

  products.forEach(product => {
    const categoryBrand = getProductCategoryBrand(product);
    const displayBrand = getProductDisplayBrand(product);

    if(categoryBrand) brandSet.add(categoryBrand);
    if(displayBrand) brandSet.add(displayBrand);
  });

  return Array.from(brandSet).sort((a, b) => b.length - a.length);
}

function findExactBrandInSearch(searchValue){
  const normalizedSearch = cleanValue(searchValue).toUpperCase().replace(/\s+/g, " ");

  if(!normalizedSearch){
    return null;
  }

  const knownBrands = getKnownProductBrands();

  for(const brand of knownBrands){
    const escapedBrand = escapeRegExp(brand).replace(/\s+/g, "\\s+");
    const pattern = new RegExp(`(^|\\s)${escapedBrand}(?=\\s|$)`, "i");
    const match = normalizedSearch.match(pattern);

    if(match){
      const remainingSearch = normalizedSearch
        .replace(pattern, " ")
        .replace(/\s+/g, " ")
        .trim();

      return {
        brand,
        remainingTerms: remainingSearch.toLowerCase().split(/\s+/).filter(Boolean)
      };
    }
  }

  return null;
}

function updateActiveButtons(){
  document.querySelectorAll('.categoryMenu button').forEach(btn => {
    btn.classList.remove('active');

    const btnCategory = cleanValue(btn.dataset.category || btn.textContent).toUpperCase();

    if(btnCategory === currentCategory){
      btn.classList.add('active');
    }
  });

  document.querySelectorAll('.pcdMenu button').forEach(btn => {
    btn.classList.remove('active');

    if(btn.textContent.trim().toUpperCase() === currentSizeFilter){
      btn.classList.add('active');
    }
  });

  document.querySelectorAll('.yearDropdown button').forEach(btn => {
    btn.classList.remove('active');

    if(btn.textContent.trim().toUpperCase() === currentYearFilter){
      btn.classList.add('active');
    }
  });

  const yearButton = document.getElementById('yearButton');

  if(yearButton){
    if(currentYearFilter){
      yearButton.classList.add('active');
      yearButton.textContent = currentYearFilter;
    }else{
      yearButton.classList.remove('active');
      yearButton.textContent = "YEAR";
    }
  }
}

function buildProductCardsOnce(){
  const grid = document.getElementById('productGrid');

  if(!grid){
    return;
  }

  grid.innerHTML = "";
  categoryCardCache = {};
  cardBySku = {};

  const visibleProducts = products.filter(p => shouldShowProduct(p));

  categoryCardCache["ALL_PRODUCTS"] = visibleProducts.map(p => {
    const sku = getProductSku(p);
    const card = createProductCard(p);

    cardBySku[sku] = card;
    grid.appendChild(card);

    return card;
  });
}

function showCachedCategory(){
  const grid = document.getElementById('productGrid');

  if(!grid){
    return;
  }

  if(!categoryCardCache["ALL_PRODUCTS"]){
    buildProductCardsOnce();
  }

  const q = document.getElementById('search').value.trim();
  const exactSearchBrand = findExactBrandInSearch(q);
  const searchTerms = exactSearchBrand
    ? exactSearchBrand.remainingTerms
    : q.toLowerCase().split(/\s+/).filter(Boolean);

  categoryCardCache["ALL_PRODUCTS"].forEach(card => {
    const sku = card.dataset.sku;
    const p = products.find(x => getProductSku(x) === sku);

    if(!p || !shouldShowProduct(p)){
      card.style.display = "none";
      return;
    }

    const searchable = `
      ${getProductDisplayBrand(p)}
      ${getProductCategoryBrand(p)}
      ${getProductDescription(p)}
    `.toLowerCase();

    const productBrandMatchesSearchBrand = !exactSearchBrand ||
      getProductDisplayBrand(p) === exactSearchBrand.brand ||
      getProductCategoryBrand(p) === exactSearchBrand.brand;
    const matchSearch = productBrandMatchesSearchBrand && searchTerms.every(term => searchable.includes(term));
    const matchBrand = productMatchesBrand(p);
    const matchYear = productMatchesYear(p);
    const matchSize = productMatchesSize(p);

    if(matchSearch && matchBrand && matchYear && matchSize){
      card.style.display = "";
    }else{
      card.style.display = "none";
    }
  });
}

function isSoldOut(product){
  return !shouldShowProduct(product);
}

function syncQtyEverywhere(sku, value, sourceInput){
  const valueText = String(value || "");

  const card = cardBySku[sku];

  if(card){
    const productQtyInput = card.querySelector(".qtyInput");

    if(productQtyInput && productQtyInput !== sourceInput){
      productQtyInput.value = valueText;
    }
  }

  document.querySelectorAll(`#cartItems .qtyInput[data-sku="${cssEscapeValue(sku)}"]`).forEach(input => {
    if(input !== sourceInput){
      input.value = valueText;
    }
  });

  updateCartCountOnly();
}

function handleQtyInputPointerDown(event, sku, input){
  if(hasConfiguredBranchNames() && getCartQty(sku) > 0){
    event.preventDefault();
    event.stopPropagation();

    if(input && document.activeElement === input && typeof input.blur === "function"){
      input.blur();
    }

    openBranchQuantityEditor(sku);
    return;
  }

  event.stopPropagation();
}

function setQtyTyping(sku, value, sourceInput){
  if(hasConfiguredBranchNames() && getCartQty(sku) > 0){
    syncQtyEverywhere(sku, getCartQty(sku) || "", sourceInput);
    openBranchQuantityEditor(sku);
    return;
  }

  const text = String(value || "").trim();

  if(text === ""){
    syncQtyEverywhere(sku, "", sourceInput);
    return;
  }

  let qty = parseInt(text, 10);

  if(isNaN(qty) || qty <= 0){
    syncQtyEverywhere(sku, text, sourceInput);
    return;
  }

  setCartQty(sku, qty);
  syncQtyEverywhere(sku, qty, sourceInput);
}

function setQtyFinal(sku, value, sourceInput){
  if(hasConfiguredBranchNames() && getCartQty(sku) > 0){
    syncQtyEverywhere(sku, getCartQty(sku) || "", null);
    openBranchQuantityEditor(sku);
    return;
  }

  const shouldRestoreProductCard = !!(
    sourceInput &&
    isPhoneBranchEditorLayout() &&
    !hasConfiguredBranchNames() &&
    sourceInput.closest &&
    sourceInput.closest(".card")
  );

  if(sourceInput && document.activeElement === sourceInput && typeof sourceInput.blur === "function"){
    sourceInput.blur();
  }

  if(String(value || "").trim() === ""){
    delete cart[sku];
  }else{
    setCartQty(sku, value);
  }

  renderCart();
  updateProductOrderArea(sku);
  updateCartCountOnly();
  restorePlainQtyProductCardAfterTyping(sku, shouldRestoreProductCard);
}

const SAFE_TAP_MOVE_LIMIT = 10;

function startSafeButtonPress(event){
  event.stopPropagation();
  event.currentTarget._safePress = {
    x: event.clientX,
    y: event.clientY
  };
}

function cancelSafeButtonPress(event){
  event.stopPropagation();
  event.currentTarget._safePress = null;
}

function isSafeButtonTap(event){
  event.preventDefault();
  event.stopPropagation();

  const press = event.currentTarget._safePress;
  event.currentTarget._safePress = null;

  if(!press) return false;

  const dx = Math.abs(event.clientX - press.x);
  const dy = Math.abs(event.clientY - press.y);

  return dx <= SAFE_TAP_MOVE_LIMIT && dy <= SAFE_TAP_MOVE_LIMIT;
}

function finishQtyButtonPress(event, sku, delta){
  if(isSafeButtonTap(event)){
    if(delta === 1 && hasConfiguredBranchNames() && getCartQty(sku) === 0){
      addToCartFromProduct(sku);
    }else if(delta !== 0 && hasConfiguredBranchNames() && getCartQty(sku) > 0){
      openBranchQuantityEditor(sku);
    }else{
      changeQty(sku, delta);
    }
  }
}

function tapQtyButton(event, sku, delta){
  event.preventDefault();
  event.stopPropagation();

  if(event.type === "pointerdown"){
    const pointerType = event.pointerType || "";
    if(pointerType && pointerType !== "touch" && pointerType !== "pen" && pointerType !== "mouse"){
      return;
    }
  }

  if(delta === 1 && hasConfiguredBranchNames() && getCartQty(sku) === 0){
    addToCartFromProduct(sku);
  }else if(delta !== 0 && hasConfiguredBranchNames() && getCartQty(sku) > 0){
    openBranchQuantityEditor(sku);
  }else{
    changeQty(sku, delta);
  }
}

function finishRemoveButtonPress(event, sku){
  if(isSafeButtonTap(event)){
    removeItem(sku);
  }
}

function finishCartBranchButtonPress(event, sku){
  if(isSafeButtonTap(event)){
    openBranchQuantityEditor(sku);
  }
}

function renderOrderControls(product){
  const soldOut = isSoldOut(product);
  const sku = getProductSku(product);
  const cartQty = getCartQty(sku);

  if(soldOut){
    return `<button disabled onpointerdown="event.preventDefault(); event.stopPropagation()">Sold Out</button>`;
  }

  if(quickBranchSku === sku && hasConfiguredBranchNames()){
    const branches = getCartBranches(sku);
    const buttonLabel = "Update Cart";
    const rows = getConfiguredBranchNames().map(name => `
      <div class="branchQtyRow">
        <label>${escapeHtml(name)}</label>
        <div class="branchQtyControl">
          <button
            type="button"
            class="branchQtyStepper"
            onpointerdown="tapBranchQtyButton(event, this, '${escapeJsString(sku)}', -1)"
            onclick="event.preventDefault(); event.stopPropagation()"
          >-</button>
          <input
            type="number"
            min="0"
            inputmode="numeric"
            value="${branches[name] || ""}"
            data-branch-name="${escapeHtml(name)}"
            placeholder="0"
            onfocus="handleQuickBranchInputFocus('${escapeJsString(sku)}', this)"
            oninput="handleQuickBranchInputInput('${escapeJsString(sku)}', this)"
            onclick="event.stopPropagation()"
            onpointerdown="event.stopPropagation()"
          >
          <button
            type="button"
            class="branchQtyStepper"
            onpointerdown="tapBranchQtyButton(event, this, '${escapeJsString(sku)}', 1)"
            onclick="event.preventDefault(); event.stopPropagation()"
          >+</button>
        </div>
      </div>
    `).join("");

    return `
      <div class="quickBranchDropdown" onclick="event.stopPropagation()" onpointerdown="event.stopPropagation()">
        <h4>Branch Qty</h4>
        ${rows}
        <div class="branchEditorActions">
          <button type="button" onclick="event.preventDefault(); event.stopPropagation(); saveQuickBranchDropdown('${escapeJsString(sku)}')">${buttonLabel}</button>
          <button type="button" onclick="event.preventDefault(); event.stopPropagation(); cancelQuickBranchDropdown('${escapeJsString(sku)}')">Cancel</button>
        </div>
      </div>
    `;
  }

  if(cartQty > 0){
    return `
      <div class="qtyControls" onclick="event.stopPropagation()" onpointerdown="event.stopPropagation()">
        <button
          type="button"
          onpointerdown="tapQtyButton(event, '${escapeJsString(sku)}', -1)"
          onclick="event.preventDefault(); event.stopPropagation()"
        >-</button>

        <input
          class="qtyInput"
          data-sku="${escapeHtml(sku)}"
          type="number"
          inputmode="numeric"
          min="1"
          value="${cartQty}"
          oninput="setQtyTyping('${escapeJsString(sku)}', this.value, this)"
          onchange="setQtyFinal('${escapeJsString(sku)}', this.value, this)"
          onclick="event.stopPropagation()"
          onpointerdown="handleQtyInputPointerDown(event, '${escapeJsString(sku)}', this)"
        >

        <button
          type="button"
          onpointerdown="tapQtyButton(event, '${escapeJsString(sku)}', 1)"
          onclick="event.preventDefault(); event.stopPropagation()"
        >+</button>
      </div>
    `;
  }

  return `
    <button
      onpointerdown="startSafeButtonPress(event)"
      onpointerup="finishQtyButtonPress(event, '${escapeJsString(sku)}', 1)"
      onpointercancel="cancelSafeButtonPress(event)"
      onclick="event.preventDefault(); event.stopPropagation()"
    >
      Add to Cart
    </button>
  `;
}

function createProductCard(p){
  const card = document.createElement('div');
  card.className = 'card';

  const sku = getProductSku(p);
  card.dataset.sku = sku;
  card.classList.toggle("quickBranchOpen", quickBranchSku === sku && hasConfiguredBranchNames());
  card.onclick = () => openPhotoViewer(sku);

  const rowColor = getProductRowColor(p);

  if(rowColor){
    card.style.backgroundColor = rowColor;
  }

  const brand = getProductDisplayBrand(p);
  const description = getProductDescription(p);
  const price = getProductPrice(p);
  const status = getProductStatus(p);
  const statusBgColor = getStatusBgColor(p);
  const statusFontColor = getStatusFontColor(p);

  let statusStyle = "";

  if(statusBgColor){
    statusStyle += `background-color:${statusBgColor};`;
  }

  if(statusFontColor){
    statusStyle += `color:${statusFontColor};`;
  }

  card.innerHTML = `
    <div class="info">
      <div class="desc">
        ${brand ? `<b class="brandName">${escapeHtml(brand)}</b>` : ''}
        ${escapeHtml(description)}
      </div>

      <div class="price">${escapeHtml(price)}</div>

      <div class="stockBox">
        <span class="stock" style="${statusStyle}">${escapeHtml(status)}</span>
      </div>

      <div class="orderArea">
        ${renderOrderControls(p)}
      </div>
    </div>
  `;

  return card;
}

function updateProductOrderArea(sku){
  const product = products.find(p => getProductSku(p) === sku);
  if(!product) return;

  const card = cardBySku[sku];
  if(!card) return;

  const orderArea = card.querySelector('.orderArea');
  if(!orderArea) return;

  card.classList.toggle("quickBranchOpen", quickBranchSku === sku && hasConfiguredBranchNames());
  orderArea.innerHTML = renderOrderControls(product);
}

function updateAllProductOrderAreas(){
  Object.keys(cardBySku).forEach(sku => {
    updateProductOrderArea(sku);
  });
}

function updateCartCountOnly(){
  const count = Object.keys(cart).reduce((sum, sku) => sum + getCartQty(sku), 0);
  document.getElementById('cartCount').textContent = count;
}

function changeQty(sku, delta){
  if(delta !== 0 && hasConfiguredBranchNames() && getCartQty(sku) > 0){
    openBranchQuantityEditor(sku);
    return;
  }

  if(quickBranchSku === sku){
    quickBranchSku = "";
  }

  const previousQty = getCartQty(sku);
  setCartQty(sku, previousQty + delta);

  renderCart();
  updateProductOrderArea(sku);
  syncQtyEverywhere(sku, getCartQty(sku) || 0, null);
}

function removeItem(sku){
  delete cart[sku];

  if(activeBranchSku === sku){
    activeBranchSku = "";
  }

  if(quickBranchSku === sku){
    quickBranchSku = "";
  }

  renderCart();
  updateProductOrderArea(sku);
  updateCartCountOnly();
}

function renderCart(){
  updateCartCountOnly();
  renderBranchSettingPanel();

  const box = document.getElementById('cartItems');
  box.innerHTML = '';

  Object.keys(cart).forEach(sku => {
    const item = getCartItem(sku);
    const p = products.find(x => getProductSku(x) === sku);

    if(!p) return;
    if(!shouldShowProduct(p)) return;
    if(!item || item.qty <= 0) return;

    const brand = getProductDisplayBrand(p);
    const description = getProductDescription(p);

    const row = document.createElement('div');
    row.className = 'cartRow';
    row.dataset.sku = sku;

    row.innerHTML = `
      <b>${escapeHtml(brand)} ${escapeHtml(description)}</b>
      <small>Order Qty (Pcs):</small>

      <div class="qtyControls">
        <button
          type="button"
          onpointerdown="tapQtyButton(event, '${escapeJsString(sku)}', -1)"
          onclick="event.preventDefault(); event.stopPropagation()"
        >-</button>

        <input
          class="qtyInput"
          data-sku="${escapeHtml(sku)}"
          type="number"
          inputmode="numeric"
          min="1"
          value="${item.qty}"
          oninput="setQtyTyping('${escapeJsString(sku)}', this.value, this)"
          onchange="setQtyFinal('${escapeJsString(sku)}', this.value, this)"
          onclick="event.stopPropagation()"
          onpointerdown="handleQtyInputPointerDown(event, '${escapeJsString(sku)}', this)"
        >

        <button
          type="button"
          onpointerdown="tapQtyButton(event, '${escapeJsString(sku)}', 1)"
          onclick="event.preventDefault(); event.stopPropagation()"
        >+</button>
      </div>

      <div class="cartActionRow">
        <button
          class="branchButton"
          type="button"
          onpointerdown="startSafeButtonPress(event)"
          onpointerup="finishCartBranchButtonPress(event, '${escapeJsString(sku)}')"
          onpointercancel="cancelSafeButtonPress(event)"
          onclick="event.preventDefault(); event.stopPropagation()"
        >Branch</button>
        <button
          class="remove"
          onpointerdown="startSafeButtonPress(event)"
          onpointerup="finishRemoveButtonPress(event, '${escapeJsString(sku)}')"
          onpointercancel="cancelSafeButtonPress(event)"
          onclick="event.preventDefault(); event.stopPropagation()"
        >Remove</button>
      </div>

      ${getBranchPreviewHtml(sku)}
      ${renderBranchSplitPanel(sku)}
    `;

    box.appendChild(row);
  });
}

document.getElementById('cartButton').onclick = () => {
  renderCart();
  document.getElementById('cartPanel').classList.remove('hidden');
};

document.getElementById('closeCart').onclick = () => {
  document.getElementById('cartPanel').classList.add('hidden');
};

document.getElementById('search').addEventListener('input', () => {
  updateClearSearchButton();
  showCachedCategory();
});

document.getElementById('clearSearchButton').onclick = () => {
  document.getElementById('search').value = "";
  updateClearSearchButton();
  showCachedCategory();
};

function updateClearSearchButton(){
  const clearButton = document.getElementById('clearSearchButton');
  const searchValue = document.getElementById('search').value.trim();

  if(searchValue){
    clearButton.classList.remove('hidden');
  }else{
    clearButton.classList.add('hidden');
  }
}

function hardRefreshApp(){
  if(refreshLock) return;

  refreshLock = true;

  cart = {};
  activeBranchSku = "";
  quickBranchSku = "";
  branchSettingOpen = false;

  resetFiltersToAll();
  resetBarsToLeft();

  const searchInput = document.getElementById('search');
  if(searchInput){
    searchInput.value = "";
  }

  updateClearSearchButton();

  const cartPanel = document.getElementById('cartPanel');
  if(cartPanel){
    cartPanel.classList.add('hidden');
  }

  closePhotoViewer();

  Object.keys(cardBySku).forEach(sku => {
    delete cart[sku];
    updateProductOrderArea(sku);
  });

  renderCart();
  updateCartCountOnly();
  updateActiveButtons();
  showCachedCategory();
  goBackToTop();
  resetBarsToLeft();

  setTimeout(() => {
    resetBarsToLeft();
    goBackToTop();
    updateCartCountOnly();
    refreshLock = false;
  }, 350);
}

const refreshButton = document.getElementById('refreshAppButton');
const branchSettingButton = document.getElementById("branchSettingButton");

if(refreshButton){
  refreshButton.addEventListener('pointerdown', function(event){
    event.preventDefault();
    event.stopPropagation();
    hardRefreshApp();
  });

  refreshButton.addEventListener('click', function(event){
    event.preventDefault();
    event.stopPropagation();
    hardRefreshApp();
  });
}

if(branchSettingButton){
  branchSettingButton.addEventListener("click", function(event){
    event.preventDefault();
    event.stopPropagation();
    openBranchSettings();
  });
}

document.getElementById('sendWhatsapp').onclick = async () => {
  if(!requireLogin()){
    return;
  }

  if(!await validateCurrentSession()){
    return;
  }

  if(Object.keys(cart).length === 0){
    alert("Cart is empty.");
    return;
  }

  let totalOrder = 0;
  const currentUser = getCurrentUser() || {};
  const customerCode = cleanValue(currentUser.customerCode);
  const lines = [
    `Code: ${customerCode}`,
    `Customer: ${customerName || customerUsername || "-"}`,
    `Username: ${customerUsername || "-"}`,
    ""
  ];

  const validEntries = Object.keys(cart)
    .map(sku => ({ sku, item: getCartItem(sku), product: products.find(p => getProductSku(p) === sku) }))
    .filter(entry => entry.item && entry.item.qty > 0 && entry.product && shouldShowProduct(entry.product));

  for(let i = 0; i < validEntries.length; i++){
    const { sku, item, product } = validEntries[i];
    const brandUsed = getProductDisplayBrand(product);
    const description = getProductDescription(product);
    const branchUsed = hasBranchSplit(sku);
    const branchTotal = getBranchTotal(sku);

    if(branchUsed && branchTotal !== item.qty){
      alert(`Branch total for ${brandUsed} ${description} is ${branchTotal} PCS, but cart qty is ${item.qty} PCS. Please adjust before sending.`);
      return;
    }

    totalOrder += item.qty;

    lines.push(`Brand: ${brandUsed}`);
    lines.push(`Description: ${description}`);

    if(branchUsed){
      Object.entries(item.branches)
        .filter(([, qty]) => Number(qty) > 0)
        .forEach(([name, qty]) => {
          lines.push(`${name}: ${qty} PCS`);
        });
    }else{
      lines.push(`Order Qty (Pcs): ${item.qty}`);
    }

    lines.push("");
  }

  lines.push(`TOTAL ORDER: ${totalOrder} PCS`);

  window.open(`https://wa.me/${ORDER_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, '_blank');

  const oldCartSkus = Object.keys(cart);

  cart = {};
  activeBranchSku = "";
  quickBranchSku = "";
  renderCart();

  oldCartSkus.forEach(sku => {
    updateProductOrderArea(sku);
  });

  document.getElementById('cartPanel').classList.add('hidden');
};

function openPhotoViewer(sku){
  const product = products.find(p => getProductSku(p) === sku);

  if(!product) return;

  const photoUrl = getProductPhotoUrl(product);

  if(!photoUrl){
    return;
  }

  document.getElementById('viewerTitle').textContent =
    getProductDisplayBrand(product) + " " + getProductDescription(product);

  document.getElementById('viewerImage').src = photoUrl;

  document.getElementById('photoViewer').classList.remove('hidden');
}

function closePhotoViewer(){
  document.getElementById('photoViewer').classList.add('hidden');
  document.getElementById('viewerImage').src = "";
}

document.getElementById("logoutConfirmCancel").onclick = () => {
  closeLogoutConfirm();
};

document.getElementById("logoutConfirmOk").onclick = () => {
  performLogout();
};

document.getElementById("logoutConfirmOverlay").onclick = (event) => {
  if(event.target && event.target.id === "logoutConfirmOverlay"){
    closeLogoutConfirm();
  }
};

document.addEventListener("keydown", (event) => {
  if(event.key === "Escape"){
    closeLogoutConfirm();
  }
});

function prevPhoto(){
  return;
}

function nextPhoto(){
  return;
}

function escapeHtml(text){
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJsString(text){
  return String(text || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', '\\"');
}

function cssEscapeValue(value){
  if(window.CSS && CSS.escape){
    return CSS.escape(value);
  }

  return String(value || "").replace(/"/g, '\\"');
}

document.addEventListener('click', function(e){
  const yearButton = document.getElementById('yearButton');
  const yearDropdown = document.getElementById('yearDropdown');

  if(!yearButton || !yearDropdown) return;

  if(
    !yearButton.contains(e.target) &&
    !yearDropdown.contains(e.target)
  ){
    yearDropdown.classList.add('hidden');
  }
});

const topTapZone = document.getElementById("topTapZone");

if(topTapZone){
  topTapZone.addEventListener("pointerdown", function(event){
    event.preventDefault();
    event.stopPropagation();
    goBackToTop();
  });
}

/* EXTRA IPHONE DOUBLE-TAP ZOOM PROTECTION */
let lastTouchEndTime = 0;

document.addEventListener('touchend', function(event){
  const now = Date.now();

  const target = event.target;
  const isInput =
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT";

  if(!isInput && now - lastTouchEndTime <= 300){
    event.preventDefault();
  }

  lastTouchEndTime = now;
}, { passive:false });

bindLoginEvents();
checkLogin();
validateCurrentSession({ silent:true });
startAuthEventListener();
resetFiltersToAll();
ensureInteractionStyleFixes();
loadBranchNames();
ensureAplusVietnamCategoryButton();
resetBarsToLeft();
loadProducts();

setInterval(autoRefreshProducts, 60000);
setInterval(() => {
  validateCurrentSession({ silent:true });
}, 15000);

window.addEventListener('pageshow', function(){
  ensureInteractionStyleFixes();
  ensureAplusVietnamCategoryButton();
  resetBarsToLeft();
  validateCurrentSession({ silent:true });
});
