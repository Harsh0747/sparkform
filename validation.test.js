import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBrief, validateStorefront, normalizeHandle, validEmail, InputError } from '../lib/validation.js';
const validDescription = 'I teach practical interview skills to Indian fresh graduates, and help them improve their resumes and communicate clearly at job interviews.';
const aStore = {
  creatorName:'Riya', handle:'riya.coach', tagline:'A calmer path to your first job',
  bio:'I help new graduates get interview-ready with practical resumes, confident stories, and realistic practice.',
  audience:'Indian fresh graduates', positioning:'Beginner friendly', theme:'mint',
  products:[
    { id:'offer-1234',format:'guide',title:'Resume starter',description:'A practical guide to create a clear, focused resume in one sitting.',includes:['An easy-to-edit resume checklist','Five clarity examples'],price:199,whyThisWorks:'Low barrier to entry.',cta:'Get updates',visible:true },
    { id:'offer-5678',format:'session',title:'Interview practice',description:'A practical practice session to work through your common interview questions.',includes:['Interview questions','Personal feedback'],price:1199,whyThisWorks:'A premium follow-up.',cta:'Join interest list',visible:true }
  ]
};
test('accepts a detailed self-description; handle stays optional',()=>{
  const result=validateBrief({description:validDescription,handle:'@Example.Creator'});
  assert.equal(result.handle,'example.creator');
  assert.equal(result.goal,'first_sale');
});
test('handle alone does not pretend Instagram is scraped',()=>{
  assert.throws(()=>validateBrief({handle:'@creator'}),/cannot read Instagram profiles/i);
});
test('rejects short and gibberish input clearly',()=>{
  assert.throws(()=>validateBrief({description:'I coach people.'}),/at least 45 characters/i);
  assert.throws(()=>validateBrief({description:'zzzzzz zzzzz zz zzzzzzzzz zzz zzzzzzzz zzzzzzzzzzzz'}),InputError);
});
test('normalizes Instagram links but rejects malformed handles',()=>{
  assert.equal(normalizeHandle('https://instagram.com/riya.coach/'),'riya.coach');
  assert.throws(()=>normalizeHandle('not a handle!'),/valid Instagram handle/);
});
test('supports India-priced products and preserves only public properties',()=>{
  const result=validateStorefront(aStore);
  assert.equal(result.products[0].price,199);
  assert.equal(result.products[1].cta,'Join interest list');
  assert.equal(result.theme,'mint');
});
test('blocks zero visible offers and negative prices',()=>{
  assert.throws(()=>validateStorefront({...aStore,products:aStore.products.map(p=>({...p,visible:false}))}),/at least one offer visible/i);
  const neg=structuredClone(aStore);neg.products[0].price=-100;
  assert.throws(()=>validateStorefront(neg),/INR price/i);
});
test('validates addresses for consent collection',()=>{
  assert.equal(validEmail(' Test.Person+1@Example.com '),'test.person+1@example.com');
  assert.throws(()=>validEmail('not-email'),/valid email/);
});
