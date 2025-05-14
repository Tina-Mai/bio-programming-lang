export interface Output {
	id: string;
	metadata: OutputMetadata; // metadata is just a json blob that we'd need to parse to get stuff like sequence, num_step, energy_score, etc.
}

export interface OutputMetadata {
	sequence?: string;
	num_step?: number;
	energy_score?: number;
	[key: string]: unknown; // catch-all for other properties
}
