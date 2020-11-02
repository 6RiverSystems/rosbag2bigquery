export enum BigQueryDataType {
	Integer = "INTEGER",
	Float = "FLOAT",
	Numeric = "NUMERIC",
	Boolean = "BOOLEAN",
	String = "STRING",
	Bytes = "BYTES",
	Record = "RECORD",
	TimeStamp = "TIMESTAMP"
}

export enum BigQueryMode {
	Nullable = "NULLABLE",
	Required = "REQUIRED",
	Repeated = "REPEATED"
}

export interface BigQueryColumnSchema {
	description?: string,
	name: string,
	type: BigQueryDataType,
	mode: BigQueryMode,
}

export interface BigQueryRecordSchema {
	description?: string,
	name: string,
	type: BigQueryDataType.Record,
	mode: BigQueryMode,
	fields: Array<BigQueryColumnSchema | BigQueryRecordSchema>
}
export interface BigQuerySchema {
	fields: Array<BigQueryColumnSchema | BigQueryRecordSchema>
}
