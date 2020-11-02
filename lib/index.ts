import * as Bag from '@6river/rosbag';
import {Storage} from '@google-cloud/storage';
import * as lz4 from 'lz4js';
import * as _ from 'lodash';
import * as fs from 'fs';
import {BigQuery} from '@google-cloud/bigquery';

import {AngleMath} from './angleMath'
import {Pose} from './pose'

import {rosMsgToLoadableItem, LoadableItem} from './rosMsgToJSON';
import {
	BigQuerySchema,
	createBigQuerySchema,
	insertDataIntoBigQuery,
} from './bigquery';
import {BigQueryCache} from './bigquery/bigQueryCache';

declare const Buffer;

// These will be replaced during build time
const BIGQUERY_PROJECT_ID = 'bigquery-project-id';
const DATASET_NAME = 'dataset-name';

const cache = new BigQueryCache();  // Cache used for repeated runs of the function

const bigQueryClient = new BigQuery({
	projectId: BIGQUERY_PROJECT_ID,
});

/**
 * Return the cache of data we save between function executions.
 * See https://cloud.google.com/functions/docs/bestpractices/tips#use_global_variables_to_reuse_objects_in_future_invocations
 * Using global variables allows us to save function startup time and avoid requerying for the table references.
 */
export function getCache() {
	return cache;
}

/**
 * Call our code.  This function is the main entry point for our GCF.
 * 
 * @param data The filename and metadata of the bag that was uploaded 
 * @param context The meta data for this function call
 * @param callback The callback that should be called with the result of this function invocation.
 */
export async function processAnalyticsBag(data: any, context: any, callback: any) {
	
	let result = null;	// initialize to null for success
	console.log(`Running processBag with event: ${JSON.stringify({data: data, context: context})}`);
    const file = data.name;
	const metadata = data.metadata;
	// Get the id of the robot that uploaded the bag.  We store this as metadata on the bag when it is uploaded.
	const robotId = _.get(metadata, 'robotId', null);
	// Get the GCS bucket where the bag is stored
    const bagBucket = _.get(data, 'bucket', null);

    // fail if we don't have the robotId or the bag bucket
	if (!robotId) {
	  	result = new Error(`No robot id set for bag ${file}. Cannot process bag.`);
	  	callback(result);
	  	return;
	}

	if (!bagBucket) {
	  	result = new Error(`No bucket found for bag ${file}. Cannot process bag.`);
	  	callback(result);
	  	return;
	}
	
	// Process the bag data.  Log any error that causes failure.
	try {
		console.log(`Processing bag ${file}`);
		await readBag(bagBucket, file, robotId);
    } catch(error) {
		result = new Error(`Failed to read bag ${file} : ${error}`);
		console.log(`Failed to read bag ${file} : ${error}`);
    }
	// End by calling the callback function that was passed in.
    callback(result);
}

/**
 * Convert a tf message into a pose object
 * @param msg The tf message
 */
function poseFromTfMsg(msg: any) {
	return new Pose(
		msg.transform.translation.x,
		msg.transform.translation.y,
		AngleMath.createYawFromQuaternion(msg.transform.rotation)
	);
}

/**
 * Read the bag and process its contents into BQ
 * @param bagBucket The name of the GCS bucket where the bag is stored
 * @param filename The bag filename
 * @param robotId The id of the robot associated with this bag
 */
async function readBag(bagBucket: string, filename: string, robotId: string) {
	// First, download the bag from the GCS bucket to a local storage location so it can be read
	let destinationFile = await downloadRemoteFile(bagBucket, filename, '/tmp/')
	if (!fs.existsSync(destinationFile)) {
		console.log(`File does not exist ${destinationFile}`)
	}
	console.log(`Opening bag: ${destinationFile}`)

	// Open the bag file 
	const bag: Bag = await Bag.open(destinationFile);
	// Build a buffer of messages by topic from the bag
	let messageBuffer: Map<string, Array<any>> = await bagToMessageBuffer(bag, robotId, filename);

	console.log("Iterating through bag")
	// Go through all of the topics and upload each one separately into BQ
	for (let topic of messageBuffer.keys()) {
		// check for empty topics
		if (messageBuffer.get(topic).length === 0) {
			console.log(`No messages for topic ${topic}. Skipping file.`);
			continue;
		}

		// Determine the schema of the table for the topic from the message structure
		console.log(`Creating schema for ${JSON.stringify(messageBuffer.get(topic)[0])}`);
		const schema: BigQuerySchema = createBigQuerySchema(messageBuffer.get(topic)[0]);

		// Push the messages for the topic into BQ
		console.log(`Inserting topic ${topic} to bigquery`);
		console.log(`Topic ${topic} has schema ${JSON.stringify(schema)}`);
		const topicString = topic.substr(1).replace(/\//g, '_');
		try {
			await insertDataIntoBigQuery(bigQueryClient, DATASET_NAME, schema,
				messageBuffer.get(topic), topicString, cache);
		} catch (error) {
			console.log(`Unable to insert data into bigquery - ${error}`);
		}
	}

	// Delete the temporary file to clear memory
	fs.unlinkSync(destinationFile);
}

/**
 * Download a bag file from GCS to a local storage location
 * @param bagBucket The name of the bucket where the bag is stored
 * @param remoteFile The name of bag file in the bucket
 * @param destinationDir The local directory where the bag should be stored
 */
async function downloadRemoteFile(bagBucket: string, remoteFile: any, destinationDir: string): Promise<string> {
	const storage = new Storage()
	const remoteFileArr: Array<string> = remoteFile.split('/');
	const destinationFile: string = destinationDir.concat(remoteFileArr[remoteFileArr.length - 1]);
	const options = {
		destination: destinationFile,
	};
	await storage.bucket(bagBucket).file(remoteFile).download(options);
	return Promise.resolve(destinationFile)
}

/**
 * 
 * @param bag The bag file handler
 * @param robotId The id of the robot that uploaded this bag
 * @param filename The name of the bag file
 */
export async function bagToMessageBuffer(bag: Bag, robotId: string, filename: string) : Promise<Map<string, Array<LoadableItem>>>  {
	let currentRobotToMap: Pose = null;
	let currentRobotToOdom: Pose = null;
	let currentOdomToMap: Pose = null;
	let currentTaskId: string = null;
	let prePoseMessageBuffer: Map<string, Array<[string, any]>> = new Map<string, Array<[string, any]>>();
	let messageBuffer: Map<string, Array<LoadableItem>> = new Map<string, Array<LoadableItem>>();

	// Read all of the messages in the bag one by one
	console.log("Creating the bag message buffer");
	await bag.readMessages(
		{
			// Our bags are compressed to save bandwidth / storage costs.  Uncompress when opening.
			decompress: {
				lz4: (buffer) => new Buffer.from(lz4.decompress(buffer)),
			}
		}, (result) => {
			// If the message topic is either a tf topic
			// then do not put it in BQ as a separate table.  Instead, use the pose information
			// to add the robot's last known position to every single row in BQ.
			if (result.topic.includes('/tf')) {

				// We use the tree map -> odom -> base_footprint for chuck
				result.message.transforms.forEach((transform) => {
					if (transform.child_frame_id == 'base_footprint') {
						// If the child_frame is base_footprint, then this is the odom -> base_footprint link
						currentRobotToOdom = poseFromTfMsg(transform);
					} else if (transform.child_frame_id == 'odom') {
						// If the child frame is odom, this this is the map -> odom tf
						currentOdomToMap = poseFromTfMsg(transform);
					}
					// If both links have been recorded, update the current robot pose
					if (currentOdomToMap && currentRobotToOdom){
						currentRobotToMap = currentOdomToMap.transform(currentRobotToOdom);
					}
					
				});

				// There may be some messages in the bag that were recorded before the tf or pose data.
				// These are stored in the prePoseMessgeBuffer.  If there are messages in this buffer and
				// the robot now has a valid pose, record that pose for all of the messages in the buffer and clear
				// out the buffer.
				if (currentRobotToMap && prePoseMessageBuffer) {
					for (let [topic, buffer] of prePoseMessageBuffer) {
						buffer.forEach((msgAndTaskIdWithoutPose) => {
							if (!messageBuffer.has(topic)) {
								messageBuffer.set(topic, []);
							}
							const msgWithoutPose = msgAndTaskIdWithoutPose[1];
							const msgTaskId = msgAndTaskIdWithoutPose[0];
							messageBuffer.get(topic).push(rosMsgToLoadableItem(robotId, filename,
								msgWithoutPose, currentRobotToMap));
						});
					}

					prePoseMessageBuffer = null;
				}
			} else {
				// If the topic is not a pose topic, convert it into a format that can be loaded into BQ
				if (currentRobotToMap) {
					// If the pose is known, convert the message.
					if (!messageBuffer.has(result.topic)) {
						messageBuffer.set(result.topic, []);
					}
					messageBuffer.get(result.topic).push(rosMsgToLoadableItem(robotId, filename, result, currentRobotToMap));
				} else {
					// If the pose is not known yet, store the message in a buffer for later conversion
					if (!prePoseMessageBuffer.has(result.topic)) {
						prePoseMessageBuffer.set(result.topic, []);
					}
					prePoseMessageBuffer.get(result.topic).push([currentTaskId, result]);
				}
			}

		});

		// Check if the pre-pose message buffer is still full.  This means the bag had no position information.
		// If so, tput in null for position.
		if (prePoseMessageBuffer != null) {
			for (let [topic, buffer] of prePoseMessageBuffer) {
				buffer.forEach((bufferItem: [string, any]) => {
					if (!messageBuffer.has(topic)) {
						messageBuffer.set(topic, []);
					}
					const taskId: string = bufferItem[0];
					const resultWithoutPose: any = bufferItem[1];
					messageBuffer.get(topic).push(rosMsgToLoadableItem(robotId, filename,
						resultWithoutPose, null));
				});
			}
		}
	return messageBuffer;
}
