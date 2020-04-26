let colorAndSizeBuffer = {
  create: {
    sizes: [],
    colors: [],
  }
};

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

const createProfile = () => {
  const profileName = $('#profileName').val();
  const billing = {
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
  const cc = {
    type: $('#ccType').val(),
    cnb: $('#ccCnb').val(),
    month: $('#ccMonth').val(),
    year: $('#ccYear').val(),
    cvv: $('#ccCvv').val(),
  };
  const newProfile = { [profileName]: { billing, cc } };
  chrome.storage.local.get('suprome-profiles', (storage) => {
    chrome.storage.local.set({ 'suprome-profiles': Object.assign({}, storage['suprome-profiles'], { ...newProfile }) }, done => {
      initAll();
    });
  });
};

const saveTab = (index = -1) => {
  let selector = '#createBody';
  let bufferProperty = index === -1 ? 'create' : `${index}`;
  if (index !== -1) selector = `#tab-${index}`;
  const selectedProfileName = $(`${selector} .profileSelection`).val();
  const product = {
    section: $(`${selector} #productSection`).val(),
    keyword: $(`${selector} #productKeyword`).val(),
    sizes: colorAndSizeBuffer[bufferProperty]['sizes'],
    colors: colorAndSizeBuffer[bufferProperty]['colors'],
  };
  const extension = {
    timeout: $(`${selector} #extensionTimeout`).val(),
    checkoutDelay: $(`${selector} #extensionCheckoutDelay`).val(),
    restockReloadDelay: $(`${selector} #extensionRestockReloadDelay`).val(),
  };
  chrome.storage.local.get('suprome-tabs', storage => {
    if (index === -1) {
      const tabs = [...(storage['suprome-tabs'] || []), { product, extension, profile: selectedProfileName }];
      chrome.storage.local.set({ 'suprome-tabs': tabs }, initTabs);
    } else {
      storage['suprome-tabs'].splice(index, 1, { product, extension, profile: selectedProfileName })
      chrome.storage.local.set({ 'suprome-tabs': storage['suprome-tabs'] }, initTabs);
    }
  });
};

const addToArray = (type, index = -1) => {
  const selector = type === 'colors' ? '#productColors' : '#productSizes';
  let property = 'create';
  let value = $(`#createBody ${selector}`).val();
  if (index !== -1) {
    property = `${index}`;
    value = $(`#tab-${index} ${selector}`).val();
  }
  colorAndSizeBuffer[property][type].push(value);
  setColorsAndSizes(index);
}

const popFromArray = (type, index = -1) => {
  let property = 'create';
  if (index !== -1) property = `${index}`;
  console.log(colorAndSizeBuffer[property][type]);
  colorAndSizeBuffer[property][type].pop();
  setColorsAndSizes(index);
}

const removeProfile = () => {
  chrome.storage.local.get('suprome-profiles', storage => {
    const profiles = storage['suprome-profiles'];
    const toRemove = $('a[id^="pill"].active').html();
    delete profiles[toRemove];
    chrome.storage.local.set({ 'suprome-profiles': profiles }, done => {
      initAll();
    });
  })
}

const removeTab = (index) => {
  chrome.storage.local.get('suprome-tabs', storage => {
    storage['suprome-tabs'].splice(index, 1);
    chrome.storage.local.set({ 'suprome-tabs': storage['suprome-tabs'] }, initTabs);
  });
}

const setTabData = (selector, tab = null) => {
  $(`${selector} .profileSelection`).val(!!tab ? tab.profile : '');
  $(`${selector} #productSection`).val(!!tab ? tab.product.section : '');
  $(`${selector} #productKeyword`).val(!!tab ? tab.product.keyword : '');
  $(`${selector} #extensionTimeout`).val(!!tab ? tab.extension.timeout : '');
  $(`${selector} #extensionCheckoutDelay`).val(!!tab ? tab.extension.checkoutDelay : '');
  $(`${selector} #extensionRestockReloadDelay`).val(!!tab ? tab.extension.restockReloadDelay : '');
  if (!!tab) {
    const btnContainer = $(`${selector} #createTabBtn`).parent();
    const tabIndex = $(selector).attr('data-tab-index');
    btnContainer.html(null);
    btnContainer.append(`<button id="removeTabBtn" class="btn btn-danger" type="button">Remove</button>`);
    btnContainer.append(`<button id="editTabBtn" class="btn btn-primary" type="button" style="margin-left: 5px;">Save</button>`);
    setColorsAndSizes(tabIndex);
    $(`${selector} #editTabBtn`).click(() => saveTab(tabIndex));
    $(`${selector} #removeTabBtn`).click(() => removeTab(tabIndex));
    $(`${selector} #addSize`).click(() => addToArray('sizes', tabIndex));
    $(`${selector} #popSize`).click(() => popFromArray('sizes', tabIndex));
    $(`${selector} #addColor`).click(() => addToArray('colors', tabIndex));
    $(`${selector} #popColor`).click(() => popFromArray('colors', tabIndex));
  }
}

const setColorsAndSizes = (index = -1) => {
  let selector = '#createBody';
  let property = 'create';
  if (index !== -1) {
    selector = `#tab-${index}`;
    property = index;
  }
  $(`${selector} #configProductColors`).html(null);
  $(`${selector} #configProductSizes`).html(null);
  for (const dataType in colorAndSizeBuffer[property]) {
    colorAndSizeBuffer[property][dataType].forEach(val => {
      if (dataType === 'colors') $(`${selector} #configProductColors`).append(`<span class="badge badge-dark">${val}</span>`);
      if (dataType === 'sizes') $(`${selector} #configProductSizes`).append(`<span class="badge badge-dark">${val}</span>`);
    });
  }
}

const setProfileData = (profileName = '', profile = null) => {
  $(`#profileName`).val(profileName);
  $(`#billingName`).val(!!profile ? profile.billing.name : '');
  $(`#billingEmail`).val(!!profile ? profile.billing.email : '');
  $(`#billingTel`).val(!!profile ? profile.billing.tel : '');
  $(`#billingAddress`).val(!!profile ? profile.billing.address : '');
  $(`#billingAddress2`).val(!!profile ? profile.billing.address2 : '');
  $(`#billingAddress3`).val(!!profile ? profile.billing.address3 : '');
  $(`#billingCity`).val(!!profile ? profile.billing.city : '');
  $(`#billingZip`).val(!!profile ? profile.billing.zip : '')
  $(`#billingCountry`).val(!!profile ? profile.billing.country : '');
  $(`#ccType`).val(!!profile ? profile.cc.type : '');
  $(`#ccCnb`).val(!!profile ? profile.cc.cnb : '');
  $(`#ccMonth`).val(!!profile ? profile.cc.month : '');
  $(`#ccYear`).val(!!profile ? profile.cc.year : '');
  $(`#ccCvv`).val(!!profile ? profile.cc.cvv : '');
  if (!!profile) {
    $(`#submitProfileBtn`).html('Edit Profile');
    $(`#removeProfileBtn`).show();
  } else {
    $(`#submitProfileBtn`).html('Create Profile');
    $(`#removeProfileBtn`).hide();
  }
}

const initProfiles = () => {
  chrome.storage.local.get('suprome-profiles', storage => {
    const pillsContainer = $('#profilesPills');
    pillsContainer.html(null);
    for (const profileName in storage['suprome-profiles']) {
      const p = storage['suprome-profiles'][profileName];
      const camelProfileName = camelize(profileName);
      pillsContainer.prepend(`<a class="nav-link" id="pill${camelProfileName}" data-toggle="pill" href="#profile${camelProfileName}" role="tab" aria-selected="false">${profileName}</a>`)
      $(`#pill${camelProfileName}`).click(() => setProfileData(profileName, p));
    }
    pillsContainer.append('<a class="nav-link active" id="pillCreateProfile" data-toggle="pill" href="#profileForm" role="tab" aria-controls="create-profile" aria-selected="true" style="margin-top: 20%;">+ New Profile</a>');
    $('#pillCreateProfile').click(() => setProfileData());
  });
}

const initProfileSelect = () => {
  chrome.storage.local.get('suprome-profiles', storage => {
    for (const profileName in storage['suprome-profiles']) {
      $('.profileSelection').append(`<option value="${profileName}">${profileName}</option>`);
      console.log(profileName);
    }
  });
}

const initTabs = () => {
  createTabSizesBuffer = [];
  createTabColorsBuffer = [];
  setTabData('#accordionCreateTask');
  chrome.storage.local.get('suprome-tabs', storage => {
    console.log(storage);
    $('#accordionContainer').html(null);
    if (!storage['suprome-tabs']) return;
    storage['suprome-tabs'].forEach((tab, index) => {
      const { colors = [], sizes = [] } = tab.product
      colorAndSizeBuffer[index] = { sizes, colors };
      const original = $('#accordionCreateTask > .card');
      original.clone().appendTo('#accordionContainer');
      $('#accordionContainer > .card').last().attr('id', `tab-${index}`);
      $(`#accordionContainer > #tab-${index}`).attr('data-tab-index', `${index}`);
      $(`#accordionContainer #tab-${index} button[data-toggle="collapse"]`).attr('data-target', `#tabContent-${index}`);
      $(`#accordionContainer > #tab-${index} > .collapse`).attr('id', `tabContent-${index}`);
      $(`#accordionContainer > #tab-${index} > .collapse`).attr('class', `collapse hide`);
      $(`#accordionContainer > #tab-${index} > .collapse`).attr('data-parent', '#accordionContainer');
      $(`#tab-${index} #tab-title`).html(`Tab ${index} - [${tab.product.section}] ${tab.product.keyword}`);
      setTabData(`#tab-${index}`, tab);
    });
  });
}

const compileConfig = () => {
  chrome.storage.local.get(['suprome-tabs', 'suprome-profiles'], storage => {
    const compiled = [];
    storage['suprome-tabs'].forEach(tab => {
      const { product, extension } = tab;
      const { billing, cc } = storage['suprome-profiles'][tab.profile];
      compiled.push({ product, extension, billing, cc });
    });
    chrome.storage.local.set({ 'suprome': compiled }, () => {chrome.runtime.reload();});
  });
}

const initAll = () => {
  chrome.storage.local.get('suprome', storage => console.log(storage));
  initProfileSelect();
  initProfiles();
  initTabs();
};

$('#pillCreateProfile').click(setProfileData);
$('#submitProfileBtn').click(createProfile);
$('#removeProfileBtn').click(removeProfile);
$('#createTabBtn').click(() => saveTab());
$(`#createBody #addSize`).click(() => addToArray('sizes'));
$(`#createBody #popSize`).click(() => popFromArray('sizes'));
$(`#createBody #addColor`).click(() => addToArray('colors'));
$(`#createBody #popColor`).click(() => popFromArray('colors'));
$('#compileConfigBtn').click(compileConfig);
$(document).ready(initAll);