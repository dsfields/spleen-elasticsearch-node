'use strict';

const {
  Clause,
  Filter,
  Like,
  Range,
  Target,
} = require('spleen');

const errors = require('./errors');
const Strategy = require('./strategy');


const msg = {
  argFilter: 'Argument "filter" must be an instance of spleen.Filter',
  argStrategy: 'Argument "strategy" must be an instance of Strategy',
};


const invalidTarget = /["{};,[\]:()'*>#~@&%?`]|-{2,}/;
const defaultStrategy = new Strategy({});


function not(dsl) {
  return { bool: { must_not: dsl } };
}


function scriptOperator(operator) {
  switch (operator.type) {
    case 'eq':
      return '==';

    case 'neq':
      return '!=';

    case 'gt':
      return '>';

    case 'gte':
      return '>=';

    case 'lt':
      return '<';

    case 'lte':
      return '<=';

    default:
      throw new errors.ConvertError();
  }
}


function scriptLiterals(clause) {
  const op = scriptOperator(clause.operator);
  return {
    script: {
      script: {
        source: `params.subject ${op} params.object`,
        params: {
          subject: clause.subject,
          object: clause.object,
        },
      },
    },
  };
}


function normalizeClause(clause) {
  if (clause.object instanceof Target) {
    const newClause = {
      subject: clause.object,
      operator: '',
      object: clause.subject,
    };

    switch (clause.operator.type) {
      case 'gt':
        newClause.operator = { type: 'lt' };
        break;

      case 'gte':
        newClause.operator = { type: 'lte' };
        break;

      case 'lt':
        newClause.operator = { type: 'gt' };
        break;

      case 'lte':
        newClause.operator = { type: 'gte' };
        break;

      default:
        newClause.operator = clause.operator;
        break;
    }

    return newClause;
  }

  return clause;
}


class Builder {

  constructor(filter, strategy) {
    if (!(filter instanceof Filter)) throw new TypeError(msg.argFilter);
    if (!(strategy instanceof Strategy)) throw new TypeError(msg.argStrategy);

    this._filter = filter;
    this._strategy = strategy;
    this._fields = new Set();
    this.fields = [];
    this.value = {};
  }


  _scriptTargets(clause) {
    const subject = this._target(clause.subject);
    const op = scriptOperator(clause.operator);
    const object = this._target(clause.object);
    return {
      script: {
        script: `doc['${subject}'].value ${op} doc['${object}'].value`,
      },
    };
  }


  _target(target) {
    const { allow, deny } = this._strategy;

    if (allow.size > 0 && !allow.has(target.field)) {
      throw new errors.NonallowedFieldError(target.field);
    }

    if (deny.size > 0 && deny.has(target.field)) {
      throw new errors.DeniedFieldError(target.field);
    }

    let val = '';

    for (let i = 0; i < target.path.length; i++) {
      let segment = target.path[i];

      if (typeof segment !== 'string') {
        segment = segment.toString();
      }

      if (invalidTarget.test(segment)) {
        throw new errors.InvalidTargetError(target);
      }

      if (val.length > 0) val += '.';

      val += segment;
    }

    if (!this._fields.has(target.field)) {
      this._fields.add(target.field);
      this.fields.push(target.field);
    }

    return val;
  }


  _comparison(clause) {
    const svo = {};
    svo[this._target(clause.subject)] = clause.object;
    return svo;
  }


  _exists(clause) {
    return { exists: { field: this._target(clause.subject) } };
  }


  _range(clause) {
    const predicate = {};
    predicate[clause.operator.type] = clause.object;

    const svo = {};
    svo[this._target(clause.subject)] = predicate;

    return { range: svo };
  }


  _eq(clause) {
    return (clause.object === null)
      ? not(this._exists(clause))
      : { term: this._comparison(clause) };
  }


  _neq(clause) {
    return (clause.object === null)
      ? this._exists(clause)
      : not(this._eq(clause));
  }


  _gt(clause) {
    return (clause.object === null)
      ? this._exists(clause)
      : this._range(clause);
  }


  _gte(clause) {
    return (clause.object === null)
      ? this._exists(clause)
      : this._range(clause);
  }


  _lt(clause) {
    return (clause.object === null)
      ? not(this._exists(clause))
      : this._range(clause);
  }


  _lte(clause) {
    return (clause.object === null)
      ? not(this._exists(clause))
      : this._range(clause);
  }


  _like(clause) {
    const like = clause.object;

    if (!(like instanceof Like) || typeof like.value !== 'string') {
      throw new errors.ConvertError();
    }

    let regex = like.toRegexString();
    // LIKE clauses in elastic do NOT
    if (regex.startsWith('^')) {
      regex = regex.slice(1);
    }
    if (regex.endsWith('$')) {
      regex = regex.slice(0, -1);
    }


    const svo = {};

    svo[this._target(clause.subject)] = regex;

    return { regexp: svo };
  }


  _nlike(clause) {
    return not(this._like(clause));
  }


  _between(clause) {
    const range = clause.object;

    if (!(range instanceof Range)) throw new errors.ConvertError();

    const svo = {};
    svo[this._target(clause.subject)] = {
      gte: range.lower,
      lte: range.upper,
    };

    return { range: svo };
  }


  _nbetween(clause) {
    return not(this._between(clause));
  }


  _in(clause) {
    if (!Array.isArray(clause.object)) throw new errors.ConvertError();
    return { terms: this._comparison(clause) };
  }


  _nin(clause) {
    return not(this._in(clause));
  }


  _build(filter) {
    const groups = [];
    const value = {
      bool: {},
    };

    let must = [];

    for (let i = 0; i < filter.statements.length; i++) {
      const statement = filter.statements[i];
      const sval = statement.value;

      if (statement.conjunctive === 'or' && must.length > 0) {
        groups.push({ bool: { must } });
        must = [];
      }

      if (sval instanceof Filter) {
        must.push(this._build(sval));
        continue;
      }

      if (!(sval instanceof Clause)) throw new errors.ConvertError();

      const subIsTarget = sval.subject instanceof Target;
      const objIsTarget = sval.object instanceof Target;

      if (subIsTarget && objIsTarget) {
        must.push(this._scriptTargets(sval));
        continue;
      }

      if (!subIsTarget && !objIsTarget) {
        must.push(scriptLiterals(sval));
        continue;
      }

      const clause = normalizeClause(statement.value);

      switch (clause.operator.type) {
        case 'eq':
          must.push(this._eq(clause));
          break;

        case 'neq':
          must.push(this._neq(clause));
          break;

        case 'gt':
          must.push(this._gt(clause));
          break;

        case 'gte':
          must.push(this._gte(clause));
          break;

        case 'lt':
          must.push(this._lt(clause));
          break;

        case 'lte':
          must.push(this._lte(clause));
          break;

        case 'like':
          must.push(this._like(clause));
          break;

        case 'nlike':
          must.push(this._nlike(clause));
          break;

        case 'between':
          must.push(this._between(clause));
          break;

        case 'nbetween':
          must.push(this._nbetween(clause));
          break;

        case 'in':
          must.push(this._in(clause));
          break;

        case 'nin':
          must.push(this._nin(clause));
          break;

        default:
          throw new errors.ConvertError(msg.unknownOp + sval.operator.type);
      }
    }

    if (groups.length === 0) {
      value.bool.must = must;
    } else {
      groups.push({ bool: { must } });
      value.bool.should = groups;
    }

    return value;
  }


  build() {
    this.value = {
      filter: this._build(this._filter),
    };
  }


  validate() {
    for (let i = 0; i < this._strategy.require.length; i++) {
      const req = this._strategy.require[i];

      if (!this._fields.has(req)) {
        throw new errors.RequiredFieldError(req);
      }
    }
  }

}


module.exports = function convert(filter, strategy = defaultStrategy) {
  const builder = new Builder(filter, strategy);
  builder.build();
  builder.validate();

  return {
    fields: builder.fields,
    value: builder.value,
  };
};
