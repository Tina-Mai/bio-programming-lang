import { Program } from "@/types";
export interface Project {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	code: string;
	program: Program;
}

export interface ProjectJSON {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	code: string;
	program: Program;
}

export function convertJSONToProject(json: ProjectJSON): Project {
	return {
		id: json.id,
		name: json.name,
		createdAt: new Date(json.createdAt),
		updatedAt: new Date(json.updatedAt),
		code: json.code,
		program: json.program,
	};
}

export function convertJSONArrayToProjects(jsonArray: ProjectJSON[]): Project[] {
	return jsonArray.map(convertJSONToProject);
}
