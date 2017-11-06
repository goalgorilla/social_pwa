<?php

/**
 * @file
 * Contains \Drupal\activity_send_push\Plugin\ActivitySend\PushActivitySend.
 */

namespace Drupal\activity_send_push\Plugin\ActivitySend;

use Drupal\activity_send\Plugin\ActivitySendBase;

/**
 * Provides a 'PushActivitySend' activity action.
 *
 * @ActivitySend(
 *  id = "push_activity_send",
 *  label = @Translation("Action that is triggered when a entity is created"),
 * )
 */
class PushActivitySend extends ActivitySendBase {

  /**
   * {@inheritdoc}
   */
  public function create($entity) {
    $data['entity_id'] = $entity->id();
    $queue = \Drupal::queue('activity_send_email_worker');
    $queue->createItem($data);
  }

}