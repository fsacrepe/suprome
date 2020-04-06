let start = false;
let state;
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

chrome.storage.sync.get(['suprome-product', 'suprome-billing', 'suprome-cc', 'suprome-config'], (config) => {
  chrome.runtime.onConnect.addListener((_port) => {
    if (_port.name === 'suprome-popup') {
      portPopup = _port;
      portPopup.onMessage.addListener((message) => {
        console.log('[MESSAGE] Popup', message);
        if (message.start === true) {
          console.time('Execution time');
          start = true;
          portContentScript.postMessage(createMessage({ start: true }, config));
          setTimeout(() => {
            start = false;
            if (config['suprome-config'].autoclear) clearCCStorage();
          }, config['suprome-config'].timeout * 1000);
        }
        if (message.stop) {
          start = false;
          if (config['suprome-config'].autoclear) clearCCStorage();
        }
      });
    }
    else if (_port.name === 'suprome-content_script') {
      portContentScript = _port;
      portContentScript.onMessage.addListener((message) => {
        console.log('[MESSAGE] Content Script', message);
        if (message.done) {
          start = false;
          console.timeEnd('Execution time');
          if (config['suprome-config'].autoclear) clearCCStorage();
        }
        if (message.error === 'NOT_FOUND') {
          portContentScript.postMessage(createMessage({ start: true }, config));
        }
      });
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (!start) return;
        const { status, url } = tab;
        console.log(tab);
        if (status === 'complete' && url.match(productSectionRegexp) && state !== 'product-section') {
          state = 'product-section';
          const message = createMessage({ page: 'product-section' }, config);
          portContentScript.postMessage(message);
        } else if (status === 'complete' && url.match(productSelectedRegexp) && state !== 'product-selected') {
          state = 'product-selected';
          const message = createMessage({ page: 'product-selected' }, config);
          portContentScript.postMessage(message);
        } else if (status === 'complete' && url === checkoutUrl && state !== 'checkout') {
          state = 'checkout';
          const message = createMessage({ page: 'checkout' }, config);
          portContentScript.postMessage(message);
        }
      });
    }
  });
});
