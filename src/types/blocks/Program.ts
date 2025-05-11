export type SequenceType = "dna" | "rna" | "protein";
export interface SequenceNode {
	id: string;
	type: SequenceType;
	sequence: string;
	metadata?: Record<string, unknown>;
	generator: GeneratorNode;
}

export interface ConstraintNode {
	id: string;
	name: string;
	scoring_function: string; // function name
}

export interface GeneratorNode {
	id: string;
	name: string;
	hyperparameters?: Record<string, unknown>;
}

export interface Edge {
	id: string;
	constraint: ConstraintNode;
	sequence: SequenceNode;
}
