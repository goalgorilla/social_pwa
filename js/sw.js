self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  var sendNotification = function(payload, icon, url) {
    var title = "Open Social";
    icon = icon || '/sites/default/files/images/touch/open-social.png';
    payload = payload || 'You\'ve received a message!';
    return self.registration.showNotification(title, {
      body: payload,
      icon: icon,
      data: url
    });
  };

  if (event.data) {
    var data = event.data.json();
    event.waitUntil(
      // Retrieve a list of the clients of this service worker.
      self.clients.matchAll().then(function(clientList) {
        // Check if there's at least one focused client.
        var focused = clientList.some(function(client) {
          return client.focused;
        });

        // The page is focused, don't show the notification.
        if (focused) {
          console.log('[SW] - Push received: ' + data.message);
          return true;
        }
        // The page is still open but unfocused, so focus the tab.
        else if (clientList.length > 0) {
          sendNotification(data.message, data.icon, data.url);
        }
        // The page is closed, send a push to retain engagement.
        else {
          sendNotification(data.message, data.icon, data.url);
        }
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  // Close the notification when the user clicks it.
  event.notification.close();

  event.waitUntil(
    // Retrieve a list of the clients of this service worker.
    self.clients.matchAll().then(function(clientList) {
      var url = event.notification.data ? event.notification.data : '/';
      // If there is at least one client, focus it.
      if (clientList.length > 0) {
        return clientList[0].focus().then(function (client) {
          client.navigate(url);
        });
      }
      // Otherwise, open a new page.
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Cache this page so the homescreen install banner works.
  if ('cache' in self) {
    cache.put('/');
  }
});
