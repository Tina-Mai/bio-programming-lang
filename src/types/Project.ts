export interface Project {
	name: string;
	createdAt: Date;
	updatedAt: Date;
	code: string;
}

export interface ProjectJSON {
	name: string;
	createdAt: string;
	updatedAt: string;
	code: string;
}

export function convertJSONToProject(json: ProjectJSON): Project {
	return {
		name: json.name,
		createdAt: new Date(json.createdAt),
		updatedAt: new Date(json.updatedAt),
		code: json.code,
	};
}

export function convertJSONArrayToProjects(jsonArray: ProjectJSON[]): Project[] {
	return jsonArray.map(convertJSONToProject);
}
