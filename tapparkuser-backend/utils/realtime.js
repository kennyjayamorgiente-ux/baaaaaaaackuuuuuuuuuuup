let ioInstance = null;

const roomForArea = (areaId) => `area:${areaId}`;
const roomForReservation = (reservationId) => `reservation:${reservationId}`;
const roomForUser = (userId) => `user:${userId}`;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

const emitToRooms = (eventName, payload = {}) => {
  if (!ioInstance) {
    return;
  }

  const rooms = new Set();
  if (payload.areaId) rooms.add(roomForArea(payload.areaId));
  if (payload.reservationId) rooms.add(roomForReservation(payload.reservationId));
  if (payload.userId) rooms.add(roomForUser(payload.userId));

  if (rooms.size === 0) {
    ioInstance.emit(eventName, payload);
    return;
  }

  for (const room of rooms) {
    ioInstance.to(room).emit(eventName, payload);
  }
};

const emitReservationUpdated = (payload) => emitToRooms('reservation:updated', payload);
const emitSpotsUpdated = (payload) => emitToRooms('spots:updated', payload);
const emitCapacityUpdated = (payload) => emitToRooms('capacity:updated', payload);

module.exports = {
  setIO,
  getIO,
  roomForArea,
  roomForReservation,
  roomForUser,
  emitReservationUpdated,
  emitSpotsUpdated,
  emitCapacityUpdated
};
