let start = false;
let page = null;
let portPopup;
let portContentScript;
const productSectionRegexp = new RegExp(/^https:\/\/www.supremenewyork.com\/shop\/all\/[a-z\_\-]+$/)
const productSelectedRegexp = new RegExp(/^https:\/\/www.supremenewyork.com\/shop\/[a-z\_\-]+\/[a-z0-9]+\/[a-z0-9]+$/);
const checkoutUrl = 'https://www.supremenewyork.com/checkout/';

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

function stopBot(config) {
  start = false;
  console.timeEnd('Execution time');
  if (config['suprome-config'].autoclear)
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

// Receive finished requests from supremenewyork.com, so content_script can go quicker
chrome.webRequest.onCompleted.addListener((r) => {
  if (!start) return;
  if (r.url.match(productSectionRegexp) && page !== 'product-section') {
    page = 'product-section';
  } else if (r.url.match(productSelectedRegexp) && page !== 'product-selected') {
    page = 'product-selected';
  } else if (r.url === checkoutUrl && page !== 'checkout') {
    page = 'checkout';
  }
}, { urls: ["*://www.supremenewyork.com/*"] }, []);

// Get config first
chrome.storage.sync.get(['suprome-product', 'suprome-billing', 'suprome-cc', 'suprome-config'], (config) => {

  // Get connection links to communicate between js files
  chrome.runtime.onConnect.addListener((_port) => {

    if (_port.name === 'suprome-popup') { // Message coming from popup
      portPopup = _port;
      portPopup.onMessage.addListener((message) => {
        if (message.start === true) {
          console.time('Execution time');
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
          state = null;
          portContentScript.postMessage(createMessage({ start: true }, config));
        } else if (message.loaded) {
          portContentScript.postMessage(createMessage({ page }, config));
        }
      });
    }
  });
});
