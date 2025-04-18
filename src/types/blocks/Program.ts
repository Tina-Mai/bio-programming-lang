import { Constraint } from "./Constraint";

export interface ProgramNode {
	id: string;
	label?: string;
	children: ProgramNode[];
	constraints: Constraint[];
	constraintWeights?: number[];
}

// a program is just the top level node, since it contains all of its children
export type Program = ProgramNode;

export type ProgramJSON = Program;

export const exampleProgram: Program = {
	id: "1",
	children: [
		{
			id: "2",
			children: [
				{ id: "4", children: [], constraints: [{ name: "length" }] },
				{ id: "5", children: [], constraints: [{ name: "length" }] },
			],
			constraints: [{ name: "symmetry" }, { name: "single chain" }, { name: "globularity" }],
		},
		{
			id: "3",
			children: [
				{ id: "4", children: [], constraints: [{ name: "length" }] },
				{ id: "5", children: [], constraints: [{ name: "length" }] },
			],
			constraints: [{ name: "symmetry" }, { name: "single chain" }, { name: "globularity" }],
		},
	],
	constraints: [{ name: "pTM" }, { name: "pLDDT" }, { name: "hydrophobics" }, { name: "symmetry" }],
};
