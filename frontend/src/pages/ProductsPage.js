// src/pages/ProductsPage.js
import React, { useState, useEffect } from 'react';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';

export default function ProductsPage({ onCartUpdate }) {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [search,     setSearch]     = useState('');
  const [category,   setCategory]   = useState('');
  const [minPrice,   setMinPrice]   = useState('');
  const [maxPrice,   setMaxPrice]   = useState('');
  const [sort,       setSort]       = useState('newest');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [msg,        setMsg]        = useState('');
  const [aiQuery,    setAiQuery]    = useState('');
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const { user } = useAuth();

  // Load categories once
  useEffect(() => {
    API.get('/products/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  // Fetch products with full query criteria
  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 8 };
    if (search)   params.search = search;
    if (category) params.category = category;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (sort)     params.sort = sort;

    API.get('/products', { params })
      .then(r => {
        if (r.data && r.data.products) {
          setProducts(r.data.products);
          setTotalPages(r.data.pages || 1);
        } else {
          setProducts(r.data || []);
          setTotalPages(1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category, minPrice, maxPrice, sort, page]);

  // Reset page to 1 when search or filter values change
  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setAiQuery('');
    setPage(1);
  };

  async function handleAiSearch() {
    if (!aiQuery.trim()) return;
    setAiSearchLoading(true);
    try {
      const { data } = await API.post('/ai/search', { query: aiQuery });
      
      // Update filters with AI response
      setSearch(data.search || '');
      setCategory(data.category || '');
      setMinPrice(data.min_price || '');
      setMaxPrice(data.max_price || '');
      setSort(data.sort || 'newest');
      setPage(1);
    } catch (err) {
      alert(err.response?.data?.error || 'AI Search parsing failed. Please try a different query.');
    } finally {
      setAiSearchLoading(false);
    }
  }

  async function handleAddToCart(product_id) {
    if (!user) { alert('Please login to add items to cart'); return; }
    try {
      await API.post('/cart/add', { product_id, quantity: 1 });
      setMsg('Added to cart! 🛒');
      onCartUpdate && onCartUpdate();
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add');
    }
  }

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-title">FITFUEL PRODUCTS</div>
        <div className="page-subtitle">Premium protein supplements & nutrition — FitFuel Protein</div> 

        {msg && <div className="alert alert-success">{msg}</div>}

        {/* ── Filters Section ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32, padding: 20, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          
          {/* AI Search Sub-bar */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                placeholder="✨ Ask AI: 'chocolate isolate under 4000' or 'cheap pre-workout'..."
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                style={{ paddingLeft: '38px', borderColor: 'var(--accent)', borderStyle: 'dashed' }}
                onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                disabled={aiSearchLoading}
              />
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16 }}>✨</span>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleAiSearch} 
              disabled={aiSearchLoading || !aiQuery.trim()}
              style={{ padding: '10px 24px', whiteSpace: 'nowrap' }}
            >
              {aiSearchLoading ? 'Analyzing...' : 'AI Search'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              placeholder="🔍 Search products…"
              value={search}
              onChange={e => handleFilterChange(setSearch, e.target.value)}
              style={{ flex: 2, minWidth: 200 }}
            />
            <select 
              value={category} 
              onChange={e => handleFilterChange(setCategory, e.target.value)} 
              style={{ flex: 1, minWidth: 150 }}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select 
              value={sort} 
              onChange={e => handleFilterChange(setSort, e.target.value)} 
              style={{ flex: 1, minWidth: 150 }}
            >
              <option value="newest">Newest Added</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Min Price:</span>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={e => handleFilterChange(setMinPrice, e.target.value)}
                style={{ width: 100, padding: '6px 10px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Max Price:</span>
              <input
                type="number"
                placeholder="10000"
                value={maxPrice}
                onChange={e => handleFilterChange(setMaxPrice, e.target.value)}
                style={{ width: 100, padding: '6px 10px' }}
              />
            </div>
            {(search || category || minPrice || maxPrice || sort !== 'newest') && (
              <button className="btn btn-ghost btn-sm" onClick={handleClearFilters} style={{ marginLeft: 'auto' }}>
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* ── Product Grid ── */}
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No products found</h3>
            <p>Try a different search or filter criteria</p>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {products.map(p => (
                <ProductCard
                  key={p.product_id}
                  product={p}
                  onAddToCart={user?.role !== 'admin' ? handleAddToCart : null}
                />
              ))}
            </div>

            {/* ── Pagination controls ── */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 40 }}>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ◀ Previous
                </button>
                <span style={{ fontWeight: '600', fontSize: 14 }}>
                  Page {page} of {totalPages}
                </span>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
