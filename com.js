const bcrypt = require('bcryptjs');

const users = [
  { id: '1', password: '1111' },
  { id: '2', password: '2222' },
  { id: '3', password: '3333' },
  { id: '4', password: '1111' },
  { id: '5', password: '2222' }, // 11
  { id: '6', password: '3333' },
  { id: '7', password: '1111' },
  { id: '8', password: '2222' },
  { id: '10', password: '3333' }
];

(async () => {
  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, 10); // 10 = salt rounds
    console.log(`UPDATE users SET password = '${hashed}' WHERE id = '${user.id}';`);
  }
})();
