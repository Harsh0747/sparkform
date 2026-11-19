import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
const dir=mkdtempSync(join(tmpdir(),'sparkform-test-'));
process.env.NODE_ENV='test';
process.env.STORE_DB_PATH=join(dir,'store.sqlite');
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
const { handleRequest }=await import('../server.js');
const store={creatorName:'Aditi Patel',handle:'aditi.creates',tagline:'Better mornings, one small habit at a time',bio:'I help busy working professionals build sustainable routines and care for themselves with simple daily rituals.',audience:'Indian working professionals',positioning:'Warm and practical',theme:'lavender',products:[
  {id:'offer-aaaa1111',format:'guide',title:'10-minute morning guide',description:'A short practical guide to set up a calmer morning without a complicated schedule.',includes:['Daily checklist','Practical routine'],price:299,whyThisWorks:'Easy starter.',cta:'Get updates',visible:true},
  {id:'offer-bbbb2222',format:'session',title:'Personal habit session',description:'A one-to-one discussion to design a simple sustainable daily routine.',includes:['45-minute session','Next-step plan'],price:1299,whyThisWorks:'More guidance.',cta:'Join interest list',visible:true}
]};
test('full publish -> public HTML -> interest -> owner leads -> update; no real LLM mocked in app',async()=>{
  const server=http.createServer((req,res)=>handleRequest(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const request=(path,method,data,token)=>fetch(origin+path,{method,headers:{'content-type':'application/json',...(token?{'x-edit-token':token}:{})},body:JSON.stringify(data)});
  try {
    const bad=await request('/api/generate','POST',{handle:'@someperson'});
    assert.equal(bad.status,400);
    assert.match((await bad.json()).error,/cannot read Instagram/i);
    const publish=await request('/api/publish','POST',{store});
    assert.equal(publish.status,201);
    const details=await publish.json();
    assert.match(details.url,/\/s\/aditi-patel-/);
    assert.equal(details.editToken.length,64);
    const page=await fetch(details.url);
    const html=await page.text();
    assert.equal(page.status,200);
    assert.match(html,/10-minute morning guide/);
    assert.match(html,/register interest/i);
    assert.doesNotMatch(html,/type="submit"[^>]*buy now/i);
    const interest=await request('/api/interest','POST',{slug:details.slug,productId:'offer-aaaa1111',email:'aisha@example.com',consent:true});
    assert.equal(interest.status,200);
    const duplicate=await request('/api/interest','POST',{slug:details.slug,productId:'offer-aaaa1111',email:'aisha@example.com',consent:true});
    assert.equal((await duplicate.json()).isNew,false);
    const badAccess=await fetch(`${origin}/api/leads?slug=${details.slug}`);
    assert.equal(badAccess.status,403);
    const leads=await fetch(`${origin}/api/leads?slug=${details.slug}`,{headers:{'x-edit-token':details.editToken}});
    const result=await leads.json();
    assert.equal(result.count,1);
    assert.equal(result.leads[0].email,'aisha@example.com');
    const unauthorizedUpdate=await request('/api/publish','PUT',{slug:details.slug,store},'0'.repeat(64));
    assert.equal(unauthorizedUpdate.status,403);
    const updated={...store,tagline:'A calmer, stronger start to every day'};
    const update=await request('/api/publish','PUT',{slug:details.slug,store:updated},details.editToken);
    assert.equal(update.status,200);
    assert.match(await (await fetch(details.url)).text(),/A calmer, stronger start to every day/);
    const removed=await request('/api/leads','DELETE',{slug:details.slug,productId:'offer-aaaa1111',email:'aisha@example.com'},details.editToken);
    assert.equal(removed.status,200);
    assert.equal((await removed.json()).deleted,true);
    const afterRemoval=await fetch(`${origin}/api/leads?slug=${details.slug}`,{headers:{'x-edit-token':details.editToken}});
    assert.equal((await afterRemoval.json()).count,0);
    const missing=await fetch(`${origin}/s/not-existing-store`);
    assert.equal(missing.status,404);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

test('HTTP generation path uses its provider endpoint and creates an editable storefront', async () => {
  const originalKey=process.env.OPENAI_API_KEY;
  const originalUrl=process.env.OPENAI_BASE_URL;
  let providerRequests=0;
  const provider=http.createServer(async(req,res)=>{
    providerRequests++;
    assert.equal(req.headers.authorization,'Bearer test-local-key');
    const chunks=[];for await(const part of req)chunks.push(part);
    const body=JSON.parse(Buffer.concat(chunks).toString());
    assert.equal(body.response_format.type,'json_schema');
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({
      status:'ready',clarification:'',creatorName:'Aditi Patel',tagline:store.tagline,bio:store.bio,
      audience:store.audience,positioning:store.positioning,
      products:store.products.map(({format,title,description,includes,price,whyThisWorks,cta})=>({format,title,description,includes,price,whyThisWorks,cta}))
    })}}]}));
  });
  const app=http.createServer((req,res)=>handleRequest(req,res));
  await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  process.env.OPENAI_API_KEY='test-local-key';
  process.env.OPENAI_BASE_URL=`http://127.0.0.1:${provider.address().port}/chat/completions`;
  try {
    const result=await fetch(`http://127.0.0.1:${app.address().port}/api/generate`,{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        creatorName:'Aditi Patel',description:'I help busy Indian working professionals build calmer morning routines, manage their habits, and make practical progress using simple daily steps.'
      })});
    assert.equal(result.status,200);
    const payload=await result.json();
    assert.equal(payload.store.products.length,2);
    assert.equal(payload.store.products[0].price,299);
    assert.equal(providerRequests,1);
  } finally {
    if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;
    if(originalUrl===undefined)delete process.env.OPENAI_BASE_URL;else process.env.OPENAI_BASE_URL=originalUrl;
    await new Promise(resolve=>app.close(resolve));
    await new Promise(resolve=>provider.close(resolve));
  }
});
