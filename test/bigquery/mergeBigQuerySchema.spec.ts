import {expect, assert} from 'chai';
import * as sinon from 'sinon';
import * as _ from 'lodash';

import {
	mergeBigQuerySchema,
	createBigQuerySchema
} from '../../lib/bigquery';

import 'mocha';

describe('test big query schema merging', () => {
	it('Should return the same schema if new schema is subset of old', () => {
		const schema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: 'some_string',
			the_bool: true,
			time: '1999-12-24T23:59:59:100'
		});

		let newSchema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: 'some_string',
			//the_bool: true, // nope not this one
			time: '1999-12-24T23:59:59:100'
		});

		const mergedSchema = mergeBigQuerySchema(newSchema, schema);

		assert.deepEqual(schema, mergedSchema)
	});

	it('Should add a field if new schema is a superset', () => {
		const schema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: 'some_string',
			//the_bool: true,
			time: '1999-12-24T23:59:59:100'
		});

		let newSchema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: 'some_string',
			the_bool: true, 
			time: '1999-12-24T23:59:59:100'
		});

		const mergedSchema = mergeBigQuerySchema(newSchema, schema);

		
		const sameSchema = _.isMatch(newSchema, mergedSchema) && _.isMatch(mergedSchema, newSchema);
		assert.isTrue(sameSchema);
	});

	it('Should add a field if new schema has a compatible new field', () => {
		const schema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: 'some_string',
			the_bool: true,
			time: '1999-12-24T23:59:59:100'
		});

		let newSchema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: 'some_string', 
			another_bool: true,
			time: '1999-12-24T23:59:59:100'
		});

		let bothSchema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: 'some_string',
			the_bool: true, 
			another_bool: true,
			time: '1999-12-24T23:59:59:100'
		});

		const mergedSchema = mergeBigQuerySchema(newSchema, schema);

		const sameSchema = _.isMatch(bothSchema, mergedSchema) && _.isMatch(mergedSchema, bothSchema);
		assert.isTrue(sameSchema);
	});

	it('Should fail if new schema changes type of a field', () => {
		const schema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: 'some_string',
			the_bool: true,
			time: '1999-12-24T23:59:59:100'
		});

		let newSchema = createBigQuerySchema({
			the_float: 10.1,
			the_int: 1,
			the_string: true, 
			another_bool: true,
			time: '1999-12-24T23:59:59:100'
		});

		try {
			const mergedSchema = mergeBigQuerySchema(newSchema, schema);
			assert.isTrue(false);
		} catch (error) {
			assert.isTrue(true);
		}
	});

	it('Should fail if new schema changes type of a field in nested field', () => {
		const schema = createBigQuerySchema({
			the_record: {
				the_record_bool: true,
				the_record_string: 'string'
			},
			time: '1999-12-24T23:59:59:100'
		});

		const newSchema = createBigQuerySchema({
			the_record: {
				the_record_bool: 'notabool',
				the_record_string: 'string'
			},
			time: '1999-12-24T23:59:59:100'
		});

		let mergedSchema = {};
		try {
			mergedSchema = mergeBigQuerySchema(newSchema, schema);
			assert.isTrue(false);
		} catch {
			assert.isTrue(_.isMatch(mergedSchema, {}));
		}
	});

	it('Should add compatible field to nested field', () => {
		const schema = createBigQuerySchema({
			the_record: {
				the_record_bool: true,
				the_record_string: 'string'
			},
			time: '1999-12-24T23:59:59:100'
		});

		const newSchema = createBigQuerySchema({
			the_record: {
				the_record_bool: true,
				the_record_string: 'string',
				the_record_int: 2,
				the_record_record: {
					why_so_many_bools: false
				}
			},
			time: '1999-12-24T23:59:59:100'
		});

		const mergedSchema = mergeBigQuerySchema(newSchema, schema);
		const sameSchema = _.isMatch(newSchema, mergedSchema) && _.isMatch(mergedSchema, newSchema);
		assert.isTrue(sameSchema);
	});
});
