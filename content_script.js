const port = chrome.runtime.connect({ name: 'suprome-content_script' });
port.postMessage({ sender: 'content_script', loaded: true });

function createMessageBody(content) {
  return {
    sender: 'content_script',
    ...content
  };
}

function isCardDeclined() {
  return $('.failed').length;
}

function isSuccess() {
  return $('.tab-confirmation.selected').length;
}

function goToProductSection(config) {
  const section = config['suprome-product'].section;
  location.href = `https://www.supremenewyork.com/shop/all/${section}`;
}

function selectProductFromAll(config) {
  const article = $(`.inner-article:contains(${config['suprome-product'].keyword})`).first().find('a');
  if (!article.length) return port.postMessage(createMessageBody({ error: 'NOT_FOUND' }));
  location.href = article[0].href;
}

function selectColorAndSize(config) {
  // Create event listener on "Buy" form
  $('#cctrl').on('DOMSubtreeModified', function () {

    // If size exists in size select, set value and click on commit
    config['suprome-product'].sizes.every(size => {
      const selectedSize = $(`option:contains(${size})`).first();
      if (selectedSize.length) {
        $('#size').val(selectedSize[0].value);
        $('input[name="commit"]').click();
        $('#cctrl').unbind(); // <-- Unbind eventlistener to prevent script from running even after bot stopped
        return false; // <-- used to stop loop, Array.every() stops iterating on return false
      }
      return true;
    });

  });

  // For each color, click on color product if not sold out
  config['suprome-product'].colors.every((color) => {
    const coloredProduct = $('ul[class^="styles"] > li').find(`a[data-style-name="${color}"][data-sold-out="false"]`).first();
    if (coloredProduct.length) coloredProduct[0].firstElementChild.click();
    return true;
  });
}

function goToCheckout() {
  location.href = "https://www.supremenewyork.com/checkout/";
}

function fillFormAndOrder(config) {
  // Once document is fully loaded, create timeout to click on "place order" button
  $(document).ready(() => {
    setTimeout(() => {
      $('input.button.checkout').click();
      $(document).unbind();
    }, config['suprome-config'].checkoutDelay);
  });

  $('input[name="order[billing_name]"]').val(config['suprome-billing'].name);
  $('input[name="order[email]"]').val(config['suprome-billing'].email);
  $('input[name="order[tel]"]').val(config['suprome-billing'].tel);
  $('input[name="order[billing_address]"]').val(config['suprome-billing'].address);
  $('input[name="order[billing_address_2]"]').val(config['suprome-billing'].address2);
  $('input[name="order[billing_address_3]"]').val(config['suprome-billing'].address3);
  $('input[name="order[billing_city]"]').val(config['suprome-billing'].city);
  $('input[name="order[billing_zip]"]').val(config['suprome-billing'].zip);
  $('select[name="order[billing_country]"]').val(config['suprome-billing'].country);
  $('select[name="credit_card[type]"]').val(config['suprome-cc'].type);
  if (config['suprome-cc'].type !== 'paypal') {
    $('input[name="credit_card[cnb]"]').val(config['suprome-cc'].cnb);
    $('select[name="credit_card[month]"]').val(config['suprome-cc'].month);
    $('select[name="credit_card[year]"]').val(config['suprome-cc'].year);
    $('input[name="credit_card[ovv]"]').val(config['suprome-cc'].cvv);
  }
  $('input[name="order[terms]"]').each((id, el) => el.click());
}

// Calls callback on message received
port.onMessage.addListener((message) => {
  // Get bot config from storage
  chrome.storage.sync.get(['suprome-product', 'suprome-billing', 'suprome-cc', 'suprome-config'], (config) => {
    // If message is coming from background
    if (message.sender === 'background') {
      if (message.start) {
        goToProductSection(config);
      } else if (message.page === 'product-section') {
        selectProductFromAll(config);
      } else if (message.page === 'product-selected') {
        selectColorAndSize(config);
        $('#cart').on('DOMSubtreeModified', () => {
          goToCheckout();
          $('#cart').unbind();
        });
      } else if (message.page === 'checkout') {
        fillFormAndOrder(config);
      } else if (message.page === 'checkout-oos') {
        window.history.back();
      } else if (message.page === 'checkout-response') {
        if (isCardDeclined()) window.history.back()
        else if (isSuccess()) port.postMessage(createMessageBody({ done: true }));
      }
    }
  });
});