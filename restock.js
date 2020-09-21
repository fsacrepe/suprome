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
  });
}

function setRestockMonitorStatus(enabled) {
  chrome.storage.local.get('suprome-restock-v2', config => {
    chrome.storage.local.set({ 'suprome-restock-v2': Object.assign({}, config['suprome-restock-v2'], { enabled }) });
  });
}

function createMonitorInterval(interval) {
  monitorInterval = setInterval(() => {
    chrome.storage.local.get('suprome-restock-v2', updatedConfig => {
      if (!updatedConfig['suprome-restock-v2'].enabled) return;
      const newState = {};
      log = updatedConfig['suprome-restock-v2'].log;
      lastState = updatedConfig['suprome-restock-v2'].lastState;
      $.get('https://www.supremenewyork.com/shop/all').then(e => {
        const notSoldout = $($.parseHTML(e)).find('article a:not(:has(.sold_out_tag))');
        notSoldout.each(index => {
          const href = `https://www.supremenewyork.com${notSoldout[index].pathname}`;
          if (Object.keys(lastState).length && !lastState[href]) promises.push(href);
          newState[href] = {};
        });
        chrome.storage.local.set({ 'suprome-restock-v2': Object.assign({}, updatedConfig['suprome-restock-v2'], { lastState: newState }) });
      });
    });
  }, interval);
}

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
      chrome.storage.local.get('suprome-restock-v2-logs', config => {
        chrome.storage.local.set({'suprome-restock-v2-logs': [{productName, productColor, productImage, productUrl, date: now}, ...(config['suprome-restock-v2-logs'] || [])]});
      });
    });
  }
}, 100);

chrome.storage.onChanged.addListener((changes) => {
  if (changes['suprome-restock-v2']) {
    clearInterval(monitorInterval);
    createMonitorInterval(changes['suprome-restock-v2'].newValue.restockMonitorDelay);
  }
});
