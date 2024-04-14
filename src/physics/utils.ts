import { TLGeoShape, TLGroupShape, TLShape, Vec, VecLike } from "@tldraw/tldraw";

export const GRAVITY = { x: 0.0, y: 98 };
export const DEFAULT_RESTITUTION = 0;
export const DEFAULT_FRICTION = 0.5;

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


type ShapeTransform = {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	parentGroupShape?: TLShape | undefined
}

// Define rotatePoint as a standalone function
const rotatePoint = (cx: number, cy: number, x: number, y: number, angle: number) => {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return {
		x: cos * (x - cx) - sin * (y - cy) + cx,
		y: sin * (x - cx) + cos * (y - cy) + cy,
	};
}

export const cornerToCenter = ({
	x,
	y,
	width,
	height,
	rotation,
	parentGroupShape
}: ShapeTransform): { x: number; y: number } => {
	const centerX = x + width / 2;
	const centerY = y + height / 2;
	if (parentGroupShape) {
		return rotatePoint(parentGroupShape.x, parentGroupShape.y, centerX, centerY, rotation);
	}
	return rotatePoint(x, y, centerX, centerY, rotation);

}

export const centerToCorner = ({
	x,
	y,
	width,
	height,
	rotation,
}: ShapeTransform): { x: number; y: number } => {

	const cornerX = x - width / 2;
	const cornerY = y - height / 2;

	return rotatePoint(x, y, cornerX, cornerY, rotation);
}

export const getDisplacement = (
	velocity: VecLike,
	acceleration: VecLike,
	timeStep: number,
	speedLimitX: number,
	decelerationX: number,
): VecLike => {
	let newVelocityX =
		acceleration.x === 0 && velocity.x !== 0
			? Math.max(Math.abs(velocity.x) - decelerationX * timeStep, 0) *
			Math.sign(velocity.x)
			: velocity.x + acceleration.x * timeStep;

	newVelocityX =
		Math.min(Math.abs(newVelocityX), speedLimitX) * Math.sign(newVelocityX);

	const averageVelocityX = (velocity.x + newVelocityX) / 2;
	const x = averageVelocityX * timeStep;
	const y =
		velocity.y * timeStep + 0.5 * acceleration.y * timeStep ** 2;

	return { x, y }
}

export const convertVerticesToFloat32Array = (
	vertices: Vec[],
	width: number,
	height: number,
) => {
	const vec2Array = new Float32Array(vertices.length * 2);
	const hX = width / 2;
	const hY = height / 2;

	for (let i = 0; i < vertices.length; i++) {
		vec2Array[i * 2] = vertices[i].x - hX;
		vec2Array[i * 2 + 1] = vertices[i].y - hY;
	}

	return vec2Array;
}

export const shouldConvexify = (shape: TLShape): boolean => {
	return !(
		shape.type === "geo" && (shape as TLGeoShape).props.geo === "rectangle"
	);
}