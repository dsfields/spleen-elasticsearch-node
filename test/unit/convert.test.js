'use strict';

const { assert } = require('chai');
const spleen = require('spleen');

const convert = require('../../lib/convert');
const errors = require('../../lib/errors');
const Strategy = require('../../lib/strategy');


describe('#convert', function() {
  it('throws if filter not instance of Filter', function() {
    assert.throws(() => {
      convert(42);
    }, TypeError);
  });

  it('throws if strategy not instance of Strategy', function() {
    assert.throws(() => {
      convert(spleen.parse('/foo eq 42').value, 42);
    }, TypeError);
  });

  it('returns object with value key', function() {
    const { value } = spleen.parse('/foo eq 42');
    const result = convert(value);
    assert.isObject(result.value);
  });

  it('returns object with value.filter key', function() {
    const { value } = spleen.parse('/foo eq 42');
    const result = convert(value);
    assert.isObject(result.value.filter);
  });

  it('returns object with value.filter.bool key', function() {
    const { value } = spleen.parse('/foo eq 42');
    const result = convert(value);
    assert.isObject(result.value.filter.bool);
  });

  it('returns object with value.fields key', function() {
    const { value } = spleen.parse('/foo eq 42');
    const result = convert(value);
    assert.isArray(result.fields);
  });

  it('omits should if no ors', function() {
    const { value } = spleen.parse('/foo eq 42 and /bar gt 0');
    const result = convert(value);
    assert.notProperty(result.value.filter.bool, 'should');
    assert.isArray(result.value.filter.bool.must);
  });

  it('wraps musts in a should if filter includes ors', function() {
    const { value } = spleen.parse('/foo eq 42 or /bar gt 0');
    const result = convert(value);
    assert.isArray(result.value.filter.bool.should);
    assert.lengthOf(result.value.filter.bool.should, 2);
  });

  it('omits should if there are no ors', function() {
    const { value } = spleen.parse('/foo eq 42');
    const result = convert(value);
    assert.notProperty(result.value.filter.bool, 'should');
    assert.isArray(result.value.filter.bool.must);
  });

  it('nests sub filters in bool', function() {
    const exp = '/foo neq true and (/baz eq 42 or /qux gt 0)';
    const { value } = spleen.parse(exp);
    const result = convert(value);
    assert.isArray(result.value.filter.bool.must);
    assert.lengthOf(result.value.filter.bool.must, 2);
    assert.isObject(result.value.filter.bool.must[1].bool);
    assert.isArray(result.value.filter.bool.must[1].bool.should);
    assert.lengthOf(result.value.filter.bool.must[1].bool.should, 2);
  });

  it('throws if statement not Filter or Clause', function() {
    const { value } = spleen.parse('/foo eq 42 and /bar gt 0');
    value.statements[1].value = 'bork';

    assert.throws(() => {
      convert(value);
    }, errors.ConvertError);
  });

  it('adds eq with two targets as script', function() {
    const { value } = spleen.parse('/foo eq /bar');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.strictEqual(
      result.value.filter.bool.must[0].script.script,
      "doc['foo'].value == doc['bar'].value"
    );
  });

  it('adds neq with two targets as script', function() {
    const { value } = spleen.parse('/foo neq /bar');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.strictEqual(
      result.value.filter.bool.must[0].script.script,
      "doc['foo'].value != doc['bar'].value"
    );
  });

  it('adds gt with two targets as script', function() {
    const { value } = spleen.parse('/foo gt /bar');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.strictEqual(
      result.value.filter.bool.must[0].script.script,
      "doc['foo'].value > doc['bar'].value"
    );
  });

  it('adds gte with two targets as script', function() {
    const { value } = spleen.parse('/foo gte /bar');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.strictEqual(
      result.value.filter.bool.must[0].script.script,
      "doc['foo'].value >= doc['bar'].value"
    );
  });

  it('adds lt with two targets as script', function() {
    const { value } = spleen.parse('/foo lt /bar');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.strictEqual(
      result.value.filter.bool.must[0].script.script,
      "doc['foo'].value < doc['bar'].value"
    );
  });

  it('adds lte with two targets as script', function() {
    const { value } = spleen.parse('/foo lte /bar');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.strictEqual(
      result.value.filter.bool.must[0].script.script,
      "doc['foo'].value <= doc['bar'].value"
    );
  });

  it('adds eq with two string literals as script', function() {
    const { value } = spleen.parse('"a" eq "b"');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject == params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      'b'
    );
  });

  it('adds eq with two number literals as script', function() {
    const { value } = spleen.parse('42 eq 3.14');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject == params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      42
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      3.14
    );
  });

  it('adds eq with two Boolean literals as script', function() {
    const { value } = spleen.parse('true eq false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject == params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      true
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds eq with string and number literals as script', function() {
    const { value } = spleen.parse('"a" eq 42');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject == params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      42
    );
  });

  it('adds eq with string and Boolean literals as script', function() {
    const { value } = spleen.parse('"a" eq true');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject == params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      true
    );
  });

  it('adds eq with number and Boolean literals as script', function() {
    const { value } = spleen.parse('3.14 eq false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject == params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      3.14
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds neq with two string literals as script', function() {
    const { value } = spleen.parse('"a" neq "b"');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject != params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      'b'
    );
  });

  it('adds neq with two number literals as script', function() {
    const { value } = spleen.parse('42 neq 3.14');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject != params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      42
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      3.14
    );
  });

  it('adds neq with two Boolean literals as script', function() {
    const { value } = spleen.parse('true neq false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject != params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      true
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds neq with string and number literals as script', function() {
    const { value } = spleen.parse('"a" neq 42');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject != params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      42
    );
  });

  it('adds neq with string and Boolean literals as script', function() {
    const { value } = spleen.parse('"a" neq true');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject != params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      true
    );
  });

  it('adds neq with number and Boolean literals as script', function() {
    const { value } = spleen.parse('3.14 neq false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject != params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      3.14
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds gt with two string literals as script', function() {
    const { value } = spleen.parse('"a" gt "b"');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject > params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      'b'
    );
  });

  it('adds gt with two number literals as script', function() {
    const { value } = spleen.parse('42 gt 3.14');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject > params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      42
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      3.14
    );
  });

  it('adds gt with two Boolean literals as script', function() {
    const { value } = spleen.parse('true gt false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject > params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      true
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds gt with string and number literals as script', function() {
    const { value } = spleen.parse('"a" gt 42');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject > params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      42
    );
  });

  it('adds gt with string and Boolean literals as script', function() {
    const { value } = spleen.parse('"a" gt true');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject > params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      true
    );
  });

  it('adds gt with number and Boolean literals as script', function() {
    const { value } = spleen.parse('3.14 gt false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject > params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      3.14
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds gte with two string literals as script', function() {
    const { value } = spleen.parse('"a" gte "b"');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject >= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      'b'
    );
  });

  it('adds gte with two number literals as script', function() {
    const { value } = spleen.parse('42 gte 3.14');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject >= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      42
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      3.14
    );
  });

  it('adds gte with two Boolean literals as script', function() {
    const { value } = spleen.parse('true gte false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject >= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      true
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds gte with string and number literals as script', function() {
    const { value } = spleen.parse('"a" gte 42');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject >= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      42
    );
  });

  it('adds gte with string and Boolean literals as script', function() {
    const { value } = spleen.parse('"a" gte true');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject >= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      true
    );
  });

  it('adds gte with number and Boolean literals as script', function() {
    const { value } = spleen.parse('3.14 gte false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject >= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      3.14
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds lt with two string literals as script', function() {
    const { value } = spleen.parse('"a" lt "b"');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject < params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      'b'
    );
  });

  it('adds lt with two number literals as script', function() {
    const { value } = spleen.parse('42 lt 3.14');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject < params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      42
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      3.14
    );
  });

  it('adds lt with two Boolean literals as script', function() {
    const { value } = spleen.parse('true lt false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject < params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      true
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds lt with string and number literals as script', function() {
    const { value } = spleen.parse('"a" lt 42');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject < params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      42
    );
  });

  it('adds lt with string and Boolean literals as script', function() {
    const { value } = spleen.parse('"a" lt true');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject < params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      true
    );
  });

  it('adds lt with number and Boolean literals as script', function() {
    const { value } = spleen.parse('3.14 lt false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject < params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      3.14
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds lte with two string literals as script', function() {
    const { value } = spleen.parse('"a" lte "b"');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject <= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      'b'
    );
  });

  it('adds lte with two number literals as script', function() {
    const { value } = spleen.parse('42 lte 3.14');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject <= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      42
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      3.14
    );
  });

  it('adds lte with two Boolean literals as script', function() {
    const { value } = spleen.parse('true lte false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject <= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      true
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('adds lte with string and number literals as script', function() {
    const { value } = spleen.parse('"a" lte 42');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject <= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      42
    );
  });

  it('adds lte with string and Boolean literals as script', function() {
    const { value } = spleen.parse('"a" lte true');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject <= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      'a'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      true
    );
  });

  it('adds lte with number and Boolean literals as script', function() {
    const { value } = spleen.parse('3.14 lte false');
    const result = convert(value);
    assert.isObject(result.value.filter.bool.must[0].script);
    assert.isObject(result.value.filter.bool.must[0].script.script);
    assert.isObject(result.value.filter.bool.must[0].script.script.params);

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.source,
      'params.subject <= params.object'
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.subject,
      3.14
    );

    assert.strictEqual(
      result.value.filter.bool.must[0].script.script.params.object,
      false
    );
  });

  it('throws if scripting with unknown operator', function() {
    const { value } = spleen.parse('/foo eq /bar');
    value.statements[0].value.operator = { type: 'nope' };

    assert.throws(() => {
      convert(value);
    }, errors.ConvertError);
  });

  it('throws if filter includes denied target', function() {
    const { value } = spleen.parse('/foo eq 42');
    const strategy = new Strategy({ deny: ['/foo'] });

    assert.throws(() => {
      convert(value, strategy);
    }, errors.DeniedFieldError);
  });

  it('throws if filter includes non-allowed target', function() {
    const { value } = spleen.parse('/foo eq 42');
    const strategy = new Strategy({ allow: ['/bar'] });

    assert.throws(() => {
      convert(value, strategy);
    }, errors.NonallowedFieldError);
  });

  it('throws if filter includes target with invalid chars', function() {
    const { value } = spleen.parse('/#blah eq 42');

    assert.throws(() => {
      convert(value);
    }, errors.InvalidTargetError);
  });

  it('groups anded clauses separated by ors', function() {
    const exp = '/foo eq 42 and /bar/2 neq "blah" or /baz gt 3.14';
    const { value } = spleen.parse(exp);
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.should);
    assert.lengthOf(filter.bool.should, 2);
    assert.isObject(filter.bool.should[0].bool);
    assert.isArray(filter.bool.should[0].bool.must);
    assert.lengthOf(filter.bool.should[0].bool.must, 2);
    assert.isObject(filter.bool.should[1].bool);
    assert.isArray(filter.bool.should[1].bool.must);
    assert.lengthOf(filter.bool.should[1].bool.must, 1);
  });

  it('adds term for target eq string', function() {
    const { value } = spleen.parse('/foo eq "a"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].term);
    assert.property(filter.bool.must[0].term, 'foo');
    assert.strictEqual(filter.bool.must[0].term.foo, 'a');
  });

  it('adds term for target eq number', function() {
    const { value } = spleen.parse('/foo eq 42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].term);
    assert.property(filter.bool.must[0].term, 'foo');
    assert.strictEqual(filter.bool.must[0].term.foo, 42);
  });

  it('adds term for target eq Boolean', function() {
    const { value } = spleen.parse('/foo eq true');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].term);
    assert.property(filter.bool.must[0].term, 'foo');
    assert.strictEqual(filter.bool.must[0].term.foo, true);
  });

  it('adds term for string eq target', function() {
    const { value } = spleen.parse('"a" eq /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].term);
    assert.property(filter.bool.must[0].term, 'foo');
    assert.strictEqual(filter.bool.must[0].term.foo, 'a');
  });

  it('adds term for number eq target', function() {
    const { value } = spleen.parse('42 eq /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].term);
    assert.property(filter.bool.must[0].term, 'foo');
    assert.strictEqual(filter.bool.must[0].term.foo, 42);
  });

  it('adds term for Boolean eq target', function() {
    const { value } = spleen.parse('true eq /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].term);
    assert.property(filter.bool.must[0].term, 'foo');
    assert.strictEqual(filter.bool.must[0].term.foo, true);
  });

  it('adds must_not term for target neq string', function() {
    const { value } = spleen.parse('/foo neq "a"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.term);
    assert.strictEqual(filter.bool.must[0].bool.must_not.term.foo, 'a');
  });

  it('adds must_not term for target neq number', function() {
    const { value } = spleen.parse('/foo neq 42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.term);
    assert.strictEqual(filter.bool.must[0].bool.must_not.term.foo, 42);
  });

  it('adds must_not term for target neq Boolean', function() {
    const { value } = spleen.parse('/foo neq false');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.term);
    assert.strictEqual(filter.bool.must[0].bool.must_not.term.foo, false);
  });

  it('adds must_not term for string neq target', function() {
    const { value } = spleen.parse('"a" neq /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.term);
    assert.strictEqual(filter.bool.must[0].bool.must_not.term.foo, 'a');
  });

  it('adds must_not term for number neq target', function() {
    const { value } = spleen.parse('42 neq /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.term);
    assert.strictEqual(filter.bool.must[0].bool.must_not.term.foo, 42);
  });

  it('adds must_not term for Boolean neq target', function() {
    const { value } = spleen.parse('false neq /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.term);
    assert.strictEqual(filter.bool.must[0].bool.must_not.term.foo, false);
  });

  it('adds range gt for target gt string', function() {
    const { value } = spleen.parse('/foo gt "a"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gt, 'a');
  });

  it('adds range gt for target gt number', function() {
    const { value } = spleen.parse('/foo gt 42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gt, 42);
  });

  it('adds range gt for target gt Boolean', function() {
    const { value } = spleen.parse('/foo gt true');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gt, true);
  });

  it('adds range lt for string gt target', function() {
    const { value } = spleen.parse('"z" gt /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lt, 'z');
  });

  it('adds range lt for number gt target', function() {
    const { value } = spleen.parse('42 gt /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lt, 42);
  });

  it('adds range lt for Boolean gt target', function() {
    const { value } = spleen.parse('true gt /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lt, true);
  });

  it('adds range gte for target gte string', function() {
    const { value } = spleen.parse('/foo gte "a"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, 'a');
  });

  it('adds range gte for target gte number', function() {
    const { value } = spleen.parse('/foo gte 42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, 42);
  });

  it('adds range gte for target gte Boolean', function() {
    const { value } = spleen.parse('/foo gte true');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, true);
  });

  it('adds range lte for string gte target', function() {
    const { value } = spleen.parse('"z" gte /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lte, 'z');
  });

  it('adds range lte for number gte target', function() {
    const { value } = spleen.parse('42 gte /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lte, 42);
  });

  it('adds range lte for Boolean gte target', function() {
    const { value } = spleen.parse('true gte /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lte, true);
  });

  it('adds range lt for target lt string', function() {
    const { value } = spleen.parse('/foo lt "a"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lt, 'a');
  });

  it('adds range lt for target lt number', function() {
    const { value } = spleen.parse('/foo lt 42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lt, 42);
  });

  it('adds range lt for target lt Boolean', function() {
    const { value } = spleen.parse('/foo lt true');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lt, true);
  });

  it('adds range gt for string lt target', function() {
    const { value } = spleen.parse('"z" lt /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gt, 'z');
  });

  it('adds range gt for number lt target', function() {
    const { value } = spleen.parse('42 lt /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gt, 42);
  });

  it('adds range gt for Boolean lt target', function() {
    const { value } = spleen.parse('true lt /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gt, true);
  });

  it('adds range lte for target lte string', function() {
    const { value } = spleen.parse('/foo lte "a"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lte, 'a');
  });

  it('adds range lte for target lte number', function() {
    const { value } = spleen.parse('/foo lte 42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lte, 42);
  });

  it('adds range lte for target lte Boolean', function() {
    const { value } = spleen.parse('/foo lte true');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.lte, true);
  });

  it('adds range gte for string lte target', function() {
    const { value } = spleen.parse('"z" lte /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, 'z');
  });

  it('adds range gte for number lte target', function() {
    const { value } = spleen.parse('42 lte /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, 42);
  });

  it('adds range gte for Boolean lte target', function() {
    const { value } = spleen.parse('true lte /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, true);
  });

  it('adds regex for target like string', function() {
    const regex = '.*Hello World.{1}';
    const parseResult = spleen.parse('/foo/bar like "*Hello World_"');
    const { value } = parseResult;
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].regexp);
    assert.strictEqual(filter.bool.must[0].regexp['foo.bar'], regex);
  });

  it('throws if like object not Like', function() {
    const parseResult = spleen.parse('/foo/bar like "*Hello World_"');
    parseResult.value.statements[0].value.object = 42;

    assert.throws(() => {
      convert(parseResult.value);
    }, errors.ConvertError);
  });

  it('throws if like object Like.value not string', function() {
    const parseResult = spleen.parse('/foo/bar like "*Hello World_"');
    parseResult.value.statements[0].value.object.value = 42;

    assert.throws(() => {
      convert(parseResult.value);
    }, errors.ConvertError);
  });

  it('adds must_not regex for target nlike string', function() {
    const regex = '.*Hello World.{1}';
    const { value } = spleen.parse('/foo/bar nlike "*Hello World_"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.regexp);
    assert.strictEqual(
      filter.bool.must[0].bool.must_not.regexp['foo.bar'],
      regex
    );
  });

  it('adds range for target between string,string', function() {
    const { value } = spleen.parse('/foo between "a","z"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, 'a');
    assert.strictEqual(filter.bool.must[0].range.foo.lte, 'z');
  });

  it('adds range for target between number,number', function() {
    const { value } = spleen.parse('/foo between 1,42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, 1);
    assert.strictEqual(filter.bool.must[0].range.foo.lte, 42);
  });

  it('adds range for target between string,number', function() {
    const { value } = spleen.parse('/foo between "a",42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, 'a');
    assert.strictEqual(filter.bool.must[0].range.foo.lte, 42);
  });

  it('adds range for target between number,string', function() {
    const { value } = spleen.parse('/foo between 1,"z"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].range);
    assert.isObject(filter.bool.must[0].range.foo);
    assert.strictEqual(filter.bool.must[0].range.foo.gte, 1);
    assert.strictEqual(filter.bool.must[0].range.foo.lte, 'z');
  });

  it('throws if between object not Range', function() {
    const { value } = spleen.parse('/foo between 1,"z"');
    value.statements[0].value.object = 42;

    assert.throws(() => {
      convert(value);
    }, errors.ConvertError);
  });

  it('adds must_not range for target nbetween string,string', function() {
    const { value } = spleen.parse('/foo nbetween "a","z"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.range);
    assert.isObject(filter.bool.must[0].bool.must_not.range.foo);
    assert.strictEqual(filter.bool.must[0].bool.must_not.range.foo.gte, 'a');
    assert.strictEqual(filter.bool.must[0].bool.must_not.range.foo.lte, 'z');
  });

  it('adds must_not range for target nbetween number,number', function() {
    const { value } = spleen.parse('/foo nbetween 1,42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.range);
    assert.isObject(filter.bool.must[0].bool.must_not.range.foo);
    assert.strictEqual(filter.bool.must[0].bool.must_not.range.foo.gte, 1);
    assert.strictEqual(filter.bool.must[0].bool.must_not.range.foo.lte, 42);
  });

  it('adds must_not range for target nbetween string,number', function() {
    const { value } = spleen.parse('/foo nbetween "a",42');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.range);
    assert.isObject(filter.bool.must[0].bool.must_not.range.foo);
    assert.strictEqual(filter.bool.must[0].bool.must_not.range.foo.gte, 'a');
    assert.strictEqual(filter.bool.must[0].bool.must_not.range.foo.lte, 42);
  });

  it('adds must_not range for target nbetween number,string', function() {
    const { value } = spleen.parse('/foo nbetween 1,"z"');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.range);
    assert.isObject(filter.bool.must[0].bool.must_not.range.foo);
    assert.strictEqual(filter.bool.must[0].bool.must_not.range.foo.gte, 1);
    assert.strictEqual(filter.bool.must[0].bool.must_not.range.foo.lte, 'z');
  });

  it('throws if nbetween object not Range', function() {
    const { value } = spleen.parse('/foo nbetween 1,"z"');
    value.statements[0].value.object = 42;

    assert.throws(() => {
      convert(value);
    }, errors.ConvertError);
  });

  it('adds terms for target in [strings]', function() {
    const { value } = spleen.parse('/foo in ["a","b","c"]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].terms);
    assert.isArray(filter.bool.must[0].terms.foo);
    assert.deepEqual(filter.bool.must[0].terms.foo, ['a', 'b', 'c']);
  });

  it('adds terms for target in [numbers]', function() {
    const { value } = spleen.parse('/foo in [1,2,3]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].terms);
    assert.isArray(filter.bool.must[0].terms.foo);
    assert.deepEqual(filter.bool.must[0].terms.foo, [1, 2, 3]);
  });

  it('adds terms for target in [Bools]', function() {
    const { value } = spleen.parse('/foo in [true,true,false]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].terms);
    assert.isArray(filter.bool.must[0].terms.foo);
    assert.deepEqual(filter.bool.must[0].terms.foo, [true, true, false]);
  });

  it('adds terms for target in [strings,numbers]', function() {
    const { value } = spleen.parse('/foo in ["a",2,"c",4]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].terms);
    assert.isArray(filter.bool.must[0].terms.foo);
    assert.deepEqual(filter.bool.must[0].terms.foo, ['a', 2, 'c', 4]);
  });

  it('adds terms for target in [strings,Bools]', function() {
    const { value } = spleen.parse('/foo in ["a",true,"c",false]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].terms);
    assert.isArray(filter.bool.must[0].terms.foo);
    assert.deepEqual(filter.bool.must[0].terms.foo, ['a', true, 'c', false]);
  });

  it('adds terms for target in [numbers,Bools]', function() {
    const { value } = spleen.parse('/foo in [1,true,3,false]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].terms);
    assert.isArray(filter.bool.must[0].terms.foo);
    assert.deepEqual(filter.bool.must[0].terms.foo, [1, true, 3, false]);
  });

  it('adds terms for target in [strings,numbers,Bools]', function() {
    const { value } = spleen.parse('/foo in [1,"b",false]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].terms);
    assert.isArray(filter.bool.must[0].terms.foo);
    assert.deepEqual(filter.bool.must[0].terms.foo, [1, 'b', false]);
  });

  it('throws if in object not array', function() {
    const { value } = spleen.parse('/foo in [1,"b",false]');
    value.statements[0].value.object = 42;

    assert.throws(() => {
      convert(value);
    }, errors.ConvertError);
  });

  it('adds must_not terms for target nin [strings]', function() {
    const { value } = spleen.parse('/foo nin ["a","b","c"]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.terms);
    assert.isArray(filter.bool.must[0].bool.must_not.terms.foo);
    assert.deepEqual(
      filter.bool.must[0].bool.must_not.terms.foo,
      ['a', 'b', 'c']
    );
  });

  it('adds must_not terms for target nin [numbers]', function() {
    const { value } = spleen.parse('/foo nin [1,2,3]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.terms);
    assert.isArray(filter.bool.must[0].bool.must_not.terms.foo);
    assert.deepEqual(
      filter.bool.must[0].bool.must_not.terms.foo,
      [1, 2, 3]
    );
  });

  it('adds must_not terms for target nin [Bools]', function() {
    const { value } = spleen.parse('/foo nin [true,true,false]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.terms);
    assert.isArray(filter.bool.must[0].bool.must_not.terms.foo);
    assert.deepEqual(
      filter.bool.must[0].bool.must_not.terms.foo,
      [true, true, false]
    );
  });

  it('adds must_not terms for target nin [strings,numbers]', function() {
    const { value } = spleen.parse('/foo nin ["a",2,"c",4]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.terms);
    assert.isArray(filter.bool.must[0].bool.must_not.terms.foo);
    assert.deepEqual(
      filter.bool.must[0].bool.must_not.terms.foo,
      ['a', 2, 'c', 4]
    );
  });

  it('adds must_not terms for target nin [strings,Bools]', function() {
    const { value } = spleen.parse('/foo nin ["a",true,"c",false]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.terms);
    assert.isArray(filter.bool.must[0].bool.must_not.terms.foo);
    assert.deepEqual(
      filter.bool.must[0].bool.must_not.terms.foo,
      ['a', true, 'c', false]
    );
  });

  it('adds must_not terms for target nin [numbers,Bools]', function() {
    const { value } = spleen.parse('/foo nin [1,true,3,false]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.terms);
    assert.isArray(filter.bool.must[0].bool.must_not.terms.foo);
    assert.deepEqual(
      filter.bool.must[0].bool.must_not.terms.foo,
      [1, true, 3, false]
    );
  });

  it('adds must_not terms for target nin [strings,numbers,Bools]', function() {
    const { value } = spleen.parse('/foo nin [1,"b",false]');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.terms);
    assert.isArray(filter.bool.must[0].bool.must_not.terms.foo);
    assert.deepEqual(
      filter.bool.must[0].bool.must_not.terms.foo,
      [1, 'b', false]
    );
  });

  it('throws if nin object not array', function() {
    const { value } = spleen.parse('/foo nin [1,"b",false]');
    value.statements[0].value.object = 42;

    assert.throws(() => {
      convert(value);
    }, errors.ConvertError);
  });

  it('throws if unknown operator', function() {
    const { value } = spleen.parse('/foo eq 42');
    value.statements[0].value.operator = { type: 'nope' };

    assert.throws(() => {
      convert(value);
    }, errors.ConvertError);
  });

  it('returns with list of all fields', function() {
    const { value } = spleen.parse('/foo eq 42 or /bar/baz neq "test"');
    const result = convert(value);
    assert.isArray(result.fields);
    assert.lengthOf(result.fields, 2);
    assert.deepEqual(result.fields, ['/foo', '/bar/baz']);
  });

  it('does not add duplicate fields to list', function () {
    const { value } = spleen.parse('/foo eq 42 or /foo neq 1 and /bar eq 2');
    const result = convert(value);
    assert.isArray(result.fields);
    assert.lengthOf(result.fields, 2);
    assert.deepEqual(result.fields, ['/foo', '/bar']);
  });

  it('throws if missing required fields', function() {
    const strategy = new Strategy({ require: ['/bar'] });
    const { value } = spleen.parse('/foo eq 42');

    assert.throws(() => {
      convert(value, strategy);
    }, errors.RequiredFieldError);
  });

  it('does not throw if all required fields present', function() {
    const strategy = new Strategy({ require: ['/foo'] });
    const { value } = spleen.parse('/foo eq 42');

    assert.doesNotThrow(() => {
      convert(value, strategy);
    }, errors.RequiredFieldError);
  });

  it('converts targets to dot notation', function() {
    const { value } = spleen.parse('/foo/bar eq 42 and /baz/qux eq false');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 2);
    assert.isObject(filter.bool.must[0].term);
    assert.property(filter.bool.must[0].term, 'foo.bar');
    assert.isObject(filter.bool.must[1].term);
    assert.property(filter.bool.must[1].term, 'baz.qux');
  });

  it('adds must_not exists for target eq null', function() {
    const { value } = spleen.parse('/foo eq nil');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.exists);
    assert.strictEqual(filter.bool.must[0].bool.must_not.exists.field, 'foo');
  });

  it('adds must_not exists for null eq target', function() {
    const { value } = spleen.parse('nil eq /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.exists);
    assert.strictEqual(filter.bool.must[0].bool.must_not.exists.field, 'foo');
  });

  it('adds exists for target neq null', function() {
    const { value } = spleen.parse('/foo neq nil');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].exists);
    assert.strictEqual(filter.bool.must[0].exists.field, 'foo');
  });

  it('adds exists for null neq target', function() {
    const { value } = spleen.parse('nil neq /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].exists);
    assert.strictEqual(filter.bool.must[0].exists.field, 'foo');
  });

  it('adds exists for target gt null', function() {
    const { value } = spleen.parse('/foo gt nil');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].exists);
    assert.strictEqual(filter.bool.must[0].exists.field, 'foo');
  });

  it('adds must_not exists for null gt target', function() {
    const { value } = spleen.parse('nil gt /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.exists);
    assert.strictEqual(filter.bool.must[0].bool.must_not.exists.field, 'foo');
  });

  it('adds exists for target gte null', function() {
    const { value } = spleen.parse('/foo gte nil');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].exists);
    assert.strictEqual(filter.bool.must[0].exists.field, 'foo');
  });

  it('adds must_not exists for null gte target', function() {
    const { value } = spleen.parse('nil gte /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.exists);
    assert.strictEqual(filter.bool.must[0].bool.must_not.exists.field, 'foo');
  });

  it('adds must_not exists for target lt null', function() {
    const { value } = spleen.parse('/foo lt nil');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.exists);
    assert.strictEqual(filter.bool.must[0].bool.must_not.exists.field, 'foo');
  });

  it('adds exists for null lt target', function() {
    const { value } = spleen.parse('nil lt /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].exists);
    assert.strictEqual(filter.bool.must[0].exists.field, 'foo');
  });

  it('adds must_not exists for target lte null', function() {
    const { value } = spleen.parse('/foo lte nil');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].bool);
    assert.isObject(filter.bool.must[0].bool.must_not);
    assert.isObject(filter.bool.must[0].bool.must_not.exists);
    assert.strictEqual(filter.bool.must[0].bool.must_not.exists.field, 'foo');
  });

  it('adds exists for null lte target', function() {
    const { value } = spleen.parse('nil lte /foo');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 1);
    assert.isObject(filter.bool.must[0].exists);
    assert.strictEqual(filter.bool.must[0].exists.field, 'foo');
  });

  it('groups clause or clause', function() {
    const { value } = spleen.parse('/foo eq 1 or /bar eq 2');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.should);
    assert.lengthOf(filter.bool.should, 2);
    assert.isObject(filter.bool.should[0].bool);
    assert.isArray(filter.bool.should[0].bool.must);
    assert.lengthOf(filter.bool.should[0].bool.must, 1);
    assert.isObject(filter.bool.should[0].bool.must[0].term);
    assert.strictEqual(filter.bool.should[0].bool.must[0].term.foo, 1);
    assert.isObject(filter.bool.should[1].bool);
    assert.isArray(filter.bool.should[1].bool.must);
    assert.lengthOf(filter.bool.should[1].bool.must, 1);
    assert.isObject(filter.bool.should[1].bool.must[0].term);
    assert.strictEqual(filter.bool.should[1].bool.must[0].term.bar, 2);
  });

  it('groups clause and clause or clause', function() {
    const { value } = spleen.parse('/foo eq 1 and /bar eq 2 or /baz eq 3');
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.should);
    assert.lengthOf(filter.bool.should, 2);
    assert.isObject(filter.bool.should[0].bool);
    assert.isArray(filter.bool.should[0].bool.must);
    assert.lengthOf(filter.bool.should[0].bool.must, 2);
    assert.isObject(filter.bool.should[0].bool.must[0].term);
    assert.strictEqual(filter.bool.should[0].bool.must[0].term.foo, 1);
    assert.isObject(filter.bool.should[0].bool.must[1].term);
    assert.strictEqual(filter.bool.should[0].bool.must[1].term.bar, 2);
    assert.isObject(filter.bool.should[1].bool);
    assert.isArray(filter.bool.should[1].bool.must);
    assert.lengthOf(filter.bool.should[1].bool.must, 1);
    assert.isObject(filter.bool.should[1].bool.must[0].term);
    assert.strictEqual(filter.bool.should[1].bool.must[0].term.baz, 3);
  });

  it('groups clause and (clause or clause) and clause', function() {
    const exp = '/foo eq 1 and (/bar eq 2 or /baz eq 3) and /qux eq 4';
    const { value } = spleen.parse(exp);
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.must);
    assert.lengthOf(filter.bool.must, 3);
    assert.isObject(filter.bool.must[0].term);
    assert.strictEqual(filter.bool.must[0].term.foo, 1);
    assert.isObject(filter.bool.must[1].bool);
    assert.isArray(filter.bool.must[1].bool.should);
    assert.lengthOf(filter.bool.must[1].bool.should, 2);
    assert.isObject(filter.bool.must[1].bool.should[0].bool);
    assert.isArray(filter.bool.must[1].bool.should[0].bool.must);
    assert.lengthOf(filter.bool.must[1].bool.should[0].bool.must, 1);
    assert.isObject(filter.bool.must[1].bool.should[0].bool.must[0].term);
    assert.strictEqual(
      filter.bool.must[1].bool.should[0].bool.must[0].term.bar,
      2
    );
    assert.isObject(filter.bool.must[1].bool.should[1].bool.must[0].term);
    assert.strictEqual(
      filter.bool.must[1].bool.should[1].bool.must[0].term.baz,
      3
    );
    assert.isObject(filter.bool.must[2].term);
    assert.strictEqual(filter.bool.must[2].term.qux, 4);
  });

  it('groups (clause and (clause or clause)) or clause and clause', function() {
    const exp =
      '(/foo eq 1 and (/bar eq 2 or /baz eq 3)) or /qux eq 4 and /quux eq 5';

    const { value } = spleen.parse(exp);
    const result = convert(value);
    const { filter } = result.value;
    assert.isArray(filter.bool.should);
    assert.lengthOf(filter.bool.should, 2);
    assert.isObject(filter.bool.should[0].bool);
    assert.isArray(filter.bool.should[0].bool.must);
    assert.lengthOf(filter.bool.should[0].bool.must, 1);
    assert.isObject(filter.bool.should[0].bool.must[0].bool);
    assert.isArray(filter.bool.should[0].bool.must[0].bool.must);
    assert.lengthOf(filter.bool.should[0].bool.must[0].bool.must, 2);
    assert.isObject(filter.bool.should[0].bool.must[0].bool.must[0].term);
    assert.strictEqual(filter.bool.should[0].bool.must[0].bool.must[0].term.foo, 1);
    assert.isObject(filter.bool.should[0].bool.must[0].bool.must[1].bool);
    assert.isArray(filter.bool.should[0].bool.must[0].bool.must[1].bool.should);
    assert.lengthOf(filter.bool.should[0].bool.must[0].bool.must[1].bool.should, 2);
    assert.isObject(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[0].bool);
    assert.isArray(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[0].bool.must);
    assert.lengthOf(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[0].bool.must, 1);
    assert.isObject(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[0].bool.must[0].term);
    assert.strictEqual(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[0].bool.must[0].term.bar, 2);
    assert.isObject(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[1].bool);
    assert.isArray(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[1].bool.must);
    assert.lengthOf(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[1].bool.must, 1);
    assert.isObject(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[1].bool.must[0].term);
    assert.strictEqual(filter.bool.should[0].bool.must[0].bool.must[1].bool.should[1].bool.must[0].term.baz, 3);
    assert.isObject(filter.bool.should[1].bool);
    assert.isArray(filter.bool.should[1].bool.must);
    assert.lengthOf(filter.bool.should[1].bool.must, 2);
    assert.isObject(filter.bool.should[1].bool.must[0].term);
    assert.strictEqual(filter.bool.should[1].bool.must[0].term.qux, 4);
    assert.isObject(filter.bool.should[1].bool.must[1].term);
    assert.strictEqual(filter.bool.should[1].bool.must[1].term.quux, 5);
  });
});
