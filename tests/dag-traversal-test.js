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
var buf10 = new Buffer('node 10')

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

var nodeA= new DAGNode()
var nodeB= new DAGNode()
var nodeC= new DAGNode()
var nodeD =new DAGNode()
var nodeE =new DAGNode()

nodeA.data= new Buffer("node A")
nodeB.data= new Buffer("node B")
nodeC.data= new Buffer("node C")
nodeD.data= new Buffer("node D")
nodeE.data= new Buffer("node E")

nodeC.addNodeLink('D',nodeD)
nodeC.addNodeLink('E',nodeE)
nodeA.addNodeLink('C',nodeC)
nodeA.addNodeLink('B',nodeB)

node2.addNodeLink('A', nodeA)

test('dag-traversal: \t\t Traverse nodes DFS in the graph', function(t){
  node1[Symbol.iterator]= function(){ return Traversal(this, {order:'DFS'})}
  var dfs= ['node 1','node 2','node A','node B', 'node C', 'node D', 'node E', 'node 3', 'node 4', 'node 5', 'node 6', 'node 7','node 8', 'node 9', 'node 10']
  var i= 0
  for(var next of node1){
    t.is(dfs[i] == next.data.toString(), true, 'Traversed to ' + dfs[i]  +' in the right order')
    i++
  }

  t.is(i== dfs.length, true, 'Got all nodes')
  t.end()
})

test('dag-traversal: \t\t Traverse nodes BFS in the graph', function(t){
  node1[Symbol.iterator]= function(){ return Traversal(this, {order:'BFS'})}
  var bfs= ['node 1','node 2','node 3','node A', 'node 4', 'node 5', 'node 6', 'node B', 'node C', 'node 7', 'node 8', 'node 9','node D', 'node E', 'node 10']
  var i= 0
  for(var next of node1){
    t.is(bfs[i] == next.data.toString(), true, 'Traversed to ' + bfs[i] +' in the right order')
    i++
  }

  t.is(i== bfs.length, true, 'Got all nodes')
  t.end()
})
