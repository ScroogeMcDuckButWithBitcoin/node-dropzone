var crypto = require('crypto')
var util = require('util')
var bitcore = require('bitcore')
var messages = require('./messages')

var BN = bitcore.BN
var Messages = messages.Messages

var CIPHER_ALGORITHM = 'aes-256-cbc' 

util.inherits(SessionError, Error)

function SessionError (message) {
  this.name = this.constructor.name
  this.message = 'Session error: ' + message
  Error.captureStackTrace(this, this.constructor);
}

function InvalidWithSessionReceiver () {
  SessionError.call(this, 'invalid with session receiver address')
}

function MissingReceiver () {
  SessionError.call(this, 'missing receiver')
}

function Session (privKey, sessionSecret, options) {
  this.privKey = privKey
  this.sessionKey = BN(sessionSecret, 16)
  
  options = options || {}

  if (options.receiverAddr) {
    this.receiverAddr = options.receiverAddr 
  } else if (options.withSession) {
    var receiverAddr = options.withSession.receiverAddress;
    if (receiverAddr === this.getSenderAddr(receiverAddr.network)) {
      throw new InvalidWithSessionReceiver
    }
    this.withSession = options.withSession;
    this.receiverAddr = this.withSession.senderAddr;
  } else {
    throw new MissingReceiver 
  }
} 

Session.prototype.getSenderAddr = function (network) {
  return this.privKey.toAddress(network) 
}

Session.all = function (addr, next) {     
  Messages.find({ 
    type: 'COMMUN', 
    addr: addr, 
    isInit: true 
  }, next)
}

module.exports = {
  Session: Session,
  InvalidWithSessionReceiver: InvalidWithSessionReceiver,
  MissingReceiver: MissingReceiver
}