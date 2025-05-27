const bcrypt = require('bcrypt');

async function generateHash() {
  const plainPassword = '123456';
  const saltRounds = 10;

  try {
    const hash = await bcrypt.hash(plainPassword, saltRounds);
    console.log('Hash generado para "123456":');
    console.log(hash);
  } catch (err) {
    console.error('Error generando el hash:', err.message);
  }
}

generateHash();