let log = [];
let lastState = {};
const promises = [];
let monitorInterval;

function createNotification(name, color, image) {
  chrome.notifications.create(null, {
    type: 'basic',
    iconUrl: image,
    title: 'Restock Alert!',
    message: `${name} (${color})`
  }, () => {});
}

function setRestockMonitorStatus(enabled) {
  chrome.storage.local.get('suprome-restock', config => {
    chrome.storage.local.set({ 'suprome-restock': Object.assign({}, config['suprome-restock'], { enabled }) }, () => {});
  });
}

function createMonitorInterval(interval) {
  monitorInterval = setInterval(() => {
    chrome.storage.local.get('suprome-restock', updatedConfig => {
      if (!updatedConfig['suprome-restock'].enabled) return;
      const newState = {};
      log = updatedConfig['suprome-restock'].log;
      lastState = updatedConfig['suprome-restock'].lastState;
      $.get('https://supremenewyork.com/shop/all').then(e => {
        const notSoldout = $($.parseHTML(e)).find('article a:not(:has(.sold_out_tag))');
        notSoldout.each(index => {
          const href = `https://supremenewyork.com${notSoldout[index].pathname}`;
          if (Object.keys(lastState).length && !lastState[href]) promises.push(href);
          newState[href] = {};
        });
        chrome.storage.local.set({ 'suprome-restock': Object.assign({}, updatedConfig['suprome-restock'], { lastState: newState}) }, _ => {});
      });
    });
  }, interval);
}

chrome.runtime.onConnect.addListener((_port) => {
  if (_port.name === 'suprome-popup') {
    _port.onMessage.addListener((msg) => {
      if (msg.start) setRestockMonitorStatus(false);
      else if (msg.stop) setRestockMonitorStatus(true);
    });
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes['suprome-restock']) {
    clearInterval(monitorInterval);
    createMonitorInterval(changes['suprome-restock'].newValue.restockMonitorDelay);
  }
});

chrome.storage.local.get('suprome-restock', (_config) => {
  createMonitorInterval(_config['suprome-restock'].restockMonitorDelay);
  setInterval(() => {
    const now = (new Date).toString();
    if (promises.length) {
      const nextRequestUrl = promises.shift();
      $.get(nextRequestUrl).then((product) => {
        const prod = $($.parseHTML(product));
        const productUrl = nextRequestUrl;
        const productName = prod.find('[itemprop="name"]').text();
        const productColor = prod.find('[itemprop="model"]').text();
        const productImage = `https:${prod.find('[itemprop="image"]')[0].attributes['src'].value}`;
        const productSmallImage = `https:${prod.find('a.selected > img')[0].attributes['src'].value}`;
        createNotification(productName, productColor, productSmallImage);
        chrome.storage.local.get('suprome-restock-logs', config => {
          chrome.storage.local.set({'suprome-restock-logs': [{productName, productColor, productImage, productUrl, date: now}, ...(config['suprome-restock-logs'] || [])]}, () => {});
        });
      });
    }
  }, 150);
});