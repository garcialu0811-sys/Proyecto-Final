import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

let prisma: PrismaClient | null = null;

if (process.env.DATABASE_URL) {
  try {
    const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });

    const prismaClientSingleton = () => {
      return new PrismaClient({ adapter });
    };

    const globalForPrisma = globalThis as unknown as {
      prisma: ReturnType<typeof prismaClientSingleton> | undefined;
    };

    prisma = globalForPrisma.prisma ?? prismaClientSingleton();

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prisma;
    }
  } catch (error) {
    console.warn('Advertencia: No se pudo instanciar Prisma Client. Se usará fallback local.', error);
    prisma = null;
  }
}

export default prisma;
