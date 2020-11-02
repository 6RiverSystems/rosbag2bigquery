export class Rpy {
	roll: number;
	pitch: number;
	yaw: number;

	constructor(roll: number, pitch: number, yaw: number) {
		this.roll = roll;
		this.pitch = pitch;
		this.yaw = yaw;
	}
}

export class Quaternion {
	x: number;
	y: number;
	z: number;
	w: number;

	constructor(x: number, y: number, z: number, w: number) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}

	public normalize(): void {
		let l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
		if (l === 0) {
			this.x = 0;
			this.y = 0;
			this.z = 0;
			this.w = 1;
		} else {
			l = 1 / l;
			this.x = this.x * l;
			this.y = this.y * l;
			this.z = this.z * l;
			this.w = this.w * l;
		}
	}
}

/**
 * Class for doing math on angles such as converting between Euler angles and quaternions
 */
export class AngleMath {
	public static normalize(angle: number): number {
		while (angle < 0) {
			angle += 360.0;
		}
		while (angle >= 360) {
			angle -= 360.0;
		}

		return angle;
	}

	public static degreesToRadians(angleInDegrees: number) {
		return angleInDegrees * Math.PI / 180.0;
	}

	public static radiansToDegrees(angleInRadians: number) {
		return angleInRadians * 180.0 / Math.PI;
	}

	public static createQuaternionFromYaw(yaw: number): Quaternion {
		return this.createQuaternionFromRPY(0, 0, yaw);
	}

	public static createQuaternionFromRPY(roll: number, pitch: number, yaw: number): Quaternion {
		const phi = this.degreesToRadians(roll) / 2.0;
		const the = this.degreesToRadians(pitch) / 2.0;
		const psi = this.degreesToRadians(yaw) / 2.0;

		const orientation = new Quaternion(
			Math.sin(phi) * Math.cos(the) * Math.cos(psi) - Math.cos(phi) * Math.sin(the) * Math.sin(psi),
			Math.cos(phi) * Math.sin(the) * Math.cos(psi) + Math.sin(phi) * Math.cos(the) * Math.sin(psi),
			Math.cos(phi) * Math.cos(the) * Math.sin(psi) - Math.sin(phi) * Math.sin(the) * Math.cos(psi),
			Math.cos(phi) * Math.cos(the) * Math.cos(psi) + Math.sin(phi) * Math.sin(the) * Math.sin(psi)
		);

		orientation.normalize();

		return orientation;
	}

	public static createYawFromQuaternion(q: Quaternion): number {
		return this.createRPYFromQuaternion(q).yaw;
	}

	public static createRPYFromQuaternion(q: Quaternion): Rpy {
		const rpy: Rpy = new Rpy(Math.atan2(2.0 * (q.y * q.z + q.w * q.x), q.w * q.w - q.x * q.x - q.y * q.y + q.z * q.z),
			Math.asin(-2.0 * (q.x * q.z - q.w * q.y)),
			Math.atan2(2.0 * (q.x * q.y + q.w * q.z), q.w * q.w + q.x * q.x - q.y * q.y - q.z * q.z)
		);

		rpy.roll = this.normalize(this.radiansToDegrees(rpy.roll));
		rpy.pitch = this.normalize(this.radiansToDegrees(rpy.pitch));
		rpy.yaw = this.normalize(this.radiansToDegrees(rpy.yaw));

		return rpy;
	}
}
