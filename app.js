// KIVORA marketplace front end. Add Supabase project URL and public anon key below.
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY) : null;
const sample = [
{id:"demo1",name:"Everyday Tote Bag",category:"Fashion",price:12500,description:"A versatile everyday carryall.",image_url:"",store_name:"KIVORA EDIT"},
{id:"demo2",name:"Wireless Headphones",category:"Electronics",price:28500,description:"Enjoy your favourite sounds.",image_url:"",store_name:"TECH FINDS"},
{id:"demo3",name:"Glow Skincare Set",category:"Beauty",price:18900,description:"A simple skincare set.",image_url:"",store_name:"GLOW HOUSE"},
{id:"demo4",name:"Minimal Desk Lamp",category:"Home",price:22000,description:"A clean look for your workspace.",image_url:"",store_name:"HOME EDIT"}
];
let products=[],category="All",search="",cart=JSON.parse(localStorage.getItem("kivora_cart")||"[]"),mode="login";
const $=id=>document.getElementById(id),money=n=>"₦"+Number(n).toLocaleString("en-NG");
function showModal(id){$("overlay").classList.add("show");$(id).classList.add("show")}
function closeAll(){$("overlay").classList.remove("show");document.querySelectorAll(".modal").forEach(x=>x.classList.remove("show"));$("cartDrawer").classList.remove("open")}
function message(id,text){$(id).textContent=text}
async function loadProducts(){
 if(db){const {data,error}=await db.from("products").select("id,name,category,price,description,image_url,store_name").eq("is_active",true).order("created_at",{ascending:false});if(!error)products=data||[];else{$("loadMessage").textContent="Could not load live listings: "+error.message;products=sample}}
 else{products=sample;$("loadMessage").textContent="Preview mode: connect Supabase to publish and load real seller listings."}
 renderProducts();
}
function renderProducts(){
 const list=products.filter(p=>(category==="All"||p.category===category)&&(`${p.name} ${p.category} ${p.store_name||""}`).toLowerCase().includes(search.toLowerCase()));
 $("productGrid").innerHTML=list.map(p=>`<article class="card"><div class="photo">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`:`<span style="font-size:55px">✦</span>`}<span class="tag">${esc(p.category||"FIND")}</span></div><div class="card-info"><small>${esc(p.category||"Marketplace")}</small><h3>${esc(p.name)}</h3><div class="price">${money(p.price)}</div><div class="store">${esc(p.store_name||"KIVORA seller")}</div><button data-add="${esc(String(p.id))}">ADD TO CART ＋</button></div></article>`).join("");
 $("productCount").textContent=`${list.length} products`;$("productTitle").textContent=category==="All"?"Explore popular finds":`Explore ${category}`;$("emptyState").hidden=list.length>0;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function saveCart(){localStorage.setItem("kivora_cart",JSON.stringify(cart));renderCart()}
function renderCart(){
 $("cartCount").textContent=cart.reduce((a,x)=>a+x.qty,0);
 $("cartItems").innerHTML=cart.length?cart.map(x=>{const p=products.find(y=>String(y.id)===String(x.id))||x;return `<div class="cart-row">${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:`<span>✦</span>`}<div><b>${esc(p.name)}</b><small>${x.qty} × ${money(p.price)}</small></div><button data-remove="${esc(String(x.id))}">Remove</button></div>`}).join(""):'<p class="empty">Your cart is waiting for something good.</p>';
 $("cartTotal").textContent=money(cart.reduce((a,x)=>a+x.price*x.qty,0));
}
function addCart(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;const found=cart.find(x=>String(x.id)===String(id));if(found)found.qty++;else cart.push({...p,qty:1});saveCart()}
function setMode(m){mode=m;document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===m));$("authTitle").textContent=m==="login"?"Your account, your finds.":"Join the KIVORA community.";$("authSubmit").textContent=m==="login"?"Log in":"Create account";message("authMessage","")}
document.addEventListener("click",e=>{
 const a=e.target.closest("[data-add]");if(a)addCart(a.dataset.add);
 const r=e.target.closest("[data-remove]");if(r){cart=cart.filter(x=>String(x.id)!==r.dataset.remove);saveCart()}
 const c=e.target.closest("[data-category]");if(c){category=c.dataset.category;document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("active",x===c));renderProducts()}
 const t=e.target.closest("[data-mode]");if(t)setMode(t.dataset.mode);
 if(e.target.matches("[data-close]")||e.target===$("overlay"))closeAll();
});
$("searchForm").addEventListener("submit",e=>{e.preventDefault();search=$("searchInput").value.trim();renderProducts();$("shop").scrollIntoView({behavior:"smooth"})});
$("accountBtn").onclick=()=>{showModal("authModal");setMode("login")};
$("sellBtn").onclick=$("sellerBannerBtn").onclick=()=>{showModal("sellerModal");message("sellerMessage","")};
$("cartBtn").onclick=()=>{$("overlay").classList.add("show");$("cartDrawer").classList.add("open")};
$("checkoutBtn").onclick=()=>alert("Secure checkout is not connected yet. Payment provider integration is required before accepting payments.");
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!db){message("authMessage","Connect Supabase in app.js and run supabase_setup.sql before enabling real accounts.");return}
 $("authSubmit").disabled=true;const email=$("authEmail").value.trim(),password=$("authPassword").value;
 const result=mode==="signup"?await db.auth.signUp({email,password}):await db.auth.signInWithPassword({email,password});
 $("authSubmit").disabled=false;message("authMessage",result.error?result.error.message:(mode==="signup"?"Account created. Check your email if confirmation is enabled.":"You are signed in."));
});
$("pImage").addEventListener("change",()=>{const file=$("pImage").files[0];if(!file)return;if(file.size>5*1024*1024){message("sellerMessage","Image must be 5 MB or smaller.");$("pImage").value="";return}const url=URL.createObjectURL(file);$("imagePreview").src=url;$("imagePreview").hidden=false;});
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!db){message("sellerMessage","Seller uploads need Supabase. Add your project URL/key in app.js and run supabase_setup.sql. No image or product is being saved in preview mode.");return}
 const {data:{user},error:userError}=await db.auth.getUser();if(userError||!user){message("sellerMessage","Please log in with your seller account first.");return}
 const file=$("pImage").files[0];if(!file){message("sellerMessage","Choose a product image.");return}
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){message("sellerMessage","Use JPG, PNG or WEBP, maximum 5 MB.");return}
 $("productSubmit").disabled=true;message("sellerMessage","Uploading product image…");
 const safeName=file.name.toLowerCase().replace(/[^a-z0-9.-]/g,"-");const path=`${user.id}/${crypto.randomUUID()}-${safeName}`;
 const upload=await db.storage.from("product-images").upload(path,file,{contentType:file.type,upsert:false});
 if(upload.error){$("productSubmit").disabled=false;message("sellerMessage","Image upload failed: "+upload.error.message);return}
 const {data:{publicUrl}}=db.storage.from("product-images").getPublicUrl(path);
 const row={seller_id:user.id,name:$("pName").value.trim(),category:$("pCategory").value,price:Number($("pPrice").value),description:$("pDescription").value.trim(),image_url:publicUrl,store_name:user.user_metadata?.store_name||user.email,is_active:true};
 const insert=await db.from("products").insert(row);
 $("productSubmit").disabled=false;
 if(insert.error){message("sellerMessage","Product record could not be saved: "+insert.error.message);return}
 message("sellerMessage","Your product is live on KIVORA!");$("productForm").reset();$("imagePreview").hidden=true;await loadProducts();
});
$("year").textContent=new Date().getFullYear();renderCart();loadProducts();
