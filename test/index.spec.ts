import {assert} from 'chai';

import { messages as bagWithTfAndMapPose } from './fixtures/bagWithTf';

import { bagToMessageBuffer } from '../lib/index';
import { LoadableItem } from '../lib/rosMsgToJSON';
import { ReadResult } from '../lib/interface/readResult';

/** mock bag interface */
// need to figure out how to import BagOptions and ReadResult types
class TestBag  {
	/* array of mock messages*/	
	messages: ReadResult[]

	constructor(messages: ReadResult[]) {
		this.messages = messages;
	}

	async readMessages(options: any, cb: (result: any) => Promise<void>) : Promise<void> {
		for(const message of this.messages) {
			await cb(message);
		}
	}
}

it('test a bag with Tf', async () => {
	const bag = new TestBag(bagWithTfAndMapPose);

	const messageBuffer: Map<string, Array<LoadableItem>> = await bagToMessageBuffer(bag, 'testRobot', 'testFile')
	
	const eventsLoadableItems = messageBuffer.get('/test');
	assert.isNotNull(eventsLoadableItems);
	assert.strictEqual(eventsLoadableItems.length, 4);
	assert.equal(eventsLoadableItems[0].pose_x, 20);
	assert.equal(eventsLoadableItems[1].pose_x, 20);
	assert.equal(eventsLoadableItems[2].pose_x, 20);
	assert.equal(eventsLoadableItems[3].pose_x, 30);
	assert.isNotEmpty(messageBuffer);
});