'use strict'

const multihashing = require('multihashing-async')

exports = module.exports

// Hash is the global IPFS hash function.
// Uses multihash SHA2_256, 256 bits as the default
exports.hash = (data, fn, callback) => {
  if (!fn) {
    fn = 'sha2-256'
  }

  return multihashing(data, fn, callback)
}
