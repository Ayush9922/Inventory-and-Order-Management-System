'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';

async function checkAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin privileges required.');
  }
}

export async function getProducts() {
  return await db.product.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function createProduct(formData: FormData) {
  await checkAdmin();

  const sku = formData.get('sku') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const category = formData.get('category') as string;
  const dimension = formData.get('dimension') as string; // WEIGHT, VOLUME, COUNT
  const baseUnit = formData.get('baseUnit') as string; // g, mL, item
  const pricePerBaseUnit = formData.get('pricePerBaseUnit') as string;
  const stockQuantity = formData.get('stockQuantity') as string;

  if (!sku || !name || !category || !dimension || !baseUnit || !pricePerBaseUnit || !stockQuantity) {
    return { error: 'All fields except description are required.' };
  }

  try {
    const existingSku = await db.product.findUnique({
      where: { sku },
    });

    if (existingSku) {
      return { error: 'A product with this SKU already exists.' };
    }

    await db.product.create({
      data: {
        sku,
        name,
        description,
        category,
        dimension,
        baseUnit,
        pricePerBaseUnit: parseFloat(pricePerBaseUnit),
        stockQuantity: parseFloat(stockQuantity),
      },
    });

    revalidatePath('/admin/products');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create product:', error);
    return { error: error.message || 'Failed to create product.' };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  await checkAdmin();

  const sku = formData.get('sku') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const category = formData.get('category') as string;
  const pricePerBaseUnit = formData.get('pricePerBaseUnit') as string;
  const stockQuantity = formData.get('stockQuantity') as string;

  if (!sku || !name || !category || !pricePerBaseUnit || !stockQuantity) {
    return { error: 'SKU, name, category, price, and stock are required.' };
  }

  try {
    const existingProduct = await db.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return { error: 'Product not found.' };
    }

    // Check SKU conflict
    if (existingProduct.sku !== sku) {
      const conflict = await db.product.findUnique({
        where: { sku },
      });
      if (conflict) {
        return { error: 'Another product with this SKU already exists.' };
      }
    }

    await db.product.update({
      where: { id },
      data: {
        sku,
        name,
        description,
        category,
        pricePerBaseUnit: parseFloat(pricePerBaseUnit),
        stockQuantity: parseFloat(stockQuantity),
      },
    });

    revalidatePath('/admin/products');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update product:', error);
    return { error: error.message || 'Failed to update product.' };
  }
}

export async function deleteProduct(id: string) {
  await checkAdmin();

  try {
    await db.product.delete({
      where: { id },
    });

    revalidatePath('/admin/products');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete product:', error);
    return { error: 'Failed to delete product. It may be linked to existing orders.' };
  }
}
