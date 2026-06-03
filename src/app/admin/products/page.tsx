import React from 'react';
import { getProducts } from '@/app/actions/products';
import ProductsClient from './ProductsClient';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await getProducts();

  // Convert Decimal objects to standard JSON strings or serializable numbers for React client component:
  const serializedProducts = products.map((p) => ({
    ...p,
    pricePerBaseUnit: p.pricePerBaseUnit.toString(),
    stockQuantity: p.stockQuantity.toString(),
  }));

  return <ProductsClient initialProducts={serializedProducts} />;
}
