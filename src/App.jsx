import { useEffect, useState, useCallback } from 'react';

const PAGES = { SHOP: 'shop', CART: 'cart', ADMIN: 'admin' };

function Toasts({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}

function Nav({ page, setPage, cartCount }) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <button className="nav-logo" onClick={() => setPage(PAGES.SHOP)}>
          C2 <span>3D PRINT SHOP</span>
        </button>
        <div className="nav-links">
          <button className={page === PAGES.SHOP ? 'active' : ''} onClick={() => setPage(PAGES.SHOP)}>
            Shop
          </button>
          <button className={page === PAGES.CART ? 'active' : ''} onClick={() => setPage(PAGES.CART)}>
            Cart{cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          <button className={page === PAGES.ADMIN ? 'active' : ''} onClick={() => setPage(PAGES.ADMIN)}>
            Admin
          </button>
        </div>
      </div>
    </nav>
  );
}

function ShopPage({ products, onAddToCart }) {
  return (
    <>
      <section className="hero">
        <h1>Premium 3D Printed Products</h1>
        <p>Custom-crafted with precision. Each piece made to order with the finest filaments.</p>
        <a href="https://designer.camwow.tv" target="_blank" rel="noopener noreferrer" className="btn-outline">
          Design Custom Hype Chains &rarr;
        </a>
      </section>
      <section className="container">
        <h2 className="section-title">Featured Products</h2>
        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">&#9883;</div>
            <p>No products yet.</p>
            <p className="text-muted">Log in as admin to add your first product.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map(p => (
              <article key={p.id} className="product-card">
                <div className="product-image-wrap">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    onError={e => { e.target.style.display = 'none'; e.target.parentElement.classList.add('no-image'); }}
                  />
                </div>
                <div className="product-info">
                  <span className="product-tag">{p.material} / {p.color}</span>
                  <h3>{p.name}</h3>
                  <p className="product-desc">{p.description}</p>
                  <div className="product-footer">
                    <span className="product-price">${(p.price_cents / 100).toFixed(2)}</span>
                    <button className="btn-primary" onClick={() => onAddToCart(p)}>Add to Cart</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function CartPage({ cart, onUpdateQty, onRemove, onCheckout, onBrowse }) {
  const total = cart.reduce((sum, i) => sum + i.price_cents * i.qty, 0);

  return (
    <section className="container">
      <h2 className="section-title">Shopping Cart</h2>
      {cart.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128722;</div>
          <p>Your cart is empty.</p>
          <button className="btn-primary" onClick={onBrowse}>Browse Products</button>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-image">
                  <img src={item.image_url} alt={item.name} onError={e => { e.target.style.display = 'none'; }} />
                </div>
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  <span className="text-muted">${(item.price_cents / 100).toFixed(2)} each</span>
                </div>
                <div className="cart-item-qty">
                  <button className="btn-sm" onClick={() => onUpdateQty(item.id, -1)}>&#8722;</button>
                  <span>{item.qty}</span>
                  <button className="btn-sm" onClick={() => onUpdateQty(item.id, 1)}>+</button>
                </div>
                <div className="cart-item-total">
                  ${((item.price_cents * item.qty) / 100).toFixed(2)}
                </div>
                <button className="btn-danger-sm" onClick={() => onRemove(item.id)}>Remove</button>
              </div>
            ))}
          </div>
          <div className="cart-summary">
            <div className="cart-total">
              <span>Total</span>
              <span className="cart-total-amount">${(total / 100).toFixed(2)}</span>
            </div>
            <button className="btn-primary btn-lg" onClick={onCheckout}>Proceed to Checkout</button>
            <p className="text-muted text-sm" style={{ marginTop: '0.75rem' }}>Secure payment powered by Stripe</p>
          </div>
        </>
      )}
    </section>
  );
}

function AdminPage({ isAdmin, onLogin, onLogout, filaments, products, onRefresh, addToast }) {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [filamentForm, setFilamentForm] = useState({ material: '', color: '', sku: '', stock_grams: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', image_url: '', price_cents: '', filament_id: '' });
  const [showFilamentForm, setShowFilamentForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    onLogin(loginForm.username, loginForm.password);
  };

  const handleAddFilament = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/filaments', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...filamentForm, stock_grams: Number(filamentForm.stock_grams) }),
      });
      if (res.ok) {
        addToast('Filament added');
        setFilamentForm({ material: '', color: '', sku: '', stock_grams: '' });
        setShowFilamentForm(false);
        onRefresh();
      } else addToast('Failed to add filament', 'error');
    } catch { addToast('Failed to add filament', 'error'); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productForm,
          price_cents: Number(productForm.price_cents),
          filament_id: Number(productForm.filament_id),
        }),
      });
      if (res.ok) {
        addToast('Product published');
        setProductForm({ name: '', description: '', image_url: '', price_cents: '', filament_id: '' });
        setShowProductForm(false);
        onRefresh();
      } else addToast('Failed to add product', 'error');
    } catch { addToast('Failed to add product', 'error'); }
  };

  const handleDeleteProduct = async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { addToast('Product deleted'); onRefresh(); }
    } catch { addToast('Failed to delete', 'error'); }
  };

  const handleDeleteFilament = async (id) => {
    try {
      const res = await fetch(`/api/filaments/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { addToast('Filament deleted'); onRefresh(); }
    } catch { addToast('Failed to delete', 'error'); }
  };

  if (!isAdmin) {
    return (
      <section className="container">
        <div className="auth-card">
          <h2>Admin Login</h2>
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn-primary btn-full">Login</button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="container">
      <div className="admin-header">
        <h2 className="section-title">Admin Dashboard</h2>
        <button className="btn-outline" onClick={onLogout}>Logout</button>
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h3>Filament Library</h3>
          <button className="btn-primary" onClick={() => setShowFilamentForm(!showFilamentForm)}>
            {showFilamentForm ? 'Cancel' : '+ Add Filament'}
          </button>
        </div>
        {showFilamentForm && (
          <form className="admin-form" onSubmit={handleAddFilament}>
            <div className="form-row">
              <div className="form-group">
                <label>Material</label>
                <input value={filamentForm.material} onChange={e => setFilamentForm({ ...filamentForm, material: e.target.value })} required placeholder="e.g. PLA, PETG, ABS" />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input value={filamentForm.color} onChange={e => setFilamentForm({ ...filamentForm, color: e.target.value })} required placeholder="e.g. Midnight Black" />
              </div>
              <div className="form-group">
                <label>SKU</label>
                <input value={filamentForm.sku} onChange={e => setFilamentForm({ ...filamentForm, sku: e.target.value })} required placeholder="e.g. PLA-BLK-001" />
              </div>
              <div className="form-group">
                <label>Stock (grams)</label>
                <input type="number" value={filamentForm.stock_grams} onChange={e => setFilamentForm({ ...filamentForm, stock_grams: e.target.value })} required placeholder="1000" />
              </div>
            </div>
            <button type="submit" className="btn-primary">Save Filament</button>
          </form>
        )}
        {filaments.length === 0 ? (
          <p className="text-muted" style={{ padding: '1rem 0' }}>No filaments yet. Add one to get started.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Material</th><th>Color</th><th>SKU</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                {filaments.map(f => (
                  <tr key={f.id}>
                    <td>{f.material}</td>
                    <td>{f.color}</td>
                    <td><code>{f.sku}</code></td>
                    <td>{f.stock_grams}g</td>
                    <td><button className="btn-danger-sm" onClick={() => handleDeleteFilament(f.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h3>Products</h3>
          <button className="btn-primary" onClick={() => setShowProductForm(!showProductForm)}>
            {showProductForm ? 'Cancel' : '+ Add Product'}
          </button>
        </div>
        {showProductForm && (
          <form className="admin-form" onSubmit={handleAddProduct}>
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required placeholder="Product name" />
              </div>
              <div className="form-group">
                <label>Price (cents)</label>
                <input type="number" value={productForm.price_cents} onChange={e => setProductForm({ ...productForm, price_cents: e.target.value })} required placeholder="1999 = $19.99" />
              </div>
              <div className="form-group">
                <label>Filament</label>
                <select value={productForm.filament_id} onChange={e => setProductForm({ ...productForm, filament_id: e.target.value })} required>
                  <option value="">Select filament...</option>
                  {filaments.map(f => <option key={f.id} value={f.id}>{f.material} - {f.color}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Image URL</label>
              <input type="url" value={productForm.image_url} onChange={e => setProductForm({ ...productForm, image_url: e.target.value })} required placeholder="https://example.com/image.jpg" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} required placeholder="Describe the product..." rows={3} />
            </div>
            <button type="submit" className="btn-primary">Publish Product</button>
          </form>
        )}
        {products.length === 0 ? (
          <p className="text-muted" style={{ padding: '1rem 0' }}>No products yet. Add filaments first, then create products.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Price</th><th>Material</th><th>Color</th><th></th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>${(p.price_cents / 100).toFixed(2)}</td>
                    <td>{p.material}</td>
                    <td>{p.color}</td>
                    <td><button className="btn-danger-sm" onClick={() => handleDeleteProduct(p.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState(PAGES.SHOP);
  const [products, setProducts] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('c2-cart')) || []; }
    catch { return []; }
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => { localStorage.setItem('c2-cart', JSON.stringify(cart)); }, [cart]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [prods, fils] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/filaments').then(r => r.json()),
      ]);
      setProducts(prods);
      setFilaments(fils);
    } catch {
      addToast('Failed to load data', 'error');
    }
  }, [addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    fetch('/api/admin/me', { credentials: 'include' })
      .then(r => { if (r.ok) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setCart([]);
      localStorage.removeItem('c2-cart');
      addToast('Payment successful! Thank you for your order.');
      window.history.replaceState({}, '', '/');
    }
  }, [addToast]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price_cents: product.price_cents, image_url: product.image_url, qty: 1 }];
    });
    addToast(`${product.name} added to cart`);
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = i.qty + delta;
      return newQty > 0 ? { ...i, qty: newQty } : i;
    }));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const cartCount = cart.reduce((a, b) => a + b.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) { addToast('Cart is empty', 'warning'); return; }
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart.map(i => ({ name: i.name, price_cents: i.price_cents, quantity: i.qty })) }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else addToast(data.error || 'Checkout failed', 'error');
    } catch {
      addToast('Checkout failed. Is Stripe configured?', 'error');
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) { setIsAdmin(true); addToast('Logged in as admin'); }
      else addToast('Invalid credentials', 'error');
    } catch { addToast('Login failed', 'error'); }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    setIsAdmin(false);
    setPage(PAGES.SHOP);
    addToast('Logged out');
  };

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);

  return (
    <>
      <Toasts toasts={toasts} />
      <Nav page={page} setPage={setPage} cartCount={cartCount} />
      {page === PAGES.SHOP && <ShopPage products={products} onAddToCart={addToCart} />}
      {page === PAGES.CART && (
        <CartPage cart={cart} onUpdateQty={updateQty} onRemove={removeFromCart} onCheckout={handleCheckout} onBrowse={() => setPage(PAGES.SHOP)} />
      )}
      {page === PAGES.ADMIN && (
        <AdminPage isAdmin={isAdmin} onLogin={handleLogin} onLogout={handleLogout} filaments={filaments} products={products} onRefresh={loadData} addToast={addToast} />
      )}
    </>
  );
}
