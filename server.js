const http=require("http"),fs=require("fs"),path=require("path"),https=require("https"),httpx=require("http");
const PORT=process.env.PORT||3000;
const esc=s=>(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
const tag=(x,n)=>esc(((x.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)<\\/${n}>`,"i"))||[])[1]||"").replace(/<!\[CDATA\[|\]\]>/g,"").trim());
function fetchText(url){return new Promise((ok,no)=>{const m=url.startsWith("https")?https:httpx;m.get(url,r=>{if(r.statusCode>=300&&r.statusCode<400&&r.headers.location)return fetchText(new URL(r.headers.location,url).href).then(ok,no);let d="";r.on("data",c=>d+=c);r.on("end",()=>ok(d));}).on("error",no)})}
function parse(xml){
 let blocks=[...xml.matchAll(/<(offer|product|item)\b[\s\S]*?<\/\1>/gi)].map(x=>x[0]);
 return blocks.slice(0,300).map((x,i)=>{
   let title=tag(x,"name")||tag(x,"title")||tag(x,"product_name");
   let price=Number((tag(x,"price")||tag(x,"sale_price")||"0").replace(/[^\d.]/g,""));
   let old=Number((tag(x,"oldprice")||tag(x,"old_price")||tag(x,"retail_price")||"0").replace(/[^\d.]/g,""));
   let image=tag(x,"picture")||tag(x,"image")||tag(x,"image_url");
   let url=tag(x,"url")||tag(x,"link")||tag(x,"deeplink");
   let store=tag(x,"vendor")||tag(x,"merchant")||tag(x,"brand")||"Live Deal";
   let off=old>price&&price>0?Math.round((old-price)/old*100):0;
   return {id:i,title,price,mrp:old,image,url,store,off};
 }).filter(x=>x.title&&x.url&&x.price);
}
const server=http.createServer(async(req,res)=>{
 if(req.url.startsWith("/api/deals")){
   res.setHeader("Content-Type","application/json");
   const feed=process.env.PRODUCT_FEED_URL;
   if(!feed)return res.end(JSON.stringify({configured:false,deals:[],message:"Add PRODUCT_FEED_URL in environment variables"}));
   try{let xml=await fetchText(feed);let deals=parse(xml).sort((a,b)=>b.off-a.off);res.end(JSON.stringify({configured:true,deals,updatedAt:new Date().toISOString()}))}
   catch(e){res.statusCode=500;res.end(JSON.stringify({configured:true,deals:[],message:e.message}))} return;
 }
 let p=req.url==="/"?"index.html":req.url.split("?")[0].slice(1), f=path.join(__dirname,"public",p);
 if(!f.startsWith(path.join(__dirname,"public"))||!fs.existsSync(f)){res.statusCode=404;return res.end("Not found")}
 const ext=path.extname(f);res.setHeader("Content-Type",ext===".html"?"text/html; charset=utf-8":ext===".js"?"application/javascript":"text/plain");fs.createReadStream(f).pipe(res);
});server.listen(PORT,()=>console.log("Loot Bhai live on "+PORT));