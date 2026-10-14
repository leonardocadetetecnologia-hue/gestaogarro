import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Defina ${name} antes do seed.`);
  return value;
}

async function upsertUser(input: {
  name: string;
  email: string;
  password: string;
  role: "GESTOR_GARRO" | "ATENDENTE";
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.user.upsert({
    where: { email: input.email.toLowerCase() },
    update: { name: input.name, passwordHash, role: input.role, active: true },
    create: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
    },
  });
}

async function main() {
  await upsertUser({
    name: process.env.SEED_GESTORA_NAME?.trim() || "Gestora Garro",
    email: process.env.SEED_GESTORA_EMAIL?.trim() || "gestora@garro.local",
    password: required("SEED_GESTORA_PASSWORD"),
    role: "GESTOR_GARRO",
  });
  await upsertUser({
    name: process.env.SEED_ATENDENTE_NAME?.trim() || "Atendente",
    email: process.env.SEED_ATENDENTE_EMAIL?.trim() || "atendente@garro.local",
    password: required("SEED_ATENDENTE_PASSWORD"),
    role: "ATENDENTE",
  });
  const settings = [
    ["timer.yellowHours", "4"],
    ["timer.orangeHours", "24"],
    ["timer.redHours", "48"],
  ] as const;
  for (const [key, value] of settings) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log("Seed concluído. Senhas não são exibidas.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
