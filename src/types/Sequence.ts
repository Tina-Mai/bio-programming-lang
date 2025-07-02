import { Segment, ConstraintInstance, GeneratorInstance } from "./";

// TODO: sequence string can have optional positions (?) in case some parts are not generated or are generated separately?
export interface Sequence {
	length: number;
	segments?: Segment[];
	constraints?: ConstraintInstance[];
	generators?: GeneratorInstance[];
	name?: string;
	sequence?: string; // TODO: rename to output or sequenceString for clarity?
}

export const nucleotideColors = {
	A: "#f0e89c", // yellow
	C: "#b9e3fa", // blue
	T: "#c7d2fe", // purple
	G: "#D2F39A", // green
} as const;

export type Nucleotide = keyof typeof nucleotideColors;
