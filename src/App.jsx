import { useEffect, useState, useCallback, useMemo } from 'react';

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

function ProductModal({ product, onClose, onAddToCart }) {
  const variants = product.variants || [];

  // Compute initial cascade values once at mount
  const allThemes = [...new Set(variants.map(v => v.theme))];
  const _initTheme = allThemes[0] || '';
  const _initSizes = [...new Set(variants.filter(v => v.theme === _initTheme).map(v => v.size))];
  const _initSize = _initSizes[0] || '';
  const _initMats = [...new Set(variants.filter(v => v.theme === _initTheme && v.size === _initSize).map(v => `${v.material} / ${v.color}`))];
  const allProductColors = [...new Set(variants.map(v => `${v.material} / ${v.color}`))];

  const [selectedTheme, setSelectedTheme] = useState(_initTheme);
  const [selectedSize, setSelectedSize] = useState(_initSize);
  const [selectedMaterial, setSelectedMaterial] = useState(_initMats[0] || '');
  const [selectedColor2, setSelectedColor2] = useState(allProductColors[0] || '');
  const [notes, setNotes] = useState('');

  // Available options cascade: each tier filters based on the tier above it
  const themes = useMemo(() => [...new Set(variants.map(v => v.theme))], [variants]);
  const sizesForTheme = useMemo(() =>
    [...new Set(variants.filter(v => v.theme === selectedTheme).map(v => v.size))],
    [variants, selectedTheme]
  );
  const materialsForSelection = useMemo(() =>
    [...new Set(variants
      .filter(v => v.theme === selectedTheme && v.size === selectedSize)
      .map(v => `${v.material} / ${v.color}`))],
    [variants, selectedTheme, selectedSize]
  );

  // Cascade: changing theme resets size → material
  const handleThemeChange = (newTheme) => {
    const sizes = [...new Set(variants.filter(v => v.theme === newTheme).map(v => v.size))];
    const firstSize = sizes[0] || '';
    const mats = [...new Set(variants.filter(v => v.theme === newTheme && v.size === firstSize).map(v => `${v.material} / ${v.color}`))];
    setSelectedTheme(newTheme);
    setSelectedSize(firstSize);
    setSelectedMaterial(mats[0] || '');
  };

  // Cascade: changing size resets material
  const handleSizeChange = (newSize) => {
    const mats = [...new Set(variants.filter(v => v.theme === selectedTheme && v.size === newSize).map(v => `${v.material} / ${v.color}`))];
    setSelectedSize(newSize);
    setSelectedMaterial(mats[0] || '');
  };

  const selectedVariant = useMemo(() => {
    const matParts = selectedMaterial.split(' / ');
    return variants.find(v =>
      v.theme === selectedTheme &&
      v.size === selectedSize &&
      v.material === matParts[0] &&
      v.color === matParts[1]
    ) || variants.find(v => v.theme === selectedTheme) || variants[0];
  }, [variants, selectedTheme, selectedSize, selectedMaterial]);

  const price = selectedVariant?.price_cents || product.price_cents || 0;

  const handleAdd = () => {
    const colorPart = product.color_label_2
      ? [`${product.color_label_1 || 'Color 1'}: ${selectedMaterial}`, `${product.color_label_2}: ${selectedColor2}`].join(', ')
      : selectedMaterial;
    const variantLabel = [
      selectedTheme !== 'Standard' && selectedTheme,
      selectedSize !== 'Standard' && selectedSize,
      colorPart,
    ].filter(Boolean).join(', ');
    onAddToCart({
      id: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      price_cents: price,
      image_url: product.image_url,
      variant: variantLabel,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{product.name}</h3>
          <button className="btn-danger-sm" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">
          <div className="modal-image">
            <img src={selectedVariant?.image_url || product.image_url} alt={product.name} />
          </div>
          <div className="modal-info">
            <p className="modal-desc">{product.description}</p>
            <div className="modal-price">${(price / 100).toFixed(2)}</div>

            {themes.length > 1 && (
              <div className="form-group">
                <label>Theme</label>
                <select value={selectedTheme} onChange={e => handleThemeChange(e.target.value)}>
                  {themes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {sizesForTheme.length > 1 && (
              <div className="form-group">
                <label>Size</label>
                <select value={selectedSize} onChange={e => handleSizeChange(e.target.value)}>
                  {sizesForTheme.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {(selectedTheme === 'Custom' || themes.length === 1) ? (
              materialsForSelection.length > 1 ? (
                <div className="form-group">
                  <label>{product.color_label_1 || 'Color'}</label>
                  <select value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)}>
                    {materialsForSelection.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              ) : materialsForSelection.length === 1 && (
                <div className="form-group">
                  <label>{product.color_label_1 || 'Color'}</label>
                  <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.9rem', padding: '0.5rem 0' }}>{materialsForSelection[0]}</p>
                </div>
              )
            ) : (
              materialsForSelection.length > 0 && (
                <div className="form-group">
                  <label>Included Colors</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.4rem 0' }}>
                    {materialsForSelection.map(m => (
                      <span key={m} style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--text)' }}>{m}</span>
                    ))}
                  </div>
                </div>
              )
            )}
            {product.color_label_2 && allProductColors.length > 0 && (
              <div className="form-group">
                <label>{product.color_label_2}</label>
                <select value={selectedColor2} onChange={e => setSelectedColor2(e.target.value)}>
                  {allProductColors.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Order Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Team name, theme, or custom color request..."
              />
              <small className="text-muted">Provide your team, theme, or custom color request not listed above.</small>
            </div>

            <button className="btn-primary btn-full" onClick={handleAdd}>Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopPage({ products, onAddToCart }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Build per-product collage image lists once per data load (stable random order per refresh)
  const tileImages = useMemo(() => {
    const result = {};
    products.forEach(p => {
      const themeImgMap = new Map();
      for (const v of (p.variants || [])) {
        if (!themeImgMap.has(v.theme)) themeImgMap.set(v.theme, v.image_url || p.image_url);
      }
      if (themeImgMap.size === 0 && p.image_url) themeImgMap.set('', p.image_url);
      const imgs = [...themeImgMap.values()].filter(Boolean);
      // Fisher-Yates shuffle so order differs on each page load
      for (let i = imgs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      }
      result[p.id] = imgs.slice(0, 3);
    });
    return result;
  }, [products]);

  const chainMakerTile = {
    id: 'chain-maker-tile',
    name: 'Design Custom Hype Chains',
    description: 'Build your own custom chain with your preferred style and details.',
    image_url: 'https://designer.camwow.tv/og-image.png',
    material: 'Custom',
    color: 'Any',
    isExternal: true,
  };
  const displayProducts = [chainMakerTile, ...products];

  return (
    <>
      <section className="hero">
        <h1>C2 3D Print Shop</h1>
        <p>Premium 3D printed products crafted with precision and care.</p>
      </section>
      <section className="container">
        <h2 className="section-title">Featured Products</h2>
        {displayProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">&#9883;</div>
            <p>No products yet.</p>
            <p className="text-muted">Log in as admin to add your first product.</p>
          </div>
        ) : (
          <div className="product-grid">
            {displayProducts.map(p => {
              const tileVariants = p.variants || [];
              const uniqueThemes = [...new Set(tileVariants.map(v => v.theme))];
              const uniqueColors = [...new Set(tileVariants.map(v => v.color))];
              const mat = [...new Set(tileVariants.map(v => v.material))][0] || p.material;
              const tagParts = [];
              if (uniqueThemes.length > 1) tagParts.push(`${uniqueThemes.length} Themes`);
              if (uniqueColors.length > 1) tagParts.push(`${uniqueColors.length} Colors`);
              const colorTag = tagParts.length > 0
                ? `${mat} · ${tagParts.join(' · ')}`
                : `${p.material} / ${p.color}`;
              const imgs = tileImages[p.id] || (p.image_url ? [p.image_url] : []);
              return (
              <article key={p.id} className="product-card" onClick={() => !p.isExternal && setSelectedProduct(p)} style={{ cursor: p.isExternal ? 'default' : 'pointer' }}>
                <div className="product-image-wrap">
                  {imgs.length > 1 ? (
                    <div className={`product-collage count-${imgs.length}`}>
                      {imgs.map((src, i) => (
                        <img key={i} src={src} alt={`${p.name} option ${i + 1}`}
                          onError={e => { e.target.style.display = 'none'; }} />
                      ))}
                    </div>
                  ) : (
                    <img
                      src={imgs[0] || p.image_url}
                      alt={p.name}
                      onError={e => { e.target.style.display = 'none'; e.target.parentElement.classList.add('no-image'); }}
                    />
                  )}
                </div>
                <div className="product-info">
                  <span className="product-tag">{colorTag}</span>
                  <h3>{p.name}</h3>
                  <p className="product-desc">{p.description?.length > 110 ? `${p.description.slice(0, 110)}...` : p.description}</p>
                  <div className="product-footer">
                    {p.isExternal ? (
                      <a href="https://designer.camwow.tv" target="_blank" rel="noopener noreferrer" className="btn-primary">
                        Open Designer
                      </a>
                    ) : (
                      <>
                        <span className="product-price">${(p.price_cents / 100).toFixed(2)}</span>
                        <button className="btn-primary" onClick={e => { e.stopPropagation(); setSelectedProduct(p); }}>View</button>
                      </>
                    )}
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={onAddToCart}
        />
      )}
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
              <div key={item.cartId} className="cart-item">
                <div className="cart-item-image">
                  <img src={item.image_url} alt={item.name} onError={e => { e.target.style.display = 'none'; }} />
                </div>
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  {item.variant && <span className="cart-item-variant">{item.variant}</span>}
                  {item.notes && <span className="cart-item-notes">{item.notes}</span>}
                  <span className="text-muted">${(item.price_cents / 100).toFixed(2)} each</span>
                </div>
                <div className="cart-item-qty">
                  <button className="btn-sm" onClick={() => onUpdateQty(item.cartId, -1)}>&#8722;</button>
                  <span>{item.qty}</span>
                  <button className="btn-sm" onClick={() => onUpdateQty(item.cartId, 1)}>+</button>
                </div>
                <div className="cart-item-total">
                  ${((item.price_cents * item.qty) / 100).toFixed(2)}
                </div>
                <button className="btn-danger-sm" onClick={() => onRemove(item.cartId)}>Remove</button>
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
  const [filamentForm, setFilamentForm] = useState({ material: '', color: '', sku: '', stock_grams: '', vendor: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', price_cents: '', filament_ids: [], themes: '', sizes: '', parent_product_id: '', slug: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showFilamentForm, setShowFilamentForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingFilamentId, setEditingFilamentId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProductForm, setEditProductForm] = useState({ name: '', description: '', image_url: '', color_label_1: '', color_label_2: '' });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editingThemeName, setEditingThemeName] = useState(null);
  const [editThemeForm, setEditThemeForm] = useState({ theme: '', price_cents: '', image_url: '' });
  const [editThemeImageFile, setEditThemeImageFile] = useState(null);
  const [editThemeImagePreview, setEditThemeImagePreview] = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

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
        setFilamentForm({ material: '', color: '', sku: '', stock_grams: '', vendor: '' });
        setShowFilamentForm(false);
        onRefresh();
      } else addToast('Failed to add filament', 'error');
    } catch { addToast('Failed to add filament', 'error'); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!imageFile && !productForm.parent_product_id) { addToast('Please select a product image', 'warning'); return; }
    setUploading(true);
    try {
      let image_url = '';
      if (imageFile) {
        const form = new FormData();
        form.append('image', imageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
        if (!uploadRes.ok) { addToast('Image upload failed', 'error'); setUploading(false); return; }
        const uploadData = await uploadRes.json();
        image_url = uploadData.url;
      }

      const themes = productForm.themes ? productForm.themes.split(',').map(s => s.trim()).filter(Boolean) : ['Standard'];
      const sizes = productForm.sizes ? productForm.sizes.split(',').map(s => s.trim()).filter(Boolean) : ['Standard'];

      const res = await fetch('/api/products', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          image_url,
          slug: productForm.slug,
          price_cents: Number(productForm.price_cents),
          filament_ids: productForm.filament_ids,
          themes, sizes,
          parent_product_id: productForm.parent_product_id || undefined,
        }),
      });
      if (res.ok) {
        addToast('Product published');
        setProductForm({ name: '', description: '', price_cents: '', filament_ids: [], themes: '', sizes: '', parent_product_id: '', slug: '' });
        setImageFile(null);
        setImagePreview(null);
        setShowProductForm(false);
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || 'Failed to add product', 'error');
      }
    } catch { addToast('Failed to add product', 'error'); }
    setUploading(false);
  };

  const handleDeleteProduct = async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { addToast('Product deleted'); onRefresh(); }
    } catch { addToast('Failed to delete', 'error'); }
  };

  const handleDeleteTheme = async (productId, theme) => {
    try {
      const res = await fetch(`/api/products/${productId}/themes/${encodeURIComponent(theme)}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        addToast(`Theme "${theme}" deleted`);
        setEditingProduct(prev => prev ? { ...prev, variants: prev.variants.filter(v => v.theme !== theme) } : null);
        onRefresh();
      } else addToast('Failed to delete theme', 'error');
    } catch { addToast('Failed to delete theme', 'error'); }
  };

  const handleUpdateTheme = async () => {
    setUploading(true);
    try {
      let image_url = editThemeForm.image_url;
      if (editThemeImageFile) {
        const form = new FormData();
        form.append('image', editThemeImageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
        if (!uploadRes.ok) { addToast('Image upload failed', 'error'); setUploading(false); return; }
        const uploadData = await uploadRes.json();
        image_url = uploadData.url;
      }
      const res = await fetch(`/api/products/${editingProduct.id}/themes/${encodeURIComponent(editingThemeName)}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: editThemeForm.theme, price_cents: Number(editThemeForm.price_cents) || undefined, image_url }),
      });
      if (res.ok) {
        addToast('Theme updated');
        const newThemeName = editThemeForm.theme;
        setEditingProduct(prev => prev ? {
          ...prev,
          variants: prev.variants.map(v => v.theme !== editingThemeName ? v : {
            ...v,
            theme: newThemeName,
            ...(editThemeForm.price_cents ? { price_cents: Number(editThemeForm.price_cents) } : {}),
            ...(image_url ? { image_url } : {}),
          }),
        } : null);
        setEditingThemeName(null);
        setEditThemeImageFile(null);
        setEditThemeImagePreview(null);
        onRefresh();
      } else addToast('Failed to update theme', 'error');
    } catch { addToast('Failed to update theme', 'error'); }
    setUploading(false);
  };

  const startEditProduct = (p) => {
    setEditingProduct(p);
    setEditProductForm({ name: p.name, description: p.description || '', image_url: p.image_url || '', color_label_1: p.color_label_1 || '', color_label_2: p.color_label_2 || '' });
    setEditImageFile(null);
    setEditImagePreview(null);
    setShowProductForm(false);
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let image_url = editProductForm.image_url;
      if (editImageFile) {
        const form = new FormData();
        form.append('image', editImageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
        if (!uploadRes.ok) { addToast('Image upload failed', 'error'); setUploading(false); return; }
        const uploadData = await uploadRes.json();
        image_url = uploadData.url;
      }
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProductForm.name, description: editProductForm.description, image_url, color_label_1: editProductForm.color_label_1 || undefined, color_label_2: editProductForm.color_label_2 || undefined }),
      });
      if (res.ok) {
        addToast('Product updated');
        setEditingProduct(null);
        setEditImageFile(null);
        setEditImagePreview(null);
        onRefresh();
      } else addToast('Failed to update product', 'error');
    } catch { addToast('Failed to update product', 'error'); }
    setUploading(false);
  };

  const handleDeleteFilament = async (id) => {
    try {
      const res = await fetch(`/api/filaments/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { addToast('Filament deleted'); onRefresh(); }
    } catch { addToast('Failed to delete', 'error'); }
  };

  const handleEditFilament = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/filaments/${editingFilamentId}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...filamentForm, stock_grams: Number(filamentForm.stock_grams) }),
      });
      if (res.ok) {
        addToast('Filament updated');
        setFilamentForm({ material: '', color: '', sku: '', stock_grams: '', vendor: '' });
        setEditingFilamentId(null);
        setShowFilamentForm(false);
        onRefresh();
      } else addToast('Failed to update filament', 'error');
    } catch { addToast('Failed to update filament', 'error'); }
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
          <button className="btn-primary" onClick={() => {
            if (showFilamentForm) {
              setShowFilamentForm(false);
              setEditingFilamentId(null);
              setFilamentForm({ material: '', color: '', sku: '', stock_grams: '', vendor: '' });
            } else setShowFilamentForm(true);
          }}>
            {showFilamentForm ? 'Cancel' : '+ Add Filament'}
          </button>
        </div>
        {showFilamentForm && (
          <form className="admin-form" onSubmit={editingFilamentId ? handleEditFilament : handleAddFilament}>
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
                <label>Vendor</label>
                <input value={filamentForm.vendor} onChange={e => setFilamentForm({ ...filamentForm, vendor: e.target.value })} required placeholder="e.g. Polymaker" />
              </div>
              <div className="form-group">
                <label>Stock (grams)</label>
                <input type="number" value={filamentForm.stock_grams} onChange={e => setFilamentForm({ ...filamentForm, stock_grams: e.target.value })} required placeholder="1000" />
              </div>
            </div>
            <button type="submit" className="btn-primary">{editingFilamentId ? 'Update Filament' : 'Save Filament'}</button>
          </form>
        )}
        {filaments.length === 0 ? (
          <p className="text-muted" style={{ padding: '1rem 0' }}>No filaments yet. Add one to get started.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Material</th><th>Color</th><th>SKU</th><th>Vendor</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                {filaments.map(f => (
                  <tr key={f.id}>
                    <td>{f.material}</td>
                    <td>{f.color}</td>
                    <td><code>{f.sku}</code></td>
                    <td>{f.vendor || '—'}</td>
                    <td>{f.stock_grams}g</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-sm" onClick={() => {
                        setEditingFilamentId(f.id);
                        setFilamentForm({ material: f.material, color: f.color, sku: f.sku, stock_grams: String(f.stock_grams), vendor: f.vendor || '' });
                        setShowFilamentForm(true);
                      }}>Edit</button>
                      <button className="btn-danger-sm" onClick={() => handleDeleteFilament(f.id)}>Delete</button>
                    </td>
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
            <div className="form-group">
              <label>Add to Existing Product?</label>
              <select value={productForm.parent_product_id} onChange={e => setProductForm({ ...productForm, parent_product_id: e.target.value, slug: '' })}>
                <option value="">No — create a new product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {productForm.parent_product_id ? (
              <p className="text-muted" style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                Adding a new variant set to <strong style={{ color: 'var(--text)' }}>{products.find(p => String(p.id) === productForm.parent_product_id)?.name}</strong>. Upload the photo for this theme and pick its filaments below.
              </p>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label>Product Name</label>
                  <input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required placeholder="e.g. Can Cooler" />
                </div>
                <div className="form-group">
                  <label>URL Slug (optional)</label>
                  <input value={productForm.slug} onChange={e => setProductForm({ ...productForm, slug: e.target.value })} placeholder="can-cooler" />
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Price (cents)</label>
                <input type="number" value={productForm.price_cents} onChange={e => setProductForm({ ...productForm, price_cents: e.target.value })} required placeholder="1999 = $19.99" />
              </div>
              <div className="form-group">
                <label>Theme label for this set</label>
                <input value={productForm.themes} onChange={e => setProductForm({ ...productForm, themes: e.target.value })} placeholder={productForm.parent_product_id ? 'e.g. NFL' : 'e.g. NFL, Camo (leave blank for Standard)'} />
              </div>
              <div className="form-group">
                <label>Sizes (comma-separated)</label>
                <input value={productForm.sizes} onChange={e => setProductForm({ ...productForm, sizes: e.target.value })} placeholder="12oz, 16oz (leave blank for Standard)" />
              </div>
            </div>

            <div className="form-group">
              <label>{productForm.parent_product_id ? 'Photo for this theme' : 'Product Image'}</label>
              <input type="file" accept="image/*" onChange={handleImageSelect} required={!imageFile && !productForm.parent_product_id} />
              {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" />}
            </div>

            {!productForm.parent_product_id && (
              <div className="form-group">
                <label>Description</label>
                <textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} required placeholder="Describe the product..." rows={3} />
              </div>
            )}

            <div className="form-group">
              <label>Filaments / Colors for this set</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button type="button" className="btn-sm" onClick={() => setProductForm({ ...productForm, filament_ids: filaments.map(f => String(f.id)) })}>Select All</button>
                <button type="button" className="btn-sm" onClick={() => setProductForm({ ...productForm, filament_ids: [] })}>Clear</button>
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem' }}>
                {filaments.map(f => (
                  <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: 'var(--text)' }}>
                    <input
                      type="checkbox"
                      checked={productForm.filament_ids.includes(String(f.id))}
                      onChange={e => {
                        const id = String(f.id);
                        const next = e.target.checked
                          ? [...productForm.filament_ids, id]
                          : productForm.filament_ids.filter(x => x !== id);
                        setProductForm({ ...productForm, filament_ids: next });
                      }}
                    />
                    <span>{f.material} — {f.color} ({f.vendor || 'Unknown vendor'})</span>
                  </label>
                ))}
              </div>
              {productForm.filament_ids.length === 0 && <small className="text-muted">Select at least one filament.</small>}
            </div>

            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? 'Uploading...' : productForm.parent_product_id ? 'Add Variant Set' : 'Publish Product'}</button>
          </form>
        )}
        {products.length === 0 ? (
          <p className="text-muted" style={{ padding: '1rem 0' }}>No products yet. Add filaments first, then create products.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Themes</th><th>Colors</th><th>Price from</th><th></th></tr></thead>
              <tbody>
                {products.map(p => {
                  const pThemes = [...new Set((p.variants || []).map(v => v.theme))];
                  const pColors = [...new Set((p.variants || []).map(v => v.color))];
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{pThemes.join(', ') || '—'}</td>
                      <td>{pColors.length > 3 ? `${pColors.length} colors` : pColors.join(', ') || '—'}</td>
                      <td>${(p.price_cents / 100).toFixed(2)}</td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-sm" onClick={() => startEditProduct(p)}>Edit</button>
                        <button className="btn-danger-sm" onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {editingProduct && (
          <form className="admin-form" onSubmit={handleEditProduct} style={{ marginTop: '1.5rem' }}>
            <div className="admin-section-header" style={{ marginBottom: '1rem' }}>
              <h4 style={{ color: 'var(--text)' }}>Editing: {editingProduct.name}</h4>
              <button type="button" className="btn-outline" onClick={() => setEditingProduct(null)}>Cancel</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input value={editProductForm.name} onChange={e => setEditProductForm({ ...editProductForm, name: e.target.value })} required placeholder="Product name" />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={editProductForm.description} onChange={e => setEditProductForm({ ...editProductForm, description: e.target.value })} rows={3} placeholder="Product description..." />
            </div>
            <div className="form-group">
              <label>Replace Main Image (optional)</label>
              <input type="file" accept="image/*" onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                setEditImageFile(file);
                const reader = new FileReader();
                reader.onload = (ev) => setEditImagePreview(ev.target.result);
                reader.readAsDataURL(file);
              }} />
              {(editImagePreview || editProductForm.image_url) && (
                <img src={editImagePreview || editProductForm.image_url} alt="Preview" className="image-preview" />
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem', marginBottom: '1rem' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Color Selector Labels</h4>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Color 1 Label</label>
                  <input value={editProductForm.color_label_1} onChange={e => setEditProductForm({ ...editProductForm, color_label_1: e.target.value })} placeholder="Color" />
                  <small className="text-muted">Label shown above the first color dropdown. Default: "Color"</small>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Color 2 Label</label>
                  <input value={editProductForm.color_label_2} onChange={e => setEditProductForm({ ...editProductForm, color_label_2: e.target.value })} placeholder="Leave blank to disable" />
                  <small className="text-muted">Enables a second color picker. e.g. "Foreground Tone"</small>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? 'Saving...' : 'Save Changes'}</button>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
              <h4 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>Manage Themes</h4>
              {(() => {
                const themes = [...new Set((editingProduct.variants || []).map(v => v.theme))];
                if (themes.length === 0) return <p className="text-muted">No themes yet.</p>;
                return themes.map(theme => {
                  const tvs = (editingProduct.variants || []).filter(v => v.theme === theme);
                  const colors = [...new Set(tvs.map(v => v.color))];
                  const sizes = [...new Set(tvs.map(v => v.size))].filter(s => s !== 'Standard');
                  const img = tvs.find(v => v.image_url)?.image_url;
                  const isEditing = editingThemeName === theme;
                  return (
                    <div key={theme} style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', border: `1px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', borderBottomLeftRadius: isEditing ? 0 : '8px', borderBottomRightRadius: isEditing ? 0 : '8px' }}>
                        {img && <img src={img} alt={theme} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ color: 'var(--text)', display: 'block' }}>{theme}</strong>
                          <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                            {colors.join(', ')}{sizes.length ? ` · ${sizes.join(', ')}` : ''}
                            {' · '}{tvs.length} variant{tvs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <button type="button" className="btn-sm" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => {
                          if (isEditing) {
                            setEditingThemeName(null);
                            setEditThemeImageFile(null);
                            setEditThemeImagePreview(null);
                          } else {
                            setEditingThemeName(theme);
                            setEditThemeForm({ theme, price_cents: String(tvs[0]?.price_cents || ''), image_url: img || '' });
                            setEditThemeImageFile(null);
                            setEditThemeImagePreview(null);
                          }
                        }}>{isEditing ? 'Cancel' : 'Edit'}</button>
                        <button type="button" className="btn-danger-sm" onClick={() => handleDeleteTheme(editingProduct.id, theme)}>Delete</button>
                      </div>
                      {isEditing && (
                        <div style={{ border: '1px solid var(--accent)', borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', padding: '0.75rem', background: 'var(--surface-1)' }}>
                          <div className="form-row" style={{ marginBottom: '0.5rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Theme Name</label>
                              <input value={editThemeForm.theme} onChange={e => setEditThemeForm({ ...editThemeForm, theme: e.target.value })} placeholder="Theme name" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Price (cents)</label>
                              <input type="number" value={editThemeForm.price_cents} onChange={e => setEditThemeForm({ ...editThemeForm, price_cents: e.target.value })} placeholder="1999 = $19.99" />
                            </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>Replace Theme Image (optional)</label>
                            <input type="file" accept="image/*" onChange={e => {
                              const file = e.target.files[0];
                              if (!file) return;
                              setEditThemeImageFile(file);
                              const reader = new FileReader();
                              reader.onload = (ev) => setEditThemeImagePreview(ev.target.result);
                              reader.readAsDataURL(file);
                            }} />
                            {(editThemeImagePreview || editThemeForm.image_url) && (
                              <img src={editThemeImagePreview || editThemeForm.image_url} alt="Preview" className="image-preview" />
                            )}
                          </div>
                          <button type="button" className="btn-primary" disabled={uploading} onClick={handleUpdateTheme} style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem' }}>
                            {uploading ? 'Saving...' : 'Save Theme'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </form>
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

  const addToCart = (item) => {
    const cartId = `${item.id}_${item.variantId || ''}_${item.notes || ''}`;
    setCart(prev => {
      const existing = prev.find(i => i.cartId === cartId);
      if (existing) return prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, cartId, qty: 1 }];
    });
    addToast(`${item.name} added to cart`);
  };

  const updateQty = (cartId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.cartId !== cartId) return i;
      const newQty = i.qty + delta;
      return newQty > 0 ? { ...i, qty: newQty } : i;
    }));
  };

  const removeFromCart = (cartId) => setCart(prev => prev.filter(i => i.cartId !== cartId));

  const cartCount = cart.reduce((a, b) => a + b.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) { addToast('Cart is empty', 'warning'); return; }
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({
            name: i.name,
            price_cents: i.price_cents,
            quantity: i.qty,
            variant: i.variant || '',
            notes: i.notes || '',
          })),
        }),
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
