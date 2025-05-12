export interface Constraint {
	id: string;
	name: string;
	description?: string;
	scoring_function: string; // function name
}

export const constraints = [
	{
		name: "Sequence Length",
		scoring_function: "SequenceLengthConstraint",
	},
	{
		name: "GC Content",
		scoring_function: "GCContentConstraint",
	},
	{
		name: "Max Homopolymer",
		scoring_function: "MaxHomopolymerConstraint",
	},
	{
		name: "Dinucleotide Frequency",
		scoring_function: "DinucleotideFrequencyConstraint",
	},
	{
		name: "Tetranucleotide Usage",
		scoring_function: "TetranucleotideUsageConstraint",
	},
];
