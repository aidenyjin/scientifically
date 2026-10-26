import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { buildDemoPack } from "../src/content/demo-pack";
import { validatePack } from "../src/content/schema/course";
import { GAME } from "../src/game/config";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

async function main() {
  const result = validatePack(buildDemoPack());
  if (!result.ok) throw new Error("Demo pack is invalid:\n" + result.errors.join("\n"));
  const pack = result.pack;
  const data = {
    title: pack.title,
    subject: pack.subject,
    level: pack.level,
    status: "published",
    json: JSON.stringify(pack),
    generatedBy: JSON.stringify({ source: "demo" }),
  };
  await db.contentPack.upsert({ where: { id: pack.id }, update: data, create: { id: pack.id, ...data } });

  await db.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      name: "Scientist",
      wallet: { create: { gems: GAME.gems.starting, hearts: GAME.hearts.max } },
      streak: { create: {} },
    },
  });
  console.log(`Seeded pack "${pack.id}" (${pack.units.length} units) and the demo user.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
