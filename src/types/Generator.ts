export interface Generator {
	key: string;
	name: string;
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
	},
	{
		key: "program-mcmc",
		name: "Program MCMC",
	},
];
