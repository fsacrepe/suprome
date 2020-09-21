let cookiesPerTab = {};

function updateCookies(tabId, responseHeaders) {
  return responseHeaders.map(header => {
    if (header.name.toLowerCase() === 'set-cookie') {
      const split = header.value.split('=').map(a => a.trim());
      chrome.tabs.sendMessage(tabId, { sender: 'cookies', cookie: { [split[0]]: split[1] }, tabId });
      return { name: 'set-cookie', value: `@@${tabId}_${header.value}`};
    }
    return header;
  });
}

function buildCookies(tabId, requestHeaders, browserCookies = null) {
  return requestHeaders.map(header => {
    if (header.name === 'Cookie') {
      let requestCookies = {};
      let requestCookiesArray = [];
      header.value.split(';').forEach((cookies) => {
        const split = cookies.split('=').map(s => s.trim());
        if (split[0].indexOf(`@@${tabId}`) === 0) requestCookies[split[0].substring(3+String(tabId).length, split[0].length)] = split[1];
        else if (split[0].indexOf('@@') === 0) return;
        else requestCookies[split[0]] = split[1];
      });
      requestCookies = { ...requestCookies, ...browserCookies };
      for (let cookieName in requestCookies) requestCookiesArray = [ ...requestCookiesArray, `${cookieName}=${requestCookies[cookieName]}`];
      return { name: 'Cookie', value: requestCookiesArray.join('; ') };
    }
    return header;
  });
}

chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
  if (details.tabId < 0) return;
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
    const split = message.cookie.split('=');
    if (!cookiesPerTab[message.tabId]) cookiesPerTab = { [message.tabId]: { [split[0]]: split[1] } };
    else cookiesPerTab[message.tabId][split[0]] = split[1];
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.cookies.getAll({ url: 'https://www.supremenewyork.com' }, cookies => {
    const matchingCookiesNames = [];
    cookies.forEach((cookie) => {
      if (cookie.name.indexOf(`@@${tabId}_`) === 0) matchingCookiesNames.push(cookie.name);
    });
    matchingCookiesNames.forEach(name => chrome.cookies.remove({ name, url: 'https://www.supremenewyork.com' }));
  });
});
