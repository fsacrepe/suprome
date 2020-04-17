let config = {
  'suprome-product': {
    section: '',
    keyword: '',
    sizes: [],
    colors: [],
  },
  'suprome-billing': {
    name: '',
    email: '',
    tel: '',
    address: '',
    address2: '',
    address3: '',
    city: '',
    zip: '',
    country: '',
  },
  'suprome-cc': {
    type: '',
    cnb: '',
    month: '',
    year: '',
    cvv: '',
  },
  'suprome-config': {
    autoclear: false,
    timeout: 3000,
    checkoutDelay: 2000,
    restockReloadDelay: 1000,
  }
}

function getFromStorage() {
  chrome.storage.local.get(['suprome-product', 'suprome-billing', 'suprome-cc', 'suprome-config'], (storageConfig) => {
    config = { ...config, ...storageConfig };
    console.log('config', config);
    getProductConfig();
    getBillingConfig();
    getCreditConfig();
    getExtensionConfig();
  });
}

function saveInStorage(constant, content) {
  chrome.storage.local.set({ [`suprome-${constant}`] : content }, (done) => {
    $('#configSaved').css('visibility', 'visible');
    setTimeout(() => {
      $('#configSaved').css('visibility', 'hidden');
    }, 3000)
    console.log(`Config ${constant} saved`);
    chrome.runtime.reload();
  });
}

function clearStorage(e) {
  e.preventDefault();
  chrome.storage.sync.clear(() => {
    getFromStorage();
    console.log(`Config resetted`);
  });
}

// Product

function addSize(e) {
  e.preventDefault();
  const value = $('#productSizes').val();
  if (!value.length) return;
  config['suprome-product'].sizes.push(value);
  getSizes();
  $('#productSizes').val(null);
}

function popSize(e) {
  e.preventDefault();
  config['suprome-product'].sizes.pop();
  getSizes();
}

function getSizes() {
  const container = $('#configProductSizes');
  container.html(null);
  config['suprome-product'].sizes.forEach((color, index) => {
    container.append(`<p class="badge">${index + 1}. ${color}</p>`)
  })
}

function addColor(e) {
  e.preventDefault();
  const value = $('#productColors').val();
  if (!value.length) return;
  config['suprome-product'].colors.push(value);
  $('#productColors').val(null);
  getColors();
  return false;
}

function popColor(e) {
  e.preventDefault();
  config['suprome-product'].colors.pop();
  getColors();
}

function getColors() {
  const container = $('#configProductColors');
  container.html(null);
  config['suprome-product'].colors.forEach((color, index) => {
    container.append(`<p class="badge">${index + 1}. ${color}</>`);
  });
}

function saveProductConfig() {
  const section = $('#productSection').val();
  const keyword = $('#productKeyword').val();
  const { colors, sizes } = config['suprome-product'];
  saveInStorage('product', {
    section,
    keyword,
    colors,
    sizes,
  });
}

function getProductConfig() {
  $('#productSection').val(config['suprome-product'].section);
  $('#productKeyword').val(config['suprome-product'].keyword);
  getSizes();
  getColors();
}

// Billing

function saveBillingConfig() {
  const name = $('#billingName').val();
  const email = $('#billingEmail').val();
  const tel = $('#billingTel').val();
  const address = $('#billingAddress').val();
  const address2 = $('#billingAddress2').val();
  const address3 = $('#billingAddress3').val();
  const city = $('#billingCity').val();
  const zip = $('#billingZip').val();
  const country = $('#billingCountry').val();
  saveInStorage('billing', { name, email, tel, address, address2, address3, city, zip, country });
}

function getBillingConfig() {
  $('#billingName').val(config['suprome-billing'].name);
  $('#billingEmail').val(config['suprome-billing'].email);
  $('#billingTel').val(config['suprome-billing'].tel);
  $('#billingAddress').val(config['suprome-billing'].address);
  $('#billingAddress2').val(config['suprome-billing'].address2);
  $('#billingAddress3').val(config['suprome-billing'].address3);
  $('#billingCity').val(config['suprome-billing'].city);
  $('#billingZip').val(config['suprome-billing'].zip);
  $('#billingCountry').val(config['suprome-billing'].country);
}

// CC

function saveCreditConfig() {
  const type = $('#ccType').val();
  const cnb = $('#ccCnb').val();
  const month = $('#ccMonth').val();
  const year = $('#ccYear').val();
  const cvv = $('#ccCvv').val();
  saveInStorage('cc', { type, cnb, month, year, cvv });
}

function getCreditConfig() {
  $('#ccType').val(config['suprome-cc'].type);
  $('#ccCnb').val(config['suprome-cc'].cnb);
  $('#ccMonth').val(config['suprome-cc'].month);
  $('#ccYear').val(config['suprome-cc'].year);
  $('#ccCvv').val(config['suprome-cc'].cvv);
}

// Extension config

function getExtensionConfig() {
  $('#extensionTimeout').val(config['suprome-config'].timeout);
  $('#extensionAutoclearStorage').prop('checked', config['suprome-config'].autoclear);
  $('#extensionCheckoutDelay').val(config['suprome-config'].checkoutDelay);
  $('#extensionRestockReloadDelay').val(config['suprome-config'].restockReloadDelay);
}

function saveExtensionConfig() {
  const timeout = $('#extensionTimeout').val();
  const checkoutDelay = $('#extensionCheckoutDelay').val();
  const autoclear = $('#extensionAutoclearStorage').is(':checked') ? true : false;
  const restockReloadDelay = $('#extensionRestockReloadDelay').val();
  saveInStorage('config', { timeout, autoclear, checkoutDelay, restockReloadDelay });
}

function saveAll(e) {
  e.preventDefault();
  saveProductConfig();
  saveBillingConfig();
  saveCreditConfig();
  saveExtensionConfig();
}

$('#submitAll').click(saveAll);
$('#resetAll').click(clearStorage);
$('#addColor').click(addColor);
$('#popColor').click(popColor);
$('#addSize').click(addSize);
$('#popSize').click(popSize);

$(document).ready(getFromStorage);