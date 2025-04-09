import { Node, Edge } from "@xyflow/react";

export interface Project {
	name: string;
	createdAt: Date;
	updatedAt: Date;
	code: string;
	nodes?: Node[];
	edges?: Edge[];
}

export interface ProjectJSON {
	name: string;
	createdAt: string;
	updatedAt: string;
	code: string;
	nodes?: Node[];
	edges?: Edge[];
}

export function convertJSONToProject(json: ProjectJSON): Project {
	return {
		name: json.name,
		createdAt: new Date(json.createdAt),
		updatedAt: new Date(json.updatedAt),
		code: json.code,
		nodes: json.nodes,
		edges: json.edges,
	};
}

export function convertJSONArrayToProjects(jsonArray: ProjectJSON[]): Project[] {
	return jsonArray.map(convertJSONToProject);
}
