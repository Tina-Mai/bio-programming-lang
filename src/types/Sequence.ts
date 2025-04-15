export interface Sequence {
	id: string;
	name?: string;
	sequence: string;
}

export const nucleotideColors = {
	A: "#f0e89c", // yellow
	C: "#b9e3fa", // blue
	T: "#c7d2fe", // purple
	G: "#D2F39A", // green
} as const;

export type Nucleotide = keyof typeof nucleotideColors;
