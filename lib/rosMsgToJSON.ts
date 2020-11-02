import { BigQuery, BigQueryTimestamp } from '@google-cloud/bigquery';
import { ReadResult } from './interface/readResult';
import { Pose } from './pose';

/**
 * Interface for row of data that we can load into BQ
 * We add robot pose, id, the filename of the bag, and the timestamp
 * to every row that we insert.
 */
export interface LoadableItem {
	msg: any,
	pose_x: number,
	pose_y: number,
	pose_yaw: number,
	robot_id: string,
	filename: string,
	time: BigQueryTimestamp
};

/**
 * Convet a ros message to a row that can be inserted into a BQ table
 * @param robotId The id of the robot
 * @param filename The filename of the bag
 * @param msg The ros msg read from the bag
 * @param pose The pose of the robot at the time the message was recorded
 */
export function rosMsgToLoadableItem(robotId: string, filename: string, msg: ReadResult, pose: Pose) : LoadableItem {
	// Create a date object from the ros timestamp
	let date: Date = new Date(0);
	if (msg.timestamp === undefined) {
		console.log(`Message timestamp is undefined`);
	}
	if (BigQuery === undefined) {
		console.log(`BigQuery is undefined`);
	}
	date.setUTCSeconds(msg.timestamp.sec);
	date.setUTCMilliseconds(msg.timestamp.nsec * 1e-6);

	// Put all of the data into an object that can be inserted into B
	return {
		robot_id: robotId,
		time: BigQuery.timestamp(date),
		msg: msg.message,
		pose_x: pose ? pose.x : null,
		pose_y: pose ? pose.y : null,
		pose_yaw: pose ? pose.orientation : null,
		filename: filename,
	};
}
