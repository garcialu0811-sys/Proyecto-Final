import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding PostgreSQL...");

  const hash = await bcrypt.hash("admin123", 10);
  const hashV = await bcrypt.hash("vendedor123", 10);
  

  const admin = await prisma.user.upsert({
    where: { email: "admin@qrshop.com" },
    update: {},
    create: {
      id: "user-admin",
      email: "admin@qrshop.com",
      password: hash,
      name: "Administrador QRShop",
      role: "ADMIN",
    },
  });

  const vendedor = await prisma.user.upsert({
    where: { email: "vendedor@qrshop.com" },
    update: {},
    create: {
      id: "user-vendedor",
      email: "vendedor@qrshop.com",
      password: hashV,
      name: "Carlos Vendedor",
      role: "VENDEDOR",
    },
  });

  console.log("Users:", { admin: admin.id, vendedor: vendedor.id });

  const sale1 = await prisma.sale.upsert({
    where: { id: "sale-aj2pjze5y" },
    update: {},
    create: {
      id: "sale-aj2pjze5y",
      productId: "prod-1",
      productName: "Teclado Mecánico RGB",
      quantity: 1,
      price: 89.99,
      total: 89.99,
      sellerId: vendedor.id,
    },
  });

  const sale2 = await prisma.sale.upsert({
    where: { id: "sale-91ztv6h8y" },
    update: {},
    create: {
      id: "sale-91ztv6h8y",
      productId: "prod-1",
      productName: "Teclado Mecánico RGB",
      quantity: 2,
      price: 89.99,
      total: 179.98,
      sellerId: vendedor.id,
    },
  });

  console.log("Sales:", { sale1: sale1.id, sale2: sale2.id });
  console.log("Seed completado!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
