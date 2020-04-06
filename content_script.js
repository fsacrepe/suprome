const port = chrome.runtime.connect({ name: 'suprome-content_script' });

function waitForEl(selector, callback) {
  if ($(selector).length) {
    callback();
  } else {
    setTimeout(function() {
      waitForEl(selector, callback);
    }, 100);
  }
};

function createMessageBody(content) {
  return {
    sender: 'content_script',
    ...content
  };
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
  $('#cctrl').on('DOMSubtreeModified', function () {
    config['suprome-product'].sizes.every(size => {
      const selectedSize = $(`option:contains(${size})`).first();
      if (selectedSize.length) {
        $('#size').val(selectedSize[0].value);
        $('input[name="commit"]').click();
        $('#cctrl').unbind();
        return false;
      }
      return true;
    });
  });
  config['suprome-product'].colors.every((color) => {
    const coloredProduct = $('ul[class^="styles"] > li').find(`a[data-style-name="${color}"][data-sold-out="false"]`).first();
    if (coloredProduct.length) coloredProduct[0].firstElementChild.click();
    return true;
  });
}

function selectSize(config) {
  return config['suprome-product'].sizes.reverse().map((size) => {
    const selectedSize = $(`option:contains(${size})`).first();
    if (!selectedSize.length) return 0;
    $('#size').val(selectedSize[0].value);
    return 1;
  });
}

function goToCheckout() {
  location.href = "https://www.supremenewyork.com/checkout/";
}

function fillFormAndOrder(config) {
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
  //$('input.button.checkout').click();
  port.postMessage(createMessageBody({ done: true }));
}

function setConfig(message) {
  const { keyword, sizes, colors, start } = message;
  config = { keyword, sizes, colors, start };
}

port.onMessage.addListener((message) => {
  chrome.storage.sync.get(['suprome-product', 'suprome-billing', 'suprome-cc'], (config) => {
    if (message.sender !== 'content_script') {
      console.log(message);
    }
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
      }
    }
  });
});