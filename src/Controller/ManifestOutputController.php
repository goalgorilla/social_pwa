<?php

/**
 * This will convert the social_pwa.settings.yml array to json format
 * and output it to the /manifest.json route.
 */

namespace Drupal\social_pwa\Controller;

use Drupal\Component\Utility\UrlHelper;
use Drupal\Core\Controller\ControllerBase;
use Drupal\file\Entity\File;
use Drupal\image\Entity\ImageStyle;
use Symfony\Component\HttpFoundation\JsonResponse;

class ManifestOutputController extends ControllerBase{

  public function generateManifest() {

    // Get all the current settings stored in social_pwa.settings.
    $config = \Drupal::config('social_pwa.settings')->get();
    // Get the specific icons. Needed to get the correct path of the file.
    $icon = \Drupal::config('social_pwa.settings')->get('icons.icon');

    // Get the file id and path.
    $fid = $icon[0];
    /** @var File $file */
    $file = File::load($fid);
    $path = $file->getFileUri();

    function array_insert(&$array, $position, $insert_array) {
      $first_array = array_splice($array, 0, $position);
      $array = array_merge($first_array, $insert_array, $array);
    }

    // Here I use the function above which has the following parameters:
    // $array         (The array you want to manipulate)
    // $position      (What key should be removed/replaced?)
    // $insert_array  (What should be the replacement?)
    array_insert($config, 3, array('icons' => array(
      ['src' => file_url_transform_relative(ImageStyle::load('social_pwa_icon_128')->buildUrl($path)), 'sizes' => '128x128', 'type' => 'image/png'],
      ['src' => file_url_transform_relative(ImageStyle::load('social_pwa_icon_144')->buildUrl($path)), 'sizes' => '144x144', 'type' => 'image/png'],
      ['src' => file_url_transform_relative(ImageStyle::load('social_pwa_icon_152')->buildUrl($path)), 'sizes' => '152x152', 'type' => 'image/png'],
      ['src' => file_url_transform_relative(ImageStyle::load('social_pwa_icon_192')->buildUrl($path)), 'sizes' => '192x192', 'type' => 'image/png']
    )));

    // Array filter used to filter the "_core:" key from the output.
    // So basically only the "_core:" key is not allowed through this filter.
    $allowed = [
      'name',
      'short_name',
      'icons',
      'start_url',
      'background_color',
      'theme_color',
      'display',
      'orientation'];
    $filtered = array_filter(
      $config,
      function ($key) use ($allowed) {
        return in_array($key, $allowed);
      },
      ARRAY_FILTER_USE_KEY
    );

    // Finally, after all the magic went down we return the manipulated and
    // filtered array of our social_pwa.settings and output it to JSON format.
    return new JsonResponse($filtered);
  }
}