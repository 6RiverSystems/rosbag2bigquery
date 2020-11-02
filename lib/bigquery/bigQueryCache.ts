import {BigQuerySchema} from './schema';

export interface ITable {	
	setMetadata(any): Promise<any>;	
	getMetadata(): Promise<any>;	
	exists(): Promise<boolean[]>	
	load(string);	
	insert(any);	
	id?: string;	
}	

export interface IDataset {	
	table(string): ITable;	
	exists(): Promise<boolean[]>;	
	createTable(string, any): Promise<[ITable, any]>;	
	id?: string;	
}

export interface IBigQueryClient {
	dataset(string): IDataset;
	createDataset(string): Promise<[IDataset, any]>;
	createQueryJob(any): Promise<any>;
}

export class BigQueryCache {
	datasets: { [s: string]: IDataset; } = {};
	tables: { [s: string]: ITable; } = {};
	schemas: { [s: string]: BigQuerySchema; } = {};
	sites: { [s: string]: string; } = {};
}
