import { useEffect, useState } from 'react';

const api = 'http://localhost:4000/api';

export default function App() {
  const [products, setProducts] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [cart, setCart] = useState([]);
  const [admin, setAdmin] = useState({ username: '', password: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', image_url: '', price_cents: 0, filament_id: '' });
  const [filamentForm, setFilamentForm] = useState({ material: '', color: '', sku: '', stock_grams: 0 });

  const load = async () => {
    setProducts(await (await fetch(`${api}/products`)).json());
    setFilaments(await (await fetch(`${api}/filaments`)).json());
  };
  useEffect(() => { load(); }, []);

  const addCart = (p) => setCart((c) => {
    const found = c.find((i) => i.id === p.id);
    return found ? c.map((i) => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i) : [...c, { id: p.id, name: p.name, price_cents: p.price_cents, quantity: 1 }];
  });

  const checkout = async () => {
    const r = await fetch(`${api}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart }) });
    const data = await r.json();
    if (data.url) window.location = data.url;
  };

  return <div className='wrap'>
    <header><h1>C2 3D Print Shop</h1><a href='https://designer.camwow.tv' target='_blank'>Design custom hype chains on designer.camwow.tv</a></header>
    <section><h2>Products</h2><div className='grid'>{products.map(p => <article key={p.id}><img src={p.image_url}/><h3>{p.name}</h3><p>{p.description}</p><small>{p.material} / {p.color}</small><b>${(p.price_cents/100).toFixed(2)}</b><button onClick={() => addCart(p)}>Add</button></article>)}</div></section>
    <section><h2>Cart ({cart.reduce((a,b)=>a+b.quantity,0)})</h2><button onClick={checkout}>Secure Stripe Checkout</button></section>
    <section><h2>Admin Login</h2><input placeholder='username' onChange={e=>setAdmin({...admin,username:e.target.value})}/><input placeholder='password' type='password' onChange={e=>setAdmin({...admin,password:e.target.value})}/><button onClick={()=>fetch(`${api}/admin/login`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(admin)})}>Login</button></section>
    <section><h2>Add Filament</h2><input placeholder='material' onChange={e=>setFilamentForm({...filamentForm,material:e.target.value})}/><input placeholder='color' onChange={e=>setFilamentForm({...filamentForm,color:e.target.value})}/><input placeholder='sku' onChange={e=>setFilamentForm({...filamentForm,sku:e.target.value})}/><input placeholder='grams' type='number' onChange={e=>setFilamentForm({...filamentForm,stock_grams:+e.target.value})}/><button onClick={async()=>{await fetch(`${api}/filaments`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(filamentForm)});load();}}>Save Filament</button></section>
    <section><h2>Add Product</h2><input placeholder='name' onChange={e=>setProductForm({...productForm,name:e.target.value})}/><input placeholder='description' onChange={e=>setProductForm({...productForm,description:e.target.value})}/><input placeholder='image url' onChange={e=>setProductForm({...productForm,image_url:e.target.value})}/><input placeholder='price cents' type='number' onChange={e=>setProductForm({...productForm,price_cents:+e.target.value})}/><select onChange={e=>setProductForm({...productForm,filament_id:+e.target.value})}><option>select filament</option>{filaments.map(f=><option key={f.id} value={f.id}>{f.material}-{f.color}</option>)}</select><button onClick={async()=>{await fetch(`${api}/products`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(productForm)});load();}}>Save Product</button></section>
  </div>;
}
