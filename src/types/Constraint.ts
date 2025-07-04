export interface Constraint {
	key: string;
	name?: string;
	description?: string;
}

// Constraint instance from database
export interface ConstraintInstance {
	id: string;
	program_id: string;
	key?: string;
	label?: string;
	created_at: string;
	updated_at?: string;
	segments: string[]; // segment IDs that this constraint applies to
}

export const constraintOptions: Constraint[] = [
	{
		key: "gc-content",
		name: "GC Content",
		description: "Percentage of G and C nucleotides in the sequence",
	},
	{
		key: "melting-temperature",
		name: "Melting Temperature",
		description: "Temperature at which DNA denatures",
	},
	{
		key: "complexity",
		name: "Sequence Complexity",
		description: "Measure of sequence randomness and repetitiveness",
	},
	{
		key: "sequence-length",
		name: "Sequence Length",
		description: "Total number of nucleotides in the sequence",
	},
];
