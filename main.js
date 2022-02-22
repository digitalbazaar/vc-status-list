/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {StatusList} from './StatusList.js';
import vc from '@digitalbazaar/vc';
import statusListCtx from 'vc-status-list-context';
import credentialsCtx from 'credentials-context';

const VC_V1_CONTEXT_URL = credentialsCtx.constants.CREDENTIALS_CONTEXT_V1_URL;
const SL_V1_CONTEXT_URL = statusListCtx.constants.CONTEXT_URL_V1;

export async function createList({length}) {
  return new StatusList({length});
}

export async function decodeList({encodedList}) {
  return StatusList.decode({encodedList});
}

export async function createCredential({id, list}) {
  const encodedList = await list.encode();
  return {
    '@context': [VC_V1_CONTEXT_URL, SL_V1_CONTEXT_URL],
    id,
    type: ['VerifiableCredential', 'StatusList2021Credential'],
    credentialSubject: {
      id: `${id}#list`,
      type: 'RevocationList2021',
      encodedList
    }
  };
}

export async function checkStatus({
  credential,
  documentLoader,
  suite,
  verifyStatusListCredential = true,
  verifyMatchingIssuers = true
} = {}) {
  let result;
  try {
    result = await _checkStatuses({
      credential,
      documentLoader,
      suite,
      verifyStatusListCredential,
      verifyMatchingIssuers,
    });
  } catch(error) {
    result = {
      verified: false,
      error,
    };
  }
  return result;
}

export function statusTypeMatches({credential} = {}) {
  _isObject({credential});
  // check for expected contexts
  const {'@context': contexts} = credential;
  if(!Array.isArray(contexts)) {
    throw new TypeError('"@context" must be an array.');
  }
  if(contexts[0] !== VC_V1_CONTEXT_URL) {
    throw new Error(
      `The first "@context" value must be "${VC_V1_CONTEXT_URL}".`);
  }
  const {credentialStatus} = credential;
  if(!credentialStatus) {
    // no status; no match
    return false;
  }
  if(typeof credentialStatus !== 'object') {
    // bad status
    throw new Error('"credentialStatus" is invalid.');
  }
  if(!contexts.includes(SL_V1_CONTEXT_URL)) {
    // context not present, no match
    return false;
  }
  const credentialStatuses = _getStatuses({credential});
  // at least one "credentialStatus.type" must match
  // RevocationList2021Status or SuspensionList2021Status
  return credentialStatuses.some(credentialStatus => {
    if(!(credentialStatus.type === 'RevocationList2021Status' ||
      credentialStatus.type === 'SuspensionList2021Status')) {
      // status type does not match
      return false;
    }
    return true;
  })
}

export function assertStatusList2021Context({credential} = {}) {
  _isObject({credential});
  // check for expected contexts
  const {'@context': contexts} = credential;
  if(!Array.isArray(contexts)) {
    throw new TypeError('"@context" must be an array.');
  }
  if(contexts[0] !== VC_V1_CONTEXT_URL) {
    throw new Error(
      `The first "@context" value must be "${VC_V1_CONTEXT_URL}".`);
  }
  if(!contexts.includes(SL_V1_CONTEXT_URL)) {
    throw new TypeError(`"@context" must include "${SL_V1_CONTEXT_URL}".`);
  }
}

export function getCredentialStatus({credential, statusType} = {}) {
  _isObject({credential});
  assertStatusList2021Context({credential});
  // statusType can be `revoked` or `suspended`
  const statusTypes = {
    revoked: 'RevocationList2021Status',
    suspended: 'SuspensionList2021Status'
  };
  const expectedType = statusTypes[statusType] || statusType;
  // get and validate status
  if(!(credential.credentialStatus &&
    typeof credential.credentialStatus === 'object')) {
    throw new Error('"credentialStatus" is missing or invalid.');
  }
  const credentialStatuses = _getStatuses({credential});
  const result = credentialStatuses.filter(
    credentialStatus => _validateStatus({credentialStatus})).find(
    cs => cs.type === expectedType);
  if(!result) {
    throw new Error(`credentialStatus type "${statusType}" not found.`);
  }
  return result;
}

function _validateStatus({credentialStatus}) {
  if(!(credentialStatus.type === 'RevocationList2021Status' ||
    credentialStatus.type === 'SuspensionList2021Status')) {
    throw new Error(
      '"credentialStatus.type" must be "RevocationList2021Status" or ' +
        '"SuspensionList2021Status".');
  }
  if(typeof credentialStatus.id !== 'string') {
    throw new TypeError(
      '"credentialStatus.id" must be a string.');
  }
  if(typeof credentialStatus.statusListCredential !== 'string') {
    throw new TypeError(
      '"credentialStatus.statusListCredential" must be a string.');
  }
  const index = parseInt(credentialStatus.statusListIndex, 10);
  if(isNaN(index)) {
    throw new TypeError('"statusListIndex" must be an integer.');
  }
  if(credentialStatus.id === credentialStatus.statusListCredential) {
    throw new Error('"credentialStatus.id" must not be "credentialStatus.statusListCredential".');
  }
  return credentialStatus;
}

/**
 * Checks if a credential is not falsey and an object.
 *
 * @param {object} options to use.
 * @param {object} [options.credential] - A potential VC.
 *
 * @throws - Throws if the credential is falsey or not an object.
 *
 * @returns {undefined}
 */
function _isObject({credential}) {
  if(!(credential && typeof credential === 'object')) {
    throw new TypeError('"credential" must be an object.');
  }
}

/**
 * Gets the statuses of a credential.
 *
 * @param {object} options - Options to use.
 * @param {object} options.credential - A VC with a credentialStatus.
 *
 * @returns {Array<object>} An array of statuses.
 */
function _getStatuses({credential}) {
  const {credentialStatus} = credential;
  if(Array.isArray(credentialStatus)) {
    return credentialStatus;
  }
  return [credentialStatus];
}

async function _checkStatus({
  credential,
  credentialStatus,
  verifyStatusListCredential,
  verifyMatchingIssuers,
  suite,
  documentLoader
}) {
  // get SL position
  const {statusListIndex} = credentialStatus;
  const index = parseInt(statusListIndex, 10);
  // retrieve SL VC
  let slCredential;
  try {
    ({document: slCredential} = await documentLoader(
      credentialStatus.statusListCredential));
  } catch(e) {
    const err = new Error(
      'Could not load "StatusList2021Credential"; ' +
      `reason: ${e.message}`);
    err.cause = e;
    throw err;
  }

  // verify SL VC
  if(verifyStatusListCredential) {
    const verifyResult = await vc.verifyCredential({
      credential: slCredential,
      suite,
      documentLoader
    });
    if(!verifyResult.verified) {
      const {error: e} = verifyResult;
      let msg = '"StatusList2021Credential" not verified';
      if(e) {
        msg += `; reason: ${e.message}`;
      } else {
        msg += '.';
      }
      const err = new Error(msg);
      if(e) {
        err.cause = verifyResult.error;
      }
      throw err;
    }
  }

  // ensure that the issuer of the verifiable credential matches
  // the issuer of the statusListCredential
  if(verifyMatchingIssuers) {
    // covers both the URI and object cases
    const credentialIssuer =
      typeof credential.issuer === 'object' ?
        credential.issuer.id : credential.issuer;
    const statusListCredentialIssuer =
      typeof slCredential.issuer === 'object' ?
        slCredential.issuer.id : slCredential.issuer;

    if(!(credentialIssuer && statusListCredentialIssuer) ||
      (credentialIssuer !== statusListCredentialIssuer)) {
      throw new Error(
        'Issuers of the status list credential and verifiable ' +
        'credential do not match.');
    }
  }
  if(!slCredential.type.includes('StatusList2021Credential')) {
    throw new Error(
      'Status list credential type must include "StatusList2021Credential".');
  }

  // get JSON RevocationList
  const {credentialSubject: rl} = slCredential;

  if(rl.type !== 'RevocationList2021') {
    throw new Error('Revocation list type must be "RevocationList2021".');
  }

  // decode list from RL VC
  const {encodedList} = rl;
  let list;
  try {
    list = await decodeList({encodedList});
  } catch(e) {
    const err = new Error(
      `Could not decode encoded revocation list; reason: ${e.message}`);
    err.cause = e;
    throw err;
  }

  // check VC's SL index for revocation status
  const verified = !list.getStatus(index);

  // TODO: return anything else? returning `slCredential` may be too unwieldy
  // given its potentially large size
  return {verified};

}

async function _checkStatuses({
  credential,
  documentLoader,
  suite,
  verifyStatusListCredential,
  verifyMatchingIssuers
}) {
  _isObject({credential});
  if(typeof documentLoader !== 'function') {
    throw new TypeError('"documentLoader" must be a function.');
  }
  if(verifyStatusListCredential && !(suite && (
    isArrayOfObjects(suite) ||
    (!Array.isArray(suite) && typeof suite === 'object')))) {
    throw new TypeError('"suite" must be an object or an array of objects.');
  }
  // check the credential for correct status type
  statusTypeMatches({credential});
  const credentialStatuses = _getStatuses({credential});
  credentialStatuses.forEach(credentialStatus => _validateStatus({credentialStatus}));
  const results = await Promise.all(credentialStatuses.map(
    credentialStatus => _checkStatus({
      credential,
      credentialStatus,
      suite,
      documentLoader,
      verifyStatusListCredential,
      verifyMatchingIssuers
    })));
  const verified = results.every(({verified = false} = {}) => verified === true);
  return {verified};
}

function isArrayOfObjects(x) {
  return Array.isArray(x) && x.length > 0 &&
    x.every(x => x && typeof x === 'object');
}
