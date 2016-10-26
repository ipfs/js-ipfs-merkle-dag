'use strict'

const protobuf = require('protocol-buffers')
const stable = require('stable')
const mh = require('multihashes')
const parallel = require('async/parallel')

const util = require('./util')
const DAGLink = require('./dag-link')

const proto = protobuf(require('./merkledag.proto'))

function linkSort (a, b) {
  return (new Buffer(a.name || '', 'ascii').compare(new Buffer(b.name || '', 'ascii')))
}

// Helper method to get a protobuf object equivalent
function toProtoBuf (node) {
  const pbn = {}

  if (node.data && node.data.length > 0) {
    pbn.Data = node.data
  } else {
    pbn.Data = null // new Buffer(0)
  }

  if (node.links.length > 0) {
    pbn.Links = node.links.map((link) => {
      return {
        Hash: link.hash,
        Name: link.name,
        Tsize: link.size
      }
    })
  } else {
    pbn.Links = null
  }

  return pbn
}

module.exports = class DAGNode {
  constructor (data, links) {
    this._cached = null
    this._encoded = null

    this.data = data
    this.links = []

    // ensure links are instances of DAGLink
    if (links) {
      links.forEach((l) => {
        if (l.constructor && l.constructor.name === 'DAGLink') {
          this.links.push(l)
        } else {
          this.links.push(
            new DAGLink(l.Name, l.Size, l.Hash)
          )
        }
      })

      stable.inplace(this.links, linkSort)
    }
  }

  // copy - returns a clone of the DAGNode
  copy () {
    const clone = new DAGNode()
    if (this.data && this.data.length > 0) {
      const buf = new Buffer(this.data.length)
      this.data.copy(buf)
      clone.data = buf
    }

    if (this.links.length > 0) {
      clone.links = this.links.slice()
    }

    return clone
  }

  // addNodeLink - adds a DAGLink to this node that points to node by a name
  addNodeLink (name, node, callback) {
    if (typeof name !== 'string') {
      callback(new Error('first argument must be link name'))
    }

    this.makeLink(node, (err, link) => {
      if (err) {
        return callback(err)
      }

      link.name = name
      this.addRawLink(link)
      callback()
    })
  }

  // addRawLink adds a Link to this node from a DAGLink
  addRawLink (link) {
    this._encoded = null
    this.links.push(new DAGLink(link.name, link.size, link.hash))
    stable.inplace(this.links, linkSort)
  }

  // UpdateNodeLink return a copy of the node with the link name set to point to
  // that. If a link of the same name existed, it is replaced.
  // TODO this would make more sense as an utility
  updateNodeLink (name, node, callback) {
    const newnode = this.copy()
    newnode.removeNodeLink(name)
    newnode.addNodeLink(name, node, (err) => {
      if (err) {
        return callback(err)
      }

      callback(null, newnode)
    })
  }

  // removeNodeLink removes a Link from this node based on name
  removeNodeLink (name) {
    this._encoded = null // uncache
    this.links = this.links.filter((link) => link.name !== name)
  }

  // removeNodeLink removes a Link from this node based on a multihash
  removeNodeLinkByHash (multihash) {
    this._encoded = null // uncache
    this.links = this.links.filter((link) => !link.hash.equals(multihash))
  }

  // makeLink returns a DAGLink node from a DAGNode
  // TODO: this would make more sense as an utility
  makeLink (node, callback) {
    parallel([
      (cb) => node.size(cb),
      (cb) => node.multihash(cb)
    ], (err, res) => {
      if (err) {
        return callback(err)
      }
      callback(null, new DAGLink(null, res[0], res[1]))
    })
  }

  // multihash - returns the multihash value of this DAGNode
  multihash (fn, callback) {
    if (typeof fn === 'function') {
      callback = fn
      fn = undefined
    }

    this.encoded(fn, (err) => {
      if (err) {
        return callback(err)
      }

      callback(null, this._cached)
    })
  }

  // Size returns the total size of the data addressed by node,
  // including the total sizes of references.
  size (callback) {
    this.encoded((err, buf) => {
      if (err) {
        return callback(err)
      }

      if (!buf) {
        return callback(null, 0)
      }

      callback(null, this.links.reduce((sum, l) => sum + l.size, buf.length))
    })
  }

  // Encoded returns the encoded raw data version of a Node instance.
  // It may use a cached encoded version, unless the force flag is given.
  encoded (fn, force, callback) {
    if (typeof force === 'function') {
      callback = force
      force = undefined
    }

    if (typeof fn === 'function') {
      callback = fn
      fn = undefined
    }

    if (typeof fn === 'boolean') {
      force = fn
      fn = undefined
    }

    if (force || !this._encoded) {
      this._encoded = this.marshal()

      if (this._encoded) {
        util.hash(this._encoded, fn, (err, digest) => {
          if (err) {
            return callback(err)
          }
          this._cached = digest
          callback(null, this._encoded)
        })
        return
      }
    }

    callback(null, this._encoded)
  }

  // marshal - encodes the DAGNode into a probuf
  marshal () {
    return proto.PBNode.encode(toProtoBuf(this))
  }

  // unMarshal - decodes a protobuf into a DAGNode
  // TODO: this would make more sense as an utility
  unMarshal (data) {
    const pbn = proto.PBNode.decode(data)
    this.links = pbn.Links.map((link) => {
      return new DAGLink(link.Name, link.Tsize, link.Hash)
    })

    stable.inplace(this.links, linkSort)
    this.data = pbn.Data || new Buffer(0)
    return this
  }

  toJSON (callback) {
    parallel([
      (cb) => this.size(cb),
      (cb) => this.multihash(cb)
    ], (err, results) => {
      if (err) {
        return callback(err)
      }

      callback(null, {
        Data: this.data,
        Links: this.links.map((l) => l.toJSON()),
        Hash: mh.toB58String(results[1]),
        Size: results[0]
      })
    })
  }

  toString () {
    return `DAGNode <data: "${this.data.toString()}", links: ${this.links.length}>`
  }
}
