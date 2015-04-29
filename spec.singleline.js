/**
 * Card detector module tests
 */
var common = require('../common.js'),
  assert = require('assert'),
  sinon = require('sinon');

var jQuery = $ = require('jquery');

global.spweb = {};
global.spweb.payments = {};
global.spweb.payments.logEvent = function () {};

describe('SingleLine', function () {
  var singleLine;

  var INVALID = '4090 9099 9999 0999';
  var VISA = '4444 3333 2222 1111';
  var AMEX = '3782 822463 10005';
  var DISCOVER = '6011 0009 9013 9424';

  beforeEach(function() {
    common.resetJsDom();
    window = common.createWindow();
    document = common.createDocument();

    common.include('../../Symfony/src/Spotify/PaymentsBundle/Resources/public/js/jquery.formatter.js');
    common.include('../../Symfony/src/Spotify/PaymentsBundle/Resources/public/js/CardDetector.js');
    common.include('../../Symfony/src/Spotify/PaymentsBundle/Resources/public/js/SingleLine.js');

    jQuery('body').html('<div class="form-group">' +
      '<label for="creditcard">credit card</label>' +
      '<div id="creditcard-form" class="form-control form-control-wrap">' +
      '<div class="tiny-label creditcard">card</div>' +
      '<div class="secondary">' +
      '<div class="tiny-label month">MM</div>' +
      '<div class="divider">/</div>' +
      '<div class="tiny-label year">YY</div>' +
      '<div class="tiny-label cvc">CVC</div>' +
      '<div class="payment-flag payment-flag-app.user.country | lower }}"></div>' +
      '<div class="tiny-label postalCode">postalCode</div>' +
      '</div>' +
      '<div class="mask"></div>' +
      '<span id="card-icon" class="icon-provider generic"></span>' +
      '<input id="creditcard" autocomplete="off" type="tel" class="form-control-slide cc" data-role="creditcard" placeholder="1234 1234 1234 1234" />' +
      '</div>' +
      '</div>'
    );

    singleLine = new SingleLine('creditcard-form', new CardDetector());
  });

  describe('Not filled in form', function () {
    it('should return {result: false}', function () {
      var invalid = singleLine.getValues();
      assert.equal(invalid.result, false);
    });
  });

  describe('Partially filled in form', function () {
    it('should return {result: false} but with some values', function () {
      singleLine.setValues({
        creditcard: VISA,
        postalCode: '90210'
      });
      var invalid = singleLine.getValues();
      assert.equal(invalid.result, false);
      assert.equal(invalid.creditcard, VISA);
      assert.equal(invalid.postalCode, '90210');
    });
  });

  describe('Fully filled in form with invalid credit card', function () {
    it('should return {result: false}, with all values filled in', function () {
      singleLine.setValues({
        creditcard: INVALID,
        month: '09',
        year: '16',
        cvc: '161',
        postalCode: '90210'
      });

      var invalid = singleLine.getValues();
      assert.equal(invalid.result, false);
      assert.equal(invalid.creditcard, INVALID);
      assert.equal(invalid.month, '09');
      assert.equal(invalid.year, '16');
      assert.equal(invalid.cvc, '161');
      assert.equal(invalid.postalCode, '90210')
    });
  });

  describe('Amex card with wrong cvc', function () {
    it('should return {result: false} with all other values correct', function () {
      singleLine.setValues({
        creditcard: AMEX,
        month: '09',
        year: '16',
        cvc: '161',
        postalCode: '90210'
      });

      var invalid = singleLine.getValues();
      assert.equal(invalid.result, false);
      assert.equal(invalid.creditcard, AMEX);
      assert.equal(invalid.month, '09');
      assert.equal(invalid.year, '16');
      assert.equal(invalid.cvc, '161');
      assert.equal(invalid.postalCode, '90210')
    });
  });

  describe('Amex card with correct cvc', function () {
    it('should return {result: true} and all other values correct', function () {
      singleLine.setValues({
        creditcard: AMEX,
        month: '09',
        year: '16',
        cvc: '1611',
        postalCode: '90210'
      });

      var invalid = singleLine.getValues();
      assert.equal(invalid.result, true);
      assert.equal(invalid.creditcard, AMEX);
      assert.equal(invalid.month, '09');
      assert.equal(invalid.year, '16');
      assert.equal(invalid.cvc, '1611');
      assert.equal(invalid.postalCode, '90210')
    });
  });

  describe('Discover card with incorrect cvc', function () {
    it('should return {result: false} with all other values correct', function () {
      singleLine.setValues({
        creditcard: DISCOVER,
        month: '09',
        year: '16',
        cvc: '11',
        postalCode: '90210'
      });

      var invalid = singleLine.getValues();
      assert.equal(invalid.result, false);
      assert.equal(invalid.creditcard, DISCOVER);
      assert.equal(invalid.month, '09');
      assert.equal(invalid.year, '16');
      assert.equal(invalid.cvc, '11');
      assert.equal(invalid.postalCode, '90210')
    });
  });

  describe('Discover card with correct cvc', function () {
    it('should return {result: true} with all other values correct', function () {
      singleLine.setValues({
        creditcard: DISCOVER,
        month: '09',
        year: '16',
        cvc: '161',
        postalCode: '90210'
      });

      var invalid = singleLine.getValues();
      assert.equal(invalid.result, true);
      assert.equal(invalid.creditcard, DISCOVER);
      assert.equal(invalid.month, '09');
      assert.equal(invalid.year, '16');
      assert.equal(invalid.cvc, '161');
      assert.equal(invalid.postalCode, '90210')
    });
  });

});
