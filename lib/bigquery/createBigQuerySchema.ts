import {
	BigQuerySchema,
	BigQueryColumnSchema,
	BigQueryMode,
	BigQueryDataType
} from './schema';

// 
/**
 * Recursively go through the ros msg object and generate the BQ schema
 * Rather than use the message definitions, we just look at the message object itself
 * to determine the schema.  Every field of the message becomes a column in the table.
 * Objects become records, which are essentially structs.
 * Messages with arrays are not allowed, as we do not want to deal with arrays in our tables.
 * 
 * @param obj The ros message object
 */
export function createBigQuerySchema(obj: any): BigQuerySchema {
	if ((typeof obj) != 'object') {
		console.log(`ERROR - cannot create schema of a non-object (got ${JSON.stringify(obj)}).`);
		return null;
	}

	if (obj === null) {
		console.log(`ERROR - cannot create schema of null object.`);
		return null;
	}

	const output: BigQuerySchema = {fields: []};

	for (let key in obj) {
		if (!obj.hasOwnProperty(key)) {
			continue;
		}
		const val = obj[key];

		let type = null;
		let fields = null;
		let mode = BigQueryMode.Nullable;
		let value = val;
		if (val && Array === val.constructor) {
			mode = BigQueryMode.Repeated
			value = val[0]
		}
		if ((key === "time")){
			type = BigQueryDataType.TimeStamp
		} else if ((key === "pose_x")) {
			type = BigQueryDataType.Float
		} else if ((key === "pose_y")) {
			type = BigQueryDataType.Float
		} else if ((key === "pose_yaw")) {
			type = BigQueryDataType.Float
		} else if ((typeof value === 'object')) {
			const nestedSchema = createBigQuerySchema(value);
			if (nestedSchema) {
				fields = nestedSchema.fields;
				type = BigQueryDataType.Record;
			}
		} else if ((typeof value) == 'string') {
			type = BigQueryDataType.String
		} else if ((typeof value) == 'number') {
			type = BigQueryDataType.Float
		} else if ((typeof value) == 'boolean') {
			type = BigQueryDataType.Boolean
		} else {
			console.log(`Unsupported type ${typeof value}`);
		}
		if (type) {
			const objSchema: BigQueryColumnSchema = {
				name: key,
				type: type,
				mode: mode
			};

			if (fields) {
				objSchema['fields'] = fields;
			}
			output.fields.push(objSchema);
		}
	}
	return output;
}
