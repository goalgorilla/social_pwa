<?php

namespace Drupal\social_pwa\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\social_pwa\BrowserDetector;
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
    $uid = \Drupal::currentUser();

    // The user agent.
    $ua = $_SERVER['HTTP_USER_AGENT'];
    // Get the data related to the user agent.
    $bd = new BrowserDetector($ua);
    // Get the device and browser formatted description.
    $browser = $bd->getFormattedDescription();

    // Prepare an array with the browser name and put in the subscription.
    $subscriptionData[$browser] = json_decode(\Drupal::request()->getContent(), TRUE);
    // Get the user data.
    $user_data = \Drupal::service('user.data')->get('social_pwa', $uid, 'subscription');

    // Check if there already is an subscription object that
    // matches this subscription object.
    if (!in_array($subscriptionData[$browser], $user_data[$browser])) {
      // First we used to set user_data to NULL since we only wanted to update
      // but now we add every subscription for a new device or browser to the
      // user_data table.
      $user_data[] = $subscriptionData;

      // And save it again.
      \Drupal::service('user.data')->set('social_pwa', $uid, 'subscription', $user_data);
    }
    return new Response();
  }

}
