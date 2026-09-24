// PRUEBAS DE REGRESIÓN (2): garantizan que los bugs corregidos no reaparezcan
const request = require('supertest');
const app = require('../app');

beforeEach(() => app.PodModel.reset());

describe('Regresión', () => {
    it('REG-1 (Bug overbooking): exceder la capacidad por 1 asiento devuelve HTTP 400', async () => {
        // P1 inicia en 19/20: el asiento 20 sí se permite...
        const ok = await request(app).post('/api/hyperloop/book').send({ podId: 'P1', destination: 'Boston' });
        expect(ok.status).toBe(200);
        expect(ok.body.passengers).toBe(20);

        // ...y el asiento 21 (1 por encima del límite) debe fallar
        const extra = await request(app).post('/api/hyperloop/book').send({ podId: 'P1', destination: 'Boston' });
        expect(extra.status).toBe(400);
        expect(extra.body).toEqual({ error: 'Cápsula llena' });
        expect(app.PodModel.findById('P1').passengers).toBe(20);
    });

    it('REG-2 (Bug sobrescritura): el destino de una cápsula con pasajeros no puede reescribirse', async () => {
        const res = await request(app).post('/api/hyperloop/book').send({ podId: 'P1', destination: 'Chicago' });
        expect(res.status).toBe(400);

        const estado = await request(app).get('/api/hyperloop');
        const p1 = estado.body.find(p => p.id === 'P1');
        expect(p1.destination).toBe('Boston');
        expect(p1.passengers).toBe(19);
    });
});
