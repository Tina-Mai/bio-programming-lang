import { SequenceType } from "./Node";

export interface Generator {
	key: string;
	name: string;
	types?: SequenceType[]; // if not provided, the generator is applicable to all sequence types
	hyperparameters?: Record<string, unknown>;
}

export const generatorOptions: Generator[] = [
	{
		key: "uniform-mutation",
		name: "Uniform Mutation",
	},
	{
		key: "evo-2",
		name: "Evo 2",
		types: ["dna", "rna"],
	},
	{
		key: "program-mcmc",
		name: "Program MCMC",
	},
];
