let botStatus = {};

const ERRORS = {
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  COLOR_SOLD_OUT: 'COLOR_SOLD_OUT',
  SIZE_NOT_FOUND: 'SIZE_NOT_FOUND',
  PRODUCT_SOLD_OUT: 'PRODUCT_SOLD_OUT',
  CC_DECLINED: 'CC_DECLINED',
};

const TAB_STATUS = {
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  SEARCHING_PRODUCT: 'SEARCHING_PRODUCT',
};

const productSectionURLs = [
  'https://www.supremenewyork.com/shop/jackets',
  'https://www.supremenewyork.com/shop/shirts',
  'https://www.supremenewyork.com/shop/tops_sweaters',
  'https://www.supremenewyork.com/shop/sweatshirts',
  'https://www.supremenewyork.com/shop/pants',
  'https://www.supremenewyork.com/shop/t-shirts',
  'https://www.supremenewyork.com/shop/hats',
  'https://www.supremenewyork.com/shop/bags',
  'https://www.supremenewyork.com/shop/accessories',
  'https://www.supremenewyork.com/shop/shoes',
  'https://www.supremenewyork.com/shop/skate',
];

function sendMessage(port, message) {
  port.postMessage({ sender: 'background', ...message });
}

function transformProductSection(section) {
  if (section.indexOf('_') !== -1) {
    const replaced = section.replace(new RegExp(/_/gi), '-');
    return replaced;
  }
  return section;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['suprome-v2', 'suprome-profiles-v2', 'suprome-tabs-v2'], s => {
    if (!Object.keys(s).length) {
      chrome.storage.local.set({
        'suprome-v2': [],
        'suprome-profiles-v2': {},
        'suprome-tabs-v2': {},
        'suprome-restock-v2': { enabled: false, restockMonitorDelay: 1000, lastState: {} },
        'suprome-restock-v2-logs': [],
        'suprome-proxy-v2': []
      });
    }
  });
});

chrome.webRequest.onCompleted.addListener((r) => {
  const { tabId } = r;
  if (!Object.keys(botStatus).length) return;
  botStatus[tabId].next = {
    findProduct: true, 
    keyword: botStatus[tabId].config.product.keyword,
  };
}, { urls: productSectionURLs }, []);

chrome.webRequest.onCompleted.addListener((r) => {
  const { tabId } = r;
  if (!Object.keys(botStatus).length) return;
  if (r.url.indexOf('?') != -1) {
    sendMessage(botStatus[tabId].portContentScript, {
      selectSize: true,
      sizes: botStatus[tabId].config.product.sizes,
      quantity: botStatus[tabId].config.product.quantity
    });
  } else {
    botStatus[tabId].next = { selectColor: true, color: botStatus[tabId].config.product.colors[0] };
  }
}, { urls: productSectionURLs.map(url => `${transformProductSection(url)}/*/*`) }, []);

chrome.webRequest.onCompleted.addListener((r) => {
  const { tabId } = r;
  if (!Object.keys(botStatus).length) return;
  sendMessage(botStatus[tabId].portContentScript, { goToCheckout: true });
}, { urls: [`https://www.supremenewyork.com/shop/*/add`] }, []);

chrome.webRequest.onCompleted.addListener((r) => {
  const { tabId } = r;
  if (!Object.keys(botStatus).length) return;
  botStatus[tabId].next = {
    placeOrder: true,
    billing: botStatus[tabId].config.billing,
    cc: botStatus[tabId].config.cc,
    checkoutDelay: botStatus[tabId].config.extension.checkoutDelay,
  };
}, { urls: [`https://www.supremenewyork.com/checkout/`] }, []);

chrome.webRequest.onCompleted.addListener((r) => {
  const { tabId } = r;
  if (!Object.keys(botStatus).length) return;
  botStatus[tabId].next = { start: true, section: botStatus[tabId].config.product.section };
}, { urls: ['https://www.supremenewyork.com/shop/cart*'] }, []);

chrome.webRequest.onCompleted.addListener((r) => {
  const { tabId } = r;
  if (!Object.keys(botStatus).length) return;
  sendMessage(botStatus[tabId].portContentScript, { checkoutResponse: true });
}, { urls: ['https://www.supremenewyork.com/checkout/*/status.json'] }, []);

chrome.webRequest.onCompleted.addListener((r) => {
  const { tabId } = r;
  if (!Object.keys(botStatus).length) return;
  sendMessage(botStatus[tabId].portContentScript, { checkoutResponse: true });
}, { urls: ['https://www.supremenewyork.com/checkout.json'] }, []);

// Get config first
chrome.storage.local.get('suprome-v2', (_config) => {
  let config = _config['suprome-v2'];
  let portPopup; // Used to store communication port between popup and background

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') return;
    if (changes['suprome-v2']) config = changes['suprome-v2'].newValue;
  });

  const stopBot = (tabId) => {
    delete botStatus[tabId];
  }
  const runTask = (search, searchMap) => {
    const params = search.split(':');
    $.get(`https://www.supremenewyork.com/shop/all/${params[0]}`)
      .done(e => {
        const productUrl = $($.parseHTML(e)).find(`.inner-article:contains(${params[1]})`).first().find('a');
        if (!productUrl.length && botStatus['-1']) return setTimeout(() => { runTask(search, searchMap); }, 250);
        else if (!productUrl.length && !botStatus['-1']) return;
        for (let confCount = 0; !!searchMap[search][confCount]; confCount++) {
          chrome.tabs.create({ url: `https://www.supremenewyork.com${productUrl[0].pathname}` }, (newTab) => {
            botStatus = Object.assign({}, botStatus, { [newTab.id]: { start: true, colorsIndex: 0, next: null, portContentScript: null, config: searchMap[search][confCount] } });
            setTimeout(() => stopBot(newTab.id), botStatus[newTab.id].config.extension.timeout * 1000);
          });
        }
      })
      .fail(() => {
        if (botStatus['-1']) return setTimeout(() => { runTask(search, searchMap); }, 250);
        else if (!botStatus['-1']) return;
      });
  }
  const setTabStatus = (tabUUID = null, status) => {
    if (status === TAB_STATUS.SEARCHING_PRODUCT) botStatus['-1'].push(tabUUID);
    else if (status === TAB_STATUS.RUNNING) botStatus['-1'].slice(botStatus.indexOf(tabUUID), 1);
    else if (status === TAB_STATUS.STOPPED && !tabUUID)
    chrome.storage.local.get('suprome-tabs-v2', storage => {
      chrome.storage.local.set({ 'suprome-tabs-v2': Object.assign({}, storage['suprome-tabs-v2'], { [tabUUID]: { ...storage['suprome-tabs-v2'][tabUUID], status } })});
    });
  }

  // Get connection links to communicate between js files
  chrome.runtime.onConnect.addListener((_port) => {

    if (_port.name === 'suprome-popup') { // Message coming from popup
      portPopup = _port;
      portPopup.onMessage.addListener((message) => {
        if (message.start && !message.configId) {
          const searchMap = {}
          if (!botStatus['-1']) botStatus = Object.assign({}, botStatus, { ['-1']: [] });
          for (let i = 0; !!config[i]; i++) {
            const { keyword, section } = config[i].product;
            searchMap[`${section}:${keyword}`] = [...(searchMap[`${section}:${keyword}`] || []), config[i]];
          }
          for (const search in searchMap) { runTask(search, searchMap); }
        } else if (message.start && message.configId) {
          const { keyword, section } = config[message.configId].product;
          if (!botStatus['-1']) botStatus = Object.assign({}, botStatus, { ['-1']: {}});
          runTask(`${section}:${keyword}`, { [`${section}:${keyword}`]: [confg[message.configId]] });
        } else if (message.stop && !message.tabId) {
          for (const tabId in botStatus) stopBot(tabId);
        } else if (message.stop && message.tabId) {
          stopBot(message.tabId);
        }
      });
    } else if (_port.name === 'suprome-content_script') { // Message coming from content script
      const tabId = _port.sender.tab.id;
      if (tabId > -1 && botStatus[tabId]) {
        botStatus[tabId].portContentScript = _port;
        botStatus[tabId].portContentScript.onMessage.addListener((message) => {
          if (message.error === ERRORS.COLOR_SOLD_OUT) {
            botStatus[tabId].colorsIndex++;
            if (botStatus[tabId].colorsIndex === botStatus[tabId].config.product.colors.length) {
              botStatus[tabId].colorsIndex = 0;
              setTimeout(() => sendMessage(botStatus[tabId].portContentScript, { reload: true }), botStatus[tabId].config.extension.restockReloadDelay);
            } else {
              sendMessage(botStatus[tabId].portContentScript, { selectColor: true, color: botStatus[tabId].config.product.colors[botStatus[tabId].colorsIndex] });
            }
          } else if (message.error === ERRORS.PRODUCT_NOT_FOUND) {
            botStatus[tabId].colorsIndex = 0;
            setTimeout(() => sendMessage(botStatus[tabId].portContentScript, { reload: true }), 500);
          } else if (message.error === ERRORS.CC_DECLINED || message.error === ERRORS.PRODUCT_SOLD_OUT) {
            botStatus[tabId].config.extension.checkoutDelay += botStatus[tabId].config.extension.checkoutDelayIncrease || 0;
            sendMessage(botStatus[tabId].portContentScript, { start: true, section: botStatus[tabId].config.product.section });
          } else if (message.loaded) {
            sendMessage(botStatus[tabId].portContentScript, botStatus[tabId].next);
            botStatus[tabId].next = null;
          } else if (message.done) {
            delete botStatus[tabId];
          }
        });
      }
    }
  });
});
