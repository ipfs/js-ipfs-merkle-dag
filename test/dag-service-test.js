/* eslint-env mocha */
'use strict'
const expect = require('chai').expect
const DAGNode = require('../src').DAGNode
const DAGService = require('../src').DAGService

const BlockService = require('ipfs-block-service')
const bs58 = require('bs58')
const series = require('async/series')
const parallel = require('async/parallel')
const waterfall = require('async/waterfall')
const pull = require('pull-stream')
const mh = require('multihashes')

module.exports = (repo) => {
  describe('DAGService', () => {
    const bs = new BlockService(repo)
    const dagService = new DAGService(bs)

    it('add a mdag node', (done) => {
      const node = new DAGNode(new Buffer('data data data'))

      pull(
        pull.values([node]),
        dagService.putStream(done)
      )
    })

    it('get a mdag node from base58 encoded string', (done) => {
      var encodedMh = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'

      pull(
        dagService.getStream(encodedMh),
        pull.collect((err, res) => {
          expect(err).to.not.exist
          expect(
            res[0].data
          ).to.deep.equal(
            new Buffer(bs58.decode('cL'))
          )
          // just picking the second link and comparing mhash
          // buffer to expected
          expect(
            res[0].links[1].hash
          ).to.be.eql(
            mh.fromB58String('QmYCvbfNbCwFR45HiNP45rwJgvatpiW38D961L5qAhUM5Y')
          )
          done()
        })
      )
    })

    it('get a mdag node from a multihash buffer', (done) => {
      const hash = mh.fromB58String('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')

      pull(
        dagService.getStream(hash),
        pull.collect((err, res) => {
          expect(err).to.not.exist
          expect(
            res[0].data
          ).to.be.eql(
            new Buffer(bs58.decode('cL'))
          )
          expect(
            res[0].links[1].hash
          ).to.be.eql(
            mh.fromB58String('QmYCvbfNbCwFR45HiNP45rwJgvatpiW38D961L5qAhUM5Y')
          )
          done()
        })
      )
    })

    it('get a mdag node from a /ipfs/ path', (done) => {
      const ipfsPath = '/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'

      pull(
        dagService.getStream(ipfsPath),
        pull.collect((err, res) => {
          expect(err).to.not.exist
          expect(
            res[0].data
          ).to.be.eql(
            new Buffer(bs58.decode('cL'))
          )
          expect(
            res[0].links[1].hash
          ).to.be.eql(
            mh.fromB58String('QmYCvbfNbCwFR45HiNP45rwJgvatpiW38D961L5qAhUM5Y')
          )
          done()
        })
      )
    })

    it('supply an improperly formatted string path', (done) => {
      pull(
        dagService.getStream('/ipfs/bad path'),
        pull.onEnd((err) => {
          expect(err.toString()).to.be.eql('Error: Invalid Key')
          done()
        })
      )
    })

    it('supply improperly formatted multihash buffer', (done) => {
      pull(
        dagService.getStream(new Buffer('bad path')),
        pull.onEnd((err) => {
          expect(err.toString()).to.be.eql('Error: Invalid Key')
          done()
        })
      )
    })

    it('supply something weird', (done) => {
      pull(
        dagService.getStream(3),
        pull.onEnd((err) => {
          expect(err.toString()).to.be.eql('Error: Invalid Key')
          done()
        })
      )
    })

    it('get a dag recursively', (done) => {
      // 1 -> 2 -> 3
      const node1 = new DAGNode(new Buffer('1'))
      const node2 = new DAGNode(new Buffer('2'))
      const node3 = new DAGNode(new Buffer('3'))

      parallel([
        (cb) => node2.addNodeLink('', node3, cb),
        (cb) => node1.addNodeLink('', node2, cb),
        (cb) => node1.multihash(cb)
      ], (err, res) => {
        expect(err).to.not.exist
        const multihash1 = res[2]
        pull(
          pull.values([node1, node2, node3]),
          dagService.putStream((err) => {
            if (err) return done(err)

            dagService.getRecursive(multihash1, (err, nodes) => {
              if (err) return done(err)
              expect(nodes.length).to.equal(3)
              done()
            })
          })
        )
      })
    })

    it('get a dag recursively (stream)', (done) => {
      // 1 -> 2 -> 3
      const node1 = new DAGNode(new Buffer('1'))
      const node2 = new DAGNode(new Buffer('2'))
      const node3 = new DAGNode(new Buffer('3'))

      parallel([
        (cb) => node2.addNodeLink('', node3, cb),
        (cb) => node1.addNodeLink('', node2, cb),
        (cb) => node1.multihash(cb)
      ], (err, res) => {
        expect(err).to.not.exist
        const multihash1 = res[2]
        pull(
          pull.values([node1, node2, node3]),
          dagService.putStream((err) => {
            if (err) return done(err)
            pull(
              dagService.getRecursiveStream(multihash1),
              pull.collect((err, nodes) => {
                if (err) return done(err)
                expect(nodes.length).to.equal(3)
                done()
              })
            )
          })
        )
      })
    })

    it('remove', (done) => {
      const node = new DAGNode(new Buffer('not going to live enough'))

      node.multihash((err, digest) => {
        expect(err).to.not.exist
        series([
          (cb) => dagService.put(node, cb),
          (cb) => dagService.get(digest, cb),
          (cb) => dagService.remove(digest, cb),
          (cb) => dagService.get(digest, (err) => {
            expect(err).to.exist
            cb()
          })
        ], done)
      })
    })

    // tests to see if we are doing the encoding well
    it('cycle test', (done) => {
      const dftHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
      const hash = mh.fromB58String(dftHash)

      dagService.get(hash, (err, node) => {
        expect(err).to.not.exist

        let cn

        waterfall([
          (cb) => node.multihash(cb),
          (digest, cb) => {
            expect(hash).to.be.eql(digest)

            const n = new DAGNode(node.data, node.links)
            cn = n.copy()

            cn.multihash(cb)
          },
          (digest, cb) => {
            expect(hash).to.be.eql(digest)
            dagService.put(cn, cb)
          },
          (cb) => dagService.get(hash, cb),
          (nodeB, cb) => {
            expect(nodeB.data).to.be.eql(node.data)
            expect(nodeB.links.length).to.equal(node.links.length)
            expect(nodeB.data).to.be.eql(new Buffer('\u0008\u0001'))
            cb()
          }
        ], done)
      })
    })

    it('get a broken dag recursively', (done) => {
      // 1 -> 2 -> 3
      const node1 = new DAGNode(new Buffer('a'))
      const node2 = new DAGNode(new Buffer('b'))
      const node3 = new DAGNode(new Buffer('c'))

      series([
        (cb) => node2.addNodeLink('', node3, cb),
        (cb) => node1.addNodeLink('', node2, cb),
        (cb) => dagService.put(node1, cb),
        // on purpose, do not add node2
        // (cb) => dagService.put(node2, cb),
        (cb) => dagService.put(node3, cb),
        (cb) => pull(
          pull.values([node1]),
          pull.asyncMap((n, cb) => n.multihash(cb)),
          pull.map((digest) => dagService.getRecursiveStream(digest)),
          pull.flatten(),
          pull.collect((err, nodes) => {
            if (err) return cb(err)
            expect(nodes.length).to.equal(1)
            cb()
          })
        )
      ], done)
    })

    it('get a node with unnamed links', (done) => {
      var b58MH = 'QmRR6dokkN7dZzNZUuqqvUGWbuwvXkavWC6dJY3nT17Joc'
      waterfall([
        (cb) => dagService.get(b58MH, cb),
        (node, cb) => node.toJSON(cb),
        (json, cb) => {
          expect(json.Links).to.deep.equal([{
            Name: '',
            Size: 45623854,
            Hash: 'QmREcKL7eXVme1ZmedsBYwLUnYmqYt3QyeJfthnp1SGo3z'
          }, {
            Name: '',
            Size: 41485691,
            Hash: 'QmWEpWQA5mJL6KzRzGqL6RCsFhLCWmovx6wHji7BzA8qmi'
          }])
          cb()
        }
      ], done)
    })
  })
}
