import React from 'react';
import { getProducts } from '@/app/actions/products';
import { getSellerOrders } from '@/app/actions/orders';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function SellerDashboardPage() {
  const products = await getProducts();
  const pastOrders = await getSellerOrders();

  // Serialize Prisma Decimal objects for React Client Component
  const serializedProducts = products.map((p) => ({
    ...p,
    pricePerBaseUnit: p.pricePerBaseUnit.toString(),
    stockQuantity: p.stockQuantity.toString(),
  }));

  const serializedPastOrders = pastOrders.map((o) => ({
    ...o,
    totalPrice: o.totalPrice.toString(),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      ...i,
      orderedQuantity: i.orderedQuantity.toString(),
      baseQuantity: i.baseQuantity.toString(),
      pricePerUnit: i.pricePerUnit.toString(),
      subtotal: i.subtotal.toString(),
      product: {
        ...i.product,
      },
    })),
  }));

  return <DashboardClient products={serializedProducts} pastOrders={serializedPastOrders} />;
}
