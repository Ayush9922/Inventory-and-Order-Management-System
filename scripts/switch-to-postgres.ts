import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(__dirname, '..');

const SCHEMAPATH = path.join(ROOT_DIR, 'prisma', 'schema.prisma');
const CONFIGPATH = path.join(ROOT_DIR, 'prisma.config.ts');
const SEEDPATH = path.join(ROOT_DIR, 'prisma', 'seed.ts');
const DBPATH = path.join(ROOT_DIR, 'src', 'lib', 'db.ts');

const POSTGRES_SCHEMA = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider   = "prisma-client-js"
  engineType = "library"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         String   // "ADMIN" | "SELLER"
  createdAt    DateTime @default(now())
  orders       Order[]
}

model Product {
  id                String      @id @default(uuid())
  sku               String      @unique
  name              String
  description       String?
  category          String
  dimension         String      // "WEIGHT" | "VOLUME" | "COUNT"
  baseUnit          String      // "g" | "mL" | "item"
  pricePerBaseUnit  Decimal     @db.Decimal(20, 8)
  stockQuantity     Decimal     @db.Decimal(20, 8)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  orderItems        OrderItem[]
}

model Order {
  id         String      @id @default(uuid())
  sellerId   String
  seller     User        @relation(fields: [sellerId], references: [id])
  status     String      @default("PENDING") // "PENDING" | "APPROVED" | "REJECTED"
  totalPrice Decimal     @db.Decimal(20, 8)
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  items      OrderItem[]
}

model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  orderedQuantity Decimal  @db.Decimal(20, 8)
  orderedUnit     String   // "g" | "kg" | "mL" | "L" | "item"
  baseQuantity    Decimal  @db.Decimal(20, 8)
  pricePerUnit    Decimal  @db.Decimal(20, 8)
  subtotal        Decimal  @db.Decimal(20, 8)
}
`;

const POSTGRES_CONFIG = `import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
`;

const POSTGRES_SEED = `import { PrismaClient } from '@prisma/client';
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
`;

const POSTGRES_DB = `import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaClient: PrismaClient;

if (typeof window === 'undefined') {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/inventory_db';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV === 'production') {
    prismaClient = new PrismaClient({ adapter });
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        adapter,
        log: ['query', 'error', 'warn'],
      });
    }
    prismaClient = globalForPrisma.prisma;
  }
} else {
  prismaClient = null as any;
}

export const db = prismaClient;
export type { PrismaClient };
`;

function run() {
  console.log('Switching database configuration to PostgreSQL...');

  console.log('Writing schema.prisma...');
  fs.writeFileSync(SCHEMAPATH, POSTGRES_SCHEMA);

  console.log('Writing prisma.config.ts...');
  fs.writeFileSync(CONFIGPATH, POSTGRES_CONFIG);

  console.log('Writing seed.ts...');
  fs.writeFileSync(SEEDPATH, POSTGRES_SEED);

  console.log('Writing db.ts...');
  fs.writeFileSync(DBPATH, POSTGRES_DB);

  console.log('Database switcher successfully configured! Running prisma generate...');
  execSync('npx prisma generate', { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log('PostgreSQL client generated successfully! Ready for production deployment on Vercel.');
}

run();
