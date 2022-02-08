/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import Bitstring from '@digitalbazaar/bitstring';

class RevocationList {
  constructor({length, buffer} = {}) {
    this.bitstring = new Bitstring({length, buffer});
    this.length = this.bitstring.length;
  }

  setRevoked(index, revoked) {
    if(typeof revoked !== 'boolean') {
      throw new TypeError('"revoked" must be a boolean.');
    }
    return this.bitstring.set(index, revoked);
  }

  isRevoked(index) {
    return this.bitstring.get(index);
  }
}

export default class StatusList extends RevocationList {
  constructor({length, buffer} = {}) {
    super({length, buffer});
  }

  async encode() {
    return this.bitstring.encodeBits();
  }

  static async decode({encodedList}) {
    const buffer = await Bitstring.decodeBits({encoded: encodedList});
    return new StatusList({buffer});
  }
}
