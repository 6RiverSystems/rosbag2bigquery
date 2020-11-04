# rosbag2bigquery

Please visit the 6 River Systems engineering blog for more information:  https://6river.com/data-driven-robotics-leveraging-google-cloud-platform-and-big-data-to-improve-robot-behaviors/

## Setup

First, make sure you are using node version 10.18.1.
In order to build, you will need to install serverless:
npm install -g serverless

## Environment

In order to build and deploy the project, you will need the following environment variables defined:

* STORAGE_PROJECT_ID : cloud project id where bags are stored
* BAG_BUCKET : name of the bucket where bags are stored
* BIGQUERY_PROJECT_ID : cloud project id where bigquery instance is located
* DATASET_NAME: name of the dataset in bigquery to create the tables

## Local Testing

### Installation of local emulator

In order to run local emulation, you'll need to install the google cloud functions framework (https://github.com/GoogleCloudPlatform/functions-framework-nodejs):

	npm install -g @google-cloud/functions-framework

### Running functions with the emulator

In order to transpile the code to the node version that runs on google cloud, you can either run webpack or serverless:

	npx webpack --config webpack.config.js

or

	serverless package

After packaging via serverless, run the emulator with

	npm run local-emulator

The emulator will then be running the `processAnalyticsBag` function on http://localhost:9090

### Calling functions

To trigger your function on the emulator you can use `npm run local-test` which is just a wrapper around `curl`. You will need to pass it data of the event to test. For example if you save the following to a local file called `test_event.json`:

	{
	  "data": {
	    "bucket": "dev-bags-data-analytics",
	    "metadata": {
	      "robotId": "r2d2",
	    },
	    "metageneration": "1",
	    "name": "r2d2/2019-11-12/r2d2_4.bag"
	  }
	}

then in another terminal, you can then trigger the function with that event with

	npm run local-test -- -d "@test_event.json"

### Reading the logs
	The logs will output in the terminal in which you ran `npm run local-emulator`

## Deploying to the cloud
	serverless deploy --bigquery-project-id $BIGQUERY_PROJECT_ID --storage-project-id $STORAGE_PROJECT_ID --bag-bucket $BAG_BUCKET --dataset-name $DATASET_NAME

The serverless configuration is set so that you can deploy to dev-bags-analytics with default options:

	serverless deploy
