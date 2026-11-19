import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFromAI } from '../lib/ai.js';
import { validateBrief } from '../lib/validation.js';
const brief=validateBrief({creatorName:'Riya',description:'I teach practical interview preparation and resume skills to young graduates in India who are searching for their first full-time job.',goal:'first_sale'});
const fixture={status:'ready',clarification:'',creatorName:'Riya',tagline:'Turn your first interview into a confident conversation',bio:'I help new graduates prepare for interviews and write clear resumes. Learn useful techniques you can practice at your own pace.',audience:'Indian graduates',positioning:'Start with the basics, then get personalized help.',products:[
  {format:'guide',title:'Resume checklist',description:'A step-by-step guide to review your resume before applying for a role.',includes:['Simple checklist','Examples you can adapt'],price:199,whyThisWorks:'An accessible, specific first offer.',cta:'Get updates'},
  {format:'workshop',title:'Interview foundations',description:'A practical workshop to organize your interview stories and practice delivery.',includes:['Live practice','Question framework'],price:799,whyThisWorks:'A clear next step.',cta:'Join interest list'},
  {format:'session',title:'One-to-one mock interview',description:'Practice answers to common questions and receive targeted feedback.',includes:['Practice interview','Actionable feedback'],price:1499,whyThisWorks:'More personal support.',cta:'Notify me'}
]};
test('generation makes a real-shaped server call; mocks only the test transport',async()=>{
  const original=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY='test-only-not-production';
  let call;
  try {
    const result=await generateFromAI(brief,async(url,opts)=>{
      call={url,opts};
      return {ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify(fixture)}}]})};
    });
    assert.match(call.url,/chat\/completions/);
    assert.match(call.opts.headers.authorization,/^Bearer /);
    const body=JSON.parse(call.opts.body);
    assert.equal(body.response_format.type,'json_schema');
    assert.equal(body.messages[1].role,'user');
    assert.equal(result.store.products.length,3);
    assert.match(result.store.products[0].id,/^offer-/);
    assert.equal(result.store.handle,'');
  } finally { if(original===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=original; }
});

test('the model can ask for clarity instead of inventing storefront ideas', async () => {
  const original=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY='test-only-not-production';
  try {
    const uncertain={...fixture,status:'needs_detail',clarification:'What specific skill do you teach, and to whom?',products:[]};
    await assert.rejects(()=>generateFromAI(brief,async()=>({ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify(uncertain)}}]})})),/What specific skill/);
  } finally { if(original===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=original; }
});
