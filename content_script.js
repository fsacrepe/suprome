const port = chrome.runtime.connect({ name: 'suprome-content_script' });
port.postMessage({ sender: 'content_script', loaded: true });

function createMessageBody(content) {
  return {
    sender: 'content_script',
    ...content
  };
}

function isSoldOut() {
  return $('.out_of_stock').length > 0;
}

function goToProductSection(section) {
  location.href = `https://www.supremenewyork.com/shop/all/${section}`;
}

function selectProductFromAll(keyword) {
  const article = $(`.inner-article:contains(${keyword})`).first().find('a');
  if (!article.length) return port.postMessage(createMessageBody({ error: 'PRODUCT_NOT_FOUND' }));
  location.href = article[0].href;
}

function selectColor(color) {
  const foundColor = color ? $(`button[data-style-name*="${color}"][data-sold-out="false"]`) : $('button[data-sold-out="false"]');
  if (!foundColor.length) return port.postMessage(createMessageBody({ error: 'COLOR_SOLD_OUT' }));
  foundColor[0].click();
}

function selectSize(sizes) {
  const notFound = sizes.every(size => {
    const foundSize = $(`option:contains(${size})`);
    if (foundSize.length) {
      $('#size').val(foundSize[0].value);
      return false;
    }
    return true;
  });
  const commit = $('input[name="commit"]');
  if ((notFound && sizes.length) || !commit.length)
    return port.postMessage(createMessageBody({ error: 'COLOR_SOLD_OUT' }));
  else
    commit[0].click();
}

function selectQuantity(quantity) {
  const quantitySelect = $('#qty');
  if (!quantitySelect.length || !quantity) return;
  quantitySelect.val(String(quantity));
}

function goToCheckout() {
  location.href = "https://www.supremenewyork.com/checkout/";
}

function manageCheckoutResponse() {
  if (!$('#confirmation:visible').length) return;
  if ($('.failed').length)
    return port.postMessage(createMessageBody({ error: 'CC_DECLINED' }));
  else if (isSoldOut())
    return port.postMessage(createMessageBody({ error: 'PRODUCT_SOLD_OUT' }));
  else
    return port.postMessage(createMessageBody({ done: true }));
}

function fillFormAndOrder(billing, cc, checkoutDelay) {
  $('input[name="order[billing_name]"]').val(billing.name);
  $('input[name="order[email]"]').val(billing.email);
  $('input[name="order[tel]"]').val(billing.tel);
  $('input[name="order[billing_address]"]').val(billing.address);
  $('input[name="order[billing_address_2]"]').val(billing.address2);
  $('input[name="order[billing_address_3]"]').val(billing.address3);
  $('input[name="order[billing_city]"]').val(billing.city);
  $('input[name="order[billing_state]"').val(billing.state);
  $('input[name="order[billing_zip]"]').val(billing.zip);
  $('select[name="order[billing_country]"]').val(billing.country);
  $('select[name="credit_card[type]"]').val(cc.type);
  if (cc.type !== 'paypal') {
    $('input[name="credit_card[number]"]').val(cc.cnb);
    $('select[name="credit_card[month]"]').val(cc.month);
    $('select[name="credit_card[year]"]').val(cc.year);
    $('input[name="credit_card[verification_value]"]').val(cc.cvv);
  }
  $('label.has-checkbox.terms').click()
  setTimeout(() => {
    $('input.button.checkout').click();
  }, checkoutDelay);
}

// Calls callback on message received
port.onMessage.addListener((message) => {
  // If message is coming from background
  if (message.sender === 'background') {
    if (message.start) {
      goToProductSection(message.section);
    } else if (message.findProduct) {
      selectProductFromAll(message.keyword);
    } else if (message.selectColor) {
      selectColor(message.color);
    } else if (message.selectSize) {
      selectQuantity(message.quantity);
      selectSize(message.sizes);
    } else if (message.goToCheckout) {
      goToCheckout();
    } else if (message.placeOrder) {
      if (isSoldOut()) return port.postMessage(createMessageBody({ error: 'PRODUCT_SOLD_OUT' }));
      fillFormAndOrder(message.billing, message.cc, message.checkoutDelay);
    } else if (message.checkoutResponse) {
      manageCheckoutResponse();
    } else if (message.reload) {
      window.location.reload();
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.sender === 'cookies') {
    if (message.inject) {
      window.addEventListener('message', (message) => {
        const parse = JSON.parse(message.data);
        if (!parse?.tabId) return;
        chrome.runtime.sendMessage(null, { sender: 'content_script', cookie: parse.cookie, tabId: parse.tabId });
      });
      injectCode(message.tabId);
    } else if (message.cookie) {
      window.postMessage(JSON.stringify({ newCookie: { ...message.cookie } }), window.location.href);
    }
  }
})

const injectCode = (tabId) => {
  if ($('#suprome-script').length) return;
  const script = document.createElement('script');
  script.id = 'suprome-script';
  script.textContent = `
  (() => {
    let tempCookies = {};
    const buildCookies = (cookies) => {
      const finalObj = {};
      cookies.split(';').forEach(cookie => {
        const split = cookie.split('=').map(a => a.trim());
        if (split[0].indexOf('@@${tabId}') === 0) finalObj[split[0].substring(3+String(${tabId}).length, split[0].length)] = split[1];
        else if (split[0].indexOf('@@') === 0) return;
        else finalObj[split[0]] = split[1];
      });
      return finalObj;
    }
    if (localStorage.getItem('suprome_${tabId}')) tempCookies = JSON.parse(localStorage.getItem('suprome_${tabId}'));
    else tempCookies = buildCookies(document.cookie);
    document.__defineGetter__('cookie', () => {
      let cookies = '';
      for (let cookie in tempCookies) cookies += \`\${cookie}=\${tempCookies[cookie]}; \`;
      return cookies;
    });
    document.__defineSetter__('cookie', c => {
      const newCookie = c.split(';')[0].split('=');
      if (!newCookie[1]) delete tempCookies[newCookie[0]];
      else tempCookies[newCookie[0]] = newCookie[1];
      localStorage.setItem('supreme_${tabId}', JSON.stringify(tempCookies));
      window.postMessage(JSON.stringify({ tabId: ${tabId}, cookie: c.split(';')[0]}), window.location.href);
    });
    window.addEventListener('message', (a) => {
      const parse = JSON.parse(a.data);
      if (parse?.newCookie) Object.assign(tempCookies, parse.newCookie);
    });
  })()
  `;
  document.head.appendChild(script);
}