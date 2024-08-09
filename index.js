const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

require('dotenv').config();
const SECRET_KEY = process.env.JWT_SECRET;

// Usuarios simulados (normalmente estarían en una base de datos)
const USERS = [
  { username: 'admin', password: bcrypt.hashSync('password123', 8) },
];

const app = express();
app.use(bodyParser.json());

// Middleware para verificar el token JWT
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

// Endpoint para iniciar sesión y obtener un token
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username);

  if (user && bcrypt.compareSync(password, user.password)) {
    // Usuario y contraseña correctos, generamos un token
    const accessToken = jwt.sign({ username: user.username }, SECRET_KEY, {
      expiresIn: '2h',
    });

    res.json({ accessToken });
  } else {
    res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
  }
});

// Datos de juegos (en memoria)
let boardGames = [
  {
    name: 'Speed Game',
    sku: 'SG001',
    totalQuantity: 10,
    rentedQuantity: 6,
    estimatedDuration: 8,
    category: 'speed',
  },
  // Otros juegos aquí
];

// Helper para verificar si un juego es tendencia
const isTrending = async (game) => {
  const rentedPercentage = (game.rentedQuantity / game.totalQuantity) * 100;

  if (rentedPercentage > 70) {
    if (game.category === 'speed' && game.estimatedDuration < 10) {
      return true;
    } else if (game.category === 'culture' && game.name.split(' ').length > 2) {
      return true;
    } else if (game.category === 'strategy') {
      try {
        const weatherResponse = await axios.get(
          'http://api.weatherapi.com/v1/forecast.json?key=109d5a86ab444d3d859162752220303&days=0&q=Buenos%20Aires'
        );
        const forecast = weatherResponse.data.forecast.forecastday[0].day.condition.text;
        if (forecast.toLowerCase().includes('rain')) {
          return true;
        }
      } catch (error) {
        console.error('Error al obtener el pronóstico del tiempo:', error);
      }
    }
  }

  return false;
};

// Listar todos los juegos de mesa
app.get('/games', async (req, res) => {
  const games = await Promise.all(
    boardGames.map(async (game) => ({
      ...game,
      availableQuantity: game.totalQuantity - game.rentedQuantity,
      isTrending: await isTrending(game),
    }))
  );
  res.json(games);
});

// Buscar juego por nombre o SKU
app.get('/games/search', async (req, res) => {
  const { name, sku } = req.query;
  const games = await Promise.all(
    boardGames
      .filter(
        (game) =>
          (name && game.name.toLowerCase().includes(name.toLowerCase())) ||
          (sku && game.sku === sku)
      )
      .map(async (game) => ({
        ...game,
        availableQuantity: game.totalQuantity - game.rentedQuantity,
        isTrending: await isTrending(game),
      }))
  );
  res.json(games);
});

// Alquilar un juego (requiere autenticación JWT)
app.post('/games/rent', authenticateJWT, (req, res) => {
  const { sku, renter } = req.body;
  const game = boardGames.find((game) => game.sku === sku);

  if (game && game.rentedQuantity < game.totalQuantity) {
    game.rentedQuantity += 1;
    res.json({ message: `Juego ${game.name} alquilado por ${renter}.` });
  } else {
    res.status(400).json({ message: 'Juego no disponible.' });
  }
});

// Devolver un juego alquilado (requiere autenticación JWT)
app.post('/games/return', authenticateJWT, (req, res) => {
  const { sku, renter } = req.body;
  const game = boardGames.find((game) => game.sku === sku);

  if (game && game.rentedQuantity > 0) {
    game.rentedQuantity -= 1;
    res.json({ message: `Juego ${game.name} devuelto por ${renter}.` });
  } else {
    res.status(400).json({ message: 'No hay juegos para devolver.' });
  }
});

const HOST = 'localhost';
const PORT = 3000;

// Iniciar el servidor
app.listen(PORT, HOST, () => {
  console.log(`API de juegos de mesa corriendo en http://localhost:${PORT}`);
});
