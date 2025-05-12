export interface Constraint {
	key: string;
	name: string;
	scoring_function: string; // function name
}

export const constraintOptions: Constraint[] = [
	{
		key: "sequence-length",
		name: "Sequence Length",
		scoring_function: "SequenceLengthConstraint",
	},
	{
		key: "gc-content",
		name: "GC Content",
		scoring_function: "GCContentConstraint",
	},
	{
		key: "max-homopolymer",
		name: "Max Homopolymer",
		scoring_function: "MaxHomopolymerConstraint",
	},
	{
		key: "dinucleotide-frequency",
		name: "Dinucleotide Frequency",
		scoring_function: "DinucleotideFrequencyConstraint",
	},
	{
		key: "tetranucleotide-usage",
		name: "Tetranucleotide Usage",
		scoring_function: "TetranucleotideUsageConstraint",
	},
];
