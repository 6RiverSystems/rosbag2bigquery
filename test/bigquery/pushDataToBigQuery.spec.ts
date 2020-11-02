import {assert} from 'chai';
import * as sinon from 'sinon';

import {createBigQuerySchema} from '../../lib/bigquery/createBigQuerySchema';
import {
	configureSchema,
	getTable,
	getDataset,
} from '../../lib/bigquery/pushDataToBigQuery'
import {ITable, IDataset, IBigQueryClient, BigQueryCache} from '../../lib/bigquery/bigQueryCache';
import {BigQuerySchema} from '../../lib/bigquery/schema';

const mochaAsync = (fn) => {
  return done => {
	fn.call().then(done, err => {
	  done(err);
	});
  };
};

class TestDataset implements IDataset {
	table(string): ITable {
		return new TestTable();
	};
	exists(): Promise<boolean[]> {
		return Promise.resolve([true])
	};
	createTable(string, any): Promise<[ITable, any]> {
		return Promise.resolve([new TestTable(), null])
	};
	id: string = 'test-dataset-0';
}

class TestTable implements ITable {
	setMetadata(any): Promise<any> {
		return Promise.resolve([{}])
	};
	getMetadata(): Promise<any> {
		return Promise.resolve([{}]);
	};
	exists(): Promise<boolean[]> {
		return Promise.resolve([true]);
	};
	load(input: string) {
		// Don't do anything.
		console.log('foo');
	};
	insert(input: any) {
		// Don't do anything
		console.log('bar');
	};
	id: string = 'test-table';
}

class TestClient implements IBigQueryClient {
	dataset(string): IDataset {
		return new TestDataset();
	};
	createDataset(string): Promise<[IDataset, any]> {
		return Promise.resolve([new TestDataset(), null])
	};
	createQueryJob(any): Promise<any> {
		return Promise.resolve([{}]);
	};
}

describe('test pushing data to bigquery', () => {

	let sandbox: any = null;

	beforeEach('unit test', () => {
		sandbox = sinon.sandbox.create();
	});

	describe('test configure schema', () => {

		it('Checks for schema if there is no cache.  If schemas are not subsets, it does update', mochaAsync(async () => {
			// Create some dummy schema
			const schema: BigQuerySchema = createBigQuerySchema({
				the_float: 10.1,
				the_int: 1,
			});

			// Create an empty cache
			const cache = new BigQueryCache();
			const tableName = 'fooTable';
			const table = new TestTable();
			const returnedSchema: BigQuerySchema = createBigQuerySchema({
				the_string: "foo"
			});

			const mergedSchema: BigQuerySchema = createBigQuerySchema({
				the_string: "foo",
				the_float: 10.1,
				the_int: 1,
			});

			// cache.tables[tableName] = table;
			const getMetadataFake = sinon.stub(table, "getMetadata").callsFake(() => {
				return Promise.resolve(
					[
						{
							schema: returnedSchema
						}
					]
				)
			});

			const setMetadataFake = sinon.stub(table, "setMetadata").callsFake(() => {
				return Promise.resolve([{}])
			});

			const res = await configureSchema(tableName, schema, table, cache);

			assert.equal(getMetadataFake.callCount, 2);
			assert.isTrue(setMetadataFake.called);
			assert.isTrue(res);
			assert.isDefined(cache.schemas[tableName]);
			assert.deepEqual(mergedSchema, cache.schemas[tableName]);

		}));

		it('Checks for schema if there is no cache.  If new schema is subset, it does not update', mochaAsync(async () => {
			// Create some dummy schema
			const schema: BigQuerySchema = createBigQuerySchema({
				the_float: 10.1,
				the_int: 1,
			});

			const returnedSchema = createBigQuerySchema({
				the_float: 10.1,
				the_int: 1,
				the_string: "foo",
			});

			// Create an empty cache
			const cache = new BigQueryCache();
			const tableName = 'fooTable';
			const table = new TestTable();

			const getMetadataFake = sinon.stub(table, "getMetadata").callsFake(() => {
				return Promise.resolve(
					[
						{
							schema: returnedSchema
						}
					]
				)
			});

			const setMetadataFake = sinon.stub(table, "setMetadata").callsFake(() => {
				return Promise.resolve([{}])
			});

			const res = await configureSchema(tableName, schema, table, cache);

			assert.isTrue(getMetadataFake.called);
			assert.isFalse(setMetadataFake.called);
			assert.isTrue(res);
			assert.isDefined(cache.schemas[tableName]);
			assert.deepEqual(returnedSchema, cache.schemas[tableName]);
		}));

		it('Checks for schema if there is no cache.  If old schema is subset, it does update', mochaAsync(async () => {
			// Create some dummy schema
			const schema: BigQuerySchema = createBigQuerySchema({
				the_float: 10.1,
				the_int: 1,
			});
			const returnedSchema = createBigQuerySchema({
				the_float: 10.1,
			});

			// Create an empty cache
			const cache = new BigQueryCache();
			const tableName = 'fooTable';
			const table = new TestTable();

			const getMetadataFake = sinon.stub(table, "getMetadata").callsFake(() => {
				return Promise.resolve(
					[
						{
							schema: returnedSchema
						}
					]
				)
			});

			const setMetadataFake = sinon.stub(table, "setMetadata").callsFake(() => {
				return Promise.resolve([{}])
			});

			const res = await configureSchema(tableName, schema, table, cache);

			assert.isTrue(getMetadataFake.called);
			assert.isTrue(setMetadataFake.called);
			assert.isTrue(res);
			assert.isDefined(cache.schemas[tableName]);
			assert.deepEqual(schema, cache.schemas[tableName]);
		}));

		it('Checks for schema if there is no cache.  Check complicated subset', mochaAsync(async () => {
			// Create some dummy schema
			const schema: BigQuerySchema = createBigQuerySchema({
				the_obj: {
					the_float: 10.1,
					the_string: "foo",
				},
				the_int: 1,
			});

			// Create an empty cache
			const cache = new BigQueryCache();
			const tableName = 'fooTable';
			const table = new TestTable();
			const returnedSchema: BigQuerySchema = createBigQuerySchema({
				the_obj: {
					the_float: 10.1,
				},
				the_int: 1,
			});

			// cache.tables[tableName] = table;
			const getMetadataFake = sinon.stub(table, "getMetadata").callsFake(() => {
				return Promise.resolve(
					[
						{
							schema: returnedSchema
						}
					]
				)
			});

			const setMetadataFake = sinon.stub(table, "setMetadata").callsFake(() => {
				return Promise.resolve([{}])
			});

			const res = await configureSchema(tableName, schema, table, cache);

			assert.isTrue(getMetadataFake.called);
			assert.isTrue(setMetadataFake.called);
			assert.isTrue(res);
			assert.isDefined(cache.schemas[tableName]);
			assert.deepEqual(schema, cache.schemas[tableName]);

		}));

		it('Does not check if the schema is cached', mochaAsync(async () => {
			// Create some dummy schema
			const schema: BigQuerySchema = createBigQuerySchema({
				the_float: 10.1,
				the_int: 1,
			});

			// Create an empty cache
			const cache = new BigQueryCache();
			const tableName = 'fooTable';
			const table = new TestTable();

			cache.schemas[tableName] = schema;

			const getMetadataFake = sinon.stub(table, "getMetadata").callsFake(() => {
				return Promise.resolve(
					[
						{
							schema: createBigQuerySchema({
								the_float: 10.1,
							})
						}
					]
				)
			});

			const setMetadataFake = sinon.stub(table, "setMetadata").callsFake(() => {
				return Promise.resolve([{}])
			});

			const res = await configureSchema(tableName, schema, table, cache);

			assert.isFalse(getMetadataFake.called);
			assert.isFalse(setMetadataFake.called);
			assert.isTrue(res);
			assert.isDefined(cache.schemas[tableName]);
			assert.deepEqual(schema, cache.schemas[tableName]);
		}));

		it('Performs a first merge, caches the result and then does a second merge', mochaAsync(async () => {
			// Create and empty cache and test table with initial schema
			const cache = new BigQueryCache();
			const tableName = 'fooTable';
			const table = new TestTable();
			const initialSchema: BigQuerySchema = createBigQuerySchema({
				the_obj: {
					the_float: 10.1,
				},
				the_int: 1,
			});

			const getMetadataFake = sinon.stub(table, "getMetadata").callsFake(() => {
				return Promise.resolve(
					[
						{
							schema: initialSchema
						}
					]
				)
			});

			const setMetadataFake = sinon.stub(table, "setMetadata").callsFake(() => {
				return Promise.resolve([{}])
			});

			const new_schema: BigQuerySchema = createBigQuerySchema({
				the_obj: {
					the_float: 10.1,
					the_string: "foo",
				},
				the_int: 1,
			});

			const res = await configureSchema(tableName, new_schema, table, cache);

			assert.equal(getMetadataFake.callCount, 2);
			assert.equal(setMetadataFake.callCount, 1);
			assert.isTrue(res);
			assert.isDefined(cache.schemas[tableName]);
			assert.deepEqual(new_schema, cache.schemas[tableName]);

			const another_new_schema: BigQuerySchema = createBigQuerySchema({
				the_obj: {
					the_float: 10.1,
				},
				the_int: 1,
				another_string: 'bar',
			});

			const final_schema: BigQuerySchema = createBigQuerySchema({
				the_obj: {
					the_float: 10.1,
					the_string: "foo",
				},
				the_int: 1,
				another_string: 'bar',
			});

			const res2 = await configureSchema(tableName, another_new_schema, table, cache);

			assert.equal(getMetadataFake.callCount, 3);
			assert.equal(setMetadataFake.callCount, 2);
			assert.isTrue(res2);
			assert.isDefined(cache.schemas[tableName]);
			assert.deepEqual(final_schema, cache.schemas[tableName]);
		}));
	});


	describe('test getTable', () => {

		it('Checks for table if there is no cache.  If table does not exist, it creates it', mochaAsync(async () => {
			// Create some dummy schema
			const schema: BigQuerySchema = createBigQuerySchema({
				the_float: 10.1,
				the_int: 1,
			});

			const dataset: IDataset = new TestDataset();

			// Create an empty cache
			const cache = new BigQueryCache();
			const tableName = 'fooTable';

			const fakeTable = new TestTable();

			const existsFake = sinon.stub(fakeTable, "exists").callsFake(() => {
				return Promise.resolve(
					[
						false
					]
				)
			});

			const tableFake = sinon.stub(dataset, "table").callsFake(() => {
				return fakeTable;
			});

			const createTableFake = sinon.stub(dataset, "createTable").callsFake(() => {
				return Promise.resolve(
					[
						new TestTable()
					]
				)
			});

			const res = await getTable(tableName, schema, dataset, cache);

			assert.isTrue(tableFake.called);
			assert.isTrue(existsFake.called);
			assert.isTrue(createTableFake.called);
			assert.isDefined(cache.tables[tableName]);
		}));

		it('Checks for table if there is no cache.  If table does exist, it does not create', mochaAsync(async () => {
			// Create some dummy schema
			const schema: BigQuerySchema = createBigQuerySchema({
				the_float: 10.1,
				the_int: 1,
			});

			const dataset: IDataset = new TestDataset();

			// Create an empty cache
			const cache = new BigQueryCache();
			const tableName = 'fooTable';

			const fakeTable = new TestTable();

			const existsFake = sinon.stub(fakeTable, "exists").callsFake(() => {
				return Promise.resolve(
					[
						true
					]
				)
			});

			const tableFake = sinon.stub(dataset, "table").callsFake(() => {
				return fakeTable;
			});

			const createTableFake = sinon.stub(dataset, "createTable").callsFake(() => {
				return Promise.resolve(
					[
						new TestTable()
					]
				)
			});

			const res = await getTable(tableName, schema, dataset, cache);

			assert.isTrue(tableFake.called);
			assert.isTrue(existsFake.called);
			assert.isFalse(createTableFake.called);
			assert.isDefined(cache.tables[tableName]);
		}));

		it('Uses the table from the cache if it is available.', mochaAsync(async () => {
			// Create some dummy schema
			const schema: BigQuerySchema = createBigQuerySchema({
				the_float: 10.1,
				the_int: 1,
			});

			const dataset: IDataset = new TestDataset();

			// Create an empty cache
			const cache = new BigQueryCache();
			const tableName = 'fooTable';

			const fakeTable = new TestTable();

			const existsFake = sinon.stub(fakeTable, "exists").callsFake(() => {
				return Promise.resolve(
					[
						false
					]
				)
			});

			const tableFake = sinon.stub(dataset, "table").callsFake(() => {
				return fakeTable;
			});

			const createTableFake = sinon.stub(dataset, "createTable").callsFake(() => {
				return Promise.resolve(
					[
						new TestTable()
					]
				)
			});

			// Put the table in the cache
			cache.tables[tableName] = fakeTable;

			const res = await getTable(tableName, schema, dataset, cache);

			assert.isFalse(tableFake.called);
			assert.isFalse(existsFake.called);
			assert.isFalse(createTableFake.called);
			assert.isDefined(cache.tables[tableName]);
		}));
	});

	describe('test getDataset', () => {

		it('Checks for dataset if there is no cache.  If dataset does not exist, it creates it', mochaAsync(async () => {
			const bigQueryClient: IBigQueryClient = new TestClient();

			// Create an empty cache
			const cache = new BigQueryCache();
			const datasetName = 'barDataset';

			const fakeDataset = new TestDataset();

			const existsFake = sinon.stub(fakeDataset, "exists").callsFake(() => {
				return Promise.resolve(
					[
						false
					]
				)
			});

			const datasetFake = sinon.stub(bigQueryClient, "dataset").callsFake(() => {
				return fakeDataset;
			});

			const createDatasetFake = sinon.stub(bigQueryClient, "createDataset").callsFake(() => {
				return Promise.resolve(
					[
						new TestDataset()
					]
				)
			});

			const res = await getDataset(bigQueryClient, datasetName, cache);

			assert.isTrue(datasetFake.called);
			assert.isTrue(existsFake.called);
			assert.isTrue(createDatasetFake.called);
			assert.isDefined(cache.datasets[datasetName]);
		}));

		it('Checks for dataset if there is no cache.  If dataset does exist, it does not create', mochaAsync(async () => {

			const bigQueryClient: IBigQueryClient = new TestClient();

			// Create an empty cache
			const cache = new BigQueryCache();
			const datasetName = 'barDataset';

			const fakeDataset = new TestDataset();

			const existsFake = sinon.stub(fakeDataset, "exists").callsFake(() => {
				return Promise.resolve(
					[
						true
					]
				)
			});

			const datasetFake = sinon.stub(bigQueryClient, "dataset").callsFake(() => {
				return fakeDataset;
			});

			const createDatasetFake = sinon.stub(bigQueryClient, "createDataset").callsFake(() => {
				return Promise.resolve(
					[
						new TestDataset()
					]
				)
			});

			const res = await getDataset(bigQueryClient, datasetName, cache);

			assert.isTrue(datasetFake.called);
			assert.isTrue(existsFake.called);
			assert.isFalse(createDatasetFake.called);
			assert.isDefined(cache.datasets[datasetName]);
		}));

		it('Uses the dataset from the cache if it is available.', mochaAsync(async () => {
			const bigQueryClient: IBigQueryClient = new TestClient();

			// Create an empty cache
			const cache = new BigQueryCache();
			const datasetName = 'barDataset';

			const fakeDataset = new TestDataset();

			const existsFake = sinon.stub(fakeDataset, "exists").callsFake(() => {
				return Promise.resolve(
					[
						false
					]
				)
			});

			const datasetFake = sinon.stub(bigQueryClient, "dataset").callsFake(() => {
				return fakeDataset;
			});

			const createDatasetFake = sinon.stub(bigQueryClient, "createDataset").callsFake(() => {
				return Promise.resolve(
					[
						new TestDataset()
					]
				)
			});

			// Put the table in the cache
			cache.datasets[datasetName] = fakeDataset;

			const res = await getDataset(bigQueryClient, datasetName, cache);

			assert.isFalse(datasetFake.called);
			assert.isFalse(existsFake.called);
			assert.isFalse(createDatasetFake.called);
			assert.isDefined(cache.datasets[datasetName]);
		}));

	});


		afterEach(function () {
		sandbox.restore();
	});
});
