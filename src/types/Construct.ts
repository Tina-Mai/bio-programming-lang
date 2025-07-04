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
