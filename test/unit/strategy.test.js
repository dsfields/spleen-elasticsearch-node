'use strict';

const { assert } = require('chai');

const Strategy = require('../../lib/strategy');


describe('Strategy', function() {

  describe('.constructor', function() {
    it('throws if settings null', function() {
      assert.throws(() => {
        const strategy = new Strategy(null);
        assert.isNotOk(strategy);
      }, TypeError);
    });

    it('throws if settings undefined', function() {
      assert.throws(() => {
        const strategy = new Strategy(undefined);
        assert.isNotOk(strategy);
      }, TypeError);
    });

    it('throws if settings not object', function() {
      assert.throws(() => {
        const strategy = new Strategy(42);
        assert.isNotOk(strategy);
      }, TypeError);
    });

    it('throws if allow not array', function() {
      assert.throws(() => {
        const strategy = new Strategy({ type: 'MyType', allow: 42 });
        assert.isNotOk(strategy);
      }, TypeError);
    });

    it('throws if deny not array', function() {
      assert.throws(() => {
        const strategy = new Strategy({ type: 'MyType', deny: 42 });
        assert.isNotOk(strategy);
      }, TypeError);
    });

    it('throws if allow contains non-strings', function() {
      assert.throws(() => {
        const strategy = new Strategy({ type: 'MyType', allow: [42] });
        assert.isNotOk(strategy);
      }, TypeError);
    });

    it('throws if deny contains non-strings', function() {
      assert.throws(() => {
        const strategy = new Strategy({ type: 'MyType', deny: [42] });
        assert.isNotOk(strategy);
      }, TypeError);
    });

    it('throws if deny and allow provided', function() {
      assert.throws(() => {
        const strategy = new Strategy({
          type: 'MyType',
          allow: ['/foo'],
          deny: ['/bar'],
        });

        assert.isNotOk(strategy);
      }, TypeError);
    });

    it('should set allow to Set containing provided values', function() {
      const allow = ['/foo', '/bar'];
      const strategy = new Strategy({ type: 'MyType', allow });

      for (let i = 0; i < allow.length; i++) {
        const val = allow[i];
        assert.isTrue(strategy.allow.has(val));
      }
    });

    it('should set deny to Set containing provided values', function() {
      const deny = ['/foo', '/bar'];
      const strategy = new Strategy({ type: 'MyType', deny });

      for (let i = 0; i < deny.length; i++) {
        const val = deny[i];
        assert.isTrue(strategy.deny.has(val));
      }
    });

    it('should set require to empty array if not provided', function() {
      const strategy = new Strategy({ type: 'MyType' });
      assert.isArray(strategy.require);
      assert.lengthOf(strategy.require, 0);
    });

    it('should set require to provided array', function() {
      const require = ['/foo'];
      const strategy = new Strategy({ type: 'MyType', require });
      assert.deepEqual(strategy.require, require);
    });
  });

});
