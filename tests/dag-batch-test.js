'use strict'

const expect = require('chai').expect
const DAGLink = require('../src/dag-node').DAGLink
const DAGNode = require('../src/dag-node').DAGNode
const DAGService= require('../src/dag-service')
const DAGBatchStream= require('../src/dag-stream').BatchStream
const DAGBatch= require('../src/dag-service-batch')
const BlockService = require('ipfs-blocks').BlockService
const IPFSRepo = require('ipfs-repo')
const async = require('async')

describe('dag-batch',() => {
  var repo
  var blockService
  var dagService

  before(() => {
    repo = new IPFSRepo(process.env.IPFS_PATH)
    blockService = new BlockService(repo)
    dagService = new DAGService(blockService)
  })
  it('add three nodes to a batch',() => {
    const node1 = new DAGNode(new Buffer('1'))
    const node2 = new DAGNode(new Buffer('2'))
    const node3 = new DAGNode(new Buffer('3'))
    const batch = new DAGBatch(dagService, 8 * 8 * 10)

    async.series([
      (cb) => { node2.addNodeLink('', node3); cb() },
      (cb) => { node1.addNodeLink('', node2); cb() },
      (cb) => { batch.add(node1,cb) },
      (cb) => { batch.add(node2, cb) },
      (cb) => { batch.add(node3, cb) },
      (cb) => { batch.commit(cb) },
      (cb) => {
        dagService.getRecursive(node1.multihash(), (err, nodes) => {
          expect(err).to.not.exist
          expect(nodes.length).to.equal(3)
          cb()
        })
      }
    ], (err) => {
      expect(err).to.not.exist
      done()
    })
  })
  it('add three nodes to a batchStream',() => {
    const node4 = new DAGNode(new Buffer('4'))
    const node5 = new DAGNode(new Buffer('5'))
    const node6 = new DAGNode(new Buffer('6'))
    const batchStream = new DAGBatchStream(dagService, 8 * 8 * 10)

    async.series([
      (cb) => { node5.addNodeLink('', node6); cb() },
      (cb) => { node4.addNodeLink('', node5); cb() },
      (cb) => { batchStream.write(node4,cb) },
      (cb) => { batchStream.write(node5,cb) },
      (cb) => { batchStream.write(node6,cb) },
      (cb) => { batchStream.end(cb) },
      (cb) => {
        dagService.getRecursive(node4.multihash(), (err, nodes) => {
          expect(err).to.not.exist
          expect(nodes.length).to.equal(3)
          cb()
        })
      }
    ], (err) => {
      expect(err).to.not.exist
      done()
    })
  })

})