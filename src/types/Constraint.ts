export interface Constraint {
	key: string;
	name: string;
}

export interface ConstraintInstance extends Constraint {
	segments: string[]; // list of segment ids that the constraint is applied to
}

export const constraintOptions: Constraint[] = [
	{
		key: "sequence-length",
		name: "Sequence Length",
	},
	{
		key: "gc-content",
		name: "GC Content",
	},
	{
		key: "max-homopolymer",
		name: "Max Homopolymer",
	},
	{
		key: "dinucleotide-frequency",
		name: "Dinucleotide Frequency",
	},
	{
		key: "tetranucleotide-usage",
		name: "Tetranucleotide Usage",
	},
];
