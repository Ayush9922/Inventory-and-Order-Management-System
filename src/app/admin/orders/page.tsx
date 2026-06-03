import React from 'react';
import { getAllOrders } from '@/app/actions/orders';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const orders = await getAllOrders();

  // Serialize Prisma Decimal objects for React Client Component
  const serializedOrders = orders.map((o) => ({
    ...o,
    totalPrice: o.totalPrice.toString(),
    items: o.items.map((i) => ({
      ...i,
      orderedQuantity: i.orderedQuantity.toString(),
      baseQuantity: i.baseQuantity.toString(),
      pricePerUnit: i.pricePerUnit.toString(),
      subtotal: i.subtotal.toString(),
      product: {
        ...i.product,
        pricePerBaseUnit: i.product.pricePerBaseUnit.toString(),
        stockQuantity: i.product.stockQuantity.toString(),
      },
    })),
  }));

  return <OrdersClient initialOrders={serializedOrders} />;
}
