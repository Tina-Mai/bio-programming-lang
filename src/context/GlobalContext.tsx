"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { Project } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { SupabaseConstraintNode, SupabaseSequenceNode, SupabaseGeneratorNode, SupabaseDBEdge } from "@/lib/utils";

// define ProjectJSON based on what Supabase 'projects' table returns
export interface ProjectJSON {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
}

type Mode = "graph" | "code";

// convert ProjectJSON to Project
const mapProjectJsonToProject = (p: ProjectJSON): Project => ({
	id: p.id,
	name: p.name,
	createdAt: new Date(p.created_at),
	updatedAt: p.updated_at ? new Date(p.updated_at) : new Date(p.created_at),
});

// sort projects
const sortProjects = (projects: Project[]): Project[] => {
	return [...projects].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

interface GlobalContextType {
	mode: Mode;
	setMode: (mode: Mode) => void;
	projects: Project[];
	currentProject: Project | null;
	setCurrentProject: (project: Project | null) => void;
	fetchProjects: () => Promise<void>;
	createNewProject: () => Promise<void>;
	deleteProject: (projectId: string) => Promise<void>;
	duplicateProject: (projectId: string) => Promise<void>;
	updateProjectTimestamp: (projectId: string, newTimestamp: Date) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
	const [mode, setMode] = useState<Mode>("graph");
	const [projects, setProjects] = useState<Project[]>([]);
	const [currentProject, setCurrentProject] = useState<Project | null>(null);
	const supabase: SupabaseClient = createClient();

	// --- Internal Helper Functions ---

	const _fetchProjectsFromDB = useCallback(async (): Promise<Project[]> => {
		console.log("Fetching projects from Supabase...");
		const { data, error } = await supabase.from("projects").select<"*", ProjectJSON>("*");
		if (error) {
			console.error("Error fetching projects:", error);
			throw error;
		}
		return data ? data.map(mapProjectJsonToProject) : [];
	}, [supabase]);

	const _createProjectInDB = useCallback(async (): Promise<{ project: ProjectJSON }> => {
		const baseName = "New design";
		let finalName = baseName;
		let counter = 1;

		const { data: existingProjects, error: fetchError } = await supabase.from("projects").select("name").like("name", `${baseName}%`);

		if (fetchError) {
			console.error("Error fetching existing project names:", fetchError);
			throw fetchError;
		}

		if (existingProjects && existingProjects.length > 0) {
			const existingNames = new Set(existingProjects.map((p: { name: string }) => p.name));
			if (existingNames.has(baseName)) {
				counter = 2;
				while (existingNames.has(`${baseName} ${counter}`)) {
					counter++;
				}
				finalName = `${baseName} ${counter}`;
			}
		}

		const { data: newProjectData, error: projectError } = await supabase.from("projects").insert({ name: finalName }).select().single();

		if (projectError) throw projectError;
		if (!newProjectData) throw new Error("Failed to create project, no data returned.");

		return { project: newProjectData as ProjectJSON };
	}, [supabase]);

	const _deleteProjectFromDB = useCallback(
		async (projectId: string): Promise<void> => {
			console.log(`Deleting project data from DB for project: ${projectId}...`);
			const tablesWithProjectId = ["constraint_nodes", "sequence_nodes", "generators"];
			for (const table of tablesWithProjectId) {
				const { error } = await supabase.from(table).delete().eq("project_id", projectId);
				if (error && error.code !== "PGRST204") {
					console.warn(`Error deleting from ${table} for project ${projectId}: ${error.message}`);
					// TODO: throw an error or continue?
				}
			}

			// handling edges
			const { data: projectConstraintNodes, error: pcnErr } = await supabase.from("constraint_nodes").select("id").eq("project_id", projectId);

			if (pcnErr && pcnErr.code !== "PGRST204") {
				console.warn("Could not fetch constraint_node IDs to delete associated edges:", pcnErr.message);
			} else if (projectConstraintNodes && projectConstraintNodes.length > 0) {
				const constraintNodeIds = projectConstraintNodes.map((n) => n.id);
				// delete edges where constraint_id is one of the project's constraint nodes
				const { error: edgeDelError } = await supabase.from("edges").delete().in("constraint_id", constraintNodeIds);
				if (edgeDelError && edgeDelError.code !== "PGRST204") {
					console.warn("Error deleting edges by constraint_id:", edgeDelError.message);
				}
			}
			// TODO: consider if you also need to delete edges based on sequence_id if they can exist independently
			// for now, this covers edges originating from this project's constraints

			// finally, delete the main project entry
			const { error: projectError } = await supabase.from("projects").delete().eq("id", projectId);
			if (projectError) {
				console.error(`Failed to delete project ${projectId} itself:`, projectError.message);
				throw projectError;
			}
			console.log(`Project ${projectId} and its associated data deleted.`);
		},
		[supabase]
	);

	const _duplicateProjectInDB = useCallback(
		async (originalProjectId: string): Promise<{ duplicatedProject: ProjectJSON }> => {
			console.log(`Duplicating project in DB: ${originalProjectId}...`);

			// 1. fetch original project details (just name for now, or all details if needed for copy)
			const { data: originalProjectData, error: fetchOrigError } = await supabase.from("projects").select("name").eq("id", originalProjectId).single();
			if (fetchOrigError) throw new Error(`Failed to fetch original project for duplication: ${fetchOrigError.message}`);
			if (!originalProjectData) throw new Error("Original project not found for duplication.");

			// 2. create new project entry
			const newProjectName = `(Copy) ${originalProjectData.name}`;
			const { data: newProjectResult, error: createProjectError } = await supabase
				.from("projects")
				.insert({ name: newProjectName })
				.select("id, name, created_at, updated_at") // Select all fields for ProjectJSON
				.single();
			if (createProjectError) throw createProjectError;
			if (!newProjectResult) throw new Error("Failed to create duplicated project entry.");
			const newProjectId = newProjectResult.id;
			const duplicatedProjectJSON = newProjectResult as ProjectJSON;

			// 3. fetch all graph components from the original project
			const [constraintsResult, sequencesResult, generatorsResult] = await Promise.all([
				supabase.from("constraint_nodes").select("*").eq("project_id", originalProjectId),
				supabase.from("sequence_nodes").select("*").eq("project_id", originalProjectId),
				supabase.from("generators").select("*").eq("project_id", originalProjectId),
			]);

			if (constraintsResult.error) throw new Error("Failed to fetch original constraint nodes for duplication");
			if (sequencesResult.error) throw new Error("Failed to fetch original sequence nodes for duplication");
			if (generatorsResult.error) throw new Error("Failed to fetch original generator nodes for duplication");

			const originalConstraints = (constraintsResult.data || []) as SupabaseConstraintNode[];
			const originalSequences = (sequencesResult.data || []) as SupabaseSequenceNode[];
			const originalGenerators = (generatorsResult.data || []) as SupabaseGeneratorNode[];

			let originalEdges: SupabaseDBEdge[] = [];
			const originalConstraintNodeIds = originalConstraints.map((n) => n.id);
			const originalSequenceNodeIdsSet = new Set(originalSequences.map((n) => n.id));

			if (originalConstraintNodeIds.length > 0) {
				const { data: oeData, error: oeError } = await supabase.from("edges").select("*").in("constraint_id", originalConstraintNodeIds);
				if (oeError) throw new Error(`Failed to fetch original edges for duplication: ${oeError.message}`);
				if (oeData) {
					originalEdges = (oeData as SupabaseDBEdge[]).filter((edge) => originalSequenceNodeIdsSet.has(edge.sequence_id));
				}
			}

			const idMap = new Map<string, string>();

			const newConstraintsToInsert = originalConstraints.map((cn) => {
				const newId = uuidv4();
				idMap.set(cn.id, newId);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { id, project_id, created_at, ...rest } = cn;
				return { ...rest, id: newId, project_id: newProjectId };
			});
			if (newConstraintsToInsert.length > 0) {
				const { error } = await supabase.from("constraint_nodes").insert(newConstraintsToInsert);
				if (error) throw new Error(`Failed to duplicate constraint_nodes: ${error.message}`);
			}

			const newGeneratorsToInsert = originalGenerators.map((gn) => {
				const newId = uuidv4();
				idMap.set(gn.id, newId);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { id, project_id, created_at, ...rest } = gn;
				return { ...rest, id: newId, project_id: newProjectId };
			});
			if (newGeneratorsToInsert.length > 0) {
				const { error } = await supabase.from("generators").insert(newGeneratorsToInsert);
				if (error) throw new Error(`Failed to duplicate generators: ${error.message}`);
			}

			const newSequencesToInsert = originalSequences.map((sn) => {
				const newId = uuidv4();
				idMap.set(sn.id, newId);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { id, project_id, created_at, generator_id, ...rest } = sn;
				const newGeneratorId = sn.generator_id ? idMap.get(sn.generator_id) : undefined;
				return { ...rest, id: newId, project_id: newProjectId, generator_id: newGeneratorId };
			});
			if (newSequencesToInsert.length > 0) {
				const { error } = await supabase.from("sequence_nodes").insert(newSequencesToInsert);
				if (error) throw new Error(`Failed to duplicate sequence_nodes: ${error.message}`);
			}

			const newEdgesToInsert = originalEdges
				.map((edge) => {
					const newSourceId = idMap.get(edge.constraint_id);
					const newTargetId = idMap.get(edge.sequence_id);
					if (!newSourceId || !newTargetId) return null;
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id, project_id, constraint_id, sequence_id, created_at, ...rest } = edge;
					return { ...rest, id: uuidv4(), /* no project_id column */ constraint_id: newSourceId, sequence_id: newTargetId };
				})
				.filter((e) => e !== null) as Omit<SupabaseDBEdge, "project_id" | "created_at" | "updated_at">[];

			if (newEdgesToInsert.length > 0) {
				const { error } = await supabase.from("edges").insert(newEdgesToInsert);
				if (error) throw new Error(`Failed to duplicate edges: ${error.message}`);
			}

			return { duplicatedProject: duplicatedProjectJSON };
		},
		[supabase]
	);

	// --- Public API ---

	const fetchProjects = useCallback(async () => {
		try {
			const fetchedProjects = await _fetchProjectsFromDB();
			const sortedProjects = sortProjects(fetchedProjects);
			setProjects(sortedProjects);

			if (sortedProjects.length > 0) {
				// determine the next current project
				const currentStillExists = currentProject && sortedProjects.some((p) => p.id === currentProject.id);
				if (!currentStillExists || !currentProject) {
					setCurrentProject(sortedProjects[0]);
				}
			} else {
				setCurrentProject(null);
			}
			console.log("Projects fetched and state updated. Current project:", currentProject?.id ?? "None");
		} catch (err: unknown) {
			console.error("Error in fetchProjects:", err);
			setProjects([]);
			setCurrentProject(null);
		}
	}, [_fetchProjectsFromDB, currentProject]);

	const createNewProject = useCallback(async () => {
		console.log("Creating new project...");
		try {
			const { project: newProjectJson } = await _createProjectInDB();
			const newProject = mapProjectJsonToProject(newProjectJson);

			// update local state
			setProjects((prevProjects) => sortProjects([newProject, ...prevProjects]));
			setCurrentProject(newProject);

			console.log("New project created successfully:", newProject.id);
		} catch (err: unknown) {
			console.error("Error creating new project:", err);
		}
	}, [_createProjectInDB, setProjects, setCurrentProject]);

	const deleteProject = useCallback(
		async (projectId: string) => {
			console.log(`Deleting project: ${projectId}...`);
			try {
				await _deleteProjectFromDB(projectId);

				// update local state
				let nextCurrentProject: Project | null = null;
				const remainingProjects = projects.filter((p) => p.id !== projectId);

				if (remainingProjects.length > 0) {
					if (currentProject?.id === projectId) {
						nextCurrentProject = remainingProjects[0];
					} else {
						nextCurrentProject = currentProject;
					}
				} else {
					nextCurrentProject = null;
				}

				setProjects(remainingProjects);
				setCurrentProject(nextCurrentProject);

				console.log(`Project ${projectId} deleted successfully. Current project set to: ${nextCurrentProject?.id ?? "None"}`);
			} catch (err: unknown) {
				console.error("Error deleting project:", err);
			}
		},
		[_deleteProjectFromDB, projects, currentProject, setProjects, setCurrentProject]
	);

	const duplicateProject = useCallback(
		async (projectId: string) => {
			console.log(`Attempting to duplicate project: ${projectId}...`);
			try {
				const { duplicatedProject: dupProjectJson } = await _duplicateProjectInDB(projectId);
				const duplicatedProject = mapProjectJsonToProject(dupProjectJson);
				setProjects((prevProjects) => sortProjects([duplicatedProject, ...prevProjects]));
				setCurrentProject(duplicatedProject);
				console.log("Project duplicated successfully:", duplicatedProject.id);
			} catch (err: unknown) {
				console.error("Error duplicating project:", err);
				// TODO: add user-facing error message
			}
		},
		[_duplicateProjectInDB, setProjects, setCurrentProject]
	);

	const updateProjectTimestamp = useCallback((projectId: string, newTimestamp: Date) => {
		setProjects((prevProjects) => {
			const updatedProjects = prevProjects.map((project) => (project.id === projectId ? { ...project, updatedAt: newTimestamp } : project));
			return sortProjects(updatedProjects);
		});
	}, []);

	// --- Effects ---

	useEffect(() => {
		fetchProjects();
	}, [fetchProjects]);

	return (
		<GlobalContext.Provider
			value={{
				mode,
				setMode,
				projects,
				currentProject,
				setCurrentProject,
				fetchProjects,
				createNewProject,
				deleteProject,
				duplicateProject,
				updateProjectTimestamp,
			}}
		>
			{children}
		</GlobalContext.Provider>
	);
}

export function useGlobal() {
	const context = useContext(GlobalContext);
	if (context === undefined) {
		throw new Error("useGlobal must be used within a GlobalProvider");
	}
	return context;
}
