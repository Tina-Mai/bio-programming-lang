export interface Generator {
	id: string;
	name: string;
	hyperparameters?: Record<string, unknown>;
}

export const generatorOptions: Generator[] = [
	{
		id: "uniform-mutation",
		name: "Uniform Mutation",
	},
	{
		id: "evo-2",
		name: "Evo 2",
	},
	{
		id: "program-mcmc",
		name: "Program MCMC",
	},
];
