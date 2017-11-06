<?php

namespace Drupal\social_pwa\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\user\Entity\User;
use Symfony\Component\HttpFoundation\Response;

/**
 * Class UserSubscriptionController.
 *
 * @package Drupal\social_pwa\Controller
 */
class UserSubscriptionController extends ControllerBase {

  /**
   * Save or update the subscription data for the user.
   *
   * @return \Symfony\Component\HttpFoundation\Response
   *    Return response.
   */
  public function saveSubscription() {
    /** @var User $account */
    $account =  \Drupal::currentUser();
    // Get the subscription object in which we obtain the endpoint
    $subscriptionData = json_decode(\Drupal::request()->getContent(), TRUE);
    // First fetch user data.
    $user_data = \Drupal::service('user.data')->get('social_pwa', $account->id(), 'subscription');

    // Check if there already is an subscription object that
    // matches this subscription object.
    if (!in_array($subscriptionData, $user_data)) {
      $user_data = NULL;
      $user_data[] = $subscriptionData;

      // And save it again.
      \Drupal::service('user.data')->set('social_pwa', $account->id(), 'subscription', $user_data);
    }
    return new Response();
  }

}
