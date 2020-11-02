import {assert} from 'chai';

import {createBigQuerySchema} from '../../lib/bigquery/createBigQuerySchema';

import 'mocha';
import { BigQueryDataType, BigQueryMode } from '../../lib/bigquery/schema';

describe('test big query schema creation', () => {
	it('Test creation of all types', () => {


		const schema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: 'some_string',
			the_bool: true,
			time: '1999-12-24T23:59:59:100'
		});


		assert.isNotNull(schema);
		assert.deepEqual(schema, {
			fields: [
				{
					name: 'the_float',
					type: BigQueryDataType.Float,
					mode: BigQueryMode.Nullable
				},
				{
					name: 'the_int',
					type: BigQueryDataType.Float,
					mode: BigQueryMode.Nullable
				},
				{
					name: 'the_string',
					type: BigQueryDataType.String,
					mode: BigQueryMode.Nullable
				},
				{
					name: 'the_bool',
					type: BigQueryDataType.Boolean,
					mode: BigQueryMode.Nullable
				},
				{
					name: 'time',
					type: BigQueryDataType.TimeStamp,
					mode: BigQueryMode.Nullable
				}
			]
		});
	});

	it('Test nested type', () => {


		const schema = createBigQuerySchema({
			foo: {
				bar: {
					baz: true
				}
			}
		});
		assert.deepEqual(schema, {
			fields: [
				{
					name: 'foo',
					type: BigQueryDataType.Record,
					mode: BigQueryMode.Nullable,
					fields: [
						{
							name: 'bar',
							type: BigQueryDataType.Record,
							mode: BigQueryMode.Nullable,
							fields: [
								{
									name: 'baz',
									type: BigQueryDataType.Boolean,
									mode: BigQueryMode.Nullable,
								}
							]
						}
					]
				}
			]
		})
	});

	it('Test array', () => {
		const schema = createBigQuerySchema({
			foo: [1, 2, 3]
		});
		assert.deepEqual(schema, {
			fields: [
				{
					name: 'foo',
					type: BigQueryDataType.Float,
					mode: BigQueryMode.Repeated,
				}
			]
		});
	});

	it('Test nested array', () => {
		const schema = createBigQuerySchema({
			foo: [1, 2, 3],
			baz: true
		});
		assert.deepEqual(schema, {
			fields: [
				{
					name: 'foo',
					type: BigQueryDataType.Float,
					mode: BigQueryMode.Repeated,
				},
				{
					name: 'baz',
					type: BigQueryDataType.Boolean,
					mode: BigQueryMode.Nullable,
				},
			]
		});
	});
	it('Test super nested array', () => {
		const schema = createBigQuerySchema({
			foo: {
				bar: [1, 2, 3]
			},
			baz: true
		});
		assert.deepEqual(schema, {
			fields: [
				{
					name: 'foo',
					type: BigQueryDataType.Record,
					mode: BigQueryMode.Nullable,
					fields: [
						{
							name: 'bar',
							type: BigQueryDataType.Float,
							mode: BigQueryMode.Repeated,
						}
					]
				},
				{
					name: 'baz',
					type: BigQueryDataType.Boolean,
					mode: BigQueryMode.Nullable,
				}
			]
		});
	});

	it('Test undefined', () => {
		const schema = createBigQuerySchema(undefined);
		assert.isNull(schema);
	});

	it('Test null', () => {
		const schema = createBigQuerySchema(null);
		assert.isNull(schema);
	});

	it('Test undefined member', () => {
		const schema = createBigQuerySchema({
			foo: undefined
		});
		assert.deepEqual(schema, {
			fields: []
		});
	});

});
