'use strict';

const { assert } = require('chai');
const { Target } = require('spleen');

const errors = require('../../lib/errors');


describe('errors', function() {

  describe('ConvertError', function() {
    it('should set message to default if none provided', function() {
      const result = new errors.ConvertError();
      assert.strictEqual(result.message, errors.ConvertError.defaultMessage);
    });

    it('should set message to provided', function() {
      const result = new errors.ConvertError('test');
      assert.strictEqual(result.message, 'test');
    });
  });


  describe('DeniedFieldError', function() {
    it('should set message to default suffixed with field', function() {
      const field = '/foo/bar';
      const result = new errors.DeniedFieldError(field);
      const expected = errors.DeniedFieldError.defaultMessage + field;
      assert.strictEqual(result.message, expected);
    });

    it('should set data to denied field', function() {
      const field = '/foo/bar';
      const result = new errors.DeniedFieldError(field);
      assert.strictEqual(result.data, field);
    });
  });


  describe('InvalidTargetError', function() {
    it('should set message with provided target', function() {
      const pointer = '/foo/bar';
      const target = Target.jsonPointer(pointer);
      const result = new errors.InvalidTargetError(target);
      assert.isTrue(result.message.endsWith(pointer));
    });
  });


  describe('NonallowedFieldError', function() {
    it('should set message to default suffixed with field', function() {
      const field = '/foo/bar';
      const result = new errors.NonallowedFieldError(field);
      const expected = errors.NonallowedFieldError.defaultMessage + field;
      assert.strictEqual(result.message, expected);
    });

    it('should set data to denied field', function() {
      const field = '/foo/bar';
      const result = new errors.NonallowedFieldError(field);
      assert.strictEqual(result.data, field);
    });
  });


  describe('RequiredFieldError', function() {
    it('should set data to provided fields', function() {
      const fields = ['foo', 'bar'];
      const result = new errors.RequiredFieldError(fields);
      assert.strictEqual(result.data, fields);
    });
  });

});
