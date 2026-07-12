const https = require("https");
const http = require("http");

const esc=s=>(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
const tag=(x,n)=>esc(((x.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)<\\/${n}>`,"i"))||[])[1]||"").replace(/<!\[CDATA\[|\]\]>/g,"").trim());

function fetchText(url){
  return new Promise((ok,no)=>{
    const m=url.startsWith("https")?https:http;
    m.get(url,r=>{
      if(r.statusCode>=300&&r.statusCode<400&&r.headers.location)
        return fetchText(new URL(r.headers.location,url).href).then(ok,no);
      let d="";
      r.on("data",c=>d+=c);
      r.on("end",()=>ok(d));
    }).on("error",no);
  });
}

function parse(xml){
  const blocks=[...xml.matchAll(/<(offer|product|item)\b[\s\S]*?<\/\1>/gi)].map(x=>x[0]);
  return blocks.slice(0,300).map((x,i)=>{
    const title=tag(x,"name")||tag(x,"title")||tag(x,"product_name");
    const price=Number((tag(x,"price")||tag(x,"sale_price")||"0").replace(/[^\d.]/g,""));
    const old=Number((tag(x,"oldprice")||tag(x,"old_price")||tag(x,"retail_price")||"0").replace(/[^\d.]/g,""));
    const image=tag(x,"picture")||tag(x,"image")||tag(x,"image_url");
    const url=tag(x,"url")||tag(x,"link")||tag(x,"deeplink");
    const store=tag(x,"vendor")||tag(x,"merchant")||tag(x,"brand")||"Live Deal";
    const off=old>price&&price>0?Math.round((old-price)/old*100):0;
    return {id:i,title,price,mrp:old,image,url,store,off};
  }).filter(x=>x.title&&x.url&&x.price).sort((a,b)=>b.off-a.off);
}

module.exports = async (req,res)=>{
  const feed=process.env.PRODUCT_FEED_URL;
  res.setHeader("Cache-Control","s-maxage=900, stale-while-revalidate=60");
  if(!feed) return res.status(200).json({configured:false,deals:[],message:"Add PRODUCT_FEED_URL in Vercel Environment Variables"});
  try{
    const xml=await fetchText(feed);
    return res.status(200).json({configured:true,deals:parse(xml),updatedAt:new Date().toISOString()});
  }catch(e){
    return res.status(500).json({configured:true,deals:[],message:e.message});
  }
};