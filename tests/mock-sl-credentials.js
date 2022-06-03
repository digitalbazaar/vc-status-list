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

export const slCredentialRevocation = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    VC_SL_CONTEXT_URL,
    SUITE_CONTEXT_URL
  ],
  id: 'https://example.com/status/1',
  issuer: 'did:key:z6MkesAkkxuETfHCMdv3gRTKr6iFiQZMjGT5pM8745oSzGX1',
  issuanceDate: '2022-06-02T16:00:21Z',
  type: ['VerifiableCredential', 'StatusList2021Credential'],
  credentialSubject: {
    id: 'https://example.com/status/1#list',
    type: 'StatusList2021',
    encodedList: encodedList100KWith50KthRevoked,
    statusPurpose: 'revocation'
  },
  proof: {
    type: 'Ed25519Signature2020',
    created: '2022-06-02T16:00:21Z',
    verificationMethod: 'did:key:z6MkesAkkxuETfHCMdv3gRTKr6iFiQZMjGT5pM8745oS' +
      'zGX1#z6MkesAkkxuETfHCMdv3gRTKr6iFiQZMjGT5pM8745oSzGX1',
    proofPurpose: 'assertionMethod',
    proofValue: 'z23V1M4NHs6MZP2T2ANyFHbvyxg9VaEgK58CXqXBnugPUR1sXc7rxuw6h4bK' +
      'cjDD24WRa7PSiAidtFWDa7UskBQxS'
  }
};

export const slCredentialSuspension = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    VC_SL_CONTEXT_URL,
    SUITE_CONTEXT_URL
  ],
  id: 'https://example.com/status/2',
  issuer: 'did:key:z6MkesAkkxuETfHCMdv3gRTKr6iFiQZMjGT5pM8745oSzGX1',
  issuanceDate: '2022-06-02T16:06:22Z',
  type: ['VerifiableCredential', 'StatusList2021Credential'],
  credentialSubject: {
    id: 'https://example.com/status/2#list',
    type: 'StatusList2021',
    encodedList: encodedList100KWith50KthRevoked,
    statusPurpose: 'suspension'
  },
  proof: {
    type: 'Ed25519Signature2020',
    created: '2022-06-02T16:06:22Z',
    verificationMethod: 'did:key:z6MkesAkkxuETfHCMdv3gRTKr6iFiQZMjGT5pM8745oS' +
      'zGX1#z6MkesAkkxuETfHCMdv3gRTKr6iFiQZMjGT5pM8745oSzGX1',
    proofPurpose: 'assertionMethod',
    proofValue: 'z5T6qqcpmoMGNh8ufZCo5fgPvU94BCFaqii2QCyHTXi51Mypw2QJusKuWuJ' +
      '7HbC7wKgzYQUQbFgJYBh7DcZkX2dCM'
  }
};
