/**
 * Credit card input with one form field
 * It might be the best thing since sliced bread
 * Or not.
 *
 * @param {string} id
 * @param {object} cardDetector Instance of a CardDetector
 * @param {object} [settings] Override default settings (language strings,
 * @returns {SingleLine}
 * @constructor
 * @depends jQuery, jquery.formatter, CardDetector, Modernizr
 * @link http://theprofoundprogrammer.com/post/53063505224/text-this-code-is-a-monument-to-all-my-sins-im
 */
var SingleLine = function(id, cardDetector, settings) {
  'use strict';

  if (!(cardDetector instanceof CardDetector)) {
    throw 'Needs an instance of CardDetector';
  }

  settings = settings || {};

  var ANIMATION_DURATION = .75;

  var FIELD_PLACEHOLDER_ID = 'slfp_';

  var PLATFORM_MOBILE = -10,
    PLATFORM_DESKTOP = -20;

  var KEY_TAB = 9,
    KEY_SHIFT = 16,
    KEY_LEFT = 37,
    KEY_RIGHT = 39;

  var MASK_CC_AMEX = '{{9999}} {{999999}} {{99999}}',
    MASK_CC_DEFAULT = '{{9999}} {{9999}} {{9999}} {{9999}}',
    MASK_CVC_AMEX = '{{9999}}',
    MASK_CVC_DEFAULT = '{{999}}',
    MASK_MM_YY = '{{99}}',
    MASK_POSTALCODE = '{{99999}}';

  var CVC_LENGTH_AMEX = 4,
    CVC_LENGTH_DEFAULT = 3;

  /**
   * Default values, can be overridden with the second parameter
   *
   * @type {{offsets: {
     *      creditcard: number, month: number, year: number, cvc: number, postalCode: number},
     *      placeholderLabels: {creditcard: string, month: string, year: string, cvc: string, postalCode: string},
     *      elementWidths: {creditcard: string, month: number, year: number, cvc: number, postalCode: number}
     *  }}
   */
  var defaults = {
    maxWidth: '767px',
    offsets: {
      creditcard: 0,
      month: 61,
      year: 103,
      cvc: 140,
      postalCode: 253
    },
    mobileOffsets: {
      creditcard: 0,
      month: 50,
      year: 82,
      cvc: 103,
      postalCode: 176
    },
    elementWidths: {
      creditcard: 'auto',
      month: 36,
      year: 36,
      cvc: 42,
      postalCode: 100
    },
    mobileWidths: {
      creditcard: 'auto',
      month: 26,
      year: 26,
      cvc: 36,
      postalCode: 60
    },
    placeholderLabels: {
      creditcard: '1234 1234 1234 1234',
      month: 'MM',
      year: 'YY',
      cvc: 'CVC',
      postalCode: 'Zip code'
    }
  };

  /**
   * Tab order of fields
   *
   * @type {string[]}
   */
  var fieldOrder = [
    'creditcard',
    'month',
    'year',
    'cvc',
    'postalCode'
  ];

  /**
   * Media query for when to switch to mobile
   * size of input field.
   *
   * @type {string}
   */
  var mqMaxWidth = settings.maxWidth ? settings.maxWidth : defaults.maxWidth;

  /**
   * Field offsets within container
   *
   * @type {{creditcard: number, month: number, year: number, cvc: number}}
   */
  var desktopElementOffsets = $.extend({}, defaults.offsets, settings.offsets);

  /**
   * Field offsets within container for mobile
   *
   * @type {{creditcard: number, month: number, year: number, cvc: number}}
   */
  var mobileElementOffsets = $.extend({}, defaults.mobileOffsets, settings.mobileOffsets);

  /**
   * Field widths within container
   *
   * @type {{creditcard: string, month: number, year: number, cvc: number}}
   */
  var desktopElementWidths = $.extend({}, defaults.elementWidths, settings.elementWidths);

  /**
   * Field widths within container for mobile
   *
   * @type {{creditcard: string, month: number, year: number, cvc: number}}
   */
  var mobileElementWidths = $.extend({}, defaults.mobileWidths, settings.mobileWidths);

  /**
   * The currently used offsets
   */
  var elementOffsets;

  /**
   * The currently used widths
   */
  var elementWidths;

  /**
   * Placeholder texts for fields
   *
   * @type {{creditcard: string, month: string, year: string, cvc: string}}
   */
  var fieldPlaceholderLabels = $.extend({}, defaults.placeholderLabels, settings.placeholderLabels);

  /**
   * @type {{}}
   */
  var domElements = {};
  domElements['root'] = document.getElementById(id);
  domElements['input'] = $('input', domElements.root);
  domElements['secondaryElements'] = $('div.secondary', domElements.root).children();
  domElements['cardIcon'] = document.getElementById('card-icon');
  domElements['tinyLabels'] = $('div.tiny-label', domElements.root);
  domElements['formButton'] = domElements.input.parents('form').find('button');

  var currentYear = new Date().getFullYear().toString().slice(2);
  var currentDecade = currentYear.slice(0,1);

  /**
   *
   * @type {{creditcard: (*|jQuery|HTMLElement), month: (*|jQuery|HTMLElement), year: (*|jQuery|HTMLElement), cvc: (*|jQuery|HTMLElement)}}
   */
  var fieldPlaceholders = {
    creditcard: $('<div />'),
    month: $('<div />'),
    year: $('<div />'),
    cvc: $('<div />'),
    postalCode: $('<div />')
  };

  /**
   * Default padding for input field
   * Was calculated, then was hidden
   * now hardcoded.
   *
   * @type {number}
   */
  var inputPadding = (function() {
    var paddingLeft = domElements.input.css('padding-left');
    if (paddingLeft) {
      return parseInt(paddingLeft.replace('px', ''), 10);
    } else {
      return 0;
    }
  })();

  /**
   * Checks if script is busy moving stuff
   * and therefor should stop user input
   *
   * @returns {{stop: stop, start: start, isStopped: boolean}}
   */
  var UserInput = (function() {
    var dirty = false;

    return {
      stop: function() {
        dirty = true;
      },
      start: function() {
        dirty = false;
      },
      isStopped: function() {
        return dirty;
      }
    }
  })();

  /**
   * Handle role allocation
   *
   * @returns {{set: set, get: get}}
   */
  var Role = (function() {
    var role = fieldOrder[0];

    return {
      set: function(newRole) {
        role = newRole;
      },
      get: function() {
        return role;
      }
    };
  })();

  /**
   * Calculates Width of the input
   *
   * @param className
   * @param value
   * @returns {string}
   * @private
   */
  var getWidthForEl = function(className, value) {
    var div = document.createElement('div');
    div.setAttribute('class', className);
    div.innerHTML = value.replace(/ /g, '&nbsp;');
    div.style['position'] = 'static';
    div.style['float'] = 'left';
    div.style['width'] = 'auto';

    var outerDiv = document.createElement('div');
    outerDiv.style['float'] = 'left';
    outerDiv.appendChild(div);
    domElements['root'] .appendChild(outerDiv);
    var width = outerDiv.clientWidth;
    domElements['root'] .removeChild(outerDiv);

    return width;
  };

  /**
   * Controller for routing input
   *
   * @param event
   */
  var Router = function(event) {
    if (UserInput.isStopped()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    var role = Role.get();
    if (event.type === 'blur') {
      fieldPlaceholders[role].data('value', domElements.input.val());
    } else {
      switch (role) {
        case 'creditcard':
          CreditCard.controller(event);
          break;

        case 'month':
        case 'year':
        case 'cvc':
        case 'postalCode':
          NumericField.controller(event);
          break;
      }
    }
  };

  /**
   * Credit card handler
   *
   * @type {{controller: controller, keyUp: keyUp, validator: validator, focusNext: focusNext}}
   */
  var CreditCard = {
    controller: function(event) {
      switch (event.type) {
        case 'keydown':
          Helpers.handleTab(event);
          break;

        case 'keyup':
          if ([KEY_TAB, KEY_SHIFT, KEY_LEFT, KEY_RIGHT].indexOf(event.which) === -1) {
            CreditCard.keyUp();
          }
          break;
      }
    },
    /**
     * Event handler for the credit card
     * number
     */
    keyUp: function() {
      cardDetector.set(domElements.input.val());

      var lastType = domElements.input.data('cctype');
      var currentType = cardDetector.get();
      if (lastType !== currentType) {
        var format;
        switch (currentType) {
          case 'amex':
            format = MASK_CC_AMEX;
            break;

          default:
            format = MASK_CC_DEFAULT;
            break;
        }

        domElements.input
          .data({
            'cctype': currentType,
            'plugin_formatter': null
          })
          .formatter({
            pattern: format
          })
        ;
      }

      CreditCard.validator(currentType, 'month');
    },
    /**
     * Validates input of credit card number -
     * sets icon for card type, slides and does
     * other tricks. Might play dead if handled
     * incorrectly
     *
     * @param currentType
     * @param target
     */
    validator: function(currentType, target) {
      domElements.cardIcon.className = 'icon-provider ' + (currentType ? currentType : 'generic');

      var value = domElements.input.val();
      var cleanValue = value.replace(/ /g, '');
      if (cardDetector.validate() === true) {
        spweb.payments.logEvent('validCreditCard');
        domElements.input.data('unmasked', cleanValue);
        CreditCard.focusNext(value, cleanValue, target);
      }
    },
    /**
     * Animates and switches role after
     * successful input of credit card
     *
     * @param value
     * @param cleanValue
     * @param target
     */
    focusNext: function(value, cleanValue, target) {
      var transitionProp = Modernizr.prefixed('transition');
      var transitionCallback = Helpers.getTransitionCallback();

      UserInput.stop();

      var lastGroup = cardDetector.get() === 'amex' ? 5 : 4,
        lastGroupWidth = getWidthForEl(domElements.input.attr('class'), cleanValue.substr(cleanValue.length - lastGroup, lastGroup)),
        fullWidth = getWidthForEl(domElements.input.attr('class'), value);

      var changeRoleToTarget = function() {
        Helpers.toggleFields(true);
        domElements.secondaryElements.show();
        if (transitionProp) {
          fieldPlaceholders.creditcard
            .off(transitionCallback)
            .css(transitionProp, '')
          ;
        }

        var targetPlaceholder = fieldPlaceholders[target].data('placeholder');
        var targetValue = fieldPlaceholders[target].data('value');
        domElements.input
          .attr('placeholder', targetPlaceholder)
          .css('paddingLeft', elementOffsets[target] + inputPadding)
          .val(targetValue === targetPlaceholder ? '' : targetValue)
          .data('plugin_formatter', null)
          .formatter({
            pattern: Helpers.getMaskForType(target)
          })
          .focus()
        ;

        UserInput.start();
      };

      fieldPlaceholders.creditcard
        .data('value', value)
        .html(value)
        .get(0)
      ;

      domElements.input
        .val('')
        .attr('placeholder', '')
      ;

      Role.set(target);

      fieldPlaceholders.creditcard
        .show()
        .removeClass('empty')
      ;

      $('#slfp_cvc')
        .css({
          left: elementOffsets['cvc'] + inputPadding
        })
        .hide()
      ;

      domElements.secondaryElements
        .filter('div.cvc')
        .css({
          left: elementOffsets['cvc'] + inputPadding
        })
        .hide()
      ;


      var leftCoordinate = -(fullWidth - lastGroupWidth) + inputPadding;

      //fallback to jquery for old browsers
      if (transitionProp) {
        fieldPlaceholders.creditcard
          .css(transitionProp, 'left ' + ANIMATION_DURATION + 's ease-in')
          .on(transitionCallback, changeRoleToTarget);

        //needs a new context to fire animation
        setTimeout(function() {
          fieldPlaceholders.creditcard.css('left', leftCoordinate);
        }, 10);
      } else {
        fieldPlaceholders.creditcard
          .animate({
            left: leftCoordinate
          }, ANIMATION_DURATION * 1000, changeRoleToTarget);
      }
    }
  };

  /**
   * Handles input of numeric fields
   *
   * @type {{controller: controller, handleMonth: handleMonth, handleYear: handleYear, handleGeneric: handleGeneric}}
   */
  var NumericField = {
    /**
     * Handles key events
     *
     * @param event
     */
    controller: function(event) {
      var role = Role.get();
      switch (event.type) {
        case 'keydown':
          Helpers.handleTab(event);
          if (!event.isDefaultPrevented()) {
            switch (role) {
              case 'month':
                NumericField.handleMonth(event);
                break;

              case 'year':
                NumericField.handleYear(event);
                break;
            }
          }
          break;

        case 'keyup':
          if ([KEY_TAB, KEY_SHIFT, KEY_LEFT, KEY_RIGHT].indexOf(event.which) === -1) {
            switch (role) {
              case 'month':
                NumericField.handleGeneric(2, 'year');
                break;

              case 'year':
                NumericField.handleGeneric(2, 'cvc');
                break;

              case 'cvc':
                NumericField.handleGeneric(cardDetector.get() === 'amex' ? CVC_LENGTH_AMEX : CVC_LENGTH_DEFAULT, 'postalCode');
                break;

              case 'postalCode':
                NumericField.handleGeneric(5, null);
                break;

            }
          }
          break;
      }
    },
    /**
     * Checks input of month and tries to be
     * smart about user intent
     *
     * @param {object} event
     */
    handleMonth: function(event) {
      var key = String.fromCharCode(event.which);
      if (!/[0-9]/.test(key)) {
        return;
      }

      event.preventDefault();

      var value = domElements.input.val();
      value = value ? parseInt(value, 10) : 0;
      if (value === 1) {
        if (key < 3) {
          domElements.input.val(String(value) + key);
        }
        Helpers.changeRole('year');
      } else if (value === 0) {
        domElements.input.val(key);
        if (key > 1) {
          Helpers.changeRole('year');
        }
      } else {
        Helpers.changeRole('year');
        spweb.payments.logEvent('validMonth');
      }
    },
    /**
     * Checks input of year and tries to be
     * smart about user intent
     *
     * @param {object} event
     */
    handleYear: function(event) {
      var key = String.fromCharCode(event.which);
      if (!/[0-9]/.test(key)) {
        return;
      }

      event.preventDefault();

      var value = domElements.input.val();
      if (value.length == 0) {
        if (key < currentDecade) {
          return;
        }
        domElements.input.val(String(value) + key);
      } else {
        var tmp = parseInt(value+key, 10);
        if (tmp < currentYear) {
          return;
        }
        domElements.input.val(String(value) + key);
        Helpers.changeRole('cvc');
        spweb.payments.logEvent('validYear');
      }
    },
    /**
     * Common functionality for numeric fields
     *
     * @param {number} maxLength
     * @param {string} toRole
     */
    handleGeneric: function(maxLength, toRole) {
      var value = domElements.input.val();
      if (value.length < maxLength) {
        if (value.length == maxLength) {
          Helpers.changeRole(toRole);
        }
      } else {
        Helpers.changeRole(toRole);
      }
    }
  };

  var Helpers = {
    /**
     * Does some stuff for handling
     * changing of roles.
     *
     * @param {string} to
     */
    changeRole: function(to) {
      if (to === null) {
        domElements.formButton
          .removeAttr('disabled')
          .removeClass('disabled')
          .focus()
        ;
        return;
      }

      var from = Role.get();
      if (from === 'creditcard') {
        CreditCard.validator(cardDetector.get(), to);
        return;
      }

      var previousValue = fieldPlaceholders[to].data('value');
      var placeholder = fieldPlaceholders[to].data('placeholder');

      fieldPlaceholders[from].data('value', domElements.input.val());

      Role.set(to);
      if (to === 'creditcard') {
        fieldPlaceholders.creditcard.css('left', elementOffsets[to] + inputPadding);
        Helpers.toggleFields(false);
        domElements.secondaryElements
          .hide()
          .filter('div.cvc')
          .css({
            left: elementOffsets['postalCode'] + inputPadding
          })
          .show();

        $('#slfp_cvc')
          .css({
            left: elementOffsets['postalCode'] + inputPadding
          })
          .show();
      } else {
        Helpers.toggleFields(true);
        domElements.secondaryElements.show();
      }

      Helpers.updateOverlay(from);
      domElements.input
        .attr('placeholder', placeholder)
        .css({
          paddingLeft: elementOffsets[to] + inputPadding + 'px'
        })
        .val(previousValue !== '' && previousValue !== placeholder ? previousValue : '')
        .data('plugin_formatter', null)
        .formatter({
          pattern: Helpers.getMaskForType(to)
        })
        .focus()
      ;
    },
    /**
     * Keep overlay placeholders
     * in sync with input
     *
     * @param {string} field
     * @param {string} [value]
     */
    updateOverlay: function(field, value) {
      if (typeof value === 'undefined') {
        value = domElements.input.val();
      } else {
        if (field === Role.get()) {
          domElements.input.val(value);
        }
      }

      if (value.length === 0) {
        fieldPlaceholders[field]
          .html(
            fieldPlaceholders[field].data('placeholder')
          )
          .addClass('empty')
        ;
      } else {
        fieldPlaceholders[field]
          .html(value)
          .removeClass('empty')
        ;
      }

      fieldPlaceholders[field].data('value', fieldPlaceholders[field].html());
    },
    /**
     * Toggles the correct fields
     * for the current role
     *
     * @param show
     */
    toggleFields: function(show) {
      var role = Role.get();
      for (var key in fieldPlaceholders) {
        if (!fieldPlaceholders.hasOwnProperty(key)) {
          continue;
        }

        if (key !== role) {
          if (show) {
            fieldPlaceholders[key].show();
          } else {
            fieldPlaceholders[key].hide();
          }
        } else {
          fieldPlaceholders[key].hide();
        }
      }
    },
    /**
     * Generic tab handler for moving
     * to appropriate field within
     * the single line form
     *
     * @param event
     */
    handleTab: function(event) {
      var keyCode = event.keyCode;
      if (keyCode === KEY_TAB) {
        event.preventDefault();
        event.stopPropagation();

        var currentRole = Role.get();
        var newRoleIndex = event.shiftKey ? fieldOrder.indexOf(currentRole) - 1 : fieldOrder.indexOf(currentRole) + 1;
        if (newRoleIndex > fieldOrder.length - 1) {
          newRoleIndex = 0;
        } else if (newRoleIndex < 0) {
          newRoleIndex = fieldOrder.length - 1;
        }

        if (currentRole === 'creditcard') {
          CreditCard.validator(cardDetector.get(), fieldOrder[newRoleIndex]);
        } else {
          Helpers.changeRole(fieldOrder[newRoleIndex]);
        }
      }
    },
    /**
     * Fetches a proper format mask for field
     *
     * @param type
     * @returns {string}
     */
    getMaskForType: function(type) {
      switch (type) {
        case 'creditcard':
          switch (cardDetector.get()) {
            case 'amex':
              return MASK_CC_AMEX;

            default:
              return MASK_CC_DEFAULT;
          }

        case 'month':
        case 'year':
          return MASK_MM_YY;

        case 'cvc':
          switch (cardDetector.get()) {
            case 'amex':
              return MASK_CVC_AMEX;

            default:
              return MASK_CVC_DEFAULT
          }

        case 'postalCode':
          return MASK_POSTALCODE;

        default:
          return '';
      }
    },
    /**
     * Setup and adds associated metadata for
     * handling navigation via click or touch
     * on the placeholder overlays
     */
    setupElements: function() {
      for (var key in fieldPlaceholders) {
        if (!fieldPlaceholders.hasOwnProperty(key)) {
          continue;
        }

        domElements.tinyLabels
          .filter('.' + key)
          .css({
            left: elementOffsets[key] + inputPadding
          })
        ;

        var overlay = fieldPlaceholders[key];
        if ($('#' + FIELD_PLACEHOLDER_ID + key).length === 0) {
          overlay
            .hide()
            .appendTo(domElements.root)
            .addClass('placeholder empty')
            .on('click', function(e) {
              //always stop all clicks on these elements
              e.preventDefault();
              var role = $(this).data('role');
              Helpers.changeRole(role);
            })
            .data({
              'value': '',
              'placeholder': fieldPlaceholderLabels[key],
              'role': key
            })
            .attr('id', FIELD_PLACEHOLDER_ID + key)
            .html(fieldPlaceholderLabels[key])
          ;
        }

        overlay
          .css({
            left: elementOffsets[key] + inputPadding,
            width: elementWidths[key]
          })
        ;
      }
    },
    /**
     * Setup layout when switching between
     * desktop and mobile views
     *
     * @param {object} mq MediaQuery to match
     */
    onWidthChange: function(mq) {
      var platform = mq.matches ? PLATFORM_MOBILE : PLATFORM_DESKTOP;
      if (platform !== Helpers.currentPlatform) {
        domElements.input.removeAttr('style');
        inputPadding = parseInt(domElements.input.css('padding-left').replace('px', ''), 10);
        Helpers.currentPlatform = platform;
        if (platform === PLATFORM_MOBILE) {
          elementOffsets = mobileElementOffsets;
          elementWidths = mobileElementWidths;
        } else {
          elementOffsets = desktopElementOffsets;
          elementWidths = desktopElementWidths;
        }
        Helpers.setupElements();
        Helpers.changeRole('creditcard');
      }
    },
    /**
     * Gets transition callback
     * for current browser
     *
     * @returns {string|boolean}
     */
    getTransitionCallback: function() {
      var transEndEventNames = {
        'WebkitTransition': 'webkitTransitionEnd',// Saf 6, Android Browser
        'MozTransition': 'transitionend',      // only for FF < 15
        'transition': 'transitionend'       // IE10, Opera, Chrome, FF 15+, Saf 7+
      };

      var transEndEventName;
      try {
        transEndEventName = transEndEventNames[Modernizr.prefixed('transition')];
      } catch (e) {
        return false;
      }

      return transEndEventName;
    },
    currentPlatform: PLATFORM_DESKTOP
  };

  domElements.formButton
    .attr('disabled', 'disabled')
    .addClass('disabled')
  ;

  domElements.input
    .on('keyup keydown blur', Router)
    .formatter({
      pattern: MASK_CC_DEFAULT
    })
  ;

  elementOffsets = desktopElementOffsets;
  elementWidths = desktopElementWidths;
  if (window.matchMedia) {
    var mq = window.matchMedia('(max-width: ' + mqMaxWidth + ')');
    mq.addListener(Helpers.onWidthChange);
    if (mq.matches) {
      Helpers.currentPlatform = PLATFORM_MOBILE;
      elementOffsets = mobileElementOffsets;
      elementWidths = mobileElementWidths;
    }
  }

  Helpers.setupElements();

  /**
   * Returns an JSON of the current form values
   *
   * @returns {Object|boolean}
   */
  this.getValues = function() {
    var values = {
      result: true
    };

    for (var i = 0; i < fieldOrder.length; i++) {
      var key = fieldOrder[i];
      var value = fieldPlaceholders[key].data('value');
      if (typeof value === 'undefined') {
        value = '';
      }

      switch (key) {
        case 'creditcard':
          if (cardDetector.validate() !== true) {
            values.result = false;
          }
          break;

        case 'cvc':
          var validLength = CVC_LENGTH_DEFAULT;
          if (cardDetector.get() === 'amex') {
            validLength = CVC_LENGTH_AMEX;
          }

          if (value.length !== validLength) {
            values.result = false;
          }
          break;

        default:
          if (!value || '' === value) {
            values.result = false;
          }
          break;
      }
      values[key] = value;
    }

    return values;
  };

  /**
   * Sets values for the fake inputs
   *
   * @param {object} fields
   */
  this.setValues = function(fields) {
    for (var key in fields) {
      if (!fields.hasOwnProperty(key) || !fieldPlaceholders.hasOwnProperty(key)) {
        continue;
      }

      if (key === 'creditcard') {
        cardDetector.set(fields[key]);
      }
      Helpers.updateOverlay(key, fields[key]);
    }
  };

  return this;
};
