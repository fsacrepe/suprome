chrome.storage.onChanged.addListener((changes) => {
  if (changes['suprome-proxy-v2']) setProxyConfig();
});

chrome.proxy.onProxyError.addListener(_ => {
  chrome.notifications.create(null, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title: 'Suprome Proxy Error',
    message: 'One of your proxies is failing to make requests'
  }, () => {});
});

function setProxyConfig() {
  chrome.storage.local.get('suprome-proxy-v2', config => {
    const proxyConfig = {
      mode: 'pac_script',
      pacScript: {
        data: "function FindProxyForURL(url, host) {\n" +
        "  var proxies = ['DIRECT'," + config['suprome-proxy-v2'].map(a => `'PROXY ${a}; DIRECT'`).join(',') + "];" +
        "  if (dnsDomainIs(host, '.supremenewyork.com') || dnsDomainIs(host, '.mon-ip.io'))\n" +
        "    return proxies[Math.floor(Math.random() * proxies.length)];\n" +
        "  return 'DIRECT';\n" +
        "}",
        mandatory: true,
      }
    };
    chrome.proxy.settings.set({value: proxyConfig, scope: 'regular'}, () => {});
  });
}

// (() => {setProxyConfig();})();