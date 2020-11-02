/** Create interface for rosbag ReadResult type since the rosbagjs library isn't typed */

// mark some properties as optional for testing
export interface ReadResult {
	topic: string,
	timestamp: {
		sec: number,
		nsec: number
	},
	message: {
		[propName: string]: any
	},
	data?: Buffer,
	chunkOffset?: number,
	totalChunks?: number
};