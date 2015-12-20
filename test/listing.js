/* global describe it before afterEach */
/* eslint no-new: 0 */

var chai = require('chai')
var crypto = require('crypto')
var async = require('async')

var expect = chai.expect

var fakeConnection = require('../lib/drivers/fake')
var listing = require('../lib/listing')

var globals = require('./fixtures/globals')

var Listing = listing.Listing

describe('Listing', function () {
  var connection = null

  before(function (next) {
    connection = new fakeConnection.FakeBitcoinConnection(next)
  })

  afterEach(function (next) { connection.clearTransactions(next) })

  describe('accessors', function () {
    it('compiles a simple profile', function (nextSpec) {
      var txidItem

      async.series([
        function (next) {
          chai.factory.create('seller',
            connection).save(globals.testerPrivateKey, next)
        }, function (next) {
          // Block height is now 1:
          connection.incrementBlockHeight()

          chai.factory.create('item', connection).save(globals.testerPrivateKey, 
            function(err, item) {
              if (err) throw err
              txidItem = item.txid
              next()
            })
        }, function (next) {
          // Block height is now 2:
          connection.incrementBlockHeight()

          var listing = new Listing(txidItem)

          expect(listing.addr).to.equal(globals.testerPublicKey)

          listing.getAttributes(null, function (err, attrs) {
            if (err) throw err

            expect(attrs.validation).to.be.null
            expect(attrs.description).to.equal('Item Description')
            expect(attrs.priceCurrency).to.equal('BTC')
            expect(attrs.priceInUnits).to.equal(100000000)
            expect(attrs.expiration_in).to.equal(6)
            expect(attrs.expiration_at).to.equal(7)
            expect(attrs.latitude).to.equal(51.500782)
            expect(attrs.longitude).to.equal(-0.124669)
            expect(attrs.radius).to.equal(1000)
            expect(attrs.addr).to.equal(globals.testerPublicKey)

            next()
          })
        }], nextSpec)
    })

    it('combines attributes from mulitple messages', function (nextSpec) {
      var txidItem

      async.series([
        function (next) {
          chai.factory.create('seller',
            connection).save(globals.testerPrivateKey, next)
        }, function (next) {
          connection.incrementBlockHeight()

          chai.factory.create('item', connection).save(globals.testerPrivateKey, 
            function(err, item) {
              if (err) throw err
              txidItem = item.txid
              next()
            })
        }, function (next) {
          connection.incrementBlockHeight()

          new Item(connection, {createTxid: txidItem,
            receiverAddr: globals.testerPublicKey, description: 'xyz',
            priceInUnits: 99999999, expirationIn: 12
          }).save(globals.testerPrivateKey, next)
        }, function (next) {
          new Listing(txidItem).getAttributes(null, function (err, attrs) {
            if (err) throw err

            expect(attrs.validation).to.be.null
            expect(attrs.description).to.equal('xyz')
            expect(attrs.priceCurrency).to.equal('BTC')
            expect(attrs.priceInUnits).to.equal(99999999)
            expect(attrs.expiration_in).to.equal(12)
            expect(attrs.expiration_at).to.equal(13)
            expect(attrs.latitude).to.equal(51.500782)
            expect(attrs.longitude).to.equal(-0.124669)
            expect(attrs.radius).to.equal(1000)
            expect(attrs.addr).to.equal(globals.testerPublicKey)

            next()
          })
        }], nextSpec)
    })

    it('combines attributes from mulitple messages', function (nextSpec) {
      var txidItem

      async.series([
        function (next) {
          chai.factory.create('seller',
            connection).save(globals.testerPrivateKey, next)
        }, function (next) {
          chai.factory.create('item', connection).save(globals.testerPrivateKey, 
            function(err, item) {
              if (err) throw err
              txidItem = item.txid
              next()
            })
        }, function (next) {
          new Item(connection, {createTxid: txidItem,
            receiverAddr: globals.testerPublicKey, description: 'xyz',
          }).save(globals.testerPrivateKey, next)
        }, function (next) {
          new Item(connection, {createTxid: 'non-existing-txid',
            receiverAddr: globals.testerPublicKey, description: '123',
          }).save(globals.testerPrivateKey, next)
        }, function (next) {
          new Listing(txidItem).getAttributes(null, function (err, attrs) {
            if (err) throw err

            expect(attrs.validation).to.be.null
            expect(attrs.description).to.equal('xyz')
          })
        }], nextSpec)
    })

    it('combines attributes from mulitple messages', function (nextSpec) {
      var txidItem

      async.series([
        function (next) {
          chai.factory.create('seller',
            connection).save(globals.testerPrivateKey, next)
        }, function (next) {
          chai.factory.create('item', connection).save(globals.testerPrivateKey, 
            function(err, item) {
              if (err) throw err
              txidItem = item.txid
              next()
            })
        }, function (next) {
          new Item(connection, {createTxid: txidItem,
            receiverAddr: globals.testerPublicKey, description: 'xyz',
          }).save(globals.tester2PrivateKey, next)
        }, function (next) {
          new Listing(txidItem).getAttributes(null, function (err, attrs) {
            if (err) throw err

            expect(attrs.validation).to.be.null
            expect(attrs.description).to.equal('Item Description')
          })
        }], nextSpec)
    })
  })

  describe('validations', function () {
    it('Cannot be created from nonsense', function (nextSpec) {
      new Listing('non-existing-txid').getAttributes(null, function (err, attrs) {
        if (err) throw err

        expect(attrs.validation.errors.length).to.equal(2)
        expect(validation.errors[0].message).to.equal('createTxid invalid or missing')
        expect(validation.errors[1].message).to.equal('sellerProfile invalid or missing')

        nextSpec()
      })
    })

    it('Cannot be created from an update', function (nextSpec) {
      var txidItem

      async.series([
        function (next) {
          chai.factory.create('seller',
            connection).save(globals.testerPrivateKey, next)
        }, function (next) {
          new Item(connection, {createTxid: 'non-existing-txid',
            receiverAddr: globals.testerPublicKey, description: '123',
          }).save(globals.testerPrivateKey, function(err, item) {
            if (err) throw err
            txidItem = item.txid
            next()
          })
        }, function (next) {
          new Listing(txidItem).getAttributes(null, function (err, attrs) {
            if (err) throw err

            expect(attrs.validation.errors.length).to.equal(2)
            expect(validation.errors[0].message).to.equal('createTxid invalid or missing')
            expect(validation.errors[1].message).to.equal('sellerProfile invalid or missing')
          })
        }], nextSpec)
    })

    it('requires seller declaration', function (nextSpec) {
      var txidItem

      async.series([
        function (next) {
          chai.factory.create('item', connection).save(globals.testerPrivateKey, 
            function(err, item) {
              if (err) throw err
              txidItem = item.txid
              next()
            })

        }, function (next) {
          new Listing(txidItem).getAttributes(null, function (err, attrs) {
            if (err) throw err

            expect(attrs.validation.errors.length).to.equal(1)
            expect(validation.errors[0].message).to.equal('sellerProfile invalid or missing')
          })
        }], nextSpec)
    })

    it('requires active seller', function (nextSpec) {
      var txidItem

      async.series([
        function (next) {
          chai.factory.create('seller',
            connection).save(globals.testerPrivateKey, next)
        }, function (next) {
          chai.factory.create('item', connection).save(globals.testerPrivateKey, 
            function(err, item) {
              if (err) throw err
              txidItem = item.txid
              next()
            })
        }, function (next) {
          // Seller deactivates account
          new Seller(connection, { 
            transferAddr: 0, receiverAddr: globals.testerPublicKey
          }).save(globals.testerPrivateKey, next)
        }, function (next) {
          new Listing(txidItem).getAttributes(null, function (err, attrs) {
            if (err) throw err

            expect(attrs.validation.errors.length).to.equal(1)
            expect(validation.errors[0].message).to.equal('sellerProfile invalid or missing')
          })
        }], nextSpec)
    })
  })
})
