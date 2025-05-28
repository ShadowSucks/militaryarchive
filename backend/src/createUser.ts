import { createUser } from "./auth";

async function seedAdmin() {
  await createUser("admin", "s3cr3t");
  console.log("Admin user created");
  process.exit(0);
}
seedAdmin();
