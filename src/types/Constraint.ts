export interface Constraint {
	id: string;
	name: string;
	description?: string;
	scoring_function: string; // function name
}

export const constraintOptions = [
	{
		id: "sequence-length",
		name: "Sequence Length",
		scoring_function: "SequenceLengthConstraint",
	},
	{
		id: "gc-content",
		name: "GC Content",
		scoring_function: "GCContentConstraint",
	},
	{
		id: "max-homopolymer",
		name: "Max Homopolymer",
		scoring_function: "MaxHomopolymerConstraint",
	},
	{
		id: "dinucleotide-frequency",
		name: "Dinucleotide Frequency",
		scoring_function: "DinucleotideFrequencyConstraint",
	},
	{
		id: "tetranucleotide-usage",
		name: "Tetranucleotide Usage",
		scoring_function: "TetranucleotideUsageConstraint",
	},
];
