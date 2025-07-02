import { Segment, ConstraintInstance, GeneratorInstance } from ".";

export interface Construct {
	segments?: Segment[];
	constraints?: ConstraintInstance[];
	generators?: GeneratorInstance[];
	name?: string;
}

export const nucleotideColors = {
	A: "#f0e89c", // yellow
	C: "#b9e3fa", // blue
	T: "#c7d2fe", // purple
	G: "#D2F39A", // green
} as const;

export type Nucleotide = keyof typeof nucleotideColors;
