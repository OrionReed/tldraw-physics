export const GRAVITY = { x: 0.0, y: 98 };
export const DEFAULT_RESTITUTION = 0;
export const DEFAULT_FRICTION = 0.1;

export function isRigidbody(color: string) {
	return !color || color === "black" ? false : true;
}
export function getGravityFromColor(color: string) {
	return color === 'grey' ? 0 : 1
}
export function getRestitutionFromColor(color: string) {
	return color === "orange" ? 0.9 : 0;
}
export function getFrictionFromColor(color: string) {
	return color === "blue" ? 0.1 : 0.8;
}
export const MATERIAL = {
	defaultRestitution: 0,
	defaultFriction: 0.1,
};
export const CHARACTER = {
	up: { x: 0.0, y: -1.0 },
	additionalMass: 20,
	maxSlopeClimbAngle: 1,
	slideEnabled: true,
	minSlopeSlideAngle: 0.9,
	applyImpulsesToDynamicBodies: true,
	autostepHeight: 5,
	autostepMaxClimbAngle: 1,
	snapToGroundDistance: 3,
	maxMoveSpeedX: 100,
	moveAcceleration: 600,
	moveDeceleration: 500,
	jumpVelocity: 300,
	gravityMultiplier: 10,
};
