/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {
  createList, decodeList, createCredential, checkStatus, statusTypeMatches,
  assertStatusList2021Context, getCredentialStatus
} from '..';
import * as didKey from '@digitalbazaar/did-method-key';
import {extendContextLoader} from 'jsonld-signatures';
import {slCredential as SLC} from './mock-sl-credential.js';
import statusListCtx from '@digitalbazaar/vc-status-list-context';
import vc from '@digitalbazaar/vc';
import {Ed25519Signature2020} from '@digitalbazaar/ed25519-signature-2020';
import suiteCtx2020 from 'ed25519-signature-2020-context';

const {defaultDocumentLoader} = vc;

const VC_SL_CONTEXT_URL = statusListCtx.constants.CONTEXT_URL_V1;
const VC_SL_CONTEXT = statusListCtx.contexts.get(VC_SL_CONTEXT_URL);
const SUITE_CONTEXT_URL = suiteCtx2020.constants.CONTEXT_URL;
const SUITE_CONTEXT = suiteCtx2020.contexts.get(SUITE_CONTEXT_URL);

const encodedList100k =
  'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQsvoAAAAAAAAAAAAAAAAP4GcwM92tQwAAA';

const documents = new Map();
documents.set(VC_SL_CONTEXT_URL, VC_SL_CONTEXT);
documents.set(SUITE_CONTEXT_URL, SUITE_CONTEXT);
documents.set(SLC.id, SLC);

const didKeyDriver = didKey.driver();

const documentLoader = extendContextLoader(async url => {
  let doc;
  if(url.startsWith('did:key')) {
    doc = await didKeyDriver.get({url});
  } else {
    doc = documents.get(url);
  }
  if(doc) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: doc
    };
  }
  return defaultDocumentLoader(url);
});

describe('createList', () => {
  it('should pass', async () => {
    const list = await createList({length: 8});
    should.exist(list.bitstring);
    should.exist(list.length);
    list.length.should.equal(8);
  });

  it('should fail when "length" param is missing', async () => {
    let err;
    try {
      await createList();
    } catch(e) {
      err = e;
    }
    should.exist(err);
    err.name.should.equal('TypeError');
  });
});

describe('decodeList', () => {
  it('should pass', async () => {
    const list = await decodeList({encodedList: encodedList100k});
    list.length.should.equal(100000);
  });

  it('should fail', async () => {
    let err;
    try {
      await decodeList({encodedList: 'INVALID-XYZ'});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    err.message.should.include('Could not decode encoded status list');
  });
});

describe('createCredential', () => {
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
        type: 'StatusList2021',
        encodedList: encodedList100k
      }
    });
  });
});

describe('statusTypeMatches', () => {
  it('should find a match', async () => {
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
        type: 'StatusList2021Entry',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const result = statusTypeMatches({credential});
    result.should.equal(true);
  });

  it('should not find a match', async () => {
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
        type: 'ex:NotMatch',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const result = statusTypeMatches({credential});
    result.should.equal(false);
  });

  it('should fail when "credential" is not an object', async () => {
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

  it('should fail when "@context" is not an array', async () => {
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

  it('should fail when first "@context" value is unexpected', async () => {
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

  it('should fail when "credentialStatus" does not exist', async () => {
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

  it('should not match when "CONTEXTS.RL_V1" is not in ' +
    '"@context"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      delete credential['@context'][1];
      credential.credentialStatus = {
        id: 'https://example.com/status/1#50000',
        type: 'StatusList2021Entry',
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
});

describe('checkStatus', () => {
  it('should verify a valid status list vc', async () => {
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    should.not.exist(result.error);
    result.verified.should.equal(true);
  });

  it('should fail to verify an invalid status list vc', async () => {
    const invalidSLC = JSON.parse(JSON.stringify(SLC));
    delete invalidSLC.proof;
    invalidSLC.id = 'https://example.com/status/no-proof-slc';
    documents.set(invalidSLC.id, invalidSLC);
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '67342',
        statusListCredential: invalidSLC.id
      },
      issuer: invalidSLC.issuer,
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.cause.errors[0].message.should.equal(
      'No matching proofs found in the given document.');
  });

  it('should verify an invalid status list vc when ' +
  '"verifyStatusListCredential" is set to "false"', async () => {
    const invalidSLC = JSON.parse(JSON.stringify(SLC));
    delete invalidSLC.proof;
    invalidSLC.id = 'https://example.com/status/no-proof-invalid-slc';
    documents.set(invalidSLC.id, invalidSLC);
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '67342',
        statusListCredential: invalidSLC.id
      },
      issuer: invalidSLC.issuer,
    };
    const result = await checkStatus({
      credential,
      documentLoader,
      verifyStatusListCredential: false
    });
    should.not.exist(result.error);
    result.verified.should.equal(true);
  });

  it('should verify one status of a credential', async () => {
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    should.not.exist(result.error);
    result.verified.should.equal(true);
  });

  it('should verify multiple statuses of a credential', async () => {
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
      credentialStatus: [{
        id: 'https://example.com/status/1#67342',
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      }, {
        id: 'https://example.com/status/1#67343',
        type: 'StatusList2021Entry',
        statusPurpose: 'suspension',
        statusListIndex: '67343',
        statusListCredential: SLC.id
      }],
      issuer: SLC.issuer,
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    should.not.exist(result.error);
    result.verified.should.equal(true);
  });

  it('should fail with incorrect status type', async () => {
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
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('"credentialStatus.type" must be ' +
      '"StatusList2021Entry".');
  });

  it('should pass when there is >= 1 matching type', async () => {
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
      credentialStatus: [{
        id: 'https://example.com/status/1#67342',
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      }, {
        id: 'https://example.com/status/1#67342',
        type: 'ex:NonmatchingStatusType',
        statusPurpose: 'revocation',
        statusListIndex: '67342',
        statusListCredential: SLC.id
      }],
      issuer: SLC.issuer,
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    should.not.exist(result.error);
    result.verified.should.equal(true);
  });

  it('should fail when missing index', async () => {
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('"statusListIndex" must be an integer.');
  });

  it('should fail when missing "statusListCredential"', async () => {
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
        type: 'StatusList2021Entry',
        statusPurpose: 'suspension',
        statusListIndex: '67342'
      },
      issuer: SLC.issuer,
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal(
      '"credentialStatus.statusListCredential" must be a string.');
  });

  it('should fail when missing "statusPurpose"', async () => {
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
        type: 'StatusList2021Entry',
        statusListIndex: '50000',
        statusListCredential: SLC.id
      },
      issuer: SLC.issuer,
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal(
      '"credentialStatus.statusPurpose" must be a string.');
  });

  it('should fail when documentLoader cannot load ' +
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '50000',
        // intentionally set statusListCredential to an id that is not set
        // in documents
        statusListCredential: 'https://example.com/status/2'
      },
      issuer: SLC.issuer,
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('Could not load ' +
      '"StatusList2021Credential"; reason: Document loader unable to load ' +
      'URL "https://example.com/status/2".');
  });

  it('should fail when "statusListCredential" type does not ' +
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
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
    result.error.message.should.equal('Status list credential type must ' +
      'include "StatusList2021Credential".');
  });

  it('should fail when "credentialSubject" type is not ' +
    '"StatusList2021"', async () => {
    const invalidSLC = JSON.parse(JSON.stringify(SLC));
    // intentionally set credential subject type to an invalid type
    invalidSLC.credentialSubject.type = 'InvalidType';
    invalidSLC.id = 'https://example.com/status/invalid-sl-type';

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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
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
    result.error.message.should.equal('Status list type must be ' +
      '"StatusList2021".');
  });

  it('should fail when "credentialSubject.encodedList" ' +
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
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
    result.error.message.should.equal('Could not decode encoded status ' +
      'list; reason: incorrect header check');
  });

  it('should fail when missing "credential" param', async () => {
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      suite,
      documentLoader,
      verifyStatusListCredential: true
    });
    should.exist(result);
    result.should.be.an('object');
    result.should.have.property('verified');
    result.verified.should.be.a('boolean');
    result.verified.should.equal(false);
    result.should.have.property('error');
    result.error.should.be.instanceof(TypeError);
    result.error.message.should.contain('"credential" must be an object');
  });

  it('should fail when documentLoader is not a function', async () => {
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
        type: 'StatusList2021Entry',
        statusListCredential: SLC.id
      }
    };
    const documentLoader = 'https://example.com/status/1';
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      suite,
      credential,
      documentLoader,
      verifyStatusListCredential: true
    });

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

  it('should fail when suite is not an object or array of ' +
    'objects', async () => {
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
        type: 'StatusList2021Entry',
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

  it('should fail when "StatusList2021Credential" is not ' +
    'verified', async () => {
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        VC_SL_CONTEXT_URL
      ],
      id: 'urn:uuid:e74fb1d6-7926-11ea-8e11-10bf48838a41',
      issuer: SLC.issuer,
      issuanceDate: '2021-03-10T04:24:12.164Z',
      type: ['VerifiableCredential', 'example:TestCredential'],
      credentialSubject: {
        id: 'urn:uuid:011e064e-7927-11ea-8975-10bf48838a41',
        'example:test': 'bar'
      },
      credentialStatus: {
        id: 'https://example.com/status/1#50000',
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: 50000,
        statusListCredential: SLC.id
      }
    };
    let err;
    let result;
    try {
      // `SLC` is not a valid status list credential, so any call with
      // `verifyStatusListCredential: true` with a credential that references
      // `SLC.id` will always fail
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

  it('should fail for non-matching credential issuers', async () => {
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '67342',
        statusListCredential: SLC.id,
      },
      // this issuer does not match the issuer for the mock SLC specified
      // by `SLC.id` above
      issuer: 'did:example:1234',
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      suite,
      credential,
      documentLoader,
      verifyStatusListCredential: true,
      verifyMatchingIssuers: true,
    });
    result.verified.should.equal(false);
    should.exist(result.error);
    result.error.message.should.equal('Issuers of the status list credential ' +
      'and verifiable credential do not match.');
  });

  it('should allow different issuers when "verifyMatchingIssuers" is ' +
    'false', async () => {
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
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '67342',
        statusListCredential: SLC.id,
      },
      // this issuer does not match the issuer for the mock SLC specified
      // by `SLC.id` above
      issuer: 'did:example:1234',
    };
    const suite = new Ed25519Signature2020();
    const result = await checkStatus({
      credential,
      suite,
      documentLoader,
      verifyStatusListCredential: true,
      // this flag is set to allow different values for credential.issuer and
      // SLC.issuer
      verifyMatchingIssuers: false,
    });
    should.not.exist(result.error);
    result.verified.should.equal(true);
  });
});

describe('assertStatusList2021Context', () => {
  it('should fail when "credential" is not an object', async () => {
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

  it('should fail when "@context" is not an array', async () => {
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

  it('should fail when first "@context" value is unexpected', async () => {
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

  it('should fail when "CONTEXTS.RL_V1" is not in "@context"', async () => {
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
});

describe('getCredentialStatus', () => {
  it('should fail when "credential" is not an object', async () => {
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

  it('should fail when "credentialStatus" is not an object', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    let err;
    let result;
    try {
      delete credential.credentialStatus;
      result = getCredentialStatus({credential, statusPurpose: 'revocation'});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(Error);
    err.message.should.contain('"credentialStatus" is missing or invalid');
  });

  it('should fail when "credentialStatus.type" is not ' +
    '"StatusList2021Entry"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    credential.credentialStatus = {
      id: 'https://example.com/status/1#67342',
      type: 'InvalidType',
      statusPurpose: 'revocation',
      statusListIndex: '67342',
      statusListCredential: SLC.id
    };
    let err;
    let result;
    try {
      result = getCredentialStatus({credential, statusPurpose: 'revocation'});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(Error);
    err.message.should.contain('"credentialStatus" with type ' +
      '"StatusList2021Entry" and status purpose "revocation" not found.');
  });

  it('should pass when credential has >= 1 credential status ' +
    'with correct type', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    credential.credentialStatus = [{
      id: 'https://example.com/status/1#67342',
      type: 'ex:NonmatchingStatusType',
      statusPurpose: 'suspension',
      statusListIndex: '67342',
      statusListCredential: SLC.id
    },
    {
      id: 'https://example.com/status/1#67342',
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: '67342',
      statusListCredential: SLC.id
    }];
    let err;
    let result;
    try {
      result = getCredentialStatus({credential, statusPurpose: 'revocation'});
    } catch(e) {
      err = e;
    }
    should.not.exist(err);
    should.exist(result);
    result.should.eql(credential.credentialStatus[1]);
  });

  it('should fail when "credential.credentialStatus" is an empty ' +
    'array', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    credential.credentialStatus = [ ];
    let err;
    let result;
    try {
      result = getCredentialStatus({credential, statusPurpose: 'revocation'});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.message.should.equal('"credentialStatus" with type ' +
      '"StatusList2021Entry" and status purpose "revocation" not found.');
  });

  it('should fail when "credential.credentialStatus" has no status with type ' +
    'matching "StatusList2021Entry"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    credential.credentialStatus = [{
      id: 'https://example.com/status/1#12345',
      type: 'ex:NonmatchingStatusType',
      statusPurpose: 'revocation',
      statusListIndex: '12345',
      statusListCredential: SLC.id
    },
    {
      id: 'https://example.com/status/1#67342',
      type: 'ex:NonmatchingStatusType',
      statusPurpose: 'suspension',
      statusListIndex: '67342',
      statusListCredential: SLC.id
    }];
    let err;
    let result;
    try {
      result = getCredentialStatus({credential, statusPurpose: 'revocation'});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.message.should.equal('"credentialStatus" with type ' +
      '"StatusList2021Entry" and status purpose "revocation" not found.');
  });

  it('should pass "credentialStatus" when "credentialStatus.type" is ' +
    '"StatusList2021Entry" and "statusPurpose" matches', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    credential.credentialStatus = {
      id: 'https://example.com/status/1#67342',
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: '67342',
      statusListCredential: SLC.id
    };
    let err;
    let result;
    try {
      result = getCredentialStatus({credential, statusPurpose: 'revocation'});
    } catch(e) {
      err = e;
    }
    should.not.exist(err);
    should.exist(result);
    result.should.eql(credential.credentialStatus);
  });

  it('should fail when "statusPurpose" is not specified', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    credential.credentialStatus = {
      id: 'https://example.com/status/1#67342',
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: '67342',
      statusListCredential: SLC.id
    };
    let err;
    let result;
    try {
      result = getCredentialStatus({credential});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.name.should.equal('TypeError');
    err.message.should.equal('"statusPurpose" must be a string.');
  });

  it('should fail when "statusPurpose" does not match ' +
    '"credentialStatus.statusPurpose"', async () => {
    const id = 'https://example.com/status/1';
    const list = await createList({length: 100000});
    const credential = await createCredential({id, list});
    credential.credentialStatus = {
      id: 'https://example.com/status/1#67342',
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: '67342',
      statusListCredential: SLC.id
    };
    let err;
    let result;
    try {
      result = getCredentialStatus({credential, statusPurpose: 'suspension'});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    should.not.exist(result);
    err.should.be.instanceof(Error);
    err.message.should.contain('"credentialStatus" with type ' +
      '"StatusList2021Entry" and status purpose "suspension" not found.');
  });
});
