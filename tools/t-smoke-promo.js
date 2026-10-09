const {chromium}=require('playwright');const {pathToFileURL}=require('url');const path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000}});
await ctx.route('**/BFCM_Promotion*',r=>{const m=/Mobile/.test(r.request().url());const w=m?740:1266,h=m?370:320;r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" fill="#ffd9c2"/><text x="50%" y="50%" font-size="60" text-anchor="middle" fill="#a31">BFCM</text></svg>'});});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
const u=pathToFileURL(path.resolve(__dirname,'..','index.html')).href;
await p.goto(u);await p.waitForTimeout(800);await p.screenshot({path:'test/promo-home.png'});
await p.goto(u+'#/master/promotion');await p.waitForTimeout(600);await p.screenshot({path:'test/promo-master.png'});
await p.goto(u+'#/master/promotion/edit/promo-bfcm');await p.waitForTimeout(600);await p.screenshot({path:'test/promo-edit.png',fullPage:true});
console.log('errors:',errs.join(' | ')||'none');await b.close();})();
