'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { createOrder } from '@/app/actions/orders';
import { DIMENSIONS, convertQuantity, calculateUnitPrice, SupportedUnit } from '@/lib/conversions';
import Decimal from 'decimal.js';

interface ProductData {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  dimension: string;
  baseUnit: string;
  pricePerBaseUnit: string;
  stockQuantity: string;
}

interface OrderItemData {
  id: string;
  orderedQuantity: string;
  orderedUnit: string;
  baseQuantity: string;
  pricePerUnit: string;
  subtotal: string;
  product: {
    sku: string;
    name: string;
    baseUnit: string;
  };
}

interface OrderData {
  id: string;
  status: string;
  totalPrice: string;
  createdAt: string;
  items: OrderItemData[];
}

interface DashboardClientProps {
  products: ProductData[];
  pastOrders: OrderData[];
}

interface CartItem {
  product: ProductData;
  quantity: number;
  orderedUnit: SupportedUnit;
  unitPrice: number; // Price per chosen unit
  subtotal: number;
}

const CATEGORIES = [
  'Active Pharmaceutical Ingredients',
  'Solvents',
  'Reagents',
  'Acids',
  'Labware',
  'General Chemicals',
];

export default function DashboardClient({ products, pastOrders }: DashboardClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add item to cart
  const addToCart = (product: ProductData) => {
    setError(null);
    setSuccess(null);
    
    // Check if product already in cart
    const exists = cart.find((item) => item.product.id === product.id);
    if (exists) {
      return; // Already in cart, they can edit qty in the cart panel
    }

    const defaultUnit = product.baseUnit as SupportedUnit;
    const basePrice = new Decimal(product.pricePerBaseUnit);
    
    const newItem: CartItem = {
      product,
      quantity: 1,
      orderedUnit: defaultUnit,
      unitPrice: basePrice.toNumber(),
      subtotal: basePrice.toNumber(),
    };

    setCart((prev) => [...prev, newItem]);
  };

  // Update cart item quantity or unit
  const updateCartItem = (productId: string, qty: number, unit: SupportedUnit) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;

        try {
          const basePrice = new Decimal(item.product.pricePerBaseUnit);
          const computedUnitPrice = calculateUnitPrice(basePrice, item.product.baseUnit as SupportedUnit, unit);
          const computedSubtotal = computedUnitPrice.times(new Decimal(qty || 0));

          return {
            ...item,
            quantity: qty,
            orderedUnit: unit,
            unitPrice: computedUnitPrice.toNumber(),
            subtotal: computedSubtotal.toNumber(),
          };
        } catch (e) {
          console.error(e);
          return item;
        }
      })
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  // Submit cart order
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setError(null);
    setSuccess(null);

    const orderItems = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      orderedUnit: item.orderedUnit,
    }));

    startTransition(async () => {
      const result = await createOrder(orderItems);
      if (result.success) {
        setSuccess('Your quotation has been submitted successfully for admin review!');
        setCart([]);
        // Force page reload to fetch updated orders and products
        window.location.reload();
      } else {
        setError(result.error);
      }
    });
  };

  // Filter products based on search terms
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container">
      {/* Overview / Banner */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Chemical & Labware Ordering</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Browse chemicals and labware, select target units, calculate prices in real-time, and place quotations.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="grid-cols-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '48px' }}>
        {/* Left Side: Product Browser */}
        <div>
          {/* Filters Bar */}
          <div className="glass-panel" style={{ marginBottom: '24px', padding: '16px 24px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Search products by SKU or Name..."
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

          {/* Products Grid */}
          <div className="grid-cols-2" style={{ gap: '20px' }}>
            {filteredProducts.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '48px' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>No chemicals found in catalog.</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const stock = parseFloat(p.stockQuantity);
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= 10;

                return (
                  <div key={p.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
                    <div>
                      <div className="flex-between" style={{ marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                          {p.sku}
                        </span>
                        <span className="badge badge-dimension" style={{ fontSize: '0.7rem' }}>
                          {p.dimension}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', marginBottom: '8px', fontWeight: 600 }}>
                        {p.name}
                      </h3>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '36px' }}>
                        {p.description || 'No description provided.'}
                      </p>
                    </div>

                    <div>
                      {/* Price & Stock Display */}
                      <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Base Price</div>
                          <div style={{ color: 'var(--color-secondary)', fontWeight: 700, fontSize: '1.05rem' }}>
                            ₹{parseFloat(p.pricePerBaseUnit).toFixed(4)}
                            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>/{p.baseUnit}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Availability</div>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: isOutOfStock ? '#EF4444' : isLowStock ? '#F59E0B' : '#10B981' }}>
                            {isOutOfStock ? 'OUT OF STOCK' : `${stock.toLocaleString()} ${p.baseUnit}`}
                          </span>
                        </div>
                      </div>

                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%' }}
                        onClick={() => addToCart(p)}
                        disabled={isOutOfStock}
                      >
                        {isOutOfStock ? 'Unavailable' : 'Add to Order'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Cart Drawer */}
        <div className="glass-panel" style={{ height: 'fit-content', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛒 Active Cart
            {cart.length > 0 && (
              <span style={{ background: 'var(--color-primary)', color: '#FFF', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '99px' }}>
                {cart.length}
              </span>
            )}
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '24px' }}>
            Configure units and quantities to see live subtotal recalculations.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '450px', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Cart is empty. Click "Add to Order" to start building your quote request.
              </div>
            ) : (
              cart.map((item) => {
                // Determine unit options based on dimension
                const dim = item.product.dimension;
                let units: string[] = ['item'];
                if (dim === 'WEIGHT') units = ['g', 'kg'];
                if (dim === 'VOLUME') units = ['mL', 'L'];

                return (
                  <div
                    key={item.product.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#FFFFFF', fontSize: '0.9rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                        {item.product.name}
                      </strong>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.85rem' }}
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      {/* Qty field */}
                      <div style={{ flex: '1' }}>
                        <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>Quantity</label>
                        <input
                          type="number"
                          step="any"
                          min="0.00000001"
                          className="input-field btn-sm"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(item.product.id, parseFloat(e.target.value) || 0, item.orderedUnit)}
                          style={{ padding: '6px 8px' }}
                        />
                      </div>

                      {/* Unit Selector */}
                      <div style={{ width: '80px' }}>
                        <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>Unit</label>
                        <select
                          className="input-field btn-sm"
                          value={item.orderedUnit}
                          onChange={(e) => updateCartItem(item.product.id, item.quantity, e.target.value as SupportedUnit)}
                          style={{ padding: '6px 8px', fontFamily: 'monospace' }}
                        >
                          {units.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      <div>
                        Rate: <span style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>₹{item.unitPrice.toFixed(4)}/{item.orderedUnit}</span>
                      </div>
                      <div style={{ color: 'var(--color-secondary)', fontWeight: 600, fontFamily: 'monospace' }}>
                        ₹{item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '16px',
              marginBottom: '20px',
            }}
          >
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Price</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--color-secondary)', fontFamily: 'monospace' }}>
                ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </strong>
            </div>
            {cart.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', border: '1px dashed var(--border-color)', marginBottom: '12px' }}>
                Prices will be verified by administration. Subtotals are mapped to high-precision backend structures.
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleCheckout}
            disabled={cart.length === 0 || isPending}
          >
            {isPending ? 'Submitting...' : 'Submit Quotation'}
          </button>
        </div>
      </div>

      {/* Bottom Section: Past Orders / Quotations History */}
      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Your Quotation & Order History</h2>

        <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Quotation Ref</th>
                  <th>Date Placed</th>
                  <th>Order Summary</th>
                  <th style={{ textAlign: 'right' }}>Total Price</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pastOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>
                      You have not submitted any quotations yet.
                    </td>
                  </tr>
                ) : (
                  pastOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600, color: '#FFFFFF' }}>#{order.id.slice(0, 8).toUpperCase()}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                              • {item.product.name} ({parseFloat(item.orderedQuantity).toLocaleString()} {item.orderedUnit})
                              <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                                (equiv. {parseFloat(item.baseQuantity).toLocaleString()} {item.product.baseUnit})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-secondary)' }}>
                        ₹
                        {parseFloat(order.totalPrice).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
