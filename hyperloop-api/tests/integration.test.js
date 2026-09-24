// PRUEBAS DE INTEGRACIÓN (9): 3 Top-Down, 3 Bottom-Up, 3 Big Bang
const request = require('supertest');
const app = require('../app');
const { PodModel, HyperloopService, HyperloopController } = app;

// req/res falsos para invocar el controlador directamente
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => PodModel.reset());
afterEach(() => jest.restoreAllMocks());

// ---------------------------------------------------------------------------
// TOP-DOWN: se prueba desde arriba (rutas/controlador) y se simulan las capas bajas
// ---------------------------------------------------------------------------
describe('Integración Top-Down (capas inferiores mockeadas)', () => {
    it('TD1: el controlador responde 200 y delega en el servicio (servicio mockeado)', () => {
        const fake = { id: 'P1', destination: 'Boston', passengers: 20 };
        const spy = jest.spyOn(HyperloopService, 'bookSeat').mockReturnValue(fake);
        const res = mockRes();

        HyperloopController.postBooking({ body: { podId: 'P1', destination: 'Boston' } }, res);

        expect(spy).toHaveBeenCalledWith('P1', 'Boston');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(fake);
    });

    it('TD2: el controlador traduce el error del servicio (mockeado) a HTTP 400', () => {
        jest.spyOn(HyperloopService, 'bookSeat').mockImplementation(() => {
            throw new Error('Cápsula llena');
        });
        const res = mockRes();

        HyperloopController.postBooking({ body: { podId: 'P1', destination: 'Boston' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Cápsula llena' });
    });

    it('TD3: la ruta GET /api/hyperloop devuelve lo que entrega el modelo (base de datos mockeada)', async () => {
        const fakeDb = [{ id: 'MOCK', location: 'Test', destination: null, capacity: 1, passengers: 0 }];
        jest.spyOn(PodModel, 'getPods').mockReturnValue(fakeDb);

        const res = await request(app).get('/api/hyperloop');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(fakeDb);
    });
});

// ---------------------------------------------------------------------------
// BOTTOM-UP: se integran primero las capas bajas reales (Modelo -> Servicio -> Controlador)
// ---------------------------------------------------------------------------
describe('Integración Bottom-Up (módulos reales, de abajo hacia arriba)', () => {
    it('BU1: Servicio + Modelo - la reserva queda persistida en el modelo', () => {
        HyperloopService.bookSeat('P2', 'Denver');
        expect(PodModel.findById('P2')).toMatchObject({ passengers: 1, destination: 'Denver' });
    });

    it('BU2: Servicio + Modelo - reservas sucesivas nunca superan la capacidad', () => {
        HyperloopService.bookSeat('P1', 'Boston'); // 20/20
        expect(() => HyperloopService.bookSeat('P1', 'Boston')).toThrow('Cápsula llena');
        expect(PodModel.findById('P1').passengers).toBe(20);
    });

    it('BU3: Controlador + Servicio + Modelo - destino distinto responde 400 y el modelo queda intacto', () => {
        const res = mockRes();
        HyperloopController.postBooking({ body: { podId: 'P1', destination: 'Chicago' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(/Destino no coincide/) });
        expect(PodModel.findById('P1')).toMatchObject({ destination: 'Boston', passengers: 19 });
    });
});

// ---------------------------------------------------------------------------
// BIG BANG: todo integrado; se prueba la API completa con peticiones HTTP reales
// ---------------------------------------------------------------------------
describe('Integración Big Bang (API completa vía HTTP)', () => {
    it('BB1: GET /api/hyperloop lista las 2 cápsulas iniciales', async () => {
        const res = await request(app).get('/api/hyperloop');
        expect(res.status).toBe(200);
        expect(res.body.map(p => p.id)).toEqual(['P1', 'P2']);
    });

    it('BB2: POST /book y luego GET reflejan la reserva de extremo a extremo', async () => {
        const post = await request(app).post('/api/hyperloop/book').send({ podId: 'P2', destination: 'Denver' });
        expect(post.status).toBe(200);
        expect(post.body).toMatchObject({ id: 'P2', passengers: 1, destination: 'Denver' });

        const get = await request(app).get('/api/hyperloop');
        expect(get.body.find(p => p.id === 'P2').passengers).toBe(1);
    });

    it('BB3: POST /book con cápsula inexistente o sin destino responde 400 con mensaje', async () => {
        const noPod = await request(app).post('/api/hyperloop/book').send({ podId: 'X9', destination: 'Boston' });
        expect(noPod.status).toBe(400);
        expect(noPod.body).toEqual({ error: 'Cápsula no encontrada' });

        const noDest = await request(app).post('/api/hyperloop/book').send({ podId: 'P2' });
        expect(noDest.status).toBe(400);
        expect(noDest.body).toEqual({ error: 'Destino requerido' });
    });
});
