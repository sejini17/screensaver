/*
 *  Copyright (c) 2015-2019, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/screensaver/blob/master/LICENSE.md
 */
import '../../../node_modules/@polymer/polymer/polymer-legacy.js';

import '../../../node_modules/@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../../../node_modules/@polymer/iron-pages/iron-pages.js';
import '../../../node_modules/@polymer/iron-label/iron-label.js';
import '../../../node_modules/@polymer/app-storage/app-localstorage/app-localstorage-document.js';
import '../../../node_modules/@polymer/paper-styles/typography.js';
import '../../../node_modules/@polymer/paper-styles/color.js';
import '../../../node_modules/@polymer/app-layout/app-toolbar/app-toolbar.js';
import '../../../node_modules/@polymer/paper-material/paper-material.js';
import '../../../node_modules/@polymer/paper-tabs/paper-tab.js';
import '../../../node_modules/@polymer/paper-tabs/paper-tabs.js';
import '../../../node_modules/@polymer/paper-item/paper-item.js';
import '../../../node_modules/@polymer/paper-icon-button/paper-icon-button.js';
import '../../../node_modules/@polymer/paper-toggle-button/paper-toggle-button.js';
import '../../../node_modules/@polymer/paper-tooltip/paper-tooltip.js';
import '../../../elements/setting-elements/setting-toggle/setting-toggle.js';
import '../../../elements/setting-elements/setting-slider/setting-slider.js';
import '../../../elements/setting-elements/setting-dropdown/setting-dropdown.js';
import '../../../elements/setting-elements/setting-background/setting-background.js';
import '../../../elements/setting-elements/setting-time/setting-time.js';
import {LocalizeBehavior} from
      '../../../elements/setting-elements/localize-behavior/localize-behavior.js';
import '../../../elements/my_icons.js';
import { Polymer } from '../../../node_modules/@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '../../../node_modules/@polymer/polymer/lib/utils/html-tag.js';
import '../../../elements/shared-styles.js';

import * as Permissions from '../../../scripts/permissions.js';
import * as PhotoSources from '../../../scripts/sources/photo_sources.js';

import * as ChromeGA
  from '../../../scripts/chrome-extension-utils/scripts/analytics.js';
import * as ChromeLocale
  from '../../../scripts/chrome-extension-utils/scripts/locales.js';
import * as ChromeLog
  from '../../../scripts/chrome-extension-utils/scripts/log.js';
import * as ChromeMsg
  from '../../../scripts/chrome-extension-utils/scripts/msg.js';
import * as ChromeStorage
  from '../../../scripts/chrome-extension-utils/scripts/storage.js';
import '../../../scripts/chrome-extension-utils/scripts/ex_handler.js';

/**
 * Module for the Settings Page
 * @module els/pgs/settings
 */

/**
 * Polymer element for the Settings Page
 * @type {{deselectPhotoSource: Function}}
 * @alias module:els/pgs/settings.SettingsPage
 * @PolymerElement
 */
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment shared-styles">
      :host {
        display: block;
        position: relative;
      }
      
      #topToolbar {
        padding: 10px 10px 10px 24px;
      }

      :host app-toolbar {
        height: 100px;
      }

    </style>

    <paper-material elevation="1" class="page-container">
      <paper-material elevation="1">
        <app-toolbar class="page-toolbar">
          <div id="topToolbar" top-item="" class="horizontal layout flex">
            <iron-label for="settingsToggle" class="center horizontal layout flex">
              <div class="flex">{{localize('screensaver')}}
                <span hidden\$="[[!enabled]]">{{localize('on')}}</span>
                <span hidden\$="[[enabled]]">{{localize('off')}}</span>
              </div>
            </iron-label>
            <paper-icon-button id="select" icon="myicons:check-box" on-tap="_selectAllTapped" hidden\$="[[menuHidden]]" disabled\$="[[!enabled]]"></paper-icon-button>
            <paper-tooltip for="select" position="left" offset="0">
              {{localize('tooltip_select')}}
            </paper-tooltip>
            <paper-icon-button id="deselect" icon="myicons:check-box-outline-blank" on-tap="_deselectAllTapped" hidden\$="[[menuHidden]]" disabled\$="[[!enabled]]"></paper-icon-button>
            <paper-tooltip for="deselect" position="left" offset="0">
              {{localize('tooltip_deselect')}}
            </paper-tooltip>
            <paper-icon-button id="restore" icon="myicons:settings-backup-restore" on-tap="_restoreDefaultsTapped" disabled\$="[[!enabled]]"></paper-icon-button>
            <paper-tooltip for="restore" position="left" offset="0">
              {{localize('tooltip_restore')}}
            </paper-tooltip>
            <paper-toggle-button id="settingsToggle" on-change="_onEnabledChanged" checked="{{enabled}}"></paper-toggle-button>
            <paper-tooltip for="settingsToggle" position="left" offset="0">
              {{localize('tooltip_settings_toggle')}}
            </paper-tooltip>
          </div>
          
         <paper-tabs selected="{{selectedTab}}" bottom-item="" class="fit">
            <paper-tab>{{localize('tab_slideshow')}}</paper-tab>
            <paper-tab>{{localize('tab_display')}}</paper-tab>
            <paper-tab>{{localize('tab_sources')}}</paper-tab>
          </paper-tabs>
          
        </app-toolbar>
        <app-localstorage-document key="enabled" data="{{enabled}}" storage="window.localStorage">
        </app-localstorage-document>

      </paper-material>

      <div class="page-content">
        <iron-pages selected="{{selectedTab}}">
          <div>
            <setting-slider name="idleTime" label="{{localize('setting_idle_time')}}" units="{{_computeWaitTimeUnits()}}" disabled\$="[[!enabled]]"></setting-slider>
            <setting-slider name="transitionTime" label="{{localize('setting_transition_time')}}" units="{{_computeTransitionTimeUnits()}}" disabled\$="[[!enabled]]"></setting-slider>
            <setting-dropdown name="photoSizing" label="{{localize('setting_photo_sizing')}}" items="{{_computePhotoSizingMenu()}}" disabled\$="[[!enabled]]"></setting-dropdown>
            <setting-dropdown name="photoTransition" label="{{localize('setting_photo_transition')}}" items="{{_computePhotoTransitionMenu()}}" disabled\$="[[!enabled]]"></setting-dropdown>
            <setting-toggle name="allowBackground" main-label="{{localize('setting_background')}}" secondary-label="{{localize('setting_background_desc')}}" on-tap="_chromeBackgroundTapped" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="interactive" main-label="{{localize('setting_interactive')}}" secondary-label="{{localize('setting_interactive_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="shuffle" main-label="{{localize('setting_shuffle')}}" secondary-label="{{localize('setting_shuffle_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="skip" main-label="{{localize('setting_skip')}}" secondary-label="{{localize('setting_skip_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="fullResGoogle" main-label="{{localize('setting_full_res')}}" secondary-label="{{localize('setting_full_res_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="showPhotog" main-label="{{localize('setting_photog')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="showLocation" main-label="{{localize('setting_location')}}" secondary-label="{{localize('setting_location_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="allowPhotoClicks" main-label="{{localize('setting_photo_clicks')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-dropdown name="showTime" label="{{localize('setting_show_time')}}" items="{{_computeTimeFormatMenu()}}" value="{{showTimeValue}}" disabled\$="[[!enabled]]"></setting-dropdown>
            <setting-toggle name="largeTime" main-label="{{localize('setting_large_time')}}" indent="" disabled\$="[[_computeLargeTimeDisabled(enabled, showTimeValue)]]">
            </setting-toggle>
            <setting-background name="background" main-label="{{localize('setting_bg')}}" secondary-label="{{localize('setting_bg_desc')}}" noseparator="" disabled\$="[[!enabled]]"></setting-background>
          </div>
          <div>
            <setting-toggle name="allDisplays" main-label="{{localize('setting_all_displays')}}" secondary-label="{{localize('setting_all_displays_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="chromeFullscreen" main-label="{{localize('setting_full_screen')}}" secondary-label="{{localize('setting_full_screen_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle id="keepAwake" name="keepAwake" main-label="{{localize('setting_keep_awake')}}" secondary-label="{{localize('setting_keep_awake_desc')}}" checked="{{keepEnabled}}"></setting-toggle>
            <paper-tooltip for="keepAwake" position="top" offset="0">
              {{localize('tooltip_keep_awake')}}
            </paper-tooltip>
            <setting-time name="activeStart" main-label="{{localize('setting_start_time')}}" secondary-label="{{localize('setting_start_time_desc')}}" format="{{showTimeValue}}" indent="" disabled\$="[[!keepEnabled]]"></setting-time>
            <setting-time name="activeStop" main-label="{{localize('setting_stop_time')}}" secondary-label="{{localize('setting_stop_time_desc')}}" format="{{showTimeValue}}" indent="" disabled\$="[[!keepEnabled]]"></setting-time>
            <setting-toggle id="allowSuspend" name="allowSuspend" main-label="{{localize('setting_suspend')}}" secondary-label="{{localize('setting_suspend_desc')}}" indent="" noseparator="" disabled\$="[[!keepEnabled]]"></setting-toggle>
          </div>
          <div>
            <setting-toggle name="useChromecast" main-label="{{localize('setting_chromecast')}}" secondary-label="{{localize('setting_chromecast_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="useInterestingFlickr" main-label="{{localize('setting_flickr_int')}}" secondary-label="{{localize('setting_flickr_int_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="useSpaceReddit" main-label="{{localize('setting_reddit_space')}}" secondary-label="{{localize('setting_reddit_space_desc')}}" noseparator="" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="useEarthReddit" main-label="{{localize('setting_reddit_earth')}}" secondary-label="{{localize('setting_reddit_earth_desc')}}" noseparator="" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="useAnimalReddit" main-label="{{localize('setting_reddit_animal')}}" secondary-label="{{localize('setting_reddit_animal_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <setting-toggle name="useAuthors" main-label="{{localize('setting_mine')}}" secondary-label="{{localize('setting_mine_desc')}}" disabled\$="[[!enabled]]"></setting-toggle>
            <paper-item tabindex="-1">
              {{localize('setting_click_to_view')}}
            </paper-item>
            <paper-item tabindex="-1">
              {{localize('setting_flickr_api')}}
            </paper-item>
          </div>
        </iron-pages>
      </div>
    </paper-material>
`,

  is: 'settings-page',

  behaviors: [
    LocalizeBehavior,
  ],

  properties: {

    /** Index of current tab */
    selectedTab: {
      type: Number,
      value: 0,
      notify: true,
    },

    /** Flag for enabled state of screensaver */
    enabled: {
      type: Boolean,
      value: true,
      notify: true,
    },

    /** Index of time value to show on screensaver */
    showTimeValue: {
      type: Number,
      value: 1,
      notify: true,
    },

    /** Flag to indicate visibility of toolbar icons */
    menuHidden: {
      type: Boolean,
      computed: '_computeMenuHidden(selectedTab)',
    },
  },

  /**
   * Element is ready
   */
  ready: function() {
    this.set('selectedTab', 0);
  },

  /**
   * Deselect the given {@link module:sources/photo_source}
   * @param {string} useName - Name of <setting-toggle>
   */
  deselectPhotoSource: function(useName) {
    this._setPhotoSourceChecked(useName, false);
  },
  
  /**
   * Return a Unit object
   * @param {string} name
   * @param {int} min - min value
   * @param {int} max - max value
   * @param {int} step - increment
   * @param {int} mult - multiplier between base and display
   * @returns {{name: *, min: *, mult: *, max: *, name: *, step: *}}
   * @private
   */
  _getUnit: function(name, min, max, step, mult) {
    return {
      'name': ChromeLocale.localize(name),
      'min': min, 'max': max, 'step': step, 'mult': mult,
    };
  },

  /**
   * Set checked state of a {@link module:sources/photo_source}
   * @param {string} useName - source name
   * @param {boolean} state - checked state
   * @private
   */
  _setPhotoSourceChecked: function(useName, state) {
    const query = `[name=${useName}]`;
    const el = this.shadowRoot.querySelector(query);
    if (el && !useName.includes('useGoogle')) {
      el.setChecked(state);
    }
  },

  /**
   * Set checked state of all {@link module:sources/photo_source} objects
   * @param {boolean} state - checked state
   * @private
   */
  _setPhotoSourcesChecked: function(state) {
    const useNames = PhotoSources.getUseKeys();
    useNames.forEach((useName) => {
      this._setPhotoSourceChecked(useName, state);
    });
  },

  /**
   * Event: Change enabled state of screensaver
   * @private
   */
  _onEnabledChanged: function() {
    // noinspection JSUnresolvedVariable
    const enabled = this.$.settingsToggle.checked;
    ChromeGA.event(ChromeGA.EVENT.TOGGLE,
        `screensaverEnabled: ${enabled}`);
  },

  /**
   * Event: select all {@link module:sources/photo_source} objects tapped
   * @private
   */
  _selectAllTapped: function() {
    this._setPhotoSourcesChecked(true);
  },

  /**
   * Event: deselect all {@link module:sources/photo_source} objects tapped
   * @private
   */
  _deselectAllTapped: function() {
    this._setPhotoSourcesChecked(false);
  },

  /**
   * Event: restore default settings tapped
   * @private
   */
  _restoreDefaultsTapped: function() {
    ChromeMsg.send(ChromeMsg.RESTORE_DEFAULTS).catch(() => {});
  },

  /**
   * Event: Process the background permission
   * @private
   */
  _chromeBackgroundTapped() {
    // this used to not be updated yet in Polymer 1
    const isSet = ChromeStorage.getBool('allowBackground');
    const perm = Permissions.BACKGROUND;
    const isAllowed = Permissions.isAllowed(perm);
    const errTitle = ChromeLocale.localize('err_optional_permissions');
    if (isSet && !isAllowed) {
      Permissions.request(perm).catch((err) => {
        ChromeLog.error(err.message,
            'settings-page._chromeBackgroundTapped', errTitle);
      });
    } else if (!isSet && isAllowed) {
      Permissions.remove(perm).catch((err) => {
        ChromeLog.error(err.message,
            'settings-page._chromeBackgroundTapped', errTitle);
      });
    }
  },

  /**
   * Computed property: Set menu icons visibility
   * @param {int} selectedTab - the current tab
   * @returns {boolean} true if menu should be visible
   * @private
   */
  _computeMenuHidden: function(selectedTab) {
    return (selectedTab !== 2);
  },

  /**
   * Computed binding: Set disabled state of largeTime toggle
   * @param {boolean} enabled - enabled state of screensaver
   * @param {number} showTimeValue - showTime value
   * @returns {boolean} true if disabled
   * @private
   */
  _computeLargeTimeDisabled: function(enabled, showTimeValue) {
    let ret = false;
    if (!enabled || (showTimeValue === 0)) {
      ret = true;
    }
    return ret;
  },

  /**
   * Computed binding: idle time values
   * @returns {Array} Array of menu items
   * @private
   */
  _computeWaitTimeUnits: function() {
    return [
      this._getUnit('minutes', 1, 60, 1, 1),
      this._getUnit('hours', 1, 24, 1, 60),
      this._getUnit('days', 1, 365, 1, 1440),
    ];
  },

  /**
   * Computed binding: transition time values
   * @returns {Array} Array of menu items
   * @private
   */
  _computeTransitionTimeUnits: function() {
    return [
      this._getUnit('seconds', 10, 60, 1, 1),
      this._getUnit('minutes', 1, 60, 1, 60),
      this._getUnit('hours', 1, 24, 1, 3600),
      this._getUnit('days', 1, 365, 1, 86400),
    ];
  },

  /**
   * Computed binding: photo sizing values
   * @returns {Array} Array of menu items
   * @private
   */
  _computePhotoSizingMenu: function() {
    return [
      ChromeLocale.localize('menu_letterbox'),
      ChromeLocale.localize('menu_zoom'),
      ChromeLocale.localize('menu_frame'),
      ChromeLocale.localize('menu_full'),
      ChromeLocale.localize('menu_random'),
    ];
  },

  /**
   * Computed binding: photo transition values
   * @returns {Array} Array of menu items
   * @private
   */
  _computePhotoTransitionMenu: function() {
    return [
      ChromeLocale.localize('menu_scale_up'),
      ChromeLocale.localize('menu_fade'),
      ChromeLocale.localize('menu_slide_from_right'),
      ChromeLocale.localize('menu_slide_down'),
      ChromeLocale.localize('menu_spin_up'),
      ChromeLocale.localize('menu_slide_up'),
      ChromeLocale.localize('menu_slide_from_bottom'),
      ChromeLocale.localize('menu_slide_right'),
      ChromeLocale.localize('menu_random'),
    ];
  },

  /**
   * Computed binding: time format values
   * @returns {Array} Array of menu items
   * @private
   */
  _computeTimeFormatMenu: function() {
    return [
      ChromeLocale.localize('no'),
      ChromeLocale.localize('menu_12_hour'),
      ChromeLocale.localize('menu_24_hour'),
    ];
  },
});
