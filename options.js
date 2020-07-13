let colorAndSizeBuffer = {
  create: {
    sizes: [],
    colors: [],
  }
};

function createUUID(){
  var dt = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (dt + Math.random()*16)%16 | 0;
      dt = Math.floor(dt/16);
      return (c=='x' ? r :(r&0x3|0x8)).toString(16);
  });
  return uuid;
}

const connectToProxy = (proxyUrl) => {
  const proxyConfig = {
    mode: 'pac_script',
    pacScript: {
      data: "function FindProxyForURL(url, host) {\n" +
      "  if (dnsDomainIs(host, '.supremenewyork.com'))\n" +
      "    return 'PROXY " + proxyUrl + "';\n" +
      "  return 'DIRECT';\n" +
      "}",
      mandatory: true,
    }
  };
  chrome.proxy.settings.get({}, (oldConfig) => {
    chrome.proxy.settings.set({value: proxyConfig, scope: 'regular'}, () => {
      chrome.tabs.create({
        url: 'https://www.supremenewyork.com',
        active: true,
      }, (tab) => {
        chrome.tabs.onRemoved.addListener((tabId) => {
          if (tabId === tab.id) chrome.proxy.settings.set({ value: oldConfig.value, scope: 'regular' });
        });
      });
    });
  })
}

const createProfile = (uuid = null) => {
  const name = $('#profileName').val();
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
  const profile = { [uuid || createUUID()]: { name, billing, cc } };
  chrome.storage.local.get('suprome-profiles-v2', (storage) => {
    chrome.storage.local.set({ 'suprome-profiles-v2': Object.assign({}, storage['suprome-profiles-v2'], { ...profile }) });
  });
};

const removeProfile = (uuid) => {
  chrome.storage.local.get('suprome-profiles-v2', storage => {
    const profiles = storage['suprome-profiles-v2'];
    delete profiles[uuid];
    chrome.storage.local.set({ 'suprome-profiles-v2': profiles });
  });
}

const setProfileData = (uuid = null, profile = null) => {
  $(`#profileName`).val(!!profile ? profile.name : '');
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
    $(`#submitProfileBtn`).click(() => createProfile(uuid));
    $(`#removeProfileBtn`).show();
    $(`#removeProfileBtn`).click(() => removeProfile(uuid));
  } else {
    $(`#submitProfileBtn`).html('Create Profile');
    $(`#submitProfileBtn`).click(() => createProfile());
    $(`#removeProfileBtn`).hide();
  }
}

const initProfiles = () => {
  chrome.storage.local.get('suprome-profiles-v2', storage => {
    const pillsContainer = $('#profilesPills');
    pillsContainer.html(null);
    for (const uuid in storage['suprome-profiles-v2']) {
      const p = storage['suprome-profiles-v2'][uuid];
      pillsContainer.prepend(`<a class="nav-link" id="pill${uuid}" data-toggle="pill" href="#profile${uuid}" role="tab" aria-selected="false">${p.name}</a>`)
      $(`#pill${uuid}`).click(() => setProfileData(uuid, p));
    }
    pillsContainer.append('<a class="nav-link active" id="pillCreateProfile" data-toggle="pill" href="#profileForm" role="tab" aria-controls="create-profile" aria-selected="true" style="margin-top: 20%;">+ New Profile</a>');
    $('#pillCreateProfile').click(() => setProfileData());
  });
}

const saveTab = (uuid = null) => {
  let selector = '#createBody';
  let bufferProperty = !uuid ? 'create' : `${uuid}`;
  if (uuid) selector = `#tab-${uuid}`;
  const profileUUID = $(`${selector} .profileSelection`).val();
  const product = {
    section: $(`${selector} #productSection`).val(),
    keyword: $(`${selector} #productKeyword`).val(),
    sizes: colorAndSizeBuffer[bufferProperty]['sizes'],
    colors: colorAndSizeBuffer[bufferProperty]['colors'],
    quantity: $(`${selector} #productQuantity`).val(),
  };
  const extension = {
    timeout: Number($(`${selector} #extensionTimeout`).val()),
    checkoutDelay: Number($(`${selector} #extensionCheckoutDelay`).val()),
    checkoutDelayIncrease: Number($(`${selector} #extensionCheckoutDelayIncrease`).val()),
    restockReloadDelay: Number($(`${selector} #extensionRestockReloadDelay`).val()),
  };
  chrome.storage.local.get('suprome-tabs-v2', storage => {
    chrome.storage.local.set({ 'suprome-tabs-v2': Object.assign({}, storage['suprome-tabs-v2'], { [uuid || createUUID()]: { product, extension, profileUUID } }) });
  });
};

const addToArray = (type, uuid = null) => {
  const selector = type === 'colors' ? '#productColors' : '#productSizes';
  let property = 'create';
  let value = $(`#createBody ${selector}`).val();
  if (uuid) {
    property = `${uuid}`;
    value = $(`#tab-${uuid} ${selector}`).val();
  }
  colorAndSizeBuffer[property][type].push(value);
  setColorsAndSizes(uuid);
}

const popFromArray = (type, uuid = null) => {
  let property = 'create';
  if (uuid) property = `${uuid}`;
  colorAndSizeBuffer[property][type].pop();
  setColorsAndSizes(uuid);
}

const removeTab = (uuid) => {
  chrome.storage.local.get('suprome-tabs-v2', storage => {
    delete storage['suprome-tabs-v2'][uuid];
    chrome.storage.local.set({ 'suprome-tabs-v2': storage['suprome-tabs-v2'] });
  });
}

const setTabData = (selector, tab = null) => {
  $(`${selector} .profileSelection`).val(!!tab ? tab.profileUUID : '');
  $(`${selector} #productSection`).val(!!tab ? tab.product.section : '');
  $(`${selector} #productKeyword`).val(!!tab ? tab.product.keyword : '');
  $(`${selector} #productQuantity`).val(!!tab ? tab.product.quantity : '');
  $(`${selector} #extensionTimeout`).val(!!tab ? tab.extension.timeout : '');
  $(`${selector} #extensionCheckoutDelay`).val(!!tab ? tab.extension.checkoutDelay : '');
  $(`${selector} #extensionCheckoutDelayIncrease`).val(!!tab ? tab.extension.checkoutDelayIncrease : '');
  $(`${selector} #extensionRestockReloadDelay`).val(!!tab ? tab.extension.restockReloadDelay : '');
  if (!!tab) {
    const btnContainer = $(`${selector} #createTabBtn`).parent();
    const tabUUID = $(selector).attr('data-tab-uuid');
    btnContainer.html(null);
    btnContainer.append(`<button id="removeTabBtn" class="btn btn-danger" type="button">Remove</button>`);
    btnContainer.append(`<button id="editTabBtn" class="btn btn-primary" type="button" style="margin-left: 5px;">Save</button>`);
    setColorsAndSizes(tabUUID);
    $(`${selector} #editTabBtn`).click(() => saveTab(tabUUID));
    $(`${selector} #removeTabBtn`).click(() => removeTab(tabUUID));
    $(`${selector} #addSize`).click(() => addToArray('sizes', tabUUID));
    $(`${selector} #popSize`).click(() => popFromArray('sizes', tabUUID));
    $(`${selector} #addColor`).click(() => addToArray('colors', tabUUID));
    $(`${selector} #popColor`).click(() => popFromArray('colors', tabUUID));
  }
}

const setColorsAndSizes = (uuid = null) => {
  let selector = '#createBody';
  let property = 'create';
  if (uuid) {
    selector = `#tab-${uuid}`;
    property = uuid;
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

const initProfileSelect = () => {
  $('.profileSelection').html(null);
  chrome.storage.local.get('suprome-profiles-v2', storage => {
    for (const uuid in storage['suprome-profiles-v2']) {
      $('.profileSelection').append(`<option value="${uuid}">${storage['suprome-profiles-v2'][uuid].name}</option>`);
    }
  });
}

const initTabs = () => {
  createTabSizesBuffer = [];
  createTabColorsBuffer = [];
  setTabData('#accordionCreateTask');
  chrome.storage.local.get('suprome-tabs-v2', storage => {
    $('#accordionContainer').html(null);
    for (const uuid in storage['suprome-tabs-v2']) {
      const tab = storage['suprome-tabs-v2'][uuid];
      const { colors = [], sizes = [] } = tab.product
      colorAndSizeBuffer[uuid] = { sizes, colors };
      const original = $('#accordionCreateTask > .card');
      original.clone().appendTo('#accordionContainer');
      $('#accordionContainer > .card').last().attr('id', `tab-${uuid}`);
      $(`#accordionContainer > #tab-${uuid}`).attr('data-tab-uuid', `${uuid}`);
      $(`#accordionContainer #tab-${uuid} button[data-toggle="collapse"]`).attr('data-target', `#tabContent-${uuid}`);
      $(`#accordionContainer > #tab-${uuid} > .collapse`).attr('id', `tabContent-${uuid}`);
      $(`#accordionContainer > #tab-${uuid} > .collapse`).attr('class', `collapse hide`);
      $(`#accordionContainer > #tab-${uuid} > .collapse`).attr('data-parent', '#accordionContainer');
      $(`#tab-${uuid} #tab-title`).html(`[${tab.product.section}] ${tab.product.keyword}`);
      setTabData(`#tab-${uuid}`, tab);
    }
  });
}

const clearMonitorHistory = () => {
  chrome.storage.local.set({ 'suprome-restock-v2-logs': [] }, () => {
    initRestockCards([]);
  });
}

const changeMonitorState = () => {
  chrome.storage.local.get('suprome-restock-v2', config => {
    chrome.storage.local.set({ 'suprome-restock-v2': Object.assign({}, config['suprome-restock-v2'], { enabled: !config['suprome-restock-v2'].enabled })});
  });
}

const setMonitorConfig = () => {
  const restockMonitorDelay = Number($('#restockMonitorDelay').val());
  chrome.storage.local.get('suprome-restock-v2', config => {
    chrome.storage.local.set({ 'suprome-restock-v2': Object.assign({}, config['suprome-restock-v2'], { restockMonitorDelay })});
  });
}

const initMonitorConfig = () => {
  chrome.storage.local.get('suprome-restock-v2', config => {
    $('#restockMonitorToggle').prop('checked', config['suprome-restock-v2'].enabled);
    $('#restockMonitorDelay').val(config['suprome-restock-v2'].restockMonitorDelay);
  });
}

const initRestockCards = (logs) => {
  $('#restockedList').html(null);
  logs.forEach((restocked) => {
    $('#restockedList').append(`
    <a href="${restocked.productUrl}" target="_blank">
      <div class="card mb-3">
        <div class="row no-gutters">
          <div class="col-md-2" style="padding: 15px;" height="128px"><img src="${restocked.productImage}" height="128px"/></div>
          <div class="col-md-10">
            <div class="card-body">
              <h5 class="card-title">${restocked.productName}</h5>
              <p class="card-text">${restocked.productColor}</p>
              <p class="card-text"><small class="text-muted">${restocked.date}</small></p>
            </div>
          </div>
        </div>
      </div>
    </a>
    `);
  });
}

const addProxy = () => {
  const newProxyUrl = $('#newProxy').val();
  $('#newProxy').val(null);
  chrome.storage.local.get('suprome-proxy-v2', config => {
    chrome.storage.local.set({ 'suprome-proxy-v2' : [...config['suprome-proxy-v2'] || [], newProxyUrl]}, () => {
      initProxyList();
    });
  });
}

const removeProxy = (index) => {
  chrome.storage.local.get('suprome-proxy-v2', config => {
    config['suprome-proxy-v2'].splice(index, 1);
    chrome.storage.local.set(config, () => {
      initProxyList();
    });
  });
}

const initProxyList = () => {
  chrome.storage.local.get('suprome-proxy-v2', config => {
    $('[id^="proxyListElement-"]').remove();
    config['suprome-proxy-v2'].forEach((proxy, index) => {
      $('#proxyList').prepend(`
      <li id="proxyListElement-${index}" class="list-group-item">
        <form class="form-inline mb-0">
          <div class="form-group mr-4">
            <input type="text" readonly class="form-control" value="${proxy}" />
          </div>
          <button id="connectBtn" type="button" class="btn btn-primary mr-2">Connect</button>
          <button id="removeBtn" type="button" class="btn btn-danger">Remove</button>
        </form>
      </li>
      `);
      $(`#proxyListElement-${index} #connectBtn`).click(() => {connectToProxy(config['suprome-proxy-v2'][index]);});
      $(`#proxyListElement-${index} #removeBtn`).click(() => {removeProxy(index)});
    });
  });
}

const compileConfig = () => {
  chrome.storage.local.get(['suprome-tabs-v2', 'suprome-profiles-v2'], storage => {
    const compiled = [];
    for (const uuid in storage['suprome-tabs-v2']) {
      const tab = storage['suprome-tabs-v2'][uuid];
      const { product, extension } = tab;
      const { billing, cc } = storage['suprome-profiles-v2'][tab.profileUUID];
      compiled.push({ tabUUID: uuid, profileUUID: tab.profileUUID, product, extension, billing, cc });
    }
    chrome.storage.local.set({ 'suprome-v2': compiled });
  });
}

const initAll = () => {
  initProfileSelect();
  initProfiles();
  initTabs();
  initProxyList();
  initMonitorConfig();
  chrome.storage.local.get(['suprome-restock-v2', 'suprome-restock-v2-logs'], storage => {
    initRestockCards(storage['suprome-restock-v2-logs']);
  });
};

$('#submitProfileBtn').click(() => createProfile());
$('#createTabBtn').click(() => saveTab());
$(`#createBody #addSize`).click(() => addToArray('sizes'));
$(`#createBody #popSize`).click(() => popFromArray('sizes'));
$(`#createBody #addColor`).click(() => addToArray('colors'));
$(`#createBody #popColor`).click(() => popFromArray('colors'));
$('#compileConfigBtn').click(compileConfig);
$('#proxyListAddBtn').click(addProxy);
$('#proxyListConnectBtn').click(() => {connectToProxy($('#newProxy').val())});
$('#clearMonitorHistoryBtn').click(clearMonitorHistory);
$('#restockMonitorToggle').click(changeMonitorState);
$('#saveRestockMonitorBtn').click(setMonitorConfig);
$(document).ready(initAll);

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') return;
  if (changes['suprome-tabs-v2']) {
    initTabs();
    compileConfig();
  } else if (changes['suprome-profiles-v2']) {
    initProfiles();
    initProfileSelect();
    compileConfig();
  }
  else if (changes['suprome-proxy-v2']) initProxyList();
  else if (changes['suprome-restock-v2']) initMonitorConfig();
  else if (changes['suprome-restock-v2-logs']) initRestockCards(changes['suprome-restock-v2-logs'].newValue);
});