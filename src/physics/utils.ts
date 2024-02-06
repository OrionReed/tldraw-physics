import { Geometry2d, Vec2d, VecLike } from "@tldraw/tldraw";

type ShapeTransform = {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	parent?: Geometry2d;
}

// Define rotatePoint as a standalone function
function rotatePoint(cx: number, cy: number, x: number, y: number, angle: number) {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return {
		x: cos * (x - cx) - sin * (y - cy) + cx,
		y: sin * (x - cx) + cos * (y - cy) + cy,
	};
}

export function cornerToCenter({
	x,
	y,
	width,
	height,
	rotation,
	parent
}: ShapeTransform): { x: number; y: number } {
	// Calculate the center position
	let centerX = x + width / 2;
	let centerY = y + height / 2;

	if (parent) {
		centerX -= parent.center.x;
		centerY -= parent.center.y;
	}

	// Apply the rotation to the center position
	return rotatePoint(x, y, centerX, centerY, rotation);
}

export function centerToCorner({
	x,
	y,
	width,
	height,
	rotation,
}: ShapeTransform): { x: number; y: number } {

	const cornerX = x - width / 2;
	const cornerY = y - height / 2;

	return rotatePoint(x, y, cornerX, cornerY, rotation);
}

export function getDisplacement(
	velocity: VecLike,
	acceleration: VecLike,
	timeStep: number,
	speedLimitX: number,
	decelerationX: number,
): VecLike {
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

export function convertVerticesToFloat32Array(
	vertices: Vec2d[],
	width: number,
	height: number,
) {
	const vec2Array = new Float32Array(vertices.length * 2);
	const hX = width / 2;
	const hY = height / 2;

	for (let i = 0; i < vertices.length; i++) {
		vec2Array[i * 2] = vertices[i].x - hX;
		vec2Array[i * 2 + 1] = vertices[i].y - hY;
	}

	return vec2Array;
}
