/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const DAGLink = require('../src').DAGLink
const DAGNode = require('../src').DAGNode

const BlockService = require('ipfs-block-service')
const Block = require('ipfs-block')
const bs58 = require('bs58')
const mh = require('multihashes')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')

module.exports = function (repo) {
  describe.only('DAGNode', function () {
    it('create a node', function (done) {
      const dagN = new DAGNode(new Buffer('some data'))
      expect(dagN.data.length > 0).to.equal(true)
      expect(Buffer.isBuffer(dagN.data)).to.equal(true)
      expect(dagN.data.equals(dagN.unMarshal(dagN.marshal()).data)).to.equal(true)

      dagN.size((err, size) => {
        expect(err).to.not.exist
        expect(size).to.be.above(0)
        done()
      })
    })

    it('create a node with links', (done) => {
      const l1 = [{
        Name: 'some link',
        Hash: 'QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39V',
        Size: 8
      }, {
        Name: 'some other link',
        Hash: 'QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR39U',
        Size: 10
      }]
      const d1 = new DAGNode(new Buffer('some data'), l1)

      d1.toJSON((err, json) => {
        expect(err).to.not.exist
        expect(json).to.be.eql({
          Data: new Buffer('some data'),
          Links: l1,
          Hash: 'QmRNwg6hP7nVUvhE4XWXsMt3SqDwHeh1kM6QtRybMWNDqN',
          Size: 137
        })

        const l2 = l1.map((l) => {
          return new DAGLink(l.Name, l.Size, l.Hash)
        })
        const d2 = new DAGNode(new Buffer('some data'), l2)
        d2.toJSON((err, json2) => {
          expect(err).to.not.exist
          expect(json).to.be.eql(json2)
          expect(d1.marshal()).to.be.eql(d2.marshal())
          expect(d2.links).to.be.eql(l2)
          done()
        })
      })
    })

    it('create an emtpy node', (done) => {
      const dagN = new DAGNode(new Buffer(0))
      expect(dagN.data.length).to.equal(0)
      expect(Buffer.isBuffer(dagN.data)).to.equal(true)
      dagN.size((err, size) => {
        expect(err).to.not.exist
        expect(size).to.equal(0)
        expect(dagN.data).to.be.eql(dagN.unMarshal(dagN.marshal()).data)
        done()
      })
    })

    describe('multihash', () => {
      it('defaults to sha2-256', (done) => {
        const node = new DAGNode(new Buffer('4444'))
        node.multihash((err, digest) => {
          expect(err).to.not.exist
          const res = mh.decode(digest)

          expect(res).to.have.property('name', 'sha2-256')
          done()
        })
      })

      it('can use a different hash function', (done) => {
        const node = new DAGNode(new Buffer('4444'))
        node.multihash('sha1', (err, digest) => {
          expect(err).to.not.exist
          const res = mh.decode(digest)

          expect(res).to.have.property('name', 'sha1')
          done()
        })
      })
    })

    it('create a link', function (done) {
      const buf = new Buffer('multihash of file.txt')
      const link = new DAGLink('file.txt', 10, buf)
      expect(link.name).to.equal('file.txt')
      expect(link.size).to.equal(10)
      expect(link.hash.equals(buf)).to.equal(true)
      done()
    })

    it('add a link to a node', function (done) {
      const dagNode1 = new DAGNode(new Buffer('4444'))
      const dagNode2 = new DAGNode(new Buffer('22'))

      parallel([
        (cb) => dagNode1.size(cb),
        (cb) => dagNode1.multihash(cb)
      ], (err, res) => {
        expect(err).to.not.exist
        const dagNode1Size = res[0]
        const dagNode1Multihash = res[1]

        dagNode1.addNodeLink('next', dagNode2, (err) => {
          expect(err).to.not.exist
          expect(dagNode1.links.length > 0).to.equal(true)

          parallel([
            (cb) => dagNode1.size(cb),
            (cb) => dagNode1.multihash(cb),
            (cb) => dagNode2.multihash(cb)
          ], (err, res) => {
            expect(err).to.not.exist
            expect(res[0]).to.be.above(dagNode1Size)
            expect(res[1]).to.not.be.eql(dagNode1Multihash)
            expect(dagNode1.links[0].hash).to.be.eql(res[2])

            dagNode1.removeNodeLink('next')
            expect(dagNode1.links.length).to.equal(0)

            done()
          })
        })
      })
    })

    it('add several links to a node', function (done) {
      const dagNode1 = new DAGNode(new Buffer('4444'))
      const dagNode2 = new DAGNode(new Buffer('22'))
      const dagNode3 = new DAGNode(new Buffer('333'))

      const dagNode1Size = dagNode1.size()
      const dagNode1Multihash = dagNode1.multihash()

      dagNode1.addNodeLink('next', dagNode2)
      expect(dagNode1.links.length > 0).to.equal(true)
      expect(dagNode1.size() > dagNode1Size).to.equal(true)

      dagNode1.addNodeLink('next', dagNode3)
      expect(dagNode1.links.length > 1).to.equal(true)
      expect(dagNode1.size() > dagNode1Size).to.equal(true)

      expect(dagNode1.multihash().equals(dagNode1Multihash)).to.equal(false)

      dagNode1.removeNodeLink('next')

      expect(dagNode1.multihash().equals(dagNode1Multihash)).to.equal(true)
      done()
    })

    it('remove link to a node by hash', function (done) {
      const dagNode1 = new DAGNode(new Buffer('4444'))
      const dagNode2 = new DAGNode(new Buffer('22'))

      const dagNode1Size = dagNode1.size()
      const dagNode1Multihash = dagNode1.multihash()

      dagNode1.addNodeLink('next', dagNode2)
      expect(dagNode1.links.length > 0).to.equal(true)
      expect(dagNode1.size() > dagNode1Size).to.equal(true)

      expect(dagNode1.multihash().equals(dagNode1Multihash)).to.equal(false)
      expect(dagNode1.links[0].hash.equals(dagNode2.multihash())).to.equal(true)
      dagNode1.removeNodeLinkByHash(dagNode2.multihash())
      expect(dagNode1.links.length).to.equal(0)
      expect(dagNode1.multihash().equals(dagNode1Multihash)).to.equal(true)
      done()
    })

    it('marshal a node and store it with block-service', (done) => {
      const bs = new BlockService(repo)

      const dagN = new DAGNode(new Buffer('some data'))
      expect(dagN.data.length > 0).to.equal(true)
      expect(Buffer.isBuffer(dagN.data)).to.equal(true)
      expect(dagN.size() > 0).to.equal(true)
      expect(dagN.data.equals(dagN.unMarshal(dagN.marshal()).data)).to.equal(true)

      waterfall([
        (cb) => Block.create(dagN.marshal(), cb),
        (b, cb) => bs.put(b, (err) => {
          expect(err).to.not.exist

          bs.get(b.key, (err, block) => {
            expect(err).to.not.exist

            expect(b.data.equals(block.data)).to.equal(true)
            expect(b.key.equals(block.key)).to.equal(true)

            const fetchedDagNode = new DAGNode()
            fetchedDagNode.unMarshal(block.data)
            expect(dagN.data.equals(fetchedDagNode.data)).to.equal(true)
            cb()
          })
        })
      ], done)
    })

    it('read a go-ipfs marshalled node and assert it gets read correctly', function (done) {
      const bs = new BlockService(repo)

      const mh = new Buffer(bs58.decode('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'))
      bs.get(mh, function (err, block) {
        expect(err).to.not.exist
        const retrievedDagNode = new DAGNode()
        retrievedDagNode.unMarshal(block.data)
        expect(retrievedDagNode.data).to.exist
        expect(retrievedDagNode.links.length).to.equal(6)
        done()
      })
    })

    it('dagNode.toJSON with empty Node', (done) => {
      const node = new DAGNode(new Buffer(0))
      const nodeJSON = node.toJSON()
      expect(nodeJSON.Data).to.deep.equal(new Buffer(0))
      expect(nodeJSON.Links).to.deep.equal([])
      expect(nodeJSON.Hash).to.exist
      expect(nodeJSON.Size).to.exist
      done()
    })

    it('dagNode.toJSON with data no links', (done) => {
      const node = new DAGNode(new Buffer('La cucaracha'))
      const nodeJSON = node.toJSON()
      expect(nodeJSON.Data).to.deep.equal(new Buffer('La cucaracha'))
      expect(nodeJSON.Links).to.deep.equal([])
      expect(nodeJSON.Hash).to.exist
      expect(nodeJSON.Size).to.exist
      done()
    })

    it('dagNode.toJSON with data and links', (done) => {
      const node1 = new DAGNode(new Buffer('hello'))
      const node2 = new DAGNode(new Buffer('world'))
      node1.addNodeLink('continuation', node2)
      const node1JSON = node1.toJSON()
      expect(node1JSON.Data).to.deep.equal(new Buffer('hello'))
      expect(node1JSON.Links).to.deep.equal([{
        Hash: 'QmPfjpVaf593UQJ9a5ECvdh2x17XuJYG5Yanv5UFnH3jPE',
        Name: 'continuation',
        Size: 7
      }])
      expect(node1JSON.Hash).to.exist
      expect(node1JSON.Size).to.exist
      done()
    })

    it('create a unnamed dagLink', (done) => {
      const node1 = new DAGNode(new Buffer('1'))
      const node2 = new DAGNode(new Buffer('2'))

      waterfall([
        (cb) => node1.addNodeLink('', node2, cb),
        (cb) => node1.toJSON(cb)
      ], (err, node1JSON) => {
        expect(err).to.not.exist
        expect(node1JSON.Data).to.deep.equal(new Buffer('1'))
        expect(node1JSON.Links).to.deep.equal([{
          Hash: 'QmNRGfMaSjNcjtyS56JrZBEU5QcGtfViWWG8V9pVqgVpmT',
          Name: '',
          Size: 3
        }])
        expect(node1JSON.Hash).to.exist
        expect(node1JSON.Size).to.exist
        done()
      })
    })

    it('toString', () => {
      const node = new DAGNode(new Buffer('hello world'))

      expect(
        node.toString()
      ).to.be.equal(
        'DAGNode <data: "hello world", links: 0>'
      )
    })

    it('add two nameless links to a node', function (done) {
      const l1 = {
        Name: '',
        Hash: 'QmbAmuwox51c91FmC2jEX5Ng4zS4HyVgpA5GNPBF5QsWMA',
        Size: 57806
      }
      const l2 = {
        Name: '',
        Hash: 'QmP7SrR76KHK9A916RbHG1ufy2TzNABZgiE23PjZDMzZXy',
        Size: 262158
      }
      const link1 = new DAGLink(l1.Name, l1.Size, new Buffer(bs58.decode(l1.Hash)))
      const link2 = new DAGLink(l2.Name, l2.Size, new Buffer(bs58.decode(l2.Hash)))

      function createNode () {
        return new DAGNode(new Buffer('hiya'), [link1, link2])
      }

      expect(createNode).to.not.throw()

      done()
    })
  })
}
