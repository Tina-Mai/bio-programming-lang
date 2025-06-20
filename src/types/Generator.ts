import { SequenceType } from "./Node";

export interface Generator {
	key: string;
	name: string;
	types?: SequenceType[]; // if not provided, the generator is applicable to all sequence types
	hyperparameters?: Record<string, unknown>;
}

export interface GeneratorInstance extends Generator {
	sections: string[]; // list of section ids that the generator is applied to
}

export const generatorOptions: Generator[] = [
	{
		key: "uniform-mutation",
		name: "Uniform Mutation",
	},
	{
		key: "evo-2",
		name: "Evo 2",
	},
	{
		key: "program-mcmc",
		name: "Program MCMC",
	},
];
