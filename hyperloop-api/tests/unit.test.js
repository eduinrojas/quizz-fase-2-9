// PRUEBAS UNITARIAS (10): HyperloopService y PodModel aislados con Mocks/Spies
const { PodModel, HyperloopService } = require('../app');

describe('Pruebas unitarias - Hyperloop', () => {
    beforeEach(() => PodModel.reset());
    afterEach(() => jest.restoreAllMocks());

    it('U1: lanza error si la cápsula no existe (findById mockeado)', () => {
        const spy = jest.spyOn(PodModel, 'findById').mockReturnValue(undefined);
        expect(() => HyperloopService.bookSeat('X9', 'Boston')).toThrow('Cápsula no encontrada');
        expect(spy).toHaveBeenCalledWith('X9');
    });

    it('U2: lanza error si falta el destino (undefined o vacío)', () => {
        expect(() => HyperloopService.bookSeat('P2', undefined)).toThrow('Destino requerido');
        expect(() => HyperloopService.bookSeat('P2', '')).toThrow('Destino requerido');
    });

    it('U3: una reserva válida incrementa passengers en 1', () => {
        const pod = HyperloopService.bookSeat('P2', 'Denver');
        expect(pod.passengers).toBe(1);
    });

    it('U4: límite exacto - permite ocupar el último asiento (19/20 -> 20/20)', () => {
        expect(() => HyperloopService.bookSeat('P1', 'Boston')).not.toThrow();
        expect(PodModel.findById('P1').passengers).toBe(20);
    });

    it('U5: rechaza la reserva cuando la cápsula está llena (20/20)', () => {
        jest.spyOn(PodModel, 'findById').mockReturnValue(
            { id: 'F', destination: 'Boston', capacity: 20, passengers: 20 }
        );
        expect(() => HyperloopService.bookSeat('F', 'Boston')).toThrow('Cápsula llena');
    });

    it('U6: una reserva rechazada por capacidad no modifica passengers', () => {
        const fakePod = { id: 'F', destination: 'Boston', capacity: 20, passengers: 20 };
        jest.spyOn(PodModel, 'findById').mockReturnValue(fakePod);
        try { HyperloopService.bookSeat('F', 'Boston'); } catch (e) { /* esperado */ }
        expect(fakePod.passengers).toBe(20);
    });

    it('U7: una cápsula vacía adopta el destino del primer pasajero', () => {
        const pod = HyperloopService.bookSeat('P2', 'Denver');
        expect(pod.destination).toBe('Denver');
    });

    it('U8: con pasajeros a bordo, el mismo destino se acepta y no cambia', () => {
        const pod = HyperloopService.bookSeat('P1', 'Boston');
        expect(pod.destination).toBe('Boston');
    });

    it('U9: con pasajeros a bordo, un destino distinto se rechaza sin alterar la cápsula', () => {
        expect(() => HyperloopService.bookSeat('P1', 'Chicago')).toThrow(/Destino no coincide/);
        const pod = PodModel.findById('P1');
        expect(pod.destination).toBe('Boston');
        expect(pod.passengers).toBe(19);
    });

    it('U10: PodModel devuelve la cápsula correcta, undefined si no existe y la lista completa', () => {
        expect(PodModel.findById('P1').id).toBe('P1');
        expect(PodModel.findById('ZZ')).toBeUndefined();
        expect(PodModel.getPods()).toHaveLength(2);
    });
});
