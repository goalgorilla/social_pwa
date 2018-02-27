<?php

namespace Drupal\social_pwa\Form;

use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Link;
use Drupal\Core\Url;
use Drupal\user\Entity\User;
use Minishlink\WebPush\WebPush;

class PushNotificationForm extends FormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'push_notification_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {

    // First we check if there are users on the platform that have a subscription
    // Retrieve all uid
    $user_query = \Drupal::entityQuery('user');
    $user_query->condition('uid',0,'>');
    $user_list = $user_query->execute();
    // Filter to check which users have subscription
    foreach ($user_list as $key => &$value) {
      /** @var User $account */
      if ($account = User::load($key)) {
        $user_subscription = \Drupal::service('user.data')->get('social_pwa', $account->id(), 'subscription');
        if (isset($user_subscription)) {
          $value = $account->getDisplayName() . ' (' . $account->getAccountName() . ')';
          continue;
        }
        unset($user_list[$key]);
      }
    }

    // Get a link to the Social PWA Settings that shows up in the message below.
    $pwaSettingsLink = Link::createFromRoute('Social PWA Settings', 'social_pwa.settings')->toString();
    // Check if the $user_list does have values
    if (empty($user_list)) {
      drupal_set_message(t('There are currently no users subscribed to receive push notifications! Also make sure you have the @link configured and saved.', array('@link' => $pwaSettingsLink)), 'warning');
    } else {
      // Start the form for sending push notifications
      $form['push_notification'] = array(
        '#type' => 'fieldset',
        '#title' => $this->t('Send a Push Notification'),
        '#open' => FALSE,
      );
      $form['push_notification']['selected-user'] = array(
        '#type' => 'select',
        '#title' => $this->t('To user'),
        '#description' => $this->t('This is a list of users that have given permission to receive notifications.'),
        '#options' => $user_list, // -> then provide filtered list
      );
      $form['push_notification']['title'] = array(
        '#type' => 'textfield',
        '#title' => $this->t('Title'),
        '#size' => 47,
        '#default_value' => 'Open Social',
        '#disabled' => TRUE,
        '#description' => $this->t('This will be the <b>title</b> of the Push Notification. <i>(Static value for now)</i>'),
      );
      $form['push_notification']['message'] = array(
        '#type' => 'textfield',
        '#title' => $this->t('Message'),
        '#size' => 47,
        '#maxlength' => 120,
        '#default_value' => 'Enter your message here...',
        '#description' => $this->t('This will be the <b>message</b> of the Push Notification.'),
      );

      // TODO: Maybe create a fieldset where the user fills in an url for redirect when the user clicks the notification.

      $form['actions']['#type'] = 'actions';
      $form['actions']['submit'] = array(
        '#type' => 'submit',
        '#value' => $this->t('Send Push Notification'),
        '#button_type' => 'primary',
      );
    }
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state) {
    parent::validateForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {

    // The selected uid value of the form.
    $uid = $form_state->getValue('selected-user');

    if (!empty($uid)) {
      // Get subscription object of the selected user.
      $user_subscription = \Drupal::service('user.data')->get('social_pwa', $uid, 'subscription');

      // Prepare the payload with the message.
      $message = $form_state->getValue('message');
      $payload = json_encode(['message' => $message]);

      // Array of notifications.
      $notifications = [];
      foreach ($user_subscription as $subscription) {
        foreach ($subscription as $key => $value) {
          $notifications[] = [
            'endpoint' => $subscription[$key]['endpoint'],
            'payload' => $payload,
            'userPublicKey' => $subscription[$key]['key'],
            'userAuthToken' => $subscription[$key]['token'],
          ];
        }
      }

      // Get the VAPID keys that were generated before.
      $vapid_keys = \Drupal::state()->get('social_pwa.vapid_keys');

      $auth = [
        'VAPID' => [
          'subject' => Url::fromRoute('<front>', [], ['absolute' => TRUE]),
          'publicKey' => $vapid_keys['public'],
          'privateKey' => $vapid_keys['private'],
        ],
      ];

      /** @var \Minishlink\WebPush\WebPush $webPush */
      $webPush = new WebPush($auth);

      foreach ($notifications as $notification) {
        $webPush->sendNotification(
          $notification['endpoint'],
          $notification['payload'],
          $notification['userPublicKey'],
          $notification['userAuthToken']
        );
      }

      $webPush->flush();

    }
    drupal_set_message($this->t('Message was successfully sent!'));
  }
}
