/*
 *  Copyright (c) 2015-2019, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/screensaver/blob/master/LICENSE.md
 */
import {updateBadgeText, updateRepeatingAlarms} from './alarm.js';

import * as MyMsg from '../../scripts/my_msg.js';
import * as PhotoSources from '../../scripts/sources/photo_sources.js';

import * as ChromeAuth
  from '../../scripts/chrome-extension-utils/scripts/auth.js';
import * as ChromeGA
  from '../../scripts/chrome-extension-utils/scripts/analytics.js';
import * as ChromeMsg
  from '../../scripts/chrome-extension-utils/scripts/msg.js';
import '../../scripts/chrome-extension-utils/scripts/ex_handler.js';

/**
 * Manage the extension's data
 * @module AppData
 */

const chromep = new ChromePromise();

/**
 * Version of localStorage - update when items are added, removed, changed
 * @type {int}
 * @default
 * @const
 * @private
 */
const _DATA_VERSION = 20;

/**
 * A number and associated units
 * @typedef {Object} module:AppData.UnitValue
 * @property {number} base - value in base unit
 * @property {number} display - value in display unit
 * @property {int} unit - display unit
 */

/**
 * Values for app data in localStorage
 * @typedef {Object} module:AppData._DEF_VALUES
 * @property {int} version - version of data
 * @property {boolean} enabled - is screensaver enabled
 * @property {string} permPicasa - optional permission for Picasa
 * @property {string} permBackground - optional permission to run in bg
 * @property {boolean} allowBackground - run Chrome in background
 * @property {module:AppData.UnitValue} idleTime - idle time to display
 *     screensaver
 * @property {module:AppData.UnitValue} transitionTime - time between photos
 * @property {boolean} skip - ignore extreme aspect ratio photos
 * @property {boolean} shuffle - randomize photo order
 * @property {int} photoSizing - photo display type
 * @property {int} photoTransition - transition animation
 * @property {boolean} interactive - vcr controls for screensaver
 * @property {int} showTime - time display format
 * @property {boolean} largeTime - display larger time label
 * @property {boolean} showPhotog - display name on own photos
 * @property {boolean} showLocation - display photo location
 * @property {string} background - background image
 * @property {boolean} keepAwake - manage computer poser settings
 * @property {boolean} chromeFullscreen - don't display over fullscreen
 * @property {boolean} allDisplays - show on all displays
 * @property {string} activeStart - Keep Wake start time '00:00' 24 hr
 * @property {string} activeStop - Keep Wake stop time '00:00' 24 hr
 * @property {boolean} allowSuspend - let computer sleep
 * @property {boolean} allowPhotoClicks - show photo source on left click
 * @property {boolean} useSpaceReddit - use this photo source
 * @property {boolean} useEarthReddit - use this photo source
 * @property {boolean} useAnimalReddit - use this photo source
 * @property {boolean} useInterestingFlickr - use this photo source
 * @property {boolean} useChromecast - use this photo source
 * @property {boolean} useAuthors - use this photo source
 * @property {boolean} useSpaceReddit - use this photo source
 * @property {boolean} fullResGoogle - true for actual size Google photos
 * @property {boolean} isAlbumMode - true if Google Photos album mode
 * @property {boolean} useGoogle - use this photo source
 * @property {boolean} useGoogleAlbums - use this photo source
 * @property {Array} albumSelections - user's selected Google Photos albums
 * @property {boolean} gPhotosNeedsUpdate - are the photo links stale
 * @property {int} gPhotosMaxAlbums - max albums a user can select at one time
 * @property {boolean} isAwake - true if screensaver can be displayed
 * @property {boolean} isShowing - true if screensaver is showing
 * @property {boolean} signedInToChrome - state of Chrome signin
 */

/**
 * Default values in localStorage
 * @type {module:AppData._DEF_VALUES}
 * @const
 * @private
 */
const _DEF_VALUES = {
  'version': _DATA_VERSION,
  'enabled': true,
  'isAlbumMode': true,
  'permPicasa': 'notSet', // enum: notSet allowed denied
  'permBackground': 'notSet', // enum: notSet allowed denied
  'allowBackground': false,
  'idleTime': {'base': 5, 'display': 5, 'unit': 0}, // minutes
  'transitionTime': {'base': 30, 'display': 30, 'unit': 0}, // seconds
  'skip': true,
  'shuffle': true,
  'photoSizing': 0,
  'photoTransition': 1,
  'interactive': false,
  'showTime': 2, // 24 hr format
  'largeTime': false,
  'fullResGoogle': false,
  'showPhotog': true,
  'showLocation': true,
  'background': 'background:linear-gradient(to bottom, #3a3a3a, #b5bdc8)',
  'keepAwake': false,
  'chromeFullscreen': true,
  'allDisplays': false,
  'activeStart': '00:00', // 24 hr time
  'activeStop': '00:00', // 24 hr time
  'allowSuspend': false,
  'allowPhotoClicks': true,
  'useSpaceReddit': false,
  'useEarthReddit': false,
  'useAnimalReddit': false,
  'useInterestingFlickr': false,
  'useChromecast': true,
  'useAuthors': false,
  'useGoogle': true,
  'useGoogleAlbums': true,
  'albumSelections': [],
  'useGooglePhotos': false,
  'gPhotosNeedsUpdate': false, // not used
  'gPhotosMaxAlbums': 10, // not used
  'isAwake': true, // not used
  'isShowing': false, // not used
  'signedInToChrome': true,
};

/**
 * Set state based on screensaver enabled flag
 * Note: this does not effect the keep awake settings so you could
 * use the extension as a display keep awake scheduler without
 * using the screensaver
 * @private
 */
function _processEnabled() {
  // update context menu text
  const label = Chrome.Storage.getBool('enabled') ? Chrome.Locale.localize(
      'disable') : Chrome.Locale.localize('enable');
  updateBadgeText();
  chromep.contextMenus.update('ENABLE_MENU', {
    title: label,
  }).catch(() => {});
}

/**
 * Set power scheduling features
 * @private
 */
function _processKeepAwake() {
  const keepAwake = Chrome.Storage.getBool('keepAwake', true);
  keepAwake ? chrome.power.requestKeepAwake(
      'display') : chrome.power.releaseKeepAwake();
  if (!keepAwake) {
    // always on
    Chrome.Storage.set('isAwake', true);
  }
  updateRepeatingAlarms();
  updateBadgeText();
}

/**
 * Set wait time for screen saver display after machine is idle
 * @private
 */
function _processIdleTime() {
  const idleTime = getIdleSeconds();
  if (idleTime) {
    chrome.idle.setDetectionInterval(idleTime);
  } else {
    Chrome.Log.Error('idleTime is null', 'Data._processIdleTime');
  }
}

/**
 * Get default time format based on locale
 * @returns {int} 12 or 24
 * @private
 */
function _getTimeFormat() {
  let ret = 2; // 24 hr
  const format = Chrome.Locale.localize('time_format');
  if (format && (format === '12')) {
    ret = 1;
  }
  return ret;
}

/**
 * Set the 'os' value
 * @returns {Promise} err on failure
 * @private
 */
function _setOS() {
  return chromep.runtime.getPlatformInfo().then((info) => {
    Chrome.Storage.set('os', info.os);
    return null;
  }).catch(() => {
    // something went wrong - linux seems to fail this call sometimes
    Chrome.Storage.set('os', 'unknown');
    return null;
  });
}

/**
 * Save the [_DEF_VALUES]{@link module:AppData._DEF_VALUES} items, if they
 * do not already exist
 * @private
 */
function _addDefaults() {
  Object.keys(_DEF_VALUES).forEach(function(key) {
    if (Chrome.Storage.get(key) === null) {
      Chrome.Storage.set(key, _DEF_VALUES[key]);
    }
  });
}

/**
 * Convert a setting-slider value due to addition of units
 * @param {!string} key - localStorage key
 * @private
 */
function _convertSliderValue(key) {
  const value = Chrome.Storage.get(key);
  if (value) {
    const newValue = {
      base: value,
      display: value,
      unit: 0,
    };
    Chrome.Storage.set(key, newValue);
  }
}

/**
 * Initialize the data saved in localStorage
 */
export function initialize() {
  _addDefaults();

  // set operating system
  _setOS().catch(() => {});

  // set signin state
  ChromeAuth.isSignedIn().then((signedIn) => {
    Chrome.Storage.set('signedInToChrome', signedIn);
    return null;
  }).catch(() => {});

  // and the last error
  Chrome.Storage.clearLastError().catch((err) => {
    ChromeGA.error(err.message, 'Data.initialize');
  });

  // set time format based on locale
  Chrome.Storage.set('showTime', _getTimeFormat());

  // update state
  processState();
}

/**
 * Update the data saved in localStorage
 */
export function update() {
  // New items, changes, and removal of unused items can take place
  // here when the version changes
  const oldVersion = Chrome.Storage.getInt('version');

  if (Number.isNaN(oldVersion) || (_DATA_VERSION > oldVersion)) {
    // update version number
    Chrome.Storage.set('version', _DATA_VERSION);
  }

  if (!Number.isNaN(oldVersion)) {

    if (oldVersion < 8) {
      // change setting-slider values due to adding units
      _convertSliderValue('transitionTime');
      _convertSliderValue('idleTime');
    }

    if (oldVersion < 10) {
      // was setting this without quotes before
      const oldOS = localStorage.getItem('os');
      if (oldOS) {
        Chrome.Storage.set('os', oldOS);
      }
    }

    if (oldVersion < 12) {
      // picasa used to be a required permission
      // installed extensions before the change will keep
      // this permission on update.
      // https://stackoverflow.com/a/38278824/4468645
      Chrome.Storage.set('permPicasa', 'allowed');
    }

    if (oldVersion < 14) {
      // background used to be a required permission
      // installed extensions before the change will keep
      // this permission on update.
      // https://stackoverflow.com/a/38278824/4468645
      Chrome.Storage.set('permBackground', 'allowed');
      Chrome.Storage.set('allowBackground', true);
    }

    if (oldVersion < 18) {
      // Need new permission for Google Photos API
      Chrome.Storage.set('permPicasa', 'notSet');

      // Remove cached Auth token
      ChromeAuth.removeCachedToken(false, null, null).catch(() => {
        // nice to remove but not critical
        return null;
      });

      // Google Photos API not compatible with Picasa API album id's
      Chrome.Storage.set('albumSelections', []);
    }
  }

  if (oldVersion < 19) {
    // remove all traces of 500px
    Chrome.Storage.set('useEditors500px', null);
    Chrome.Storage.set('usePopular500px', null);
    Chrome.Storage.set('useYesterday500px', null);
    Chrome.Storage.set('editors500pxImages', null);
    Chrome.Storage.set('popular500pxImages', null);
    Chrome.Storage.set('yesterday500pxImages', null);
  }

  if (oldVersion < 20) {
    // set signin state
    ChromeAuth.isSignedIn().then((signedIn) => {
      Chrome.Storage.set('signedInToChrome', signedIn);
      return null;
    }).catch(() => {});

    // change minimum transition time
    const trans = Chrome.Storage.get('transitionTime',
        {'base': 30, 'display': 30, 'unit': 0});
    if ((trans.unit === 0)) {
      trans.base = Math.max(10, trans.base);
      trans.display = trans.base;
      Chrome.Storage.set('transitionTime', trans);
    }
  }

  _addDefaults();

  // update state
  processState();
}

/**
 * Restore default values for data saved in localStorage
 */
export function restoreDefaults() {
  Object.keys(_DEF_VALUES).forEach(function(key) {
    if (!key.includes('useGoogle') &&
        (key !== 'googlePhotosSelections') &&
        (key !== 'albumSelections')) {
      // skip Google photos settings
      Chrome.Storage.set(key, _DEF_VALUES[key]);
    }
  });

  // restore default time format based on locale
  Chrome.Storage.set('showTime', _getTimeFormat());

  // update state
  processState();
}

/**
 * Process changes to localStorage items
 * @param {string} [key='all'] - the item that changed
 * @param {boolean} [doGoogle=false] - update Google Photos?
 */
export function processState(key = 'all', doGoogle = false) {
  // Map processing functions to localStorage values
  const STATE_MAP = {
    'enabled': _processEnabled,
    'keepAwake': _processKeepAwake,
    'activeStart': _processKeepAwake,
    'activeStop': _processKeepAwake,
    'allowSuspend': _processKeepAwake,
    'idleTime': _processIdleTime,
  };
  if (key === 'all') {
    // process everything
    Object.keys(STATE_MAP).forEach(function(ky) {
      const fn = STATE_MAP[ky];
      fn();
    });

    // process photo SOURCES
    PhotoSources.processAll(doGoogle);
    Chrome.Storage.set('isShowing', false);

    // set os, if not already
    if (!Chrome.Storage.get('os')) {
      _setOS().catch(() => {});
    }
  } else {
    // individual change
    if (PhotoSources.isUseKey(key) || (key === 'fullResGoogle')) {
      // photo source change
      const useKey = (key === 'fullResGoogle') ? 'useGoogleAlbums' : key;
      PhotoSources.process(useKey).catch((err) => {
        // send message on processing error
        const msg = MyMsg.PHOTO_SOURCE_FAILED;
        msg.key = useKey;
        msg.error = err.message;
        return ChromeMsg.send(msg);
      }).catch(() => {});
    } else {
      const fn = STATE_MAP[key];
      if (typeof (fn) !== 'undefined') {
        fn();
      }
    }
  }
}

/**
 * Get the idle time in seconds
 * @returns {int} idle time in seconds
 */
export function getIdleSeconds() {
  const idle = Chrome.Storage.get('idleTime',
      {'base': 5, 'display': 5, 'unit': 0});
  return idle.base * 60;
}
