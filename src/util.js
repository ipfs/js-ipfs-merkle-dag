'use strict'

const multihashing = require('multihashing')

exports = module.exports

// Hash is the global IPFS hash function.
// Uses multihash SHA2_256, 256 bits as the default
exports.hash = (data, fn) => {
  if (!fn) {
    fn = 'sha2-256'
  }

  return multihashing(data, fn)
}
