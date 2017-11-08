/**
 * @file Main.js
 *  - Registers the Service Worker. (See /social_pwa/js/sw.js)
 *  - Subscribes the user.
 *  - Saves the user subscription object.
 */

(function ($, Drupal, drupalSettings) {

    'use strict';

    Drupal.behaviors.serviceWorkerLoad = {
        attach: function () {

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

            if ('serviceWorker' in navigator && 'PushManager' in window) {
                //console.log('Service Worker and Push is supported.');
                navigator.serviceWorker.register('/sw.js')
                    .then(function (swReg) {
                        //console.log('Service Worker is registered', swReg);
                        swRegistration = swReg;
                        checkSubscription();
                    })
                    .catch(function (error) {
                        console.error('Service Worker Error', error);
                    });
            } else {
                console.warn('Push messaging is not supported');
            }

            function checkSubscription() {
                // Set the initial subscription value
                swRegistration.pushManager.getSubscription()
                    .then(function (subscription) {
                        isSubscribed = !(subscription === null);

                        if (isSubscribed) {
                            console.log('User is already subscribed.');
                        } else {
                            console.log('User is not subscribed yet. Trying to subscribe...');
                        }
                        subscribeUser();
                    });
            }

            // TODO: Rewrite the subscribeUser function because of vapid.
            function subscribeUser() {
                // Creating an overlay to provide focus to the permission prompt.
                $('body').append('<div class="social_pwa--overlay" style="width: 100%; height: 100%; position: fixed; background-color: rgba(0,0,0,0.5); left: 0; top: 0; z-index: 999;"></div>');
                const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
                navigator.serviceWorker.ready.then(function(swRegistration) {
                    swRegistration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: applicationServerKey
                    })
                        // Delete the overlay since the user has accepted.
                        .then(function (subscription) {
                            $('.social_pwa--overlay').remove();
                            updateSubscriptionOnServer(subscription);
                            isSubscribed = true;
                        })
                        // Delete the overlay since the user has denied.
                        .catch(function (err) {
                            console.log('Failed to subscribe the user: ', err);
                            $('.social_pwa--overlay').remove();
                        });
                })
            }

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
                        console.log('Something went wrong during subscription update.');
                    },
                    complete: function(msg) {
                        console.log('Subscription added to database.');
                    }
                });
                return true;
            }

            function getEndpoint(pushSubscription) {
                var endpoint = pushSubscription.endpoint;
                var subscriptionId = pushSubscription.subscriptionId;

                // Fix Chrome < 45
                if (subscriptionId && endpoint.indexOf(subscriptionId) === -1) {
                    endpoint += '/' + subscriptionId;
                }
                return endpoint;
            }

            // Install banner section below
            window.addEventListener('beforeinstallprompt', function(e) {
                console.log('[Main] beforeinstallprompt event fired.');

                // e.userChoice will return a Promise. For more details read: http://www.html5rocks.com/en/tutorials/es6/promises/
                e.userChoice.then(function(choiceResult) {

                    console.log(choiceResult.outcome);

                    if(choiceResult.outcome == 'dismissed') {
                        console.log('User cancelled homescreen install');
                    }
                    else {
                        console.log('User added to homescreen');
                    }
                });

            });
        }
    }

})(jQuery, Drupal, drupalSettings);
