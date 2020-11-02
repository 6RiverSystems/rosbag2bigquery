const path = require('path');
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
	  entry: ['babel-polyfill', 'util.promisify', './lib/index.ts'],
		target: 'node',
		mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
		optimization: {
			// We no not want to minimize our code.
			minimize: false,
			namedModules: true
		},
		performance: {
			// Turn off size warnings for entry points
			hints: false
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					use: [
						{
							loader: 'babel-loader'
						},
						{
							loader: 'ts-loader'
						},
						{
							loader: 'string-replace-loader',
							options: {
								multiple: [
									{
										search: 'jwt-token', replace: process.env.JWT_TOKEN
									},
									{
										search: 'storage-project-id', replace: process.env.STORAGE_PROJECT_ID
									},
									{
										search: 'bigquery-project-id', replace: process.env.BIGQUERY_PROJECT_ID
									},
									{
										search: 'dataset-name', replace: process.env.DATASET_NAME
									}
								]
							}
						}
					],
				},
			]
		},
		resolve: {
			extensions: ['.ts', '.js', '.json']
		},
		node: {
			__dirname: 'mock',
		},
		output: {
			libraryTarget: 'commonjs2',
			path: path.join(__dirname, '.webpack'),
			filename: 'index.js',
			sourceMapFilename: '[file].map'
		}
};
