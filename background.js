let page = null;
let start = false;
const cartUrl = 'https://www.supremenewyork.com/shop/cart';
const checkoutUrl = 'https://www.supremenewyork.com/checkout/';
const productSectionUrl = 'https://www.supremenewyork.com/shop/all/';
const productSelectedUrl = 'https://www.supremenewyork.com/shop/';
const checkoutResponseUrl = 'https://www.supremenewyork.com/checkout.json';

function createMessage(content, config = {}) {
  return {
    sender: 'background',
    config,
    ...content
  };
}

function clearCCStorage() {
  chrome.storage.sync.remove('suprome-cc', () => {
    console.log('[STORAGE] CC Info removed');
  });
}

function stopBot(config = null) {
  page = null;
  start = false;
  console.timeEnd('Execution time');
  if (!!config && config['suprome-config'].autoclear)
    clearCCStorage();
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

// Block images and css files from loading
chrome.webRequest.onBeforeRequest.addListener(
  r => ({cancel: start && (r.url.indexOf('.jpg') != -1 || r.url.indexOf('.gif') != -1 || r.url.indexOf('.css') != 1)}),
  { urls: ['https://assets.supremenewyork.com/*', 'https://*.cloudfront.net/*'] },
  ['blocking']
);

// Get config first
chrome.storage.sync.get(['suprome-product', 'suprome-billing', 'suprome-cc', 'suprome-config'], (config) => {
  let portPopup; // Used to store communication port between popup and background
  let portContentScript; // Used to store communication port between content script and background

  // Get connection links to communicate between js files
  chrome.runtime.onConnect.addListener((_port) => {

    if (_port.name === 'suprome-popup') { // Message coming from popup
      portPopup = _port;
      portPopup.onMessage.addListener((message) => {
        if (message.start) {
          console.time('Execution time');
          console.time('Time to checkout');
          start = true;
          portContentScript.postMessage(createMessage({ start: true }, config));
          setTimeout(() => stopBot(config), config['suprome-config'].timeout * 1000);
        } else if (message.stop) {
          stopBot(config);
        }
      });
    } else if (_port.name === 'suprome-content_script') { // Message coming from content script
      portContentScript = _port;
      portContentScript.onMessage.addListener((message) => {
        if (message.done) {
          stopBot(config);
        } else if (message.error === 'NOT_FOUND') {
          page = null;
          portContentScript.postMessage(createMessage({ start: true }, config));
        } else if (message.loaded) {
          portContentScript.postMessage(createMessage({ page }, config));
        } else if (message.checkout) {
          console.timeEnd('Time to checkout');
        }
      });
    }

  });

  // Receive finished requests from supremenewyork.com, so content_script can go quicker
  chrome.webRequest.onCompleted.addListener((r) => {
    if (!start) return;
    if (r.url.indexOf(productSectionUrl) != -1 && page !== 'product-section') {
      page = 'product-section';
    } else if (r.url.indexOf(productSelectedUrl + config['suprome-product'].section) != -1 && page !== 'product-selected') {
      page = 'product-selected';
    } else if (r.url === checkoutUrl && page !== 'checkout') {
      page = 'checkout';
    } else if (r.url.indexOf(cartUrl) && page !== 'checkout-oos') {
      // Product out of stock
      page = 'checkout-oos';
    } else if (r.url === checkoutResponseUrl && page !== 'checkout-response') {
      // View does not reload on checkout response, so I directly send the message here
      page = 'checkout-response';
      portContentScript.postMessage(createMessage({ page }, config));
    } else if (r.url.indexOf('paypal.com') != -1) {
      stopBot(config);
    }
  }, { urls: ["*://www.supremenewyork.com/*", "https://www.paypal.com/*"] }, []);

});
