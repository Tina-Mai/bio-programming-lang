import { Program } from "@/types";
export interface Project {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	code?: string;
	programs?: Program[];
}
