# spleen-elasticsearch

The [`spleen`](https://www.npmjs.com/package/spleen) module provides high-level abstractions for dynamic filters.  This module will convert a `spleen` [`Filter`](https://www.npmjs.com/package/spleen#class-filter) into an [Elasticsearch Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html) object..

__Contents__
* [Usage](#usage)
* [API](#api)
* [Conversion Behavior](#conversion-behavior)
* [Mapping Considerations](#mapping-considerations)

## Usage

Add `spleen-elasticsearch` to your `package.json` file's `dependencies`:

```sh
$ npm install spleen-elasticsearch -S
```

Then use it in your code:

```js
const spelastic = require('spleen-elasticsearch');
const spleen = require('spleen');

const filter = spleen.parse('/foo/bar eq 42 and /baz in [1,2,3] or /qux gt 0');
const result = spelastic.convert(filter);

console.log(result);
// {
//   "value": {
//     "filter": {
//       "bool": {
//         "should": [
//           {
//             "bool": {
//               "must": [
//                 {
//                   "term": { "foo.bar": 42 }
//                 },
//                 {
//                   "terms": "baz": [1, 2, 3]
//                 }
//               ]
//             }
//           },
//           {
//             "range": {
//               "qux": { "gt": 0 }
//             }
//           }
//         ]
//       }
//     }
//   }
// }
```

## API

The `spleen-elasticsearch` module provides the following interface:

* __Properties__

  + `errors`: an object that contains references to the various possible errors thrown by `spleen-elasticsearch`.  This object has the following keys:

    - `ConvertError`: a general error thrown when `spleen-elasticsearch` is unable to convert a given `Filter` instance into a Query DSL object.  This should generally never happen, and is here as a safeguard in the event a `Filter` instance is corrupted.

    - `DeniedFieldError`: thrown when a field is encountered that has been explicitly black-listed by the `deny` option.

    - `InvalidTargetError`: thrown if a target is encountered with an invalid format.  For example, if a segment of the path contains disallowed characters.

    - `NonallowedFieldError`: thrown when a field is encountered that not been white-listed by the `allow` option.

    - `RequiredFieldError`: thrown when a field that has been required by the `require` option is not present in the given `Filter`.

  + `Strategy`: a reference to the [`Strategy`](#class-strategy) class.

* __Methods__

  + `convert(filter [, strategy])`: converts an instance of `spleen`'s `Filter`' class into an Elasticsearch Query DSL object.

    _Parameters_

    - `filter`: _(required)_ the instance of `Filter` to convert.

    - `strategy`: _(optional)_ an instance of `Strategy`.

    This method returns an object with the following key:

    - `fields`: an array containing all of the fields (in [RFC 6901 JSON pointer](https://tools.ietf.org/html/rfc6901) format) included in the filter.

    - `value`: a string containing the N1QL filter statement.

### Class: `Strategy`

Compiles a `spleen` to Elasticsearch Query DSL conversion strategy, which is easily read by the `convert()` method.

* `new Strategy(settings)`

  Creates a new instance of `Strategy`.

  _Parameters_

  + `settings`: _(required)_ an object that controls various aspects of the conversion process.  This object can have the keys:

    - `allow`: _(optional)_ an array of RFC 6901 JSON pointer strings that are allowed to be in a `Filter`'s list of targets.  Any targets in a `Filter` instance not found in the `allow` or `require` lists will result in an error being thrown.  This list functions as a white list, and can only be present if `deny` is absent.  An empty array is the logical equivalent of the `allow` key being absent.

    - `deny`: _(optional)_ an array of RFC 6901 JSON pointer strings that are not allowed to be in a `Filter`'s list of targets.  Any targets in a `Filter` instance found in this list will result in an error being thrown.  This list functions as a black list, and can only be present if `allow` is absent.

    - `discriminator`: _(optional)_ an object that configures a discriminator field, which is used for determining the Elasticsearch type to query at runtime.  This feature works similarly to discriminator columns found in RDBMS table designs that utilize inheritance.  If you do not wish to assign a discriminator leave this key `null` or `undefined`.  This object has the following keys:

      - `target`: _(optional)_ an RFC 6901 JSON pointer string that specifies a target field to use as the discriminator.

      - `map`: _(optional)_ an object whose keys are possible values for the discriminator field, and the value is the name of an Elasticsearch type.  The value of a discriminator must be a string or number.

    - `require`: _(optional)_ an array of RFC 6901 JSON pointer strings that are required to be in a `Filter`'s list of targets (`Filter.prototype.targets`).  If a required target is missing, an error is thrown.

## Conversion Behavior

A `spleen` filter is essentially an Boolean algebraic expression (`AND`, `OR`, `NOT`), and answers questions in a binary fashion — either _yes_ or _no_.  This contrasts with Elasticsearch's probabilistic matching, which generates a score representing the likelihood of a match.  While Elasticsearch's Query DSL (EQD) provides methods for executing queries using Boolean algebra, there are some limitations.

It is worth noting that `spleen` filters converted using `spleen-elasticsearch` are designed to answer questions about filtering in a binary fashion, and, so, none of Elasticsearch's fuzzy and probabilistic matching features.  Thus, a converted `spleen` filter is nested in a `filter`, and all clauses are represented as a `bool` query.

### `AND`s, `OR`s, and `NOT`s

The EQD does not include `AND`, `OR`, or `NOT` operators.  Instead, we are provided with `must`, `should`, and `must_not`.  The challenge is converting `spleen.Filter` instance while preserving its Boolean logic.  To do this, the `spleen-elasticsearch` module follows a few rules:

1. The `AND` operator is given precedence over `OR`.

2. Clauses chained together with `AND` are treated as a single group, with `OR` being the delimiter between groups.

3. All clauses in an `AND` group are nested in a `must`.

4. If there is more than one `AND` group in the filter, then all `must` queries are nested in a `should`.

### Operators

Under the hood, Elasticsearch is utilizing the [Apache Lucene](https://lucene.apache.org/core/) project to create and query indexes.  Lucene does not have a concept of comparison operators.  Searching Lucene indexes using different kinds of comparisons translate into different types of queries.  Elasticsearch's Query DSL provides a high level abstraction of Lucene query types, and different `spleen` operators must be translated accordingly.

| Operator   | Elasticsearch Query DSL                                          |
| ---------- | ---------------------------------------------------------------- |
| `eq`       | `{ "term": { "key": "value" } }`                                 |
| `neq`      | `{ "bool": { "must_not": { "term": { "key": "value" } } } }`     |
| `gt`       | `{ "range": { "key": { "gt": "value" } } }`                      |
| `gte`      | `{ "range": { "key": { "gte": "value" } } }`                     |
| `lt`       | `{ "range": { "key": { "lt": "value" } } }`                      |
| `lte`      | `{ "range": { "key": { "lte": "value" } } }`                     |
| `between`  | `{ "range": { "key": { "gte": "value1", "lte": "value2" } } }`   |
| `nbetween` | `{ "bool": { "must_not": { "range": { "key": { "gte": "value1", "lte": "value2" } } } } }` |
| `in`       | `{ "terms": { "key": ["value1", "value2", "valueN"] } }`         |
| `nin`      | `{ "bool": { "must_not": { "terms": { "key": ["value1", "value2", "valueN"] } } } }` |
| `like`     | `{ "regexp": { "key": "like value converted to regex" } }` |
| `nlike`    | `{ "bool": { "must_not": { "regexp": { "key": "like value converted to regex" } } } }` |

### Pattern Matching Conversion to Regex

Elasticsearch can perform pattern matching usig regular expressions.  The `spleen-elasticsearch` module converts `like` patterns to regex in the following way.

| `like` Char | Regex Operator |
| ----------- | -------------- |
| `*`         | `.*`           |
| `_`         | `.{1}`         |

All `like` statements converted to regex begin with `^` and `$`.  For example, the `like` pattern `*Hello World_` is converted into the regex `.*Hello World.{1}`.

### Range Comparisons

Elasticsearch's Query DSL does not support queries where the document property is evaluated on to the right of a literal value (i.e. `42 gt /foo`).  In cases where `gt`, `gte`, `lt`, or `lte` comparisons are performed with the target on the right and the literal on the left, the operator used in the Elasticsearch Query DSL `range` query is inverted (`gt` is replaced with `lt`, `gte` is replaced with `lte`, or visa versa).

### Handling `nil` Literals

When a `spleen` filter includes a comparison between a target and a `nil` literal, the `exists` query DSL is used.  The `spleen` expression dialect allows for a variety of operators to be used when comparing against a `nil`.  Different operators result in different Elasticsearch Query DSL...

| Operator   | Elasticsearch Query DSL                                        |
| ---------- | -------------------------------------------------------------- |
| `eq nil`   | `{ "bool": { "must_not": { "exists": { "field": "key" } } } }` |
| `neq nil`  | `{ "exists": { "field": "key" } }`                             |
| `gt nil`   | `{ "exists": { "field": "key" } }`                             |
| `gte nil`  | `{ "exists": { "field": "key" } }`                             |
| `lt nil`   | `{ "bool": { "must_not": { "exists": { "field": "key" } } } }` |
| `lte nil`  | `{ "bool": { "must_not": { "exists": { "field": "key" } } } }` |

### Comparing Two Properties/Literals

Comparison between properties on a document does not exist as a first-class citizen in Elasticsearch Query DSL.  However, it is possible using `script` queries.  Thus, clauses that are a comparison between two targets will be translated to a `script` query.

For example, the `spleen` expression...

```
/foo eq /bar
```

...is translated to...

```json
{
  "script": {
    "script": "doc['foo'].value == doc['bar'].value"
  }
}
```

Though not a typical use case, comparisons between two literal values are handled the same way.

## Mapping Considerations

In order for `spleen` filters to work properly when converted into Elasticsearch's Query DSL there are a couple of things to consider when creating index mappings.

### String Properties

Because `spleen-elasticsearch` uses `term` and `terms` for comparisons, Elasticsearch will attempt to make exact comparisons of values in its inverted index.  Document property mappings of type `text` are "analyzed," and the entire value of a property may not be in the index.  For example, _stopwords_ and most punctuation will not be indexed.   For this reason it is recommended that you map string values as `keyword` for indexes you intend to run converted `spleen` filters against.

### Referencing Array Values by Index

In a future release, support for referencing array items by index will be added.  In order to make this possible, you will need to create a computed property mapping using the [`token_count`](https://www.elastic.co/guide/en/elasticsearch/reference/current/token-count.html).
