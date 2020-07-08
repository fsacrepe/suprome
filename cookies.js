const cookiesPerTab = {};

function updateCookies(tabId, responseHeaders) {
  return responseHeaders.map(header => {
    if (header.name.toLowerCase() === 'set-cookie') {
      return { name: 'set-cookie', value: `@@${tabId}_${header.value}`};
    }
    return header;
  });
}

function buildCookies(tabId, requestHeaders, browserCookies = null) {
  return requestHeaders.map(header => {
    if (header.name === 'Cookie') {
      let obj = {};
      let value = '';
      let browserSplit;
      if (browserCookies) browserSplit = header.value.split(';').map(s => s.trim());
      const requestSplit = header.value.split(';').map(s => s.trim());
      const originalCookies = (browserSplit || requestSplit).filter(s => s.indexOf('@@') != 0);
      const tabCookies = requestSplit.filter(s => s.indexOf(`@@${tabId}_`) === 0).map(s => s.slice(`@@${tabId}_`.length));
      const allCookies = tabCookies.concat(originalCookies);
      allCookies.forEach((cookie) => { const cookieSplit = cookie.split('='); obj[cookieSplit[0]] = cookieSplit[1]});
      for (const prop in obj) {
        value += `${prop}=${obj[prop]}; `;
      }
      return { name: 'Cookie', value };
    }
    return header;
  });
}

chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
  if (details.tabId < 0) return;
  let cookiesIndex;
  details.requestHeaders.forEach((head, index) => {
    if (head.name === "Cookie") cookiesIndex = index;
  });
  return { requestHeaders: buildCookies(details.tabId, details.requestHeaders, cookiesPerTab[details.tabId]) };
}, { urls: ["*://www.supremenewyork.com/**"] }, ["requestHeaders", "extraHeaders", "blocking"]);

chrome.webRequest.onHeadersReceived.addListener((details) => {
  if (details.tabId < 0) return;
  return { responseHeaders: updateCookies(details.tabId, details.responseHeaders) };
}, { urls: ['*://www.supremenewyork.com/**']}, ["responseHeaders", "extraHeaders", "blocking"]);

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (tab.url.indexOf('supremenewyork.com') !== -1) {
    chrome.tabs.sendMessage(tabId, { sender: 'cookies', inject: true, tabId });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.sender === 'content_script' && message.cookie) {
    cookiesPerTab[message.tabId] = message.cookie;
  }
});
