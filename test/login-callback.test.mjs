import assert from 'node:assert/strict';
import test from 'node:test';
import {expiredLinkMessage,loginCallback,verificationFailure} from '../lib/login.mjs';

test('fragment token links await confirmation and issued sessions still open',()=>{
  assert.deepEqual(loginCallback('', '#token_hash=sample&type=email'),{verification:{token_hash:'sample',type:'email'}});
  assert.equal(loginCallback('', '#access_token=a&refresh_token=b').session.access,'a');
  assert.ok(loginCallback('', '#access_token=a').error);
  assert.ok(loginCallback('', '#token_hash=sample&type=recovery').error);
});

test('old provider error redirects lead to sign-in recovery',()=>{
  assert.equal(loginCallback('', '#error_code=otp_expired').error,expiredLinkMessage);
  assert.equal(loginCallback('?error=access_denied&error_description=Email+link+is+invalid+or+has+expired', '').error,expiredLinkMessage);
  assert.equal(loginCallback('?view=skills','').error,undefined);
});

test('expired and retryable verification failures have distinct recovery paths',()=>{
  assert.deepEqual(verificationFailure(403,'otp_expired'),{message:expiredLinkMessage,retryable:false});
  assert.equal(verificationFailure(400,'invalid_request').retryable,false);
  assert.equal(verificationFailure(429).retryable,true);
  assert.equal(verificationFailure(503).retryable,true);
});
