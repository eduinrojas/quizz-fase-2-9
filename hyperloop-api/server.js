const app = require('./app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hyperloop API escuchando en http://localhost:${PORT}`));
//const app = require('./original/app.buggy');