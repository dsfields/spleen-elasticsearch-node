'use strict';

const elv = require('elv');


const msg = {
  argSettingsRequired: 'Argument "settings" is required',
  argSettingsObj: 'Argument "settings" must be an object',
  argSettingsAllowDeny: 'Argument "settings" cannot have by "allow" and "deny"',
  argSettingsDis: 'Argument "settings.discriminator" must be an object',
  argTarget: 'Argument "discriminator.target" is required',
  argMap: 'Argument "discriminator.map" is required',
  argTargetStr: 'Argument "discriminator.target" must be a non-empty string',
  argMapObj: 'Argument "discriminator.map" must be an object',
  argMappedType: 'Mapped discriminator type names must be non-empty strings',
};


function createTargetSet(value, name) {
  if (!elv(value)) return new Set();

  if (!Array.isArray(value)) {
    throw new TypeError(`Argument "settings.${name}" must be an array`);
  }

  const set = new Set();

  for (let i = 0; i < value.length; i++) {
    const val = value[i];

    if (typeof val !== 'string') {
      throw new TypeError(`Argument "settings.${name} must contain strings`);
    }

    set.add(val);
  }

  return set;
}


class Strategy {

  constructor(settings) {
    if (!elv(settings)) {
      throw new TypeError(msg.argSettingsRequired);
    }

    if (typeof settings !== 'object') {
      throw new TypeError(msg.argSettingsObj);
    }

    this.allow = createTargetSet(settings.allow, 'allow');
    this.deny = createTargetSet(settings.deny, 'deny');
    this.require = elv.coalesce(settings.require, () => []);

    if (this.allow.size > 0 && this.deny.size > 0) {
      throw new TypeError(msg.argSettingsAllowDeny);
    }
  }

}


module.exports = Strategy;
