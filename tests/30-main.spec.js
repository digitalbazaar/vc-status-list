/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {
  createList, decodeList, createCredential, checkStatus, statusTypeMatches,
  assertStatusList2021Context, getCredentialStatus
} from '..';
import {extendContextLoader} from 'jsonld-signatures';
import statusListCtx from 'vc-status-list-context';
import vc from '@digitalbazaar/vc';
import {slCredential as SLC} from './mock-sl-credential.js';

const {defaultDocumentLoader} = vc;

const VC_SL_CONTEXT_URL = statusListCtx.constants.CONTEXT_URL_V1;
const VC_SL_CONTEXT = statusListCtx.contexts.get(VC_SL_CONTEXT_URL);

const encodedList100k =
  'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQsvoAAAAAAAAAAAAAAAAP4GcwM92tQwAAA';

const documents = new Map();
documents.set(VC_SL_CONTEXT_URL, VC_SL_CONTEXT);

documents.set(SLC.id, SLC);

const documentLoader = extendContextLoader(async url => {
  const doc = documents.get(url);
  if(doc) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: doc
    };
  }
  return defaultDocumentLoader(url);
});

describe('main', () => {
  it('should create a list', async () => {
    const list = await createList({length: 8});
    should.exist(list.bitstring);
    should.exist(list.length);
    list.length.should.equal(8);
  });

  it('should fail to create a list if no length is provided', async () => {
    let err;
    try {
      await createList();
    } catch(e) {
      err = e;
    }
    should.exist(err);
    err.name.should.equal('TypeError');
  });

  it('should decode an encoded list', async () => {
    const list = await decodeList({encodedList: encodedList100k});
    list.length.should.equal(100000);
  });

  it('should create a StatusList2021Credential credential', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    credential.should.be.an('object');
    credential.should.deep.equal({
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id,
      type: ['VerifiableCredential', 'StatusList2021Credential'],
      credentialSubject: {
        id: `${id}#list`,
        type: 'RevocationList2021',
        encodedList: encodedList100k
      }
    });
  });

  it('should indicate that the status type matches', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:a0418a78-7924-11ea-8a23-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:4886029a-7925-11ea-9274-10bf48838a41',
        'example:test': 'foo'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#67342',
        type: 'RevocationList2021Status',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const result = statusTypeMatches({credential});
    result.should.equal(true);
  });

  it('should indicate that the status type does not match', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:a0418a78-7924-11ea-8a23-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:4886029a-7925-11ea-9274-10bf48838a41',
        'example:test': 'foo'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#67342',
        type: 'NotMatch',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const result = statusTypeMatches({credential});
    result.should.equal(false);
  });

  it('should verify the status of a credential', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:a0418a78-7924-11ea-8a23-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:4886029a-7925-11ea-9274-10bf48838a41',
        'example:test': 'foo'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#67342',
        type: 'RevocationList2021Status',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const result = await checkStatus({
      credential, documentLoader, verifyStatusListCredential: false
    });
    result.verified.should.equal(true);
  });

  it('should fail to verify status with incorrect status type', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:a0418a78-7924-11ea-8a23-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:4886029a-7925-11ea-9274-10bf48838a41',
        'example:test': 'foo'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#67342',
        type: 'ex:NonmatchingStatusType',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const result = await checkStatus({
      credential, documentLoader, verifyStatusListCredential: false
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('"credentialStatus" type must be ' +
      '"RevocationList2021Status" or "SuspensionList2021Status".');
  });

  it('should fail to verify status with missing index', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:a0418a78-7924-11ea-8a23-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:4886029a-7925-11ea-9274-10bf48838a41',
        'example:test': 'foo'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#67342',
        type: 'RevocationList2021Status',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const result = await checkStatus({
      credential, documentLoader, verifyStatusListCredential: false
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('"statusListIndex" must be an integer.');
  });

  it('should fail to verify status with missing "statusListCredential"',
    async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          VC_SL_CONTEXT_URL
        ],
        id: 'urn:uuid:a0418a78-7924-11ea-8a23-10bf48838a41',
        type: ['VerifiableCredential', 'example:TestCredential'],
        credentialSubject: {
          id: 'urn:uuid:4886029a-7925-11ea-9274-10bf48838a41',
          'example:test': 'foo'
        },
        credentialStatus: {
          id: 'https://example.com/status/1#67342',
          type: 'RevocationList2021Status',
          statusListIndex: '67342'
        },
        issuer: SLC.issuer,
      };
      const result = await checkStatus({
        credential, documentLoader, verifyStatusListCredential: false
      });
      result.verified.should.equal(false);
      should.exist(result.error);
      result.error.message.should.equal('"credentialStatus" ' +
        'statusListCredential must be a string.');
    });

  it('should fail to verify status for revoked credential', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:e74fb1d6-7926-11ea-8e11-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:011e064e-7927-11ea-8975-10bf48838a41',
        'example:test': 'bar'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#50000',
        type: 'RevocationList2021Status',
        statusListIndex: '50000',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const result = await checkStatus({
      credential, documentLoader, verifyStatusListCredential: false
    });
    result.verified.should.equal(false);
  });

  it('should fail to verify status if documentLoader is unable to load ' +
    '"statusListCredential"', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:e74fb1d6-7926-11ea-8e11-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:011e064e-7927-11ea-8975-10bf48838a41',
        'example:test': 'bar'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#50000',
        type: 'RevocationList2021Status',
        statusListIndex: '50000',
        // intentionally set statusListCredential to an id that is not set
        // in documents
        statusListCredential: 'https://example.com/status/2'
      },
      issuer: SLC.issuer,
    };
    const result = await checkStatus({
      credential, documentLoader, verifyStatusListCredential: false
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('Could not load ' +
      '"StatusList2021Credential"; reason: Document loader unable to load ' +
      'URL "https://example.com/status/2".');
  });

  it('should fail to verify status if "statusListCredential" type does not ' +
    'include "StatusList2021Credential"', async () => {
    const invalidSLC = JSON.parse(JSON.stringify(SLC));
    // intentionally set SLC type to an invalid type
    invalidSLC.type = ['InvalidType'];
    invalidSLC.id = 'https://example.com/status/invalid-slc-type';

    documents.set(invalidSLC.id, invalidSLC);

    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:e74fb1d6-7926-11ea-8e11-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:011e064e-7927-11ea-8975-10bf48838a41',
        'example:test': 'bar'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#50000',
        type: 'RevocationList2021Status',
        statusListIndex: '50000',
        statusListCredential: invalidSLC.id
      },
      issuer: SLC.issuer,
    };
    const result = await checkStatus({
      credential, documentLoader, verifyStatusListCredential: false
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('Status list credential must include ' +
      '"StatusList2021Credential" type.');
  });

  it('should fail to verify status if "credentialSubject" type is not ' +
    '"RevocationList2021"', async () => {
    const invalidSLC = JSON.parse(JSON.stringify(SLC));
    // intentionally set credential subject type to an invalid type
    invalidSLC.credentialSubject.type = 'InvalidType';
    invalidSLC.id = 'https://example.com/status/invalid-rl-type';

    documents.set(invalidSLC.id, invalidSLC);

    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:e74fb1d6-7926-11ea-8e11-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:011e064e-7927-11ea-8975-10bf48838a41',
        'example:test': 'bar'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#50000',
        type: 'RevocationList2021Status',
        statusListIndex: '50000',
        statusListCredential: invalidSLC.id
      },
      issuer: SLC.issuer,
    };
    const result = await checkStatus({
      credential, documentLoader, verifyStatusListCredential: false
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('Revocation list type must be ' +
      '"RevocationList2021".');
  });

  it('should fail to verify status if "credentialSubject.encodedList" ' +
    'cannot not be decoded', async () => {
    const invalidSLC = JSON.parse(JSON.stringify(SLC));
    // intentionally set encodedList to an invalid value
    invalidSLC.credentialSubject.encodedList = 'INVALID-XYZ';
    invalidSLC.id = 'https://example.com/status/invalid-encoded-list';

    documents.set(invalidSLC.id, invalidSLC);

    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:e74fb1d6-7926-11ea-8e11-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:011e064e-7927-11ea-8975-10bf48838a41',
        'example:test': 'bar'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#50000',
        type: 'RevocationList2021Status',
        statusListIndex: '50000',
        statusListCredential: invalidSLC.id
      },
      issuer: SLC.issuer,
    };
    const result = await checkStatus({
      credential, documentLoader, verifyStatusListCredential: false
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('Could not decode encoded revocation ' +
      'list; reason: undefined');
  });

  it('should fail to verify status on missing "credential" param', async () => {
    let err;
    let result;
    try {
      result = await checkStatus({
        documentLoader, verifyStatusListCredential: false
      });
      result.verified.should.equal(false);
    } catch(e) {
      err = e;
    }
    should.not.exist(err);
    should.exist(result);
    result.should.be.an('object');
    result.should.have.property('verified');
    result.verified.should.be.a('boolean');
    result.verified.should.be.false;
    result.should.have.property('error');
    result.error.should.be.instanceof(TypeError);
    result.error.message.should.contain('"credential" must be an object');
  });

  it('should fail to verify if credential is not an object for ' +
    'statusTypeMatches"', async () => {
    let err;
    let result;
    try {
      result = statusTypeMatches({credential: ''});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(TypeError);
    err.message.should.contain('"credential" must be an object');
  });

  it('should fail to verify if credential is not an object for ' +
    '"assertStatusList2021Context"', async () => {
    let err;
    let result;
    try {
      result = assertStatusList2021Context({credential: ''});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(TypeError);
    err.message.should.contain('"credential" must be an object');
  });

  it('should fail to verify if credential is not an object for ' +
    '"getCredentialStatus"', async () => {
    let err;
    let result;
    try {
      result = getCredentialStatus({credential: ''});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(TypeError);
    err.message.should.contain('"credential" must be an object');
  });

  it('should fail to verify if @context is not an array in ' +
    '"statusTypeMatches"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      // change the @context property to a string
      credential['@context'] = id;
      result = statusTypeMatches({credential});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(TypeError);
    err.message.should.contain('"@context" must be an array');
  });

  it('should fail when the first "@context" value is unexpected in ' +
    'statusTypeMatches"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      // change the @context property intentionally to an unexpected value
      credential['@context'][0] = 'https://example.com/test/1';
      result = statusTypeMatches({credential});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(Error);
    err.message.should.contain('first "@context" value');
  });

  it('should fail to verify if @context is not an array in ' +
    '"assertStatusList2021Context"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      // change the @context property to a string
      credential['@context'] = 'https://example.com/status/1';
      result = assertStatusList2021Context({credential});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(TypeError);
    err.message.should.contain('"@context" must be an array');
  });

  it('should fail when the first "@context" value is unexpected in' +
    '"assertStatusList2021Context"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      // change the @context property intentionally to an unexpected value
      credential['@context'][0] = 'https://example.com/test/1';
      result = assertStatusList2021Context({credential});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(Error);
    err.message.should.contain('first "@context" value');
  });

  it('should fail when "credentialStatus" does not exist in ' +
    '"statusTypeMatches"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      // remove required credentialStatus property
      delete credential.credentialStatus;
      result = statusTypeMatches({credential});
    } catch(e) {
      err = e;
    }
    should.not.exist(err);
    result.should.equal(false);
  });

  it('should fail when "credentialStatus" is not an object in ' +
    '"statusTypeMatches"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      // change credentialStatus to a string type
      credential.credentialStatus = 'https://example.com/status/1#50000';
      result = statusTypeMatches({credential});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(Error);
    err.message.should.contain('"credentialStatus" is invalid');
  });

  it('should return false when "CONTEXTS.RL_V1" is not in ' +
    '"@contexts" in "statusTypeMatches"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      delete credential['@context'][1];
      credential.credentialStatus = {
        id: 'https://example.com/status/1#50000',
        type: 'RevocationList2021Status',
        statusListIndex: '50000',
        statusListCredential: SLC.id
      };
      result = statusTypeMatches({credential});
    } catch(e) {
      err = e;
    }
    should.not.exist(err);
    result.should.equal(false);
  });

  it('should fail when "CONTEXTS.RL_V1" is not in "@contexts" ' +
    'in "assertStatusList2021Context"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      delete credential['@context'][1];
      result = assertStatusList2021Context({credential});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(TypeError);
    err.message.should.contain('@context" must include');
  });

  it('should fail when credentialStatus is not an object for ' +
    '"getCredentialStatus"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      delete credential.credentialStatus;
      result = getCredentialStatus({credential});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(Error);
    err.message.should.contain('"credentialStatus" is missing or invalid');
  });

  it('should fail to verify when documentLoader is not a function',
    async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          VC_SL_CONTEXT_URL
        ],
        id: 'urn:uuid:a0418a78-7924-11ea-8a23-10bf48838a41',
        type: ['VerifiableCredential', 'example:TestCredential'],
        credentialSubject: {
          id: 'urn:uuid:4886029a-7925-11ea-9274-10bf48838a41',
          'example:test': 'foo'
        },
        credentialStatus: {
          id: 'https://example.com/status/1#67342',
          type: 'RevocationList2021Status',
          statusListCredential: SLC.id
        }
      };
      const documentLoader = 'https://example.com/status/1';
      let err;
      let result;
      try {
        result = await checkStatus({
          credential, documentLoader, verifyStatusListCredential: false
        });
      } catch(e) {
        err = e;
      }
      should.not.exist(err);
      should.exist(result);
      result.should.be.an('object');
      result.should.have.property('verified');
      result.verified.should.be.a('boolean');
      result.verified.should.be.false;
      result.should.have.property('error');
      result.error.should.be.instanceof(TypeError);
      result.error.message.should.contain(
        '"documentLoader" must be a function');
    });

  it('should fail to verify when suite is not an object or array of ' +
    'objects in checkStatus', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:e74fb1d6-7926-11ea-8e11-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:011e064e-7927-11ea-8975-10bf48838a41',
        'example:test': 'bar'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#50000',
        type: 'RevocationList2021Status',
        statusListIndex: '50000',
        statusListCredential: SLC.id
      }
    };
    const documentLoader = extendContextLoader(async url => {
      const doc = documents.get(url);
      if(doc) {
        return {
          contextUrl: null,
          documentUrl: url,
          document: doc
        };
      }
      return defaultDocumentLoader(url);
    });
    const suite = '{}';
    let err;
    let result;
    try {
      result = await checkStatus({
        credential, documentLoader, suite, verifyStatusListCredential: true
      });
    } catch(e) {
      err = e;
    }
    should.not.exist(err);
    should.exist(result);
    result.should.be.an('object');
    result.should.have.property('verified');
    result.verified.should.be.a('boolean');
    result.verified.should.be.false;
    result.should.have.property('error');
    result.error.should.be.instanceof(TypeError);
    result.error.message.should.contain(
      '"suite" must be an object or an array of objects');
  });

  it('should fail to verify when "StatusList2021Credential" ' +
    'is not valid', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:e74fb1d6-7926-11ea-8e11-10bf48838a41',
      issuer: 'exampleissuer',
      issuanceDate: '2021-03-10T04:24:12.164Z',
      type: ['VerifiableCredential', 'StatusList2021Credential'],
      credentialSubject: {
        id: 'urn:uuid:011e064e-7927-11ea-8975-10bf48838a41',
        'example:test': 'bar'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#50000',
        type: 'RevocationList2021Status',
        statusListIndex: 50000,
        statusListCredential: SLC.id
      }
    };
    let err;
    let result;
    try {
      delete credential.type[1];
      result = await checkStatus({
        credential, documentLoader, suite: {}, verifyStatusListCredential: true
      });
    } catch(e) {
      err = e;
    }
    should.not.exist(err);
    should.exist(result);
    result.should.be.an('object');
    result.should.have.property('verified');
    result.verified.should.be.a('boolean');
    result.verified.should.be.false;
    result.should.have.property('error');
    result.error.should.be.instanceof(Error);
    result.error.message.should.contain(
      '"StatusList2021Credential" not verified');
  });

  it('should fail to verify for non-matching credential issuers', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL,
      ],
      id: 'urn:uuid:a0418a78-7924-11ea-8a23-10bf48838a41',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:4886029a-7925-11ea-9274-10bf48838a41',
        'example:test': 'foo',
      },
      credentialStatus: {
        id: 'https://example.com/status/1#67342',
        type: 'RevocationList2021Status',
        statusListIndex: '67342',
        statusListCredential: SLC.id,
      },
      // this issuer does not match the issuer for the mock SLC specified
      // by `SLC.id` above
      issuer: 'did:example:1234',
    };
    const result = await checkStatus({
      credential,
      documentLoader,
      verifyStatusListCredential: false,
      verifyMatchingIssuers: true,
    });
    result.verified.should.equal(false);
    result.error.message.should.equal('Issuers of the status list credential ' +
      'and verifiable credential do not match.');
  });

  it('should allow different issuers if verifyMatchingIssuers is false',
    async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          VC_SL_CONTEXT_URL,
        ],
        id: 'urn:uuid:a0418a78-7924-11ea-8a23-10bf48838a41',
        type: ['VerifiableCredential', 'example:TestCredential'],
        credentialSubject: {
          id: 'urn:uuid:4886029a-7925-11ea-9274-10bf48838a41',
          'example:test': 'foo',
        },
        credentialStatus: {
          id: 'https://example.com/status/1#67342',
          type: 'RevocationList2021Status',
          statusListIndex: '67342',
          statusListCredential: SLC.id,
        },
        // this issuer does not match the issuer for the mock SLC specified
        // by `SLC.id` above
        issuer: 'did:example:1234',
      };
      const result = await checkStatus({
        credential,
        documentLoader,
        verifyStatusListCredential: false,
        // this flag is set to allow different values for credential.issuer and
        // SLC.issuer
        verifyMatchingIssuers: false,
      });
      result.verified.should.equal(true);
    });

});
