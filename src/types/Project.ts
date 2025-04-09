export interface Project {
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProjectJSON {
	name: string;
	createdAt: string;
	updatedAt: string;
}

export function convertJSONToProject(json: ProjectJSON): Project {
	return {
		name: json.name,
		createdAt: new Date(json.createdAt),
		updatedAt: new Date(json.updatedAt),
	};
}

export function convertJSONArrayToProjects(jsonArray: ProjectJSON[]): Project[] {
	return jsonArray.map(convertJSONToProject);
}
