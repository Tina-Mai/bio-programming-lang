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
	segment_id: string;
	key: string | null;
	label: string | null;
	created_at: string;
	updated_at?: string;
}

export const generatorOptions: Generator[] = [
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
