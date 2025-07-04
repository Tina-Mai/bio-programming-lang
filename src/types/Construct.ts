import { Segment, ConstraintInstance, GeneratorInstance } from "@/types";

export interface Construct {
	id: string;
	program_id: string;
	output_id?: string;
	created_at: string;
	updated_at?: string;
	segments?: Segment[];
	constraints?: ConstraintInstance[];
	generators?: GeneratorInstance[];
}

export const nucleotideColors = {
	A: "#f0e89c", // yellow
	C: "#b9e3fa", // blue
	T: "#c7d2fe", // purple
	G: "#D2F39A", // green
} as const;

export type Nucleotide = keyof typeof nucleotideColors;
