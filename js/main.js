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

      const applicationServerKey = urlBase64ToUint8Array(settings.vapidPublicKey);

      var isSubscribed = false;
      var swRegistration = null;
      var subscriptionKey = null;
      var toggleElement = $('#edit-push-notifications-current-device-toggle');

      /**
       * Convert a Base64 encoded string to an ArrayBuffer.
       *
       * @param base64String
       *   A Base64 encoded string.
       * @returns {Uint8Array}
       *   The converted ArrayBuffer.
       */
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
       * Creates a Base64 encoded string from an ArrayBuffer.
       *
       * @param buffer
       *   The ArrayBuffer.
       * @returns {string}
       *   A Base64 encoded string.
       */
      function arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
          binary += String.fromCharCode( bytes[ i ] );
        }
        return window.btoa(binary);
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
            console.error('Service Worker error: ', error);
          });
      }
      else {
        toggleElement.attr('disabled', true);
        $('.blocked-notice').html(Drupal.t('Your browser does not support push notifications.'));
        $('.social_pwa--overlay').remove();
      }

      /**
       * Check if the user is already subscribed.
       */
      function checkSubscription() {
        // Set the initial subscription value.
        swRegistration.pushManager.getSubscription()
          .then(function (subscription) {
            // Check subscription.
            isSubscribed = false;

            if (subscription !== null && typeof settings.pushNotificationSubscriptions !== "undefined") {
              subscriptionKey = arrayBufferToBase64(subscription.getKey('p256dh'));
              // Check if subscription key is known in the database.
              if ($.inArray(subscriptionKey, settings.pushNotificationSubscriptions) !== -1) {
                isSubscribed = true;
              }
            }

            // Get permissions state.
            swRegistration.pushManager.permissionState({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey
            })
              .then(function (state) {
                // We think the user is currently subscribed.
                if (isSubscribed) {
                  if (state === 'granted') {
                    // Switch toggle to on, user is subscribed and granted permission.
                    toggleSwitcher(true);
                  }
                  else {
                    // Is subscribed, but didn't grant permissions.
                    isSubscribed = false;
                    toggleSwitcher(false);
                  }
                }
                else {
                  // User is currently not subscribed.
                  if (state !== 'denied') {
                    // Check if we should prompt the user for enabling the push notifications.
                    if (settings.pushNotificationPrompt === true && typeof settings.pushNotificationPromptTime !== "undefined") {
                      // Create the prompt after x seconds.
                      setTimeout(function () {
                        createPushNotificationPrompt();
                      }, settings.pushNotificationPromptTime * 1000);
                    }
                  }
                  else if (state === 'denied') {
                    // User denied push notifications. Disable the settings form.
                    toggleSwitcher(false, true);

                    blockSwitcher();
                  }
                }
              });
          });
      }

      /**
       * Create the prompt dialog for the push notification.
       */
      function createPushNotificationPrompt() {
        // Create the prompt.
        var html = '<div id="social_pwa--prompt">' +
          '<h3 class="ui-dialog-message-title">' +
          Drupal.t('Would you like to enable <strong>push notifications</strong>?') +
          '</h3><p>' +
          Drupal.t('Choose enable to receive important updates straight away!') +
          '</p><small>' +
          Drupal.t('These can always be disabled in <strong>Settings</strong>.') +
          '</small><div class="buttons"><button id="prompt-defer" class="btn btn-default">' +
          Drupal.t('Not now') +
          '</button><button id="prompt-accept" class="btn btn-primary">' +
          Drupal.t('Enable') +
          '</button></div></div>';

        // Check if the prompt exists, otherwise append it.
        if ($('#social_pwa--prompt').length === 0) {
          $('body').append(html);
        }

        var pushNotificationsDialog = Drupal.dialog($('#social_pwa--prompt'), {
          dialogClass: 'ui-dialog_push-notification',
          modal: true,
          width: 'auto'
        });

        // Show the prompt.
        pushNotificationsDialog.showModal();
      }

      /**
       * User clicked on 'not now'.
       */
      $(document.body).on('click', '#prompt-defer', function (event) {
        event.preventDefault();

        // Register the prompt and close the dialog.
        registerPrompt();
      });

      /**
       * User accepted push notifications.
       */
      $(document.body).on('click', '#prompt-accept', function (event) {
        event.preventDefault();

        // Subscribe the user.
        subscribeUser(true);
      });

      /**
       * Subscribes the user to the database.
       *
       * @param prompt
       *   Registers the prompt if applicable.
       */
      function subscribeUser(prompt) {
        // User is not yet subscribed, add the subscription.
        navigator.serviceWorker.ready.then(function (swRegistration) {
          swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          })
            .then(function (subscription) {
              // Push subscription to the server.
              updateSubscriptionOnServer(subscription);
              isSubscribed = true;

              // Delete the overlay since the user has accepted.
              $('.social_pwa--overlay').remove();

              // Mark the toggle element as checked (if it exists).
              toggleSwitcher(true);

              // If we need to register the prompt, let's do it now.
              if (prompt === true) {
                // Register the prompt and close the dialog.
                registerPrompt();
              }
            })
            .catch(function (error) {
              // Delete the overlay since the user has denied.
              console.log('Failed to subscribe the user: ', error);

              // Make sure elements are checked if needed.
              toggleSwitcher(false);
              blockSwitcher();

              // If we need to register the prompt, let's do it now.
              if (prompt === true) {
                // Register the prompt and close the dialog.
                registerPrompt();
              }
            });
        });
      }

      /**
       * Ask the user to receive push notifications through the browser prompt.
       */
      toggleElement.on('click', function (event) {
        event.preventDefault();
        $(this).attr('disabled', true);

        // Creating an overlay to provide focus to the permission prompt.
        $('body').append('<div class="social_pwa--overlay" style="width: 100%; height: 100%; position: fixed; background-color: rgba(0,0,0,0.5); left: 0; top: 0; z-index: 999;"></div>');

        // If the user is subscribed, we'll now remove the subscription.
        if (isSubscribed) {
          removeSubscriptionFromServer(subscriptionKey);
          $('.social_pwa--overlay').remove();
          isSubscribed = false;
          subscriptionKey = null;
        }
        else {
          // User is not yet subscribed, add the subscription.
          subscribeUser();
        }
      });

      /**
       * Register that user saw the push notification prompt to the server.
       */
      function registerPrompt() {
        $.ajax({
          url: '/sw-subscription/prompt',
          type: 'POST',
          async: true,
          complete: function() {
            // Close the dialog.
            Drupal.dialog($('#social_pwa--prompt')).close();
          }
        });
      }

      /**
       * Update the subscription to the database through a callback.
       */
      function updateSubscriptionOnServer(subscription) {

        subscriptionKey = subscription.getKey('p256dh') ? arrayBufferToBase64(subscription.getKey('p256dh')) : null;
        var token = subscription.getKey('auth');

        var subscriptionData = JSON.stringify({
          'endpoint': getEndpoint(subscription),
          'key': subscriptionKey,
          'token': token ? arrayBufferToBase64(token) : null
        });

        $.ajax({
          url: '/sw-subscription',
          type: 'POST',
          data: subscriptionData,
          dataType: 'json',
          contentType: 'application/json;charset=utf-8',
          async: true,
          complete: function() {
            toggleSwitcher(true, false);
          }
        });

        return true;
      }

      /**
       * Update the subscription to the database through a callback.
       */
      function removeSubscriptionFromServer(key) {
        var subscriptionData = JSON.stringify({
          'key': key
        });

        $.ajax({
          url: '/sw-subscription/remove',
          type: 'POST',
          data: subscriptionData,
          dataType: 'json',
          contentType: 'application/json;charset=utf-8',
          async: true,
          complete: function() {
            toggleSwitcher(false, false);
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
       * Toggle the switch element to on, off or disabled.
       *
       * @param state
       *   Boolean indicating if the element should be on or off.
       * @param disabled
       *   Boolean indicating if the element should be disabled or not.
       */
      function toggleSwitcher(state, disabled) {
        if (typeof state !== 'undefined') {
          toggleElement.attr('checked', state);
          toggleElement.prop('checked', state);
        }

        if (typeof disabled !== 'undefined') {
          toggleElement.attr('disabled', disabled);
        }
      }

      /**
       * Turn off possibility to change Push notifications state for a user.
       */
      function blockSwitcher() {
        toggleElement.attr('disabled', true);
        $('.blocked-notice').removeClass('hide');
        $('.social_pwa--overlay').remove();
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
