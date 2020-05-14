const port = chrome.runtime.connect({ name: 'suprome-popup' });

$('#startBtn').click(() => {
  port.postMessage({ sender: 'popup', start: true });
});

$('#stopBtn').click(() => {
  port.postMessage({ sender: 'popup', stop: true });
});

$('#goToConfig').click(() => {
  const configUrl = chrome.runtime.getURL('options.html');
  chrome.tabs.create({ url: configUrl });
});

$('#startRestockBtn').click(() => {
  port.postMessage({ sender: 'popup', startRestock: true });
});

$('#stopRestockBtn').click(() => {
  port.postMessage({ sender: 'popup', stopRestock: true });
});