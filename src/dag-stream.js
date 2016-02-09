'use strict'
const Writable = require('stream').Writable;
const util = require('util');
const Batch = require('./dag-service-batch')

exports = module.exports.BatchStream = BatchStream

// BatchStream is to defer writes
function BatchStream (ds, max, options) {
  if (!(this instanceof BatchStream
))
  {
    return new BatchStream(ds, max)
  }
  Writable.call(this, options);

  this.batch = new Batch(ds, max)
  this._write = (chunk, enc, cb) => {
    this.batch.add(chunnk, cb)
  }
  this.end= (cb)=>  {
    this._super.prototype.end.apply(this)
    this.batch.commit(cb)
  }
}

util.inherits(BatchStream, Writable);
