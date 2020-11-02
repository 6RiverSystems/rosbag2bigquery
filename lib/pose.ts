import { AngleMath } from "./angleMath";

export class Pose {
    x: number;
    y: number;
    orientation: number;

    constructor(x: number, y: number, orientation: number) {
            this.x = x;
            this.y = y;
            this.orientation = orientation;
    }

    public transform(pose: Pose): Pose {
            const orientationInRadians = this.orientation * Math.PI / 180.0;
            return (new Pose(
                    this.x + pose.x * Math.cos(orientationInRadians) - pose.y * Math.sin(orientationInRadians),
                    this.y + pose.x * Math.sin(orientationInRadians) + pose.y * Math.cos(orientationInRadians),
                    AngleMath.normalize(this.orientation + pose.orientation))
            );
    }

    public inverse(): Pose {
            const yawRad = this.orientation * Math.PI / 180.0;
            const sinYaw = Math.sin(yawRad);
            const cosYaw = Math.cos(yawRad);
            const x = this.x;
            const y = this.y;

            return (new Pose(
                    -x * cosYaw - y * sinYaw,
                    -y * cosYaw + x * sinYaw,
                    AngleMath.normalize(-this.orientation)
            )
            );
    }

    public distance(pose: Pose): number {
            if (pose === null) {
                    return 0;
            }
            const diff = Math.sqrt((this.x - pose.x)*(this.x - pose.x) + (this.y - pose.y)*(this.y - pose.y));
            return diff;
    }
}
