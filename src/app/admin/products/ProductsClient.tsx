'use client';

import React, { useState, useTransition } from 'react';
import { createProduct, updateProduct, deleteProduct } from '@/app/actions/products';
import { SupportedUnit } from '@/lib/conversions';

interface ProductData {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  dimension: string;
  baseUnit: string;
  pricePerBaseUnit: any; // Prisma Decimal
  stockQuantity: any; // Prisma Decimal
}

interface ProductsClientProps {
  initialProducts: ProductData[];
}

const CATEGORIES = [
  'Active Pharmaceutical Ingredients',
  'Solvents',
  'Reagents',
  'Acids',
  'Labware',
  'General Chemicals',
];

export default function ProductsClient({ initialProducts }: ProductsClientProps) {
  const [products, setProducts] = useState<ProductData[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: CATEGORIES[0],
    dimension: 'WEIGHT', // WEIGHT | VOLUME | COUNT
    baseUnit: 'g',       // g | mL | item
    pricePerBaseUnit: '',
    stockQuantity: '',
  });

  // Automatically update base unit when dimension changes
  const handleDimensionChange = (dim: string) => {
    let unit = 'g';
    if (dim === 'VOLUME') unit = 'mL';
    if (dim === 'COUNT') unit = 'item';
    
    setFormData((prev) => ({
      ...prev,
      dimension: dim,
      baseUnit: unit,
    }));
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: CATEGORIES[0],
      dimension: 'WEIGHT',
      baseUnit: 'g',
      pricePerBaseUnit: '',
      stockQuantity: '',
    });
    setError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (p: ProductData) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      category: p.category,
      dimension: p.dimension,
      baseUnit: p.baseUnit,
      pricePerBaseUnit: p.pricePerBaseUnit.toString(),
      stockQuantity: p.stockQuantity.toString(),
    });
    setError(null);
    setIsOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    const result = await deleteProduct(id);
    if (result.success) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert(result.error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = new FormData();
    data.append('sku', formData.sku);
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('dimension', formData.dimension);
    data.append('baseUnit', formData.baseUnit);
    data.append('pricePerBaseUnit', formData.pricePerBaseUnit);
    data.append('stockQuantity', formData.stockQuantity);

    startTransition(async () => {
      let result;
      if (editingProduct) {
        result = await updateProduct(editingProduct.id, data);
      } else {
        result = await createProduct(data);
      }

      if (result.success) {
        setIsOpen(false);
        // Page revalidation refreshes Server Component, but let's refresh state for instant feedback:
        window.location.reload();
      } else {
        setError(result.error);
      }
    });
  };

  // Filter products based on search term and category
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container">
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Inventory Catalog</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Manage database products, base storage units, prices, and monitor stock levels.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ marginBottom: '24px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <input
              type="text"
              placeholder="Search products by Name or SKU..."
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: '220px' }}>
            <select
              className="input-field"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Product List Table */}
      <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name / Category</th>
                <th>Dimension</th>
                <th>Base Unit</th>
                <th style={{ textAlign: 'right' }}>Base Price (INR)</th>
                <th style={{ textAlign: 'right' }}>Stock Level</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{p.sku}</td>
                    <td>
                      <div>
                        <div style={{ color: '#FFFFFF', fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                          {p.category}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-dimension">{p.dimension}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.baseUnit}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-secondary)' }}>
                      ₹{parseFloat(p.pricePerBaseUnit.toString()).toLocaleString('en-IN', {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 6,
                      })}
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                        /{p.baseUnit}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: parseFloat(p.stockQuantity.toString()) <= 10 ? '#EF4444' : '#10B981',
                        }}
                      >
                        {parseFloat(p.stockQuantity.toString()).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </span>{' '}
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{p.baseUnit}</span>
                      {parseFloat(p.stockQuantity.toString()) <= 10 && (
                        <div style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: '2px', fontWeight: 600 }}>
                          LOW STOCK
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex-gap" style={{ justifyContent: 'center' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(p)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary btn-sm btn-danger"
                          onClick={() => handleDelete(p.id, p.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal Dialog */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '50%', padding: '6px' }}
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="sku">SKU Code</label>
                  <input
                    id="sku"
                    type="text"
                    className="input-field"
                    placeholder="e.g. CHEM-ASP-01"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="category">Category</label>
                  <select
                    id="category"
                    className="input-field"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="name">Product Name</label>
                <input
                  id="name"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Aspirin (Acetylsalicylic Acid)"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">Description</label>
                <textarea
                  id="description"
                  className="input-field"
                  rows={3}
                  placeholder="Provide technical details, grade, storage notes..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid-cols-2" style={{ pointerEvents: editingProduct ? 'none' : 'auto', opacity: editingProduct ? 0.7 : 1 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="dimension">Dimension</label>
                  <select
                    id="dimension"
                    className="input-field"
                    value={formData.dimension}
                    onChange={(e) => handleDimensionChange(e.target.value)}
                    disabled={!!editingProduct}
                  >
                    <option value="WEIGHT">WEIGHT (g, kg)</option>
                    <option value="VOLUME">VOLUME (mL, L)</option>
                    <option value="COUNT">COUNT (item)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="baseUnit">Base Unit</label>
                  <input
                    id="baseUnit"
                    type="text"
                    className="input-field"
                    value={formData.baseUnit}
                    readOnly
                    style={{ background: 'rgba(255,255,255,0.05)', fontFamily: 'monospace' }}
                  />
                  {!editingProduct && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                      Base units are locked to the dimension (WEIGHT: g, VOLUME: mL, COUNT: item).
                    </span>
                  )}
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="pricePerBaseUnit">
                    Price per Base Unit (₹/base)
                  </label>
                  <input
                    id="pricePerBaseUnit"
                    type="number"
                    step="0.00000001"
                    min="0"
                    className="input-field"
                    placeholder="e.g. 0.45"
                    required
                    value={formData.pricePerBaseUnit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pricePerBaseUnit: e.target.value }))}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    ₹/g for weights, ₹/mL for volumes, ₹/item for counts.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="stockQuantity">
                    Stock Quantity (in base units)
                  </label>
                  <input
                    id="stockQuantity"
                    type="number"
                    step="0.00000001"
                    min="0"
                    className="input-field"
                    placeholder="e.g. 50000"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stockQuantity: e.target.value }))}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    e.g., enter 1000 for 1kg (1000g) or 1L (1000mL) of stock.
                  </span>
                </div>
              </div>

              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
