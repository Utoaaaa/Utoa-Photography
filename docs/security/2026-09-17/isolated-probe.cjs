const fs=require('fs'),vm=require('vm'),ts=require(process.cwd()+'/node_modules/typescript');
const env={NODE_ENV:'production',ADMIN_EMAILS:'admin@example.invalid'};
const rows=[];
const next={NextResponse:class extends Response{static json(v,o){return Response.json(v,o)} static next(){return {status:200,next:true}} static redirect(){return {status:308}}}};
const utils={parseRequestJsonSafe:async r=>{try{return await r.json()}catch{return {}}}};
function load(file,mocks={}){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:n=>{if(n==='next/server')return next;if(n in mocks)return mocks[n];throw Error('Blocked dependency: '+n)},process:{env},console:{log(){},warn(){},error(){}},URL,Response,Headers,Request,File,Date,Math,fetch:()=>{throw Error('Network forbidden')}});return exports;}
function req(path,method='GET',headers={},body){const r=new Request('https://site.example'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});r.nextUrl=new URL(r.url);return r;}
function check(name,value){rows.push({name,...value});}
(async()=>{
const auth=load('src/lib/auth.ts');
check('production no credentials rejected',{actual:auth.isAuthenticated(req('/')),expected:false});
check('forged email no JWT accepted',{actual:auth.requireAdminAuth(req('/', 'GET',{'cf-access-authenticated-user-email':'admin@example.invalid'})).email,expected:'admin@example.invalid'});
const middleware=load('middleware.ts',{'./src/lib/auth':auth}).middleware;
for(const path of ['/admin','/api/collections/11111111-1111-4111-8111-111111111111','/api/admin/years/2026.0/locations'])check('middleware '+path,{status:middleware(req(path)).status});
const up=load('src/app/api/images/direct-upload/route.ts',{'@/lib/utils':utils});
for(const token of [null,'invalid_token','arbitrary-value']){let r=await up.POST(req('/api/images/direct-upload','POST',token?{authorization:'Bearer '+token}:{},{filename:'test.jpg',content_type:'image/jpeg'}));check('direct upload '+(token||'no token'),{status:r.status});}
let dbTouched=0;const db={prepare(){dbTouched++;return {bind(){return this},first:async()=>null,run:async()=>({meta:{changes:0}})}}};
const mocks={'@/lib/utils':utils,'@/lib/cache':{},'@/lib/d1-queries':{shouldUseD1Direct:()=>true},'@/lib/cloudflare':{getD1Database:()=>db},'@/lib/auth':auth,'@/lib/d1/location-service':{}};
for(const file of ['src/app/api/collections/[collection_id]/route.ts','src/app/api/years/[year_id]/route.ts']){const mod=load(file,mocks);const before=dbTouched;const r=await mod.DELETE(req('/api/probe','DELETE'),{params:Promise.resolve({collection_id:'11111111-1111-4111-8111-111111111111',year_id:'11111111-1111-4111-8111-111111111111'})});check('anonymous DELETE '+file,{status:r.status,accessedMockDatabase:dbTouched>before});}

const cache={revalidatePathsWithRetry:async p=>({success:p,failed:[]}),revalidateTagsWithRetry:async p=>({success:p,failed:[]})};
const revalidate=load('src/app/api/revalidate/route.ts', {...mocks,'zod':require(process.cwd()+'/node_modules/zod'),'next/cache':{},'@/lib/cache':cache});
const rr=await revalidate.POST(req('/api/revalidate','POST',{authorization:'Bearer undefined'},{tags:['homepage']}));check('missing revalidate secret accepts literal undefined',{status:rr.status});
const fakePrisma={auditLog:{findMany:async()=>[],count:async()=>0}};
const audit=load('src/app/api/audit/route.ts',{'zod':require(process.cwd()+'/node_modules/zod'),'@/lib/auth':auth,'@/lib/db':{prisma:fakePrisma},'@/lib/queries/audit':{}});
check('audit arbitrary authorization header',{status:(await audit.GET(req('/api/audit','GET',{authorization:'anything'}))).status});
let stored;
const r2=load('src/app/api/uploads/r2/route.ts',{'next/server':next,'@/lib/auth':auth,'@/lib/cloudflare':{getR2Bucket:()=>({put:async(key,body,meta)=>{stored={key,...meta}}})},'@/lib/r2-variants':{}});
const html=new File(['<html>security review inert fixture</html>'],'fixture.jpg',{type:'text/html'});
const uploadReq={url:'https://site.example/api/uploads/r2?variant=thumb&image_id=probe',headers:new Headers({'content-type':'multipart/form-data','cf-access-authenticated-user-email':'admin@example.invalid'}),formData:async()=>new Map([['file',html]])};
check('R2 accepts HTML disguised as jpg',{status:(await r2.POST(uploadReq)).status,stored});
console.log(JSON.stringify({environment:'isolated transpiled source; production; no real database, secrets or network',results:rows},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
