import * as _ from 'lodash';

import {
	BigQuerySchema,
	BigQueryRecordSchema,
	BigQueryMode,
	BigQueryDataType
} from './schema';

/**
 * Merge two table schemas together.  Return the union of the two schemas.
 * @param newSchema The schema of the new message
 * @param oldSchema The schema that is currently used for the table
 */
export function mergeBigQuerySchema(newSchema: BigQuerySchema, oldSchema: BigQuerySchema) : BigQuerySchema {
	// create a deep copy of the old schema
	let mergedSchema: BigQuerySchema = _.cloneDeep(oldSchema);

	// recursively check compatibility of new schema fields, add new ones
	for (let field of newSchema.fields) {
		const oldField = _.find(oldSchema.fields, ['name', field.name]);
		if (oldField) {
			// check compatibility
			if (field.type != BigQueryDataType.Record) {
				if (field.type != oldField.type || (field.mode != oldField.mode && (field.mode != BigQueryMode.Nullable || oldField.mode != undefined))) {
					console.log(`Field ${field.name} is not compatible with server schema, cannot add data.`);
					console.log(`New field type: ${field.type}, mode: ${field.mode}`);
					console.log(`Old field type: ${oldField.type}, mode: ${oldField.mode}`);
					throw new Error('Incompatible schemas');
				}
			} else {
				const mergedSubSchema = mergeBigQuerySchema(<BigQuerySchema>field, <BigQuerySchema>oldField);
				// remove old sub schema
				let mergedField = _.find(mergedSchema.fields, ['name', field.name]);
				(<BigQueryRecordSchema>mergedField).fields = mergedSubSchema.fields;
			}
		} else {
			// field is new, can add safely
			console.log(`Adding field ${field.name} to schema`);
			mergedSchema.fields.push(field);
		}
	}

	console.log(`Finished merging schemas to create new schema: ${JSON.stringify(mergedSchema)}`);
	return mergedSchema;
}
