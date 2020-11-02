const fs = require('fs');

export async function writeBufferToFile(filename: string, buffer: Array<any>) : Promise<any> {
	console.log(`Creating write stream for file ${filename}`);
	let writePromise: Promise<any> = new Promise((resolve, reject) => {
		let stream: any = fs.createWriteStream(filename);

		stream.once('open', function (fd) {
			console.log(`Writing ${buffer.length} items to file`);
			for (let item of buffer) {
				stream.write(JSON.stringify(item));
				stream.write('\n');
			}

			stream.end();
		});

		stream.once('error', function(err) {
			console.log(`Stream error for ${filename}: ${err}`);
			reject();
		});

		stream.once('finish', function (fd) {
			console.log('Done writing file');
			resolve();
		})
	});
	return writePromise;
}
