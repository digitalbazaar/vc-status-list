/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {StatusList} from '../StatusList.js';

const encodedList100k =
  'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQsvoAAAAAAAAAAAAAAAAP4GcwM92tQwAAA';
const encodedList100KWith50KthRevoked =
  'H4sIAAAAAAAAA-3OMQ0AAAgDsOHfNB72EJJWQRMAAAAAAIDWXAcAAAAAAIDHFrc4zDz' +
  'UMAAA';

describe('StatusList', () => {
  it('should create an instance', async () => {
    const list = new StatusList({length: 8});
    list.length.should.equal(8);
  });

  it('should fail to create an instance if no length nor buffer is provided',
    async () => {
      let err;
      try {
        new StatusList();
      } catch(e) {
        err = e;
      }
      should.exist(err);
      err.name.should.equal('TypeError');
    });

  it('should encode', async () => {
    const list = new StatusList({length: 100000});
    let encodedList;
    let err;
    try {
      encodedList = await list.encode();
    } catch(e) {
      err = e;
    }
    should.not.exist(err);
    should.exist(encodedList);
    encodedList.should.equal(encodedList100k);
  });

  it('should decode', async () => {
    let err;
    let list;
    try {
      list = await StatusList.decode({encodedList: encodedList100k});
    } catch(e) {
      err = e;
    }
    should.not.exist(err);
    should.exist(list);
    list.length.should.equal(100000);
  });

  it('should mark a credential revoked', async () => {
    const list = new StatusList({length: 8});
    list.getStatus(0).should.equal(false);
    list.getStatus(1).should.equal(false);
    list.getStatus(2).should.equal(false);
    list.getStatus(3).should.equal(false);
    list.getStatus(4).should.equal(false);
    list.getStatus(5).should.equal(false);
    list.getStatus(6).should.equal(false);
    list.getStatus(7).should.equal(false);
    list.setStatus(4, true);
    list.getStatus(0).should.equal(false);
    list.getStatus(1).should.equal(false);
    list.getStatus(2).should.equal(false);
    list.getStatus(3).should.equal(false);
    list.getStatus(4).should.equal(true);
    list.getStatus(5).should.equal(false);
    list.getStatus(6).should.equal(false);
    list.getStatus(7).should.equal(false);
  });

  it('should fail to mark a credential revoked if no "revokedStatus" boolean ' +
    'param is passed', async () => {
    const list = new StatusList({length: 8});
    let err;
    try {
      list.setStatus(0);
    } catch(e) {
      err = e;
    }
    should.exist(err);
    err.name.should.equal('TypeError');
    err.message.should.equal('"revokedStatus" must be a boolean.');
  });

  it('should fail to get a credential status for position that is out of range',
    async () => {
      const list = new StatusList({length: 8});
      let err;
      try {
        list.getStatus(8);
      } catch(e) {
        err = e;
      }
      should.exist(err);
      err.name.should.equal('Error');
      err.message.should.equal('Position "8" is out of range "0-7".');
    });

  it('should mark a credential revoked, encode and decode', async () => {
    const list = new StatusList({length: 100000});
    list.getStatus(50000).should.equal(false);
    list.setStatus(50000, true);
    list.getStatus(50000).should.equal(true);
    const encodedList = await list.encode();
    encodedList.should.equal(encodedList100KWith50KthRevoked);
    const decodedList = await StatusList.decode({encodedList});
    decodedList.getStatus(50000).should.equal(true);
  });
});
