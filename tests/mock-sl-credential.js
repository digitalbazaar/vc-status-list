/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import statusListCtx from 'vc-status-list-context';

const encodedList100KWith50KthRevoked =
  'H4sIAAAAAAAAA-3OMQ0AAAgDsOHfNB72EJJWQRMAAAAAAIDWXAcAAAAAAIDHFrc4zDz' +
  'UMAAA';
const VC_SL_CONTEXT_URL = statusListCtx.constants.CONTEXT_URL_V1;

export const slCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    VC_SL_CONTEXT_URL
  ],
  id: 'https://example.com/status/1',
  issuer: 'did:key:z6MknUVLM84Eo5mQswCqP7f6oNER84rmVKkCvypob8UtBC8K',
  issuanceDate: '2021-03-10T04:24:12.164Z',
  type: ['VerifiableCredential', 'StatusList2021Credential'],
  credentialSubject: {
    id: `https://example.com/status/1#list`,
    type: 'RevocationList2021',
    encodedList: encodedList100KWith50KthRevoked
  }
};
