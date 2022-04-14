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
  issuer: 'did:key:z6MknUVLM84Eo5mQswCqP7f6oNER84rmVKkCvypob8UtBC8K',
  issuanceDate: '2021-03-10T04:24:12.164Z',
  type: [ 'VerifiableCredential', 'StatusList2021Credential' ],
  credentialSubject: {
    id: 'https://example.com/status/1#list',
    type: 'StatusList2021',
    encodedList: encodedList100KWith50KthRevoked,
    proof: {
      type: 'Ed25519Signature2020',
      created: '2022-04-14T18:59:44Z',
      // eslint-disable-next-line max-len
      verificationMethod: 'did:key:z6MknUVLM84Eo5mQswCqP7f6oNER84rmVKkCvypob8UtBC8K#z6MknCCLeeHBUaHu4aHSVLDCYQW9gjVJ7a63FpMvtuVMy53T',
      proofPurpose: 'assertionMethod',
      // eslint-disable-next-line max-len
      proofValue: 'z4EZMjmQNbJQJm5rWKyiLm486WrDJuQAdCHo2aAm9yQ3EkMjuFVCVY9Mab7dQhDtQRt4fJ7siytQZtcoUiQLCBEXB'
    }
  }
};
