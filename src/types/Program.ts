import { Construct, ConstraintInstance, GeneratorInstance } from "@/types";

export interface Program {
	id: string;
	project_id: string;
	created_at: string;
	compiled_at?: string;
	updated_at?: string;
	constructs?: Construct[];
	constraints?: ConstraintInstance[];
	generators?: GeneratorInstance[];
}
