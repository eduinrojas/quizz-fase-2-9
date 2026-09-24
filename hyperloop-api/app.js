const express = require('express');
const app = express();
app.use(express.json());

// Estado inicial en una función para poder reiniciarlo entre pruebas
const createInitialPods = () => [
    { id: 'P1', location: 'New York', destination: 'Boston', capacity: 20, passengers: 19 },
    { id: 'P2', location: 'Miami', destination: null, capacity: 10, passengers: 0 }
];
let pods = createInitialPods();

const PodModel = {
    getPods: () => pods,
    findById: (id) => pods.find(p => p.id === id),
    reset: () => { pods = createInitialPods(); } // solo para pruebas
};

const HyperloopService = {
    bookSeat: (podId, requestedDestination) => {
        const pod = PodModel.findById(podId);
        if (!pod) throw new Error('Cápsula no encontrada');
        if (!requestedDestination) throw new Error('Destino requerido');

        // BUG 1 CORREGIDO 
        if (pod.passengers >= pod.capacity) {
            throw new Error('Cápsula llena');
        }

        // BUG 2 CORREGIDO 
        const enTransito = pod.passengers > 0 && Boolean(pod.destination);
        if (enTransito && pod.destination !== requestedDestination) {
            throw new Error('Destino no coincide con el de la cápsula en tránsito');
        }
        if (!enTransito) {
            pod.destination = requestedDestination; // cápsula vacía: define su ruta
        }

        pod.passengers++;
        return pod;
    }
};

const HyperloopController = {
    getStatus: (req, res) => res.json(PodModel.getPods()),
    postBooking: (req, res) => {
        try {
            const result = HyperloopService.bookSeat(req.body.podId, req.body.destination);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};

app.get('/api/hyperloop', HyperloopController.getStatus);
app.post('/api/hyperloop/book', HyperloopController.postBooking);

module.exports = app;
// Se exponen las capas internas para poder probarlas de forma aislada
module.exports.PodModel = PodModel;
module.exports.HyperloopService = HyperloopService;
module.exports.HyperloopController = HyperloopController;
