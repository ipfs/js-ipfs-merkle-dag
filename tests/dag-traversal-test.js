var DAGNode = require('../src/dag-node').DAGNode
var Traversal= require('../src/traversal')
var test = require('tape')

var buf1 = new Buffer('node 1')
var buf2 = new Buffer('node 2')
var buf3 = new Buffer('node 3')
var buf4 = new Buffer('node 4')
var buf5 = new Buffer('node 5')
var buf6 = new Buffer('node 6')
var buf7 = new Buffer('node 7')
var buf8 = new Buffer('node 8')
var buf9 = new Buffer('node 9')
var buf10 = new Buffer('node10')

var node1 = new DAGNode()
var node2 = new DAGNode()
var node3 = new DAGNode()
var node4 = new DAGNode()
var node5 = new DAGNode()
var node6 = new DAGNode()
var node7 = new DAGNode()
var node8 = new DAGNode()
var node9 = new DAGNode()
var node10 = new DAGNode()
//order of a depth first search based upon sorted links by bumber
var nodes = [node1, node2, node3, node4, node5, node6, node7, node8, node9, node10]

node1.data = buf1
node2.data = buf2
node3.data = buf3
node4.data = buf4
node5.data = buf5
node6.data = buf6
node7.data = buf7
node8.data = buf8
node9.data = buf9
node10.data = buf10

node9.addNodeLink('10', node10)
node6.addNodeLink('9', node9)
node6.addNodeLink('8', node8)
node6.addNodeLink('7', node7)
node3.addNodeLink('4', node4)
node3.addNodeLink('5', node5)
node3.addNodeLink('6', node6)
node1.addNodeLink('2', node2)
node1.addNodeLink('3', node3)

test('dag-traversal: \t\t Traverse nodes in the graph', function(t){
  node1[Symbol.iterator]= function(){ return Traversal(this, {order:'DFS'})}
  var i= 0
  for(var next of node1){
    t.is(nodes[i].key().equals(next.key()), true, 'Traversed to node' + (i+1) +' in the right order')
    i++
  }

  t.is(i== 10, true, 'Got all ten nodes')
  t.end()
})