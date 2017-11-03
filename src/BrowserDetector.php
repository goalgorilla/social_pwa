<?php

namespace Drupal\social_pwa;

use DeviceDetector\DeviceDetector;

/**
 * Class BrowserDetector.
 *
 * Gives ability to detect devices and metadata.
 */
class BrowserDetector {

  /**
   * Holds the User Agent that should be parsed
   *
   * @var string
   */
  protected $userAgent;

  /**
   * Instance of the DeviceDetector.
   *
   * @var /DeviceDetector/DeviceDetector
   */
  protected $dd;

  /**
   * Constructor.
   *
   * @param string $userAgent
   *   User Agent to parse.
   */
  public function __construct($userAgent = '')
  {
    // Initiate the DeviceDetector library.
    $this->dd = new DeviceDetector();
    $this->dd->discardBotInformation();
    $this->dd->skipBotDetection();

    if ($userAgent != '') {
      // Set the user agent.
      $this->setUserAgent($userAgent);
      $this->dd->setUserAgent($userAgent);

      // We can parse the information.
      $this->dd->parse();
    }
  }

  /**
   * Sets the User Agent so it can be parsed.
   *
   * @param string $userAgent
   *   User agent to parse.
   */
  public function setUserAgent($userAgent) {
    $this->userAgent = $userAgent;
    $this->dd->setUserAgent($userAgent);

    // We can parse the information.
    $this->dd->parse();
  }

  /**
   * Returns the type of device.
   *
   * Possible options:
   * - mobile
   * - table
   * - tv
   * - other
   * - desktop
   *
   * @return string
   *   The device type.
   */
  public function getDeviceType() {
    $device = $this->dd->getDeviceName();

    switch ($device) {
      // Mobile phones.
      case 'feature phone':
      case 'smartphone':
        return 'mobile';

      // Tablets.
      case 'tablet':
      case 'phablet':
        return 'tablet';

      // TV's.
      case 'tv':
      case 'console':
        return 'tv';

      // Other.
      case 'car browser':
      case 'smart display':
      case 'camera':
      case 'portable media player':
        return 'other';

      // Desktop.
      case 'desktop':
      case 'default':
        return 'desktop';
    }
  }

  /**
   * Describes what kind of browser and/or device the client is using.
   *
   * @return string
   *   A formatted string describing the client's device.
   */
  public function getFormattedDescription() {
    // Try to get a formatted description of the brand and model.
    $brand_model = $this->formatBrandModel($this->dd->getBrandName(), $this->dd->getModel());
    if (!empty($brand_model)) {
      return $brand_model;
    }

    // Try to get a formatted description of the OS in combination with the
    // browser client.
    $client_os = $this->formatClientOs($this->dd->getOs(), $this->dd->getClient());
    if (!empty($client_os)) {
      return $client_os;
    }

    return '';
  }

  /**
   * Formats a description from the brand and model.
   *
   * @param string $brand
   *   The brand of the device.
   * @param string $model
   *   The model of the device.
   *
   * @return string
   *   A formatted description consisting of the brand and model.
   */
  protected function formatBrandModel($brand, $model) {
    $description = '';

    if (!empty($brand)) {
      $description .= $brand;
    }

    if (!empty($model)) {
      $description .= empty($description) ? $model : ' ' . $model;
    }

    return $description;
  }

  /**
   * Formats a description from the OS and client.
   *
   * @param string $os
   *   The OS information of the device.
   * @param string $client
   *   The client information coming from the browser.
   *
   * @return string
   *   A formatted description consisting of the OS and the client.
   */
  protected function formatClientOs($os, $client) {
    // OS description.
    if (!empty($os['name'])) {
      $os_description = $os['name'];

      if (!empty($os['version'])) {
        $os_description .= ' ' . $os['version'];
      }
    }

    // Format description.
    if (!empty($client['name'])) {
      $client_description = $client['name'];

      if (!empty($client['version'])) {
        $client_description .= ' ' . $client['version'];
      }
    }

    // Formatted device name.
    $description = '';

    // Add the OS description.
    if (!empty($os_description)) {
      $description .= $os_description;
    }
    // Add the client description.
    if (!empty($client_description)) {
      $description .= empty($description) ? $client_description : ' - ' . $client_description;
    }

    return $description;
  }

}
