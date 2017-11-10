/**
 * @file Main.js
 *  - Registers the Service Worker. (See /social_pwa/js/sw.js)
 *  - Subscribes the user.
 *  - Saves the user subscription object.
 */

(function ($, Drupal, drupalSettings) {

  'use strict';

  Drupal.behaviors.serviceWorkerLoad = {
    attach: function (context, settings) {

      const vapidPublicKey = 'BFhe5EFfcPn0XDnBAgNGPIqKocwI-yimiWet1fQXNbFtCwlRzmGVDTJoG8fjxjXEXmFqt8BzcaDtkFyTdUk2cb8';

      var isSubscribed = false;
      var swRegistration = null;

      function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
          .replace(/\-/g, '+')
          .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (var i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }

      /**
       * Check if ServiceWorkers and Push are supported in the browser.
       */
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('/sw.js')
          .then(function (swReg) {
            swRegistration = swReg;
            checkSubscription();
          })
          .catch(function (error) {
            console.error('[PWA] - Service Worker Error', error);
          });
      } else {
        console.warn('[PWA] - Push messaging is not supported');
        // TODO: Callback to make button disabled with message.
      }

      /**
       * Check if the user is already subscribed.
       */
      function checkSubscription() {
        // Set the initial subscription value.
        swRegistration.pushManager.getSubscription()
          .then(function (subscription) {
            isSubscribed = !(subscription === null);

            if (isSubscribed) {
              console.log('[PWA] - User is already subscribed.');
              // return;
            } else {
              // TODO: Custom install prompt story.
              console.log('[PWA] - User is not subscribed yet.');
            }
            // subscribeUser();
          });
      }

      $('#edit-push-notifications-current-device-current').on('click', function() {
        subscribeUser();
      });

      /**
       * Ask the user to receive push notifications through the browser prompt.
       */
      function subscribeUser() {
        // Creating an overlay to provide focus to the permission prompt.
        $('body').append('<div class="social_pwa--overlay" style="width: 100%; height: 100%; position: fixed; background-color: rgba(0,0,0,0.5); left: 0; top: 0; z-index: 999;"></div>');
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        navigator.serviceWorker.ready.then(function(swRegistration) {
          swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          })
            .then(function (subscription) {
              // Delete the overlay since the user has accepted.
              $('.social_pwa--overlay').remove();
              updateSubscriptionOnServer(subscription);
              isSubscribed = true;
            })
            .catch(function (err) {
              // Delete the overlay since the user has denied.
              console.log('[PWA] - Failed to subscribe the user: ', err);
              // TODO: Callback to make button disabled with message.
              $('.social_pwa--overlay').remove();
            });
        })
      }

      /**
       * Update the subscription to te database through a callback.
       */
      function updateSubscriptionOnServer(subscription) {

        var key = subscription.getKey('p256dh');
        var token = subscription.getKey('auth');

        var subscriptionData = JSON.stringify({
          'endpoint': getEndpoint(subscription),
          'key': key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : null,
          'token': token ? btoa(String.fromCharCode.apply(null, new Uint8Array(token))) : null
        });

        $.ajax({
          url: '/subscription',
          type: 'POST',
          data: subscriptionData,
          dataType: "json",
          contentType: "application/json;charset=utf-8",
          async: true,
          fail: function(msg) {
            console.log('[PWA] - Something went wrong during subscription update.');
          },
          complete: function(msg) {
            console.log('[PWA] - Subscription added to database.');
          }
        });
        return true;
      }

      /**
       * Retrieve the endpoint.
       */
      function getEndpoint(pushSubscription) {
        var endpoint = pushSubscription.endpoint;
        var subscriptionId = pushSubscription.subscriptionId;

        // Fix Chrome < 45.
        if (subscriptionId && endpoint.indexOf(subscriptionId) === -1) {
          endpoint += '/' + subscriptionId;
        }
        return endpoint;
      }

      /**
       * The install banner.
       */
      window.addEventListener('beforeinstallprompt', function(e) {
        console.log('[PWA] - beforeinstallprompt event fired.');

        e.userChoice.then(function(choiceResult) {

          console.log(choiceResult.outcome);

          if(choiceResult.outcome == 'dismissed') {
            console.log('[PWA] - User cancelled homescreen install.');
          }
          else {
            console.log('[PWA] - User added to homescreen.');
          }
        });

      });
    }
  }

})(jQuery, Drupal, drupalSettings);
