let botStatus = {};
const ERRORS = {
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  COLOR_SOLD_OUT: 'COLOR_SOLD_OUT',
  SIZE_NOT_FOUND: 'SIZE_NOT_FOUND',
  PRODUCT_SOLD_OUT: 'PRODUCT_SOLD_OUT',
  CC_DECLINED: 'CC_DECLINED',
};

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

function createRequestListeners(tabId) {
  chrome.webRequest.onCompleted.addListener((r) => {
    const { tabId } = r;
    if (!botStatus.start) return;
    botStatus[tabId].next = { findProduct: true, keyword: botStatus[tabId].config.product.keyword };
  }, { urls: [`https://www.supremenewyork.com/shop/all/${botStatus[tabId].config.product.section}`] }, []);

  chrome.webRequest.onCompleted.addListener((r) => {
    const { tabId } = r;
    if (!botStatus.start) return;
    if (r.url.indexOf('?') != -1) {
      sendMessage(botStatus[tabId].portContentScript, {
        selectSize: true,
        sizes: botStatus[tabId].config.product.sizes,
        quantity: botStatus[tabId].config.product.quantity
      });
    } else {
      botStatus[tabId].next = { selectColor: true, color: botStatus[tabId].config.product.colors[0] };
    }
  }, { urls: [`https://www.supremenewyork.com/shop/${transformProductSection(botStatus[tabId].config.product.section)}/*/*`] }, []);

  chrome.webRequest.onCompleted.addListener((r) => {
    const { tabId } = r;
    if (!botStatus.start) return;
    //sendMessage(botStatus[tabId].portContentScript, { goToCheckout: true });
  }, { urls: [`https://www.supremenewyork.com/shop/*/add`] }, []);

  chrome.webRequest.onCompleted.addListener((r) => {
    const { tabId } = r;
    if (!botStatus.start) return;
    botStatus[tabId].next = {
      placeOrder: true,
      billing: botStatus[tabId].config.billing,
      cc: botStatus[tabId].config.cc,
      checkoutDelay: botStatus[tabId].config.extension.checkoutDelay,
    };
  }, { urls: [`https://www.supremenewyork.com/checkout/`] }, []);

  chrome.webRequest.onCompleted.addListener((r) => {
    const { tabId } = r;
    if (!botStatus.start) return;
    botStatus[tabId].next = { start: true, section: botStatus[tabId].config.product.section };
  }, { urls: ['https://www.supremenewyork.com/shop/cart*'] }, []);

  chrome.webRequest.onCompleted.addListener((r) => {
    const { tabId } = r;
    if (!botStatus.start) return;
    sendMessage(botStatus[tabId].portContentScript, { checkoutResponse: true });
  }, { urls: ['https://www.supremenewyork.com/checkout/*/status.json'] }, []);

  chrome.webRequest.onCompleted.addListener((r) => {
    const { tabId } = r;
    if (!botStatus.start) return;
    sendMessage(botStatus[tabId].portContentScript, { checkoutResponse: true });
  }, { urls: ['https://www.supremenewyork.com/checkout.json'] }, []);

  chrome.webRequest.onCompleted.addListener((r) => {
    const { tabId } = r;
    if (!botStatus.start) return;
    stopBot(tabId);
  }, { urls: ['*://www.paypal.com/**'] }, []);
}

// Used to set extension's icon in greyscale if not on supremenewyork.com
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'www.supremenewyork.com', schemes: ['https'] }
          })
        ],
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
});

// Get config first
chrome.storage.local.get('suprome', (_config) => {
  let config = _config.suprome;
  let portPopup; // Used to store communication port between popup and background

  const stopBot = (tabId) => botStatus[tabId].start = false;
  const runTask = (search, searchMap) => {
    const params = search.split(':');
    $.get(`https://www.supremenewyork.com/shop/all/${params[0]}`)
      .done(e => {
        const productUrl = $($.parseHTML(e)).find(`.inner-article:contains(${params[1]})`).first().find('a');
        if (!productUrl.length && botStatus.start === true) return setTimeout(() => { runTask(search, searchMap); }, 500);
        else if (!productUrl.length && !botStatus.start) return;
        for (let confCount = 0; !!searchMap[search][confCount]; confCount++) {
          chrome.tabs.create({ url: `https://www.supremenewyork.com${productUrl[0].pathname}` }, (newTab) => {
            botStatus = Object.assign({}, botStatus, { [newTab.id]: { start: true, colorsIndex: 0, next: null, portContentScript: null, config: searchMap[search][confCount] } });
            setTimeout(() => stopBot(newTab.id), botStatus[newTab.id].config.extension.timeout * 1000);
            createRequestListeners(newTab.id);
          });
        }
      })
      .fail(() => {
        if (botStatus.start === true) return setTimeout(() => { runTask(search, searchMap); }, 2000);
        else if (!botStatus.start) return;
      });
  }

  // Get connection links to communicate between js files
  chrome.runtime.onConnect.addListener((_port) => {

    if (_port.name === 'suprome-popup') { // Message coming from popup
      portPopup = _port;
      portPopup.onMessage.addListener((message) => {
        if (message.start) {
          const searchMap = {}
          botStatus.start = true;
          for (let i = 0; !!config[i]; i++) {
            const { keyword, section } = config[i].product;
            searchMap[`${section}:${keyword}`] = [...(searchMap[`${section}:${keyword}`] || []), config[i]];
          }
          for (const search in searchMap) { runTask(search, searchMap); }
        } else if (message.stop) {
          botStatus.start = false;
        }
      });
    } else if (_port.name === 'suprome-content_script') { // Message coming from content script
      const tabId = _port.sender.tab.id;
      if (botStatus[tabId]) {
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
            botStatus[tabId].colorsIndex = 0;
            botStatus[tabId].config.extension.checkoutDelay += botStatus[tabId].config.extension.checkoutDelayIncrease || 0;
            sendMessage(botStatus[tabId].portContentScript, { start: true, section: botStatus[tabId].config.product.section });
          } else if (message.loaded) {
            sendMessage(botStatus[tabId].portContentScript, botStatus[tabId].next);
            botStatus[tabId].next = null;
          } else if (message.done) {
            stopBot(tabId);
          }
        });
      }
    }
  });
});
