const cookiesPerTab = {};

function getInitialCookies(tabId, { name, value }) {
  const initalCookies = {};
  value.split('; ').forEach((uniqueCookie) => {
    const splittedCookie = uniqueCookie.split('=');
    initalCookies[splittedCookie[0]] = splittedCookie[1];
  });
  cookiesPerTab[tabId] = initalCookies;
}

function updateCookies(tabId, responseHeaders) {
  const setCookies = responseHeaders.filter(header => header.name.toLowerCase() === 'set-cookie');
  const newCookies = setCookies.map(setCookieHeader => setCookieHeader.value.split(';')[0]);
  if (!cookiesPerTab[tabId]) cookiesPerTab[tabId] = {};
  newCookies.forEach(newCookie => {
    const splitted = newCookie.split('=');
    cookiesPerTab[tabId][splitted[0]] = splitted[1];
  });
}

function buildCookies(tabId) {
  const cookieArray = [];
  for (const cookieName in cookiesPerTab[tabId]) {
    cookieArray.push(`${cookieName}=${cookiesPerTab[tabId][cookieName]}`);
  }
  return { name: 'Cookie', value: cookieArray.join('; ') };
}

chrome.webNavigation.onBeforeNavigate.addListener(({ tabId, url }) => {
  if (url.indexOf('supremenewyork.com') !== -1) {
    let cookies = Object.assign({}, cookiesPerTab[tabId] || {}, { cart: '', pure_cart: '' });
    for (const cookie in cookies) {
      chrome.cookies.set({ url: 'https://www.supremenewyork.com', name: cookie, value: cookies[cookie] });
    }
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
  let cookiesIndex;
  details.requestHeaders.forEach((head, index) => {
    if (head.name === "Cookie") cookiesIndex = index;
  });
  if (!cookiesPerTab[details.tabId]) {
    details.requestHeaders.splice(cookiesIndex, 1);
  } else details.requestHeaders[cookiesIndex] = buildCookies(details.tabId);
  return { requestHeaders: details.requestHeaders };
}, { urls: ["*://www.supremenewyork.com/**"] }, ["requestHeaders", "extraHeaders"]);

chrome.webRequest.onHeadersReceived.addListener((details) => {
  updateCookies(details.tabId, details.responseHeaders);
}, { urls: ['*://www.supremenewyork.com/**']}, ["responseHeaders", "extraHeaders"]);

chrome.tabs.onRemoved.addListener((tabId) => delete cookiesPerTab[tabId]);