'use client';

import React, { useState, useTransition } from 'react';
import { updateOrderStatus } from '@/app/actions/orders';

interface OrderItemData {
  id: string;
  productId: string;
  orderedQuantity: any;
  orderedUnit: string;
  baseQuantity: any;
  pricePerUnit: any;
  subtotal: any;
  product: {
    sku: string;
    name: string;
    baseUnit: string;
    pricePerBaseUnit: any;
  };
}

interface OrderData {
  id: string;
  sellerId: string;
  status: string;
  totalPrice: any;
  createdAt: Date;
  seller: {
    name: string;
    email: string;
  };
  items: OrderItemData[];
}

interface OrdersClientProps {
  initialOrders: OrderData[];
}

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAction = async (orderId: string, action: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to mark this quotation as ${action.toLowerCase()}?`)) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, action);
      if (result.success) {
        setSuccessMsg(`Quotation has been successfully ${action.toLowerCase()}!`);
        // Update local state:
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: action } : o))
        );
      } else {
        setErrorMsg(result.error);
      }
    });
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Quotations & Orders Management</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Review seller quotations, verify high-precision unit conversions and subtotal calculations, and approve/reject orders.
        </p>
      </div>

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {orders.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>No orders or quotations have been placed yet.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="glass-panel" style={{ padding: '24px' }}>
              <div
                className="flex-between"
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '16px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                      Quote Ref: #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`badge badge-${order.status.toLowerCase()}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary)',
                      marginTop: '6px',
                    }}
                  >
                    Submitted by: <strong style={{ color: '#FFFFFF' }}>{order.seller.name}</strong> ({order.seller.email}) on{' '}
                    {new Date(order.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Total Price</div>
                  <div
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      color: 'var(--color-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    ₹
                    {parseFloat(order.totalPrice.toString()).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </div>
                </div>
              </div>

              {/* Order Items Table & Calculations Verification */}
              <div className="table-container" style={{ marginBottom: '20px' }}>
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Ordered Qty</th>
                      <th>Conv. Factor</th>
                      <th>Base Qty</th>
                      <th style={{ textAlign: 'right' }}>Base Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Calculated Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => {
                      // Compute conversion factor dynamically for display
                      // E.g., kg to g factor is 1000
                      const oQty = parseFloat(item.orderedQuantity.toString());
                      const bQty = parseFloat(item.baseQuantity.toString());
                      const factor = bQty / oQty;

                      return (
                        <tr key={item.id}>
                          <td>
                            <div>
                              <strong style={{ color: '#FFFFFF' }}>{item.product.name}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                SKU: {item.product.sku}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, color: '#FFFFFF' }}>
                            {oQty} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{item.orderedUnit}</span>
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>
                            x {factor.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {bQty.toLocaleString('en-US', { maximumFractionDigits: 4 })}{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {item.product.baseUnit}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                            ₹
                            {parseFloat(item.product.pricePerBaseUnit.toString()).toLocaleString('en-IN', {
                              minimumFractionDigits: 4,
                            })}
                            /{item.product.baseUnit}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#FFFFFF', fontFamily: 'monospace' }}>
                            ₹
                            {parseFloat(item.pricePerUnit.toString()).toLocaleString('en-IN', {
                              minimumFractionDigits: 4,
                            })}
                            /{item.orderedUnit}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-secondary)', fontFamily: 'monospace' }}>
                            ₹
                            {parseFloat(item.subtotal.toString()).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action buttons (only show if PENDING) */}
              {order.status === 'PENDING' && (
                <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary btn-danger"
                    onClick={() => handleAction(order.id, 'REJECTED')}
                    disabled={isPending}
                  >
                    Reject Quotation
                  </button>
                  <button
                    className="btn btn-primary btn-success"
                    onClick={() => handleAction(order.id, 'APPROVED')}
                    disabled={isPending}
                  >
                    Approve & Deduct Stock
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
