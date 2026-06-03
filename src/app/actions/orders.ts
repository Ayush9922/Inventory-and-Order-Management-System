'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { getBaseQuantityAndPrice, SupportedUnit } from '@/lib/conversions';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';

interface CartItem {
  productId: string;
  quantity: number;
  orderedUnit: SupportedUnit;
}

export async function createOrder(items: CartItem[]) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized. Please log in.' };
  }

  if (!items || items.length === 0) {
    return { error: 'Cart is empty.' };
  }

  try {
    // 1. Fetch products to validate
    const productIds = items.map((i) => i.productId);
    const dbProducts = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    interface PreparedOrderItem {
      productId: string;
      orderedQuantity: Decimal;
      orderedUnit: SupportedUnit;
      baseQuantity: Decimal;
      pricePerUnit: Decimal;
      subtotal: Decimal;
    }
    const orderItemsData: PreparedOrderItem[] = [];
    let orderTotalPrice = new Decimal(0);

    // 2. Validate products and calculate conversions
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return { error: `Product not found for ID: ${item.productId}` };
      }

      // Perform conversion and pricing math
      const { baseQuantity, pricePerUnit, subtotal } = getBaseQuantityAndPrice(
        item.quantity,
        item.orderedUnit,
        product.baseUnit as SupportedUnit,
        product.pricePerBaseUnit.toString()
      );

      orderTotalPrice = orderTotalPrice.plus(subtotal);

      orderItemsData.push({
        productId: product.id,
        orderedQuantity: new Decimal(item.quantity),
        orderedUnit: item.orderedUnit,
        baseQuantity: baseQuantity,
        pricePerUnit: pricePerUnit,
        subtotal: subtotal,
      });
    }

    // 3. Create order in a transaction
    await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          sellerId: session.userId,
          status: 'PENDING',
          totalPrice: orderTotalPrice,
        },
      });

      for (const itemData of orderItemsData) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: itemData.productId,
            orderedQuantity: itemData.orderedQuantity,
            orderedUnit: itemData.orderedUnit,
            baseQuantity: itemData.baseQuantity,
            pricePerUnit: itemData.pricePerUnit,
            subtotal: itemData.subtotal,
          },
        });
      }
    });

    revalidatePath('/seller/dashboard');
    revalidatePath('/admin/orders');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create order:', error);
    return { error: error.message || 'Failed to place quotation.' };
  }
}

export async function getSellerOrders() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized.');
  }

  return await db.order.findMany({
    where: { sellerId: session.userId },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAllOrders() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin required.');
  }

  return await db.order.findMany({
    include: {
      seller: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateOrderStatus(orderId: string, status: 'APPROVED' | 'REJECTED') {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Unauthorized. Admin privileges required.' };
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      return { error: 'Order not found.' };
    }

    if (order.status !== 'PENDING') {
      return { error: `Order is already ${order.status.toLowerCase()}.` };
    }

    if (status === 'APPROVED') {
      // 1. Check stock and deduct in a transaction
      await db.$transaction(async (tx) => {
        for (const item of order.items) {
          const freshProduct = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!freshProduct) {
            throw new Error(`Product ${item.product.name} not found.`);
          }

          const currentStock = new Decimal(freshProduct.stockQuantity.toString());
          const requiredQty = new Decimal(item.baseQuantity.toString());

          if (currentStock.lessThan(requiredQty)) {
            throw new Error(
              `Insufficient stock for ${freshProduct.name}. Required: ${requiredQty} ${freshProduct.baseUnit}, Available: ${currentStock} ${freshProduct.baseUnit}`
            );
          }

          // Deduct stock
          const newStock = currentStock.minus(requiredQty);
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newStock },
          });
        }

        // 2. Mark order as approved
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'APPROVED' },
        });
      });
    } else {
      // Just mark order as rejected
      await db.order.update({
        where: { id: orderId },
        data: { status: 'REJECTED' },
      });
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin/products');
    revalidatePath('/seller/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update order status:', error);
    return { error: error.message || 'Failed to update order status.' };
  }
}
