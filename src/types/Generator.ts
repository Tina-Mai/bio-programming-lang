import { SequenceType } from "@/types";

export interface Generator {
	key: string;
	name?: string;
	description?: string;
	types?: SequenceType[]; // if not provided, the generator is applicable to all sequence types
	hyperparameters?: Record<string, unknown>;
}

// generator instance from database
export interface GeneratorInstance {
	id: string;
	program_id: string;
	key?: string;
	label?: string;
	created_at: string;
	updated_at?: string;
	segments: string[]; // segment IDs that this generator applies to
}

export const generatorOptions: Generator[] = [
	{
		key: "random",
		name: "Random",
		description: "Generate completely random sequences",
	},
	{
		key: "uniform-mutation",
		name: "Uniform Mutation",
		description: "Apply uniform mutations across the sequence",
	},
	{
		key: "evo-2",
		name: "Evo 2",
		description: "Evolution-based sequence generation algorithm",
	},
];
