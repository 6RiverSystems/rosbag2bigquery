import * as _ from 'lodash';

import {IBigQueryClient, IDataset, ITable, BigQueryCache} from './bigQueryCache';
import {BigQuerySchema} from './schema';
import {mergeBigQuerySchema} from './mergeBigQuerySchema';
import { LoadableItem } from '../rosMsgToJSON';
import bigquery from '@google-cloud/bigquery/build/src/types';

/**
 * Use streaming inserts (https://cloud.google.com/bigquery/streaming-data-into-bigquery) to
 * put data into bigquery for a single topic / table
 * @param bigQueryClient The client object for accessing BQ
 * @param datasetName The name of the dataset within BQ where our tables reside
 * @param schema The schema for the table
 * @param data An array of messages for a single topic converted into table rows
 * @param tableName The name of the table where the data should be inserted
 * @param cache The global cache used to store information between function invocations
 */
export async function insertDataIntoBigQuery(bigQueryClient: IBigQueryClient, datasetName: string, schema: BigQuerySchema, data: Array<LoadableItem>,
																						 tableName: string, cache: BigQueryCache) {

	// Make sure the table exists and has the proper schema
	const table = await configureTable(bigQueryClient, datasetName, schema, tableName, cache);
	if (table) {
		// If it does, insert all the data using streaming inserts
		try {
			const insertRowsResponse = await table.insert(data);
			if((insertRowsResponse[0] as bigquery.ITableDataInsertAllResponse).insertErrors) {
				console.log(`Insert errors: ${JSON.stringify((insertRowsResponse[0] as bigquery.ITableDataInsertAllResponse).insertErrors[0])}`)
			}
		} catch(err) {
			console.error(`Insert error: ${JSON.stringify(err)}`);
		}
	}
}
/**
 * Put data into big query using file upload (https://cloud.google.com/bigquery/docs/loading-data-local)
 * Our GCF does not currently use this method as it is limited but left here for reference.
 * @param bigQueryClient The client object for accessing BQ
 * @param datasetName The name of the dataset within BQ where our tables reside
 * @param schema The schema for the table
 * @param filename The name of a local file which contains all the data for a topic ready to be inserted
 * @param tableName The name of the table where the data should be inserted
 * @param cache The global cache used to store information between function invocations
 */
export async function uploadFileToBigQuery(bigQueryClient: IBigQueryClient, datasetName: string, schema: BigQuerySchema,
																					 filename: string, tableName: string, cache: BigQueryCache) {

	const table = await configureTable(bigQueryClient, datasetName, schema, tableName, cache);
	if (table) {
		try {
			await table.load(filename);
		} catch(err) {
			console.error('load error:', err);
		}
	}
}

/**
 * Prepare the table for data to be inserted.  If the table does not exist, create it.
 * Also update the schema of the table to match the data to be inserted.
 * @param bigQueryClient The client object for accessing BQ
 * @param datasetName The name of the dataset within BQ where our tables reside
 * @param schema The schema for the table
 * @param tableName The name of the table where the data should be inserted
 * @param cache The global cache used to store information between function invocations
 */
export async function configureTable(bigQueryClient: IBigQueryClient, datasetName: string, schema: BigQuerySchema,
															tableName: string, cache: BigQueryCache) {
	try {
		const dataset = await getDataset(bigQueryClient, datasetName, cache);
		const table = await getTable(tableName, schema, dataset, cache);
		const configurationSuccessful = await configureSchema(tableName, schema, table, cache);

		return configurationSuccessful ? table : null;
	} catch(err) {
		console.error('Error communicating with database: ', err);
		return null;
	}
}

/**
 * Get a reference to the dataset.  If the dataset does not exist, create it.
 * Datasets are used to organize groups of tables in a single project in BQ
 * https://cloud.google.com/bigquery/docs/datasets-intro
 * 
 * @param bigQueryClient The client object for accessing BQ
 * @param datasetName The name of the dataset within BQ where our tables reside
 * @param schema The schema for the table
 */
export async function getDataset(bigQueryClient: IBigQueryClient, datasetName: string, cache: BigQueryCache): Promise<IDataset> {
	// Check to see if dataset is already in the cache
	if (!_.has(cache.datasets, datasetName)) {
		// If it isn't in the cache, check to see if it needs to be created
		console.log(`Dataset ${datasetName} not in cache`);
		let dataset = bigQueryClient.dataset(datasetName);
		const [dsExists] = await dataset.exists();
		if (!dsExists) {
			// Create the dataset if it does not exist
			const results = await bigQueryClient.createDataset(datasetName);
			dataset = results[0];
			console.log(`Dataset ${dataset.id} created.`);
		} else {
			console.log(`Dataset ${datasetName} already exists`);
		}
		// Store the dataset in the cache
		cache.datasets[datasetName] = dataset;
	}

	// Get the dataset from the cache
	return cache.datasets[datasetName];
}

/**
 * Get a reference to the table.  If the table does not exist, create it.
 * 
 * We create one table per topic in our ros bag.  The table is named with the topic name.
 * Each field in the message on the topic because a column in the table.  If the message is updated
 * at some point in the future, the table will be updated to be the union of the two message definitions
 * so that old data can exist alongside new data.
 * 
 * @param tableName The name of the table where the data should be inserted
 * @param schema The schema for the table
 * @param dataset The dataset which will hold the table
 * @param cache The global cache used to store information between function invocations
 */
export async function getTable(tableName: string, schema: BigQuerySchema,
												dataset: IDataset, cache: BigQueryCache): Promise<ITable> {
	// Check the cache for the table
	if (!_.has(cache.tables, tableName)) {
		console.log(`Table ${tableName} not in cache.`);
		let table = dataset.table(tableName);
		console.log(`Checking table existence for ${tableName}`);
		// If the table is not in the cache, look to see if it exists in the dataset
		try{
			console.log(`Starting existence check`)
			const [tabExists] = await table.exists();

			console.log(`Table exists? ${tabExists}`);
		if (!tabExists) {
			// If the table does not exist, create it.
			try {
				const results = await dataset.createTable(tableName, {
					schema: schema,
					timePartitioning: {field: "time", type: "DAY"},
					clustering: {fields: ["site_name", "robot_id"]}
				});
				table = results[0];
				console.log(`Table ${table.id} created.`);
			} catch(error) {
				console.log(`Error creating table: ${JSON.stringify(error)}`);
			}
		} else {
			console.log(`Table ${tableName} already exists`);
		}
		cache.tables[tableName] = table;
		} catch (error) {
			console.log(`Table existence error: ${JSON.stringify(error)}`)
			return Promise.reject();
		}
	}


	// Get the table from the cache
	return cache.tables[tableName];
}

/**
 * Configure the schema for the table. 
 * If the schema for the table exists, merge it with the schema of the new data.
 * 
 * We create one table per topic in our ros bag.  The table is named with the topic name.
 * Each field in the message on the topic because a column in the table.  If the message is updated
 * at some point in the future, the table will be updated to be the union of the two message definitions
 * so that old data can exist alongside new data.
 * @param tableName The name of the table to check
 * @param schema The schema for the data to be inserted
 * @param table A reference to the table object
 * @param cache The global cache used to store information between function invocations
 */
export async function configureSchema(tableName: string, schema: BigQuerySchema,
															 table: ITable, cache: BigQueryCache): Promise<boolean> {
	// Check to see if the schema is in the cache
	if (!_.has(cache.schemas, tableName)) {
		console.log(`Schema for ${tableName} not in cache`);
		// Get the current schema for the table and cache it
		const [meta] = await table.getMetadata();
		console.log(`Got new table meta: ` + JSON.stringify(meta));
		cache.schemas[tableName] = meta.schema;
	}

	const cachedSchema = cache.schemas[tableName];
	console.log(`cachedSchema: ${JSON.stringify(cachedSchema)}`);
	// If new schema is a subset of existing schema, there is nothing to do
	if (!_.isMatch(cachedSchema, schema)) {
		try {
			const mergedSchema = mergeBigQuerySchema(schema, cachedSchema);
			// only update if merged and cached are different
			// use _.isMatch because order of fields in not guaranteed to be the same, _.isEqual will return false
			if (!_.isMatch(cachedSchema, mergedSchema)) {
				const [meta] = await table.getMetadata();
				meta.schema = mergedSchema;
				await table.setMetadata(meta);
				cache.schemas[tableName] = mergedSchema;
				console.log('Updated metadata');
			} else {
				console.log('Merged schema is same as cached schema - not updating.');
			}
		} catch (error) {
			console.log(`Unable to merge schemas, will not be able to insert data.: ${error}`);
			console.log(`New schema: ${JSON.stringify(schema)}`);
			console.log(`Old schema: ${JSON.stringify(cachedSchema)}`);
			return false;
		}
	}
	else {
		console.log('New schema is a subset of cached schema - not updating.');
	}
	return true;
}