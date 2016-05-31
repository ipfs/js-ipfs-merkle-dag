'use strict'

const Block = require('ipfs-block')
const isIPFS = require('is-ipfs')
const mh = require('multihashes')

const DAGNode = require('./dag-node')

module.exports = class DAGService {
  constructor (blockService) {
    if (!blockService) {
      throw new Error('DAGService requires a BlockService instance')
    }

    this.bs = blockService
  }

  // add a DAGNode to the service, storing it on the block service
  add (node, callback) {
    this.bs.addBlock(new Block(node.encoded()), callback)
  }

  // DEPRECATED - https://github.com/ipfs/go-ipfs/issues/2262
  // this.addRecursive

  // get retrieves a DAGNode, using the Block Service
  get (multihash, callback) {
    this.getMany([multihash], (err, results) => {
      if (err) {
        return callback(err)
      }

      const key = Object.keys(results)[0]

      if (results[key].error) {
        return callback(results[key].error)
      }

      callback(null, results[key])
    })
  }

  getMany (mhs, callback) {
    let err = false
    const list = mhs.map((m) => {
      const isMhash = isIPFS.multihash(m)
      const isPath = isIPFS.path(m)

      if (!isMhash && !isPath) {
        err = true
        callback(new Error('Invalid Key'))
        return
      }
      if (isMhash) return m
      if (isPath) return m.replace('/ipfs/', '')
    })

    if (err) return

    this.getWithMany(list, callback)
  }

  getWith (key, callback) {
    this.getWithMany([key], (err, results) => {
      if (err) {
        return callback(err)
      }

      const key = Object.keys(results)[0]

      if (results[key].error) {
        return callback(results[key].error)
      }

      callback(null, results[key].block)
    })
  }

  getWithMany (keys, callback) {
    this.bs.getBlocks(keys.map((key) => {
      if (Buffer.isBuffer(key)) {
        return key
      }
      return mh.fromB58String(key)
    }), (err, raw) => {
      if (err) return callback(err)

      const results = {}
      Object.keys(raw).forEach((key) => {
        if (raw[key].error) {
          return callback(raw[key].error)
        }

        const node = new DAGNode()
        node.unMarshal(raw[key].block.data)
        results[key] = node
      })

      callback(null, results)
    })
  }

  // getRecursive fetches a node and all of the nodes on its links recursively
  // TODO add depth param
  getRecursive (multihash, callback, linkStack, nodeStack) {
    this.get(multihash, (err, node) => {
      if (err && nodeStack.length > 0) {
        return callback(new Error('Could not complete the recursive get'), nodeStack)
      }
      if (err) {
        return callback(err)
      }

      if (!linkStack) { linkStack = [] }
      if (!nodeStack) { nodeStack = [] }

      nodeStack.push(node)

      const keys = node.links.map((link) => {
        return link.hash
      })

      linkStack = linkStack.concat(keys)

      const next = linkStack.pop()

      if (next) {
        this.getRecursive(next, callback, linkStack, nodeStack)
      } else {
        const compare = (hash) => (node) => {
          node.multihash().equals(hash)
        }

        let link
        for (let k = 0; k < nodeStack.length; k++) {
          const current = nodeStack[k]
          for (let j = 0; j < current.links.length; j++) {
            link = current.links[j]
            const index = nodeStack.findIndex(compare(link.hash))
            if (index !== -1) {
              link.node = nodeStack[index]
            }
          }
        }
        return callback(null, nodeStack)
      }
    })
  }

  // remove deletes a node with given multihash from the blockService
  remove (multihash, cb) {
    if (!multihash) {
      return cb(new Error('Invalid multihash'))
    }

    this.bs.deleteBlock(multihash, cb)
  }

  // DEPRECATED - https://github.com/ipfs/go-ipfs/issues/2262
  // this.removeRecursive = (key, callback) => { }
}
