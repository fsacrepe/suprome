let config = [];
const configBase = {
  product: {
    section: '',
    keyword: '',
    sizes: [],
    colors: [],
  },
  billing: {
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
  cc: {
    type: '',
    cnb: '',
    month: '',
    year: '',
    cvv: '',
  },
  extension: {
    autoclear: false,
    timeout: 3000,
    checkoutDelay: 2000,
    restockReloadDelay: 1000,
  }
};

function getFromStorage() {
  chrome.storage.local.get('suprome', (storageConfig) => {
    config = storageConfig.suprome;
    changeProfile();
  });
}

function saveInStorage() {
  chrome.storage.local.set({ suprome: config }, (done) => {
    $('#configSaved').css('visibility', 'visible');
    setTimeout(() => {
      $('#configSaved').css('visibility', 'hidden');
    }, 3000)
    console.log(`Config saved`);
    //chrome.runtime.reload();
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
  const profileId = $('#profileID').val();
  const value = $('#productSizes').val();
  if (!value.length) return;
  config[profileId].product.sizes.push(value);
  getSizes();
  $('#productSizes').val(null);
}

function popSize(e) {
  e.preventDefault();
  const profileId = $('#profileID').val();
  config[profileId].product.sizes.pop();
  getSizes();
}

function getSizes() {
  const container = $('#configProductSizes');
  const profileId = $('#profileID').val();
  container.html(null);
  config[profileId].product.sizes.forEach((color, index) => {
    container.append(`<p class="badge">${index + 1}. ${color}</p>`)
  })
}

function addColor(e) {
  e.preventDefault();
  const profileId = $('#profileID').val();
  const value = $('#productColors').val();
  if (!value.length) return;
  config[profileId].product.colors.push(value);
  $('#productColors').val(null);
  getColors();
  return false;
}

function popColor(e) {
  e.preventDefault();
  const profileId = $('#profileID').val();
  config[profileId].product.colors.pop();
  getColors();
}

function getColors() {
  const profileId = $('#profileID').val();
  const container = $('#configProductColors');
  container.html(null);
  config[profileId].product.colors.forEach((color, index) => {
    container.append(`<p class="badge">${index + 1}. ${color}</>`);
  });
}

function saveProductConfig() {
  const profileId = $('#profileID').val();
  config[profileId].product = {
    section: $('#productSection').val(),
    keyword: $('#productKeyword').val(),
    colors: config[profileId].product.colors,
    sizes: config[profileId].product.sizes,
  };
  saveInStorage();
}

function getProductConfig(profileId) {
  $('#productSection').val(config[profileId].product.section);
  $('#productKeyword').val(config[profileId].product.keyword);
  getSizes();
  getColors();
}

// Billing

function saveBillingConfig() {
  const profileId = $('#profileID').val();
  config[profileId].billing = {
    name: $('#billingName').val(),
    email: $('#billingEmail').val(),
    tel: $('#billingTel').val(),
    address: $('#billingAddress').val(),
    address2: $('#billingAddress2').val(),
    address3: $('#billingAddress3').val(),
    city: $('#billingCity').val(),
    zip: $('#billingZip').val(),
    country: $('#billingCountry').val(),
  };
  saveInStorage();
}

function getBillingConfig(profileId) {
  $('#billingName').val(config[profileId].billing.name);
  $('#billingEmail').val(config[profileId].billing.email);
  $('#billingTel').val(config[profileId].billing.tel);
  $('#billingAddress').val(config[profileId].billing.address);
  $('#billingAddress2').val(config[profileId].billing.address2);
  $('#billingAddress3').val(config[profileId].billing.address3);
  $('#billingCity').val(config[profileId].billing.city);
  $('#billingZip').val(config[profileId].billing.zip);
  $('#billingCountry').val(config[profileId].billing.country);
}

// CC

function saveCreditConfig() {
  const profileId = $('#profileID').val();
  config[profileId].cc = {
    type: $('#ccType').val(),
    cnb: $('#ccCnb').val(),
    month: $('#ccMonth').val(),
    year: $('#ccYear').val(),
    cvv: $('#ccCvv').val(),
  };
  saveInStorage();
}

function getCreditConfig(profileId) {
  $('#ccType').val(config[profileId].cc.type);
  $('#ccCnb').val(config[profileId].cc.cnb);
  $('#ccMonth').val(config[profileId].cc.month);
  $('#ccYear').val(config[profileId].cc.year);
  $('#ccCvv').val(config[profileId].cc.cvv);
}

// Extension config

function getExtensionConfig(profileId) {
  $('#extensionTimeout').val(config[profileId].extension.timeout);
  $('#extensionAutoclearStorage').prop('checked', config[profileId].extension.autoclear);
  $('#extensionCheckoutDelay').val(config[profileId].extension.checkoutDelay);
  $('#extensionRestockReloadDelay').val(config[profileId].extension.restockReloadDelay);
}

function saveExtensionConfig() {
  const profileId = $('#profileID').val();
  config[profileId].extension = {
    timeout: $('#extensionTimeout').val(),
    checkoutDelay: $('#extensionCheckoutDelay').val(),
    autoclear: $('#extensionAutoclearStorage').is(':checked') ? true : false,
    restockReloadDelay: $('#extensionRestockReloadDelay').val(),
  }
  saveInStorage();
}

function saveAll(e) {
  e.preventDefault();
  saveProductConfig();
  saveBillingConfig();
  saveCreditConfig();
  saveExtensionConfig();
}

// Profile Management

function changeProfile() {
  const profileId = $('#profileID').val();
  if (!config[profileId]) config[profileId] = Object.assign({}, configBase);
  console.log(config);
  getProductConfig(profileId);
  getBillingConfig(profileId);
  getCreditConfig(profileId);
  getExtensionConfig(profileId);
}

$('#submitAll').click(saveAll);
$('#resetAll').click(clearStorage);
$('#addColor').click(addColor);
$('#popColor').click(popColor);
$('#addSize').click(addSize);
$('#popSize').click(popSize);
$('#profileID').change(changeProfile);

$(document).ready(getFromStorage);