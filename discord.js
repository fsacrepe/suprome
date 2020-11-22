let baseRequest = null;
const RUNTIME_MESSAGE_NOTIFICATION_TYPE = {
  SUCCESSFUL_ORDER: 'SUCCESSFUL_ORDER',
};

const getNotificationTitle = (event) => {
  switch (event) {
    case RUNTIME_MESSAGE_NOTIFICATION_TYPE.SUCCESSFUL_ORDER:
      return 'You cooked :man_cook::ok_hand:';
  }
}

const sendNotification = (body) => {
  const notificationRequest = new Request(baseRequest, {
    body: JSON.stringify(body)
  });
  fetch(notificationRequest).then(() => {});
}

const sendSuccessfulCheckoutNotification = ({ profile, orderId, image, details, price }) => {
  return sendNotification({
    username: 'Suprome',
    embeds: [
      {
        title: getNotificationTitle(RUNTIME_MESSAGE_NOTIFICATION_TYPE.SUCCESSFUL_ORDER),
        thumbnail: { url: `https:${image}` },
        color: 4437377,
        fields: [
          { name: 'Profile', value: `||${profile}||`, inline: true },
          { name: 'Order ID', value: `||${orderId}||`, inline: true },
          { name: 'Order Details', value: details },
          { name: 'Price', value: price },
        ]
      }
    ]
  })
}

const setWebhookRequest = (webhookUrl) => {
  baseRequest = new Request(webhookUrl, {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
  });
}

chrome.storage.local.get('suprome-v2-discord-webhook', (storage) => {
  if (!storage['suprome-v2-discord-webhook']) return;
  setWebhookRequest(storage['suprome-v2-discord-webhook']);
});

chrome.storage.onChanged.addListener((changes) => {
  if (!changes['suprome-v2-discord-webhook']) return;
  setWebhookRequest(changes['suprome-v2-discord-webhook']);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.sender === 'background' && message.type === RUNTIME_MESSAGE_NOTIFICATION_TYPE.SUCCESSFUL_ORDER) {
    const { profile, orderId, image, details, price } = message;
    return sendSuccessfulCheckoutNotification({ profile, orderId, image, details, price });
  }
});
