/*
* Dag Traversal is a go-ipfs inspired Iterator for DAG-Nodes
* It provides DFS, BFS and the ability to perform operations on nodes in pre and post order.
* If used on the Symbol.iterator property of a node that node can use for...of loops
* as a traversal mechanise ie.
*
* node[ Symbol.iterator ] = function () { return Traversal(this, { order: 'DFS' })}
* */

var uniqueBy = require('unique-by')
var deasync = require('deasync')

var Traversal = function (node, opts) {
  if (!node) {
    throw new Error('Invalid Root Node')
  }
  var visited = [] //Stores nodes that have been visited
  var waiting = [ { value: node, depth: 0, parent: -1, children: node.links.length } ] // stores nodes waiting to be visited
  var current //current position of the traversal
  var order = opts.order || 'DFS' // can be DFS or BFS
  var skipDuplicates = opts.skipDuplicates || true //disallow cycles
  var operation = opts.operation || null
  var action = opts.action || 'Pre' // Operat 'Pre' or 'Post'
  var dagService = opts.dagService
  var getLinkNodes = function () { //Gathers link nodes of current node to be stored in waiting list
    var nodes = []
    if (current) {
      for (var i = 0; i < current.value.links.length; i++) {
        var link = current.value.links[ i ]
        if (link.node) {
          nodes.push({
            value: link.node, depth: (current.depth + 1),
            parent: visited.length, children: link.node.links.length
          })
        } else {
          if (dagService) {
            var done = false
            dagService.get(link.hash().toString('hex'), function (err, node) {
              if (err) {
                done = true
                throw new Error(err)
              }
              link.node = node
              nodes.push({
                value: link.node, depth: (current.depth + 1),
                parent: visited.length, children: link.node.links.length
              })
              done = true
            })
            deasync.loopWhile(function () {return !done })
          } else {
            throw new Error('Invalid DAG Service - Node missing from link')
          }
        }
      }
    }
    return nodes
  }
  var operatePost = function () { // operates on leaf nodes and traverses toward root if it is a terminal node
    if (current.value.links.length === 0) {
      operation(current)
      if (current.parent == -1) {
        return
      }
      var parent = visited[ current.parent ]
      parent.children--;
      while (parent.children == 0) {
        operation(parent)
        if (parent.parent == -1) {
          return
        }
        parent = visited[ parent.parent ]
        parent.children--;
      }
    }
  }
  var visit = function () {// The workhorse! Performs the traversal
    if (order === 'DFS') {
      if (current) {
        visited.push(current)
      }
      current = waiting.shift()
      waiting = getLinkNodes().concat(waiting) // DFS place new nodes at the front of the list to be processed
      if (skipDuplicates) {
        waiting = uniqueBy(waiting, function (obj) { return obj.value.key().toString('hex')})// eliminate cyles or repeated visits
      }
      if (operation && action == 'Post') {
        operatePost()
      }
      if (operation && action == 'Pre') {
        operation(current)
      }
    }
    if (order === 'BFS') {
      if (current) {
        visited.push(current)
      }
      current = waiting.shift()
      waiting = waiting.concat(getLinkNodes()) //BFS places new nodes at the end of the waiting list
      waiting.sort(function (a, b) { return a.depth - b.depth})
      if (skipDuplicates) {
        waiting = uniqueBy(waiting, function (obj) { return obj.value.key().toString('hex')})
      }
    }
  }
  return {
    next: function () {
      if (waiting.length > 0) {
        visit()
        if (current && current.value) {
          return {value: current.value, done: false}
        } else {
          return { done: true }
        }
      } else {
        return { done: true }
      }
    },
    currentDepth: function () { // potentially un needed but may be helpful
      if (current) {
        return current.depth
      } else {
        return 0
      }
    }
  }
}
module.exports = Traversal