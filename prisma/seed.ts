import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createHash } from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/inventory_db';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding database...');
  const adminPassword = hashPassword('admin123');
  const sellerPassword = hashPassword('seller123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@aasamedchem.com' },
    update: {},
    create: {
      email: 'admin@aasamedchem.com',
      name: 'Dr. Ayush (Admin)',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@aasamedchem.com' },
    update: {},
    create: {
      email: 'seller@aasamedchem.com',
      name: 'Samir (Seller)',
      passwordHash: sellerPassword,
      role: 'SELLER',
    },
  });

  console.log('Users seeded:', { admin: admin.email, seller: seller.email });

  const products = [
    {
      sku: 'CHEM-ASP-01',
      name: 'Aspirin (Acetylsalicylic Acid)',
      description: 'High-purity active pharmaceutical ingredient (API), USP grade, suitable for formulation research.',
      category: 'Active Pharmaceutical Ingredients',
      dimension: 'WEIGHT',
      baseUnit: 'g',
      pricePerBaseUnit: 0.45,
      stockQuantity: 50000,
    },
    {
      sku: 'CHEM-ETH-02',
      name: 'Ethanol 99% Pure',
      description: 'Anhydrous alcohol solvent for extraction, synthesis, and sanitization.',
      category: 'Solvents',
      dimension: 'VOLUME',
      baseUnit: 'mL',
      pricePerBaseUnit: 0.15,
      stockQuantity: 100000,
    },
    {
      sku: 'LAB-PD-03',
      name: 'Petri Dishes 90mm (Sterile)',
      description: 'Single-use polystyrene petri dishes for microbial culture, package of 1 unit.',
      category: 'Labware',
      dimension: 'COUNT',
      baseUnit: 'item',
      pricePerBaseUnit: 12.50,
      stockQuantity: 250,
    },
    {
      sku: 'CHEM-NAOH-04',
      name: 'Sodium Hydroxide Pellets',
      description: 'Analytical reagent grade NaOH. Highly hygroscopic, store in sealed containers.',
      category: 'Reagents',
      dimension: 'WEIGHT',
      baseUnit: 'g',
      pricePerBaseUnit: 0.80,
      stockQuantity: 25000,
    },
    {
      sku: 'CHEM-HCL-05',
      name: 'Hydrochloric Acid 37%',
      description: 'Concentrated strong acid, ACS reagent grade, for chemical analysis and pH adjustment.',
      category: 'Acids',
      dimension: 'VOLUME',
      baseUnit: 'mL',
      pricePerBaseUnit: 0.65,
      stockQuantity: 50000,
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        name: prod.name,
        description: prod.description,
        category: prod.category,
        dimension: prod.dimension,
        baseUnit: prod.baseUnit,
        pricePerBaseUnit: prod.pricePerBaseUnit,
        stockQuantity: prod.stockQuantity,
      },
      create: prod,
    });
  }

  console.log('Products seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
