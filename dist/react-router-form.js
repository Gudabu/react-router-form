/*!
 * react-router-form 1.0.0 (dev build at Wed, 08 Apr 2015 10:07:29 GMT) - https://github.com/insin/react-router-form
 * MIT Licensed
 */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ReactRouterForm = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var getFormData = require('get-form-data')
var React = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null)
var assign = require('react/lib/Object.assign')

/**
 * <Form> components are used to create a <form> element that submits its input
 * data to a route.
 *
 * For example, assuming you have the following route:
 *
 *   <Route name="addPost" path="/topics/:topicID/addPost" handler={AddPost}/>
 *
 * You could use the following component to submit a form's input data to that
 * route:
 *
 *   <Form to="addPost" params={{ topicID: "123" }}>
 */
var Form = React.createClass({

  displayName: 'Form',

  contextTypes: {
    router: React.PropTypes.func
  },

  propTypes: {
    component: React.PropTypes.any,
    to: React.PropTypes.string.isRequired,
    params: React.PropTypes.object,
    query: React.PropTypes.object,
    onSubmit: React.PropTypes.func
  },

  getDefaultProps:function() {
    return {
      component: 'form',
      method: 'GET'
    }
  },

  handleSubmit:function(event) {
    var formData = getFormData(event.target)
    var allowTransition = true
    var submitResult

    if (this.props.onSubmit) {
      submitResult = this.props.onSubmit(event, formData)
    }

    if (submitResult === false || event.defaultPrevented === true) {
      allowTransition = false
    }

    event.preventDefault()

    if (allowTransition) {
      if (this.props.method === 'GET') {
        // GET submissions use the query string, so just marge form data into it
        this.context.router.transitionTo(
          this.props.to,
          this.props.params,
          assign({}, this.props.query, formData)
        )
      }
      else {
        // HACK - add data to the query string along with a dummy method indicator
        this.context.router.transitionTo(
          this.props.to,
          this.props.params,
          assign({}, this.props.query, formData, {_method: this.props.method})
        )
      }
    }
  },

  /**
   * Returns the value of the "action" attribute to use on the DOM element.
   */
  getAction:function() {
    return this.context.router.makeHref(this.props.to, this.props.params, this.props.query)
  },

  render:function() {
    var props = assign({}, this.props, {
      action: this.getAction(),
      onSubmit: this.handleSubmit
    })

    return React.createElement(this.props.component, props, this.props.children)
  }
})

module.exports = Form
},{"get-form-data":2,"react/lib/Object.assign":3}],2:[function(require,module,exports){
'use strict';

var NODE_LIST_CLASSES = {
  '[object HTMLCollection]': true
, '[object NodeList]': true
, '[object RadioNodeList]': true
}

var IGNORED_INPUT_TYPES = {
  'button': true
, 'reset': true
, 'submit': true
, 'fieldset': true
}

var CHECKED_INPUT_TYPES = {
  'checkbox': true
, 'radio': true
}

var TRIM_RE = /^\s+|\s+$/g

var slice = Array.prototype.slice
var toString = Object.prototype.toString

/**
 * @param {HTMLFormElement} form
 * @return {Object.<string,(string|Array.<string>)>} an object containing
 *   submittable value(s) held in the form's .elements collection, with
 *   properties named as per element names or ids.
 */
function getFormData(form, options) {
  if (!form) {
    throw new Error('A form is required by getFormData, was given form=' + form)
  }

  if (!options) {
    options = {trim: false}
  }

  var data = {}
  var elementName
  var elementNames = []
  var elementNameLookup = {}

  // Get unique submittable element names for the form
  for (var i = 0, l = form.elements.length; i < l; i++) {
    var element = form.elements[i]
    if (IGNORED_INPUT_TYPES[element.type] || element.disabled) {
      continue
    }
    elementName = element.name || element.id
    if (!elementNameLookup[elementName]) {
      elementNames.push(elementName)
      elementNameLookup[elementName] = true
    }
  }

  // Extract element data name-by-name for consistent handling of special cases
  // around elements which contain multiple inputs.
  for (i = 0, l = elementNames.length; i < l; i++) {
    elementName = elementNames[i]
    var value = getNamedFormElementData(form, elementName, options)
    if (value != null) {
      data[elementName] = value
    }
  }

  return data
}

/**
 * @param {HTMLFormElement} form
 * @param {string} elementName
 * @return {(string|Array.<string>)} submittable value(s) in the form for a
 *   named element from its .elements collection, or null if there was no
 *   element with that name or the element had no submittable value(s).
 */
function getNamedFormElementData(form, elementName, options) {
  if (!form) {
    throw new Error('A form is required by getNamedFormElementData, was given form=' + form)
  }
  if (!elementName) {
    throw new Error('A form element name is required by getNamedFormElementData, was given elementName=' + elementName)
  }

  var element = form.elements[elementName]
  if (!element || element.disabled) {
    return null
  }

  var trim = !!(options && options.trim)

  if (!NODE_LIST_CLASSES[toString.call(element)]) {
    return getFormElementValue(element, trim)
  }

  // Deal with multiple form controls which have the same name
  var data = []
  var allRadios = true
  for (var i = 0, l = element.length; i < l; i++) {
    if (element[i].disabled) {
      continue
    }
    if (allRadios && element[i].type !== 'radio') {
      allRadios = false
    }
    var value = getFormElementValue(element[i], trim)
    if (value != null) {
      data = data.concat(value)
    }
  }

  // Special case for an element with multiple same-named inputs which were all
  // radio buttons: if there was a selected value, only return the value.
  if (allRadios && data.length === 1) {
    return data[0]
  }

  return (data.length > 0 ? data : null)
}

/**
 * @param {HTMLElement} element a form element.
 * @param {booleam} trim should values for text entry inputs be trimmed?
 * @return {(string|Array.<string>|File|Array.<File>)} the element's submittable
 *   value(s), or null if it had none.
 */
function getFormElementValue(element, trim) {
  var value = null

  if (element.type === 'select-one') {
    if (element.options.length) {
      value = element.options[element.selectedIndex].value
    }
    return value
  }

  if (element.type === 'select-multiple') {
    value = []
    for (var i = 0, l = element.options.length; i < l; i++) {
      if (element.options[i].selected) {
        value.push(element.options[i].value)
      }
    }
    if (value.length === 0) {
      value = null
    }
    return value
  }

  // If a file input doesn't have a files attribute, fall through to using its
  // value attribute.
  if (element.type === 'file' && 'files' in element) {
    if (element.multiple) {
      value = slice.call(element.files)
      if (value.length === 0) {
        value = null
      }
    }
    else {
      // Should be null if not present, according to the spec
      value = element.files[0]
    }
    return value
  }

  if (!CHECKED_INPUT_TYPES[element.type]) {
    value = (trim ? element.value.replace(TRIM_RE, '') : element.value)
  }
  else if (element.checked) {
    value = element.value
  }

  return value
}

getFormData.getNamedFormElementData = getNamedFormElementData

module.exports = getFormData
},{}],3:[function(require,module,exports){
/**
 * Copyright 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Object.assign
 */

// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign

'use strict';

function assign(target, sources) {
  if (target == null) {
    throw new TypeError('Object.assign target cannot be null or undefined');
  }

  var to = Object(target);
  var hasOwnProperty = Object.prototype.hasOwnProperty;

  for (var nextIndex = 1; nextIndex < arguments.length; nextIndex++) {
    var nextSource = arguments[nextIndex];
    if (nextSource == null) {
      continue;
    }

    var from = Object(nextSource);

    // We don't currently support accessors nor proxies. Therefore this
    // copy cannot throw. If we ever supported this then we must handle
    // exceptions and side-effects. We don't support symbols so they won't
    // be transferred.

    for (var key in from) {
      if (hasOwnProperty.call(from, key)) {
        to[key] = from[key];
      }
    }
  }

  return to;
}

module.exports = assign;

},{}]},{},[1])(1)
});