# [DEPRECATED] js-ipfs-merkle-dag

# DEPRECATED Please use [ipld/js-ipld-dag-pb](https://github.com/ipld/js-ipld-dag-pb) and [ipld/js-ipld-resolver](https://github.com/ipld/js-ipld-resolver) instead


[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/ipfs/js-ipfs-merkle-dag/badge.svg?branch=master)](https://coveralls.io/github/ipfs/js-ipfs-merkle-dag?branch=master)
[![Travis CI](https://travis-ci.org/ipfs/js-ipfs-merkle-dag.svg?branch=master)](https://travis-ci.org/ipfs/js-ipfs-merkle-dag)
[![Circle CI](https://circleci.com/gh/ipfs/js-ipfs-merkle-dag.svg?style=svg)](https://circleci.com/gh/ipfs/js-ipfs-merkle-dag)
[![Dependency Status](https://david-dm.org/ipfs/js-ipfs-merkle-dag.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfs-merkle-dag) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard) [![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> JavaScript Implementation of the DAGService and DAGNode data structure

## Table of Contents

* [Table of Contents](#table-of-contents)
* [Install](#install)
* [Architecture](#architecture)
* [Usage](#usage)
* [API](#api)
  + [DAGNode Class](#dagnode-class)
    - [`addNodeLink`](#addnodelink)
    - [`addRawLink`](#addrawlink)
    - [`updateNodeLink`](#updatenodelink)
    - [`removeNodeLink`](#removenodelink)
    - [`removeNodeLinkByHash`](#removenodelinkbyhash)
    - [`copy`](#copy)
    - [`size`](#size)
    - [`links`](#links)
    - [`multihash(fn)`](#multihashfn)
    - [`marshal`](#marshal)
    - [`unMarshal`](#unmarshal)
    - [`getPBNode`](#getpbnode)
    - [`makeLink`](#makelink)
  + [DAGLink Class](#daglink-class)
  + [DAGService](#dagservice)
    - [`put`](#put)
    - [`putStream`](#putstream)
    - [`get`](#get)
    - [`getStream`](#getstream)
    - [`getRecursive`](#getrecursive)
    - [`getRecursiveStream`](#getrecursivestream)
    - [`remove`](#remove)
* [License](#license)

## Install

```bash
$ npm i ipfs-merkle-dag
```

## Architecture

```markdown
┌────────────────────┐
│   DAGService       │
└────────────────────┘
           │
           ▼
┌────────────────────┐
│   BlockService     │
└────────────────────┘
```

**DAGService** - The DAGService offers an interface to interact directly with a MerkleDAG object (composed by one or more DAGNodes that are linked), using the BlockService to store and fetch the DAGNodes as it needs them

[**BlockService** - The BlockService uses IPFS Repo as the local datastore for blocks and an IPFS Exchange compliant implementation to fetch blocks from the network.](https://github.com/ipfs/js-ipfs-block-service)

A DAGNode and DAGLink are data structures made available on this module.

## Usage

```js
const ipfsMDAG = require('ipfs-merkle-dag')

// then, to access each of the components
ipfsMDAG.DAGService
ipfsMDAG.DAGNode
ipfsMDAG.DAGLink
```

## API

### DAGNode Class

Create a new DAGNode

```JavaScript
var node = new ipfsMDAG.DAGNode([<data>, <[links]>])
```

#### `addNodeLink(name, node, callback)`

> creates a link on node A to node B by using node B to get its multihash

#### `addRawLink(link)`

> creates a link on node A to node B by using directly node B multihash

#### `updateNodeLink(name, node, callback)`

> updates a link on the node. *caution* this method returns a copy of the MerkleDAG node

#### `removeNodeLink(name)`

> removes a link from the node by name

#### `removeNodeLinkByHash(multihash)`

> removes a link from the node by the hash of the linked node


#### `copy()`

> creates a copy of the MerkleDAG Node

#### `size(callback)`

> get the size of the node, in bytes

#### `links`

> (property) an array of `DAGLink`s belonging to the node

#### `multihash([hashIdentifier, ] callback)`

> returns the multihash (default: sha2-256)

`hashIdentifier` can be any hash function that [`multihashing`](https://github.com/multiformats/js-multihashing) understands.

#### `marshal()`

> returns a protobuf serialized version, compatible with go-ipfs MerkleDAG

#### `unMarshal(data)`

> deserializes a node encoded using protobuf

#### `toJSON(cb)`

> generate a `JSON` representation of the node

#### `getPBNode`

> used internally

#### `makeLink(node, callback)`

> used internally

### DAGLink Class

Create a new DAGLink

```JavaScript
var link = new ipfsMDAG.DAGLink(<name>, <size>, <hash>)
```

### DAGService

#### `put`

> stores the node

#### `putStream`

> stores nodes using a writable pull-stream

#### `get`

> fetches a node by its multihash

#### `getStream`

> fetches a node as a pull-stream

#### `getRecursive`

> fetches a node and all of its links (if possible)

#### `getRecursiveStream`

> fetches a node and all of its links (if possible) as pull-stream

#### `remove`

> deletes a node

## License

MIT © IPFS
