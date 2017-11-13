<?php

namespace Drupal\social_pwa\Controller;

use Drupal\Component\Utility\UrlHelper;
use Drupal\Core\Controller\ControllerBase;
use Drupal\file\Entity\File;
use Drupal\image\Entity\ImageStyle;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Class ManifestOutputController.
 *
 * @package Drupal\social_pwa\Controller
 */
class ManifestOutputController extends ControllerBase{

  /**
   * This will convert the social_pwa.settings.yml array to json format.
   */
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

    $image_styles = [
      'social_pwa_icon_128' => '128x128',
      'social_pwa_icon_144' => '144x144',
      'social_pwa_icon_152' => '152x152',
      'social_pwa_icon_180' => '180x180',
      'social_pwa_icon_192' => '192x192',
      'social_pwa_icon_256' => '256x256',
      'social_pwa_icon_512' => '512x512',
    ];

    $image_style_url = [];
    foreach ($image_styles as $key => $value) {
      $image_style_url[] = [
        'src' => file_url_transform_relative(ImageStyle::load($key)->buildUrl($path)),
        'sizes' => $value,
        'type' => 'image/png'
      ];
    }

    // Insert the icons to the array.
    array_insert($config, 3, ['icons' => $image_style_url]);

    // Array filter used to filter the "_core:" key from the output.
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

    // Finally, after all the magic went down we return a manipulated and
    // filtered array of our social_pwa.settings and output it to JSON format.
    return new JsonResponse($filtered);
  }
}
