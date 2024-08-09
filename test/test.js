import request from 'supertest';
import { app } from '../index.js'; // Ensure this path is correct for your project

describe('Board Game Catalog API', () => {

  it('Debería listar todos los juegos', async () => {
    const res = await request(app).get('/games');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(20); // Assuming there are 20 games in memory
  });

  it('Debería alquilar un juego', async () => {
    const user = { username: 'admin', password: 'password123' };
    const loginRes = await request(app).post('/login').send(user);
    const token = loginRes.body.accessToken;

    const rentRes = await request(app)
      .post('/games/rent')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'SG001', renter: 'Juan' });

    expect(rentRes.status).toBe(200);
    expect(rentRes.body.message).toBe('Juego Speed Game alquilado por Juan.');
  });

  it('Debería devolver un juego', async () => {
    const user = { username: 'admin', password: 'password123' };
    const loginRes = await request(app).post('/login').send(user);
    const token = loginRes.body.accessToken;

    const returnRes = await request(app)
      .post('/games/return')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'SG001', renter: 'Juan' });

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.message).toBe('Juego Speed Game devuelto por Juan.');
  });

  it('Debería verificar si un juego es tendencia', async () => {
    const user = { username: 'admin', password: 'password123' };
    const loginRes = await request(app).post('/login').send(user);
    const token = loginRes.body.accessToken;
  
    await request(app)
      .post('/games/rent')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'SG001', renter: 'Juan' });
  
    const trendingRes = await request(app).get('/games/trending');
  
    expect(trendingRes.status).toBe(200);
  
    if (trendingRes.body.message) {
      expect(trendingRes.body).toBeInstanceOf(Object);
      expect(trendingRes.body.message).toBe('No hay juegos en tendencia en este momento.');
    } else {
      expect(trendingRes.body).toBeInstanceOf(Array);
      expect(trendingRes.body.some(game => game.sku === 'SG001')).toBe(true);
    }
  });

  it('Debería devolver un mensaje si no hay juegos en tendencia', async () => {
    const res = await request(app).get('/games/trending');

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Object);
    expect(res.body.message).toBe('No hay juegos en tendencia en este momento.');
  });

});
