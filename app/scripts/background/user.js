/*
 *  Copyright (c) 2015-2019, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/screensaver/blob/master/LICENSE.md
 */
import * as ChromeGA
  from '../../scripts/chrome-extension-utils/scripts/analytics.js';
import * as ChromeLocale
  from '../../scripts/chrome-extension-utils/scripts/locales.js';
import * as ChromeLog
  from '../../scripts/chrome-extension-utils/scripts/log.js';
import * as ChromeStorage
  from '../../scripts/chrome-extension-utils/scripts/storage.js';
import '../../scripts/chrome-extension-utils/scripts/ex_handler.js';

import * as MyGA from '../../scripts/my_analytics.js';

/**
 * Manage the Chrome sign-in state
 * @module User
 */

/**
 * Event: Fired when signin state changes for an act. on the user's profile.
 * @see https://developer.chrome.com/apps/identity#event-onSignInChanged
 * @param {Object} account - chrome AccountInfo
 * @param {boolean} signedIn - true if signedIn
 * @private
 */
function _onSignInChanged(account, signedIn) {
  ChromeStorage.set('signedInToChrome', signedIn);
  if (!signedIn) {
    ChromeGA.event(MyGA.EVENT.CHROME_SIGN_OUT);
    ChromeStorage.set('albumSelections', []);
    const type = ChromeStorage.get('permPicasa');
    if (type === 'allowed') {
      ChromeLog.error(ChromeLocale.localize('err_chrome_signout'),
          'User._onSignInChanged');
    }
  }
}

/**
 * Event: called when document and resources are loaded
 * @private
 */
function _onLoad() {
  // Listen for changes to Browser sign-in
  chrome.identity.onSignInChanged.addListener(_onSignInChanged);
}

// listen for documents and resources loaded
window.addEventListener('load', _onLoad);
