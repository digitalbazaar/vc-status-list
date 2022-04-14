/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import statusListCtx from '@digitalbazaar/vc-status-list-context';
import suiteCtx2020 from 'ed25519-signature-2020-context';

const encodedList100KWith50KthRevoked =
  'H4sIAAAAAAAAA-3OMQ0AAAgDsOHfNB72EJJWQRMAAAAAAIDWXAcAAAAAAIDHFrc4zDz' +
  'UMAAA';
const VC_SL_CONTEXT_URL = statusListCtx.constants.CONTEXT_URL_V1;
const SUITE_CONTEXT_URL = suiteCtx2020.constants.CONTEXT_URL;

export const slCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    VC_SL_CONTEXT_URL,
    SUITE_CONTEXT_URL
  ],
  id: 'https://example.com/status/1',
  issuer: 'did:key:z6MkhgCF7fgo4isGpbwRRPRh8kNyQ6VtvmqYcVMqPuzS2pWY',
  issuanceDate: '2021-03-10T04:24:12.164Z',
  type: [ 'VerifiableCredential', 'StatusList2021Credential' ],
  credentialSubject: {
    id: 'https://example.com/status/1#list',
    type: 'StatusList2021',
    encodedList: encodedList100KWith50KthRevoked
  },
  proof: {
    type: 'Ed25519Signature2020',
    created: '2022-04-14T20:20:54Z',
    verificationMethod: 'did:key:z6MkhgCF7fgo4isGpbwRRPRh8kNyQ6VtvmqYcVMqPuz' +
      'S2pWY#z6MkhgCF7fgo4isGpbwRRPRh8kNyQ6VtvmqYcVMqPuzS2pWY',
    proofPurpose: 'assertionMethod',
    proofValue: 'zsoPiKg5wabrkKMJqv8k5d2gEbVs7pfQK2591zcfntrkGmDAqSUSiK4xrmz' +
      'NmQNTNL8tc6kaY77fodY5Gtu2QAVC'
  }
};
