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
  const foundColor = color ? $(`a[data-style-name*="${color}"][data-sold-out="false"]`) : $('a[data-sold-out="false"]');
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

function goToCheckout() {
  location.href = "https://www.supremenewyork.com/checkout/";
}

function manageCheckoutResponse() {
  if ($('.failed').length)
    return port.postMessage(createMessageBody({ error: 'CC_DECLINED' }));
  else if (isSoldOut())
    return port.postMessage(createMessageBody({ error: 'PRODUCT_SOLD_OUT' }));
  else
    return port.postMessage(createMessageBody({ done: true }));
}

function fillFormAndOrder(billing, cc, checkoutDelay) {
  // Once document is fully loaded, create timeout to click on "place order" button
  $(document).ready(() => {
    setTimeout(() => {
      $('input.button.checkout').click();
      $(document).unbind();
    }, checkoutDelay);
  });

  $('input[name="order[billing_name]"]').val(billing.name);
  $('input[name="order[email]"]').val(billing.email);
  $('input[name="order[tel]"]').val(billing.tel);
  $('input[name="order[billing_address]"]').val(billing.address);
  $('input[name="order[billing_address_2]"]').val(billing.address2);
  $('input[name="order[billing_address_3]"]').val(billing.address3);
  $('input[name="order[billing_city]"]').val(billing.city);
  $('input[name="order[billing_zip]"]').val(billing.zip);
  $('select[name="order[billing_country]"]').val(billing.country);
  $('select[name="credit_card[type]"]').val(cc.type);
  if (cc.type !== 'paypal') {
    $('input[name="credit_card[cnb]"]').val(cc.cnb);
    $('select[name="credit_card[month]"]').val(cc.month);
    $('select[name="credit_card[year]"]').val(cc.year);
    $('input[name="credit_card[ovv]"]').val(cc.cvv);
  }
  $('label.has-checkbox.terms').click()
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