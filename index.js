import express from 'express';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = process.env.JWT_SECRET || 'tu_secreto';

// Datos en memoria con 20 juegos
let games = [
    { name: 'Speed Game', sku: 'SG001', totalQuantity: 10, rentedQuantity: 0, estimatedDuration: 8, category: 'speed' },
    { name: 'General Culture Game', sku: 'GCG002', totalQuantity: 5, rentedQuantity: 0, estimatedDuration: 30, category: 'culture' },
    { name: 'Strategy Game', sku: 'SG003', totalQuantity: 7, rentedQuantity: 0, estimatedDuration: 120, category: 'strategy' },
    { name: 'Memory Master', sku: 'MM004', totalQuantity: 8, rentedQuantity: 0, estimatedDuration: 15, category: 'culture' },
    { name: 'Fast Track', sku: 'FT005', totalQuantity: 12, rentedQuantity: 0, estimatedDuration: 9, category: 'speed' },
    { name: 'World Trivia', sku: 'WT006', totalQuantity: 6, rentedQuantity: 0, estimatedDuration: 45, category: 'culture' },
    { name: 'Chess', sku: 'C007', totalQuantity: 4, rentedQuantity: 0, estimatedDuration: 60, category: 'strategy' },
    { name: 'Sudoku Challenge', sku: 'SC008', totalQuantity: 10, rentedQuantity: 0, estimatedDuration: 30, category: 'culture' },
    { name: 'Rapid Reflexes', sku: 'RR009', totalQuantity: 15, rentedQuantity: 0, estimatedDuration: 7, category: 'speed' },
    { name: 'Puzzle Master', sku: 'PM010', totalQuantity: 9, rentedQuantity: 0, estimatedDuration: 50, category: 'strategy' },
    { name: 'Speed Round', sku: 'SR011', totalQuantity: 10, rentedQuantity: 0, estimatedDuration: 6, category: 'speed' },
    { name: 'Capital Cities', sku: 'CC012', totalQuantity: 7, rentedQuantity: 0, estimatedDuration: 25, category: 'culture' },
    { name: 'War Tactics', sku: 'WT013', totalQuantity: 8, rentedQuantity: 0, estimatedDuration: 90, category: 'strategy' },
    { name: 'Quick Draw', sku: 'QD014', totalQuantity: 10, rentedQuantity: 0, estimatedDuration: 5, category: 'speed' },
    { name: 'Knowledge Quest', sku: 'KQ015', totalQuantity: 6, rentedQuantity: 0, estimatedDuration: 35, category: 'culture' },
    { name: 'Battlefield', sku: 'BF016', totalQuantity: 7, rentedQuantity: 0, estimatedDuration: 100, category: 'strategy' },
    { name: 'Reaction Time', sku: 'RT017', totalQuantity: 12, rentedQuantity: 0, estimatedDuration: 8, category: 'speed' },
    { name: 'History Buff', sku: 'HB018', totalQuantity: 5, rentedQuantity: 0, estimatedDuration: 40, category: 'culture' },
    { name: 'Empire Builder', sku: 'EB019', totalQuantity: 8, rentedQuantity: 0, estimatedDuration: 120, category: 'strategy' },
    { name: 'Flash Cards', sku: 'FC020', totalQuantity: 10, rentedQuantity: 0, estimatedDuration: 10, category: 'culture' },
  ];
  

let trendingGames = [];

// Middleware para autenticación JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token no válido' });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: 'Autenticación requerida' });
  }
};

// Login y generación de token
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = { username: 'admin', password: bcrypt.hashSync('password123', 8) };

  if (username === user.username && bcrypt.compareSync(password, user.password)) {
    const accessToken = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ accessToken });
  } else {
    res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
  }
});

// Listar todos los juegos con información adicional (rentas y tendencias)
app.get('/games', (req, res) => {
  const gamesWithDetails = games.map((game) => {
    const isTrending = trendingGames.some((tg) => tg.sku === game.sku);

    return {
      ...game,
      isTrending,
    };
  });

  res.json(gamesWithDetails);
});

// Buscar juegos por nombre o SKU
app.get('/games/search', (req, res) => {
  const { name, sku } = req.query;

  const filteredGames = games.filter(
    (game) =>
      (name && game.name.toLowerCase().includes(name.toLowerCase())) ||
      (sku && game.sku === sku)
  );

  if (filteredGames.length > 0) {
    res.json(filteredGames);
  } else {
    res.status(404).json({ message: 'No se encontraron juegos que coincidan con los criterios de búsqueda.' });
  }
});

// Alquilar un juego
app.post('/games/rent', authenticateJWT, (req, res) => {
  const { sku, renter } = req.body;
  const game = games.find((g) => g.sku === sku);

  if (!game) {
    return res.status(404).json({ message: 'Juego no encontrado.' });
  }

  if (game.rentedQuantity < game.totalQuantity) {
    game.rentedQuantity += 1;
    res.json({ message: `Juego ${game.name} alquilado por ${renter}.` });
    checkTrending(game);
  } else {
    res.status(400).json({ message: 'Juego no disponible para alquilar.' });
  }
});

// Devolver un juego
app.post('/games/return', authenticateJWT, (req, res) => {
  const { sku, renter } = req.body;
  const game = games.find((g) => g.sku === sku);

  if (!game) {
    return res.status(404).json({ message: 'Juego no encontrado.' });
  }

  if (game.rentedQuantity > 0) {
    game.rentedQuantity -= 1;
    res.json({ message: `Juego ${game.name} devuelto por ${renter}.` });
    checkTrending(game);
  } else {
    res.status(400).json({ message: 'No hay ejemplares de este juego para devolver.' });
  }
});

// Verificar si un juego es tendencia
const checkTrending = (game) => {
  const rentedPercentage = (game.rentedQuantity / game.totalQuantity) * 100;

  let isTrending = false;
  if (rentedPercentage > 70) {
    if (game.category === 'speed' && game.estimatedDuration < 10) {
      isTrending = true;
    } else if (game.category === 'culture' && game.name.split(' ').length > 2) {
      isTrending = true;
    } else if (game.category === 'strategy') {
      const isRaining = true; // Simulación de condiciones meteorológicas
      if (isRaining) {
        isTrending = true;
      }
    }
  }

  if (isTrending && !trendingGames.some((tg) => tg.sku === game.sku)) {
    trendingGames.push(game);
  } else if (!isTrending && trendingGames.some((tg) => tg.sku === game.sku)) {
    trendingGames = trendingGames.filter((tg) => tg.sku !== game.sku);
  }
};

// Endpoint para obtener juegos en tendencia
app.get('/games/trending', (req, res) => {
  if (trendingGames.length > 0) {
    res.json(trendingGames);
  } else {
    res.json({ message: 'No hay juegos en tendencia en este momento.' });
  }
});

// Iniciar el servidor
const HOST = 'localhost';
const PORT = 3000;

app.listen(PORT, HOST, () => {
  console.log(`API de juegos de mesa corriendo en http://${HOST}:${PORT}`);
});

export { app };
