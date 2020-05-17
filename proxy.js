chrome.storage.onChanged.addListener((changes) => {
  if (changes['suprome-proxy']) setProxyConfig();
});

chrome.proxy.onProxyError.addListener((err) => {
  console.log('proxy error', err);
  chrome.notifications.create(null, {
    type: 'basic',
    title: 'Suprome Proxy Error',
    message: 'One of your proxies is failing to make requests'
  }, () => {});
});

function setProxyConfig() {
  chrome.storage.local.get('suprome-proxy', config => {
    const proxyConfig = {
      mode: 'pac_script',
      pacScript: {
        data: "function FindProxyForURL(url, host) {\n" +
        "  var proxies = ['DIRECT'," + config['suprome-proxy'].map(a => `'PROXY ${a}'`).join(',') + "];" +
        "  if (host == 'supremenewyork.com')\n" +
        "    return proxies[Math.floor(Math.random() * proxies.length)];\n" +
        "  return 'DIRECT';\n" +
        "}",
        mandatory: true,
      }
    };
    chrome.proxy.settings.set({value: proxyConfig, scope: 'regular'}, () => {
      chrome.proxy.settings.get({}, (a) => console.log('NEW PROXY CONFIG', a));
    });
  });
}

(() => {setProxyConfig();})();