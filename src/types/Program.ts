import { Construct, ConstraintInstance, GeneratorInstance } from "@/types";

export interface Program {
	id: string;
	project_id: string;
	createdAt: Date;
	updatedAt: Date;
	constructs?: Construct[];
	constraints?: ConstraintInstance[];
	generators?: GeneratorInstance[];
}
