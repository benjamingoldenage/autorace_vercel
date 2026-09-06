// src/Collision.js içine ekleyin:
export function keepCarOnTrack(car, trackLimits) {
    // Arabanın pist sınırını aşmasını engeller
    if (car.position.x < trackLimits.minX) car.position.x = trackLimits.minX;
    if (car.position.x > trackLimits.maxX) car.position.x = trackLimits.maxX;
    if (car.position.z < trackLimits.minZ) car.position.z = trackLimits.minZ;
    if (car.position.z > trackLimits.maxZ) car.position.z = trackLimits.maxZ;
}
