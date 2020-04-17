let start = false;

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

function stopBot() {
  page = null;
  start = false;
  console.timeEnd('Execution time');
}

// Get config first
chrome.storage.local.get(['suprome-product', 'suprome-billing', 'suprome-cc', 'suprome-config'], (config) => {
  let portPopup; // Used to store communication port between popup and background
  let portContentScript; // Used to store communication port between content script and background
  let botStatus = {
    colorsIndex: 0,
    next: null,
  };
  let productSection = config['suprome-product'].section;

  console.log('config', config);

  // Get connection links to communicate between js files
  chrome.runtime.onConnect.addListener((_port) => {

    if (_port.name === 'suprome-popup') { // Message coming from popup
      portPopup = _port;
      portPopup.onMessage.addListener((message) => {
        if (message.start) {
          console.time('Execution time');
          start = true;
          botStatus.colorsIndex = 0;
          sendMessage(portContentScript, { start: true, section: productSection });
          setTimeout(() => stopBot(config), config['suprome-config'].timeout * 1000);
        } else if (message.stop) {
          stopBot(config);
        }
      });
    } else if (_port.name === 'suprome-content_script') { // Message coming from content script
      portContentScript = _port;
      portContentScript.onMessage.addListener((message) => {
        if (message.error === ERRORS.COLOR_SOLD_OUT) {
          botStatus.colorsIndex++;
          if (botStatus.colorsIndex === config['suprome-product'].colors.length) {
            botStatus.colorsIndex = 0;
            setTimeout(() => sendMessage(portContentScript, { reload: true }), config['suprome-config'].restockReloadDelay);
          } else {
            sendMessage(portContentScript, { selectColor: true, color: config['suprome-product'].colors[botStatus.colorsIndex] });
          }
        } else if (message.error === ERRORS.PRODUCT_NOT_FOUND) {
          botStatus.colorsIndex = 0;
          setTimeout(() => sendMessage(portContentScript, { reload: true }), 500);
        } else if (message.error === ERRORS.CC_DECLINED) {
          botStatus.colorsIndex = 0;
          sendMessage(portContentScript, { start: true, section: productSection });
        } else if (message.loaded) {
          sendMessage(portContentScript, botStatus.next);
          botStatus.next = null;
        } else if (message.done) {
          stopBot();
        }
      });
    }

  });

  chrome.webRequest.onCompleted.addListener((r) => {
    if (!start) return;
    botStatus.next = { findProduct: true, keyword: config['suprome-product'].keyword };
  }, { urls: [`https://www.supremenewyork.com/shop/all/${productSection}`] }, []);

  chrome.webRequest.onCompleted.addListener((r) => {
    if (!start) return;
    if (r.url.indexOf('?') != -1) {
      sendMessage(portContentScript, { selectSize: true, sizes: config['suprome-product'].sizes });
    } else {
      botStatus.next = { selectColor: true, color: config['suprome-product'].colors[0] };
    }
  }, { urls: [`https://www.supremenewyork.com/shop/${productSection}/*/*`] }, []);

  chrome.webRequest.onCompleted.addListener(() => {
    if (!start) return;
    sendMessage(portContentScript, { goToCheckout: true });
  }, { urls: [`https://www.supremenewyork.com/shop/*/add`] }, []);

  chrome.webRequest.onCompleted.addListener(() => {
    if (!start) return;
    botStatus.next = {
      placeOrder: true,
      billing: config['suprome-billing'],
      cc: config['suprome-cc'],
      checkoutDelay: config['suprome-config'].checkoutDelay
    };
  }, { urls: [`https://www.supremenewyork.com/checkout/`] }, []);

  chrome.webRequest.onCompleted.addListener(() => {
    if (!start) return;
    botStatus.next = { start: true, section: productSection };
  }, { urls: ['https://www.supremenewyork.com/shop/cart*'] }, []);

  chrome.webRequest.onCompleted.addListener(() => {
    if (!start) return;
    sendMessage(portContentScript, { checkoutResponse: true });
  }, { urls: ['https://www.supremenewyork.com/checkout.json'] }, []);

  chrome.webRequest.onCompleted.addListener(() => {
    if (!start) return;
    stopBot();
  }, { urls: ['*://www.paypal.com/**'] }, []);

});