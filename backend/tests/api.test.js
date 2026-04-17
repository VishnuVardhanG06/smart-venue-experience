const request = require('supertest');
const express = require('express');
const { router } = require('../routes');

const app = express();
app.use(express.json());
app.use('/api', router); // Mount identical to production server.js

// Mock the websocket init
const { init } = require('../routes');
init(() => {});

describe('REST API Core Operations', () => {
  
  test('GET /api/kpis returns aggregated venue layout metrics', async () => {
    const response = await request(app).get('/api/kpis');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('totalOccupancy');
    expect(response.body).toHaveProperty('openIncidents');
    expect(typeof response.body.totalOccupancy).toBe('number');
  });

  test('POST /api/incidents creates a new incident and auto-flags status', async () => {
    const response = await request(app)
      .post('/api/incidents')
      .send({ type: 'security_alert', zone_id: 'Z04' });
    
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('incident_id');
    expect(response.body.type).toBe('security_alert');
    expect(response.body.status).toBe('open');
  });

  test('POST /api/incidents without required parameters returns 400', async () => {
    const response = await request(app).post('/api/incidents').send({});
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
