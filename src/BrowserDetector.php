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
    $client = $this->dd->getClient();
    $os = $this->dd->getOs();

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
    $name = '';

    // Add the OS description.
    if (!empty($os_description)) {
      $name .= $os_description;
    }
    // Add the client description.
    if (!empty($client_description)) {
      if (empty($name)) {
        $name .= $client_description;
      }
      else {
        $name .= ' - ' . $client_description;
      }
    }


    return $name;
  }

}
