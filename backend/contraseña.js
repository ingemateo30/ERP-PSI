// crear_hash.js
const bcrypt = require("bcryptjs");

async function generarHash(password) {
  try {
    const saltRounds = 12; // Debe coincidir con tu AuthController
    const hash = await bcrypt.hash(password, saltRounds);
    console.log("\n🔐 Contraseña original:", password);
    console.log("🔑 Hash generado listo para DB:\n");
    console.log(hash + "\n");
  } catch (error) {
    console.error("❌ Error generando hash:", error);
  }
}

// Cambia esto por la contraseña que quieras generar
const passwordEnTextoPlano = process.argv[2];

if (!passwordEnTextoPlano) {
  console.log("Uso: node crear_hash.js <contraseña>");
  process.exit(1);
}

generarHash(passwordEnTextoPlano);
