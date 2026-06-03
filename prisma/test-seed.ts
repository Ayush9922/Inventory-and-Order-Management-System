import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

console.log('Environment DATABASE_URL:', process.env.DATABASE_URL);

try {
  // Pass the config directly to PrismaLibSql constructor
  const adapter = new PrismaLibSql({
    url: 'file:dev.db',
  });
  console.log('PrismaLibSql adapter created successfully.');

  const prisma = new PrismaClient({ adapter });
  console.log('PrismaClient instantiated successfully.');

  prisma.user.findMany().then((users) => {
    console.log('Users found:', users.length);
  }).catch((err) => {
    console.error('Query error:', err);
  });
} catch (err) {
  console.error('Initialization error:', err);
}
