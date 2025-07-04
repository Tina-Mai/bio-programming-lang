export interface Output {
	id: string;
	construct_id?: string;
	metadata?: OutputMetadata;
	created_at: string;
	updated_at?: string;
}

export interface OutputMetadata {
	sequence?: string;
	num_step?: number;
	energy_score?: number;
	[key: string]: unknown; // catch-all for other properties
}
