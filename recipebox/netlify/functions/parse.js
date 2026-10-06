const dec=s=>String(s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;|&#34;/g,'"').replace(/&#0?39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n)).replace(/<[^>]+>/g,'').trim();
const meta=(h,p)=>{const m=h.match(new RegExp('<meta[^>]+(?:property|name)=["\']'+p+'["\'][^>]*>','i'));const c=m&&m[0].match(/content=["']([^"']*)["']/i);return c?dec(c[1]):''};
const find=n=>{if(!n||typeof n!=='object')return null;if(Array.isArray(n)){for(const x of n){const r=find(x);if(r)return r}return null}
const t=[].concat(n['@type']||[]);if(t.includes('Recipe'))return n;return find(n['@graph'])};
const mins=s=>{const m=String(s||'').match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/);return m?(+m[1]||0)*60+(+m[2]||0):0};
const img=i=>Array.isArray(i)?img(i[0]):typeof i==='string'?i:i&&i.url||'';
const steps=s=>[].concat(s||[]).flatMap(x=>typeof x==='string'?dec(x).split(/\n+/):x.itemListElement?steps(x.itemListElement):[dec(x.text||x.name)]).filter(Boolean);
exports.handler=async e=>{
  const url=new URL(e.rawUrl).searchParams.get('url');
  const out=(c,b)=>({statusCode:c,headers:{'content-type':'application/json'},body:JSON.stringify(b)});
  if(!/^https?:\/\//.test(url||''))return out(400,{error:'bad url'});
  try{
    const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36','accept-language':'en'}});
    const h=await r.text();let rec=null;
    for(const m of h.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)){try{rec=find(JSON.parse(m[1]));if(rec)break}catch{}}
    if(rec)return out(200,{name:dec(rec.name),image:img(rec.image),time:mins(rec.totalTime)||mins(rec.cookTime),servings:dec([].concat(rec.recipeYield||'')[0]),
      ingredients:[].concat(rec.recipeIngredient||[]).map(dec),steps:steps(rec.recipeInstructions),notes:''});
    const d=meta(h,'og:description')||meta(h,'description'),name=meta(h,'og:title')||dec((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]);
    const o={name,image:meta(h,'og:image'),time:0,servings:'',ingredients:[],steps:[],notes:d};
    const a=d.search(/ingredients/i),b=d.search(/(method|instructions|directions|steps)\s*:?/i);
    if(a>=0&&b>a){const ln=t=>t.split(/\n|•|;|(?<=\.)\s/).map(x=>x.replace(/^[-\d.)\s]+/,'').trim()).filter(Boolean);
      o.ingredients=ln(d.slice(a,b)).slice(1);o.steps=ln(d.slice(b)).slice(1);o.notes=''}
    return out(200,o);
  }catch(err){return out(500,{error:String(err)})}
};
