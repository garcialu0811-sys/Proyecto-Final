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
  console.log("Seed completado!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
