"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { Project } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { SupabaseProgram, SupabaseConstraintNode, SupabaseSequenceNode, SupabaseGeneratorNode, SupabaseDBEdge } from "@/lib/utils";

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

	const _createProjectInDB = useCallback(async (): Promise<{ project: ProjectJSON; initialProgram: import("@/lib/utils").SupabaseProgram }> => {
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

		// Create the project
		const { data: newProjectData, error: projectError } = await supabase.from("projects").insert({ name: finalName }).select().single();
		if (projectError) throw projectError;
		if (!newProjectData) throw new Error("Failed to create project, no data returned.");
		const projectJson = newProjectData as ProjectJSON;

		// Create an initial default program for the new project
		const now = new Date().toISOString();
		const initialProgramPayload = {
			project_id: projectJson.id,
			name: "Main Program", // Or some default name
			created_at: now,
			updated_at: now,
		};
		const { data: newProgramData, error: programError } = await supabase.from("programs").insert(initialProgramPayload).select().single();
		if (programError) {
			console.error("Failed to create initial program for new project, attempting to roll back project creation...", programError);
			// Attempt to delete the just-created project if program creation fails
			await supabase.from("projects").delete().eq("id", projectJson.id);
			throw new Error(`Failed to create initial program: ${programError.message}`);
		}
		if (!newProgramData) throw new Error("Failed to create initial program, no data returned.");

		return { project: projectJson, initialProgram: newProgramData as import("@/lib/utils").SupabaseProgram };
	}, [supabase]);

	const _deleteProjectFromDB = useCallback(
		async (projectId: string): Promise<void> => {
			console.log(`Deleting project data from DB for project: ${projectId}...`);

			// 1. Fetch all program IDs for the project
			const { data: programs, error: fetchProgramsError } = await supabase.from("programs").select("id").eq("project_id", projectId);

			if (fetchProgramsError) {
				console.error(`Error fetching programs for project ${projectId}: ${fetchProgramsError.message}`);
				throw fetchProgramsError;
			}

			const programIds = programs?.map((p) => p.id) || [];

			if (programIds.length > 0) {
				console.log(`Found ${programIds.length} programs to delete for project ${projectId}:`, programIds);

				// 2. For each program, delete its associated nodes and edges
				// (Batching these deletes would be more efficient for many programs)
				for (const programId of programIds) {
					console.log(`Deleting graph components for program ${programId}...`);
					const deletePromises = [
						supabase.from("edges").delete().eq("program_id", programId),
						supabase.from("constraint_nodes").delete().eq("program_id", programId),
						supabase.from("sequence_nodes").delete().eq("program_id", programId),
					];
					const results = await Promise.allSettled(deletePromises);
					results.forEach((result, index) => {
						if (result.status === "rejected") {
							const tables = ["edges", "constraint_nodes", "sequence_nodes"];
							console.warn(`Error deleting from ${tables[index]} for program ${programId}: ${result.reason?.message}`);
							// Decide if to throw or continue. For now, log and continue.
						}
					});
				}

				// 3. Delete all programs for the project
				console.log(`Deleting programs for project ${projectId}...`);
				const { error: deleteProgramsError } = await supabase.from("programs").delete().in("id", programIds);
				if (deleteProgramsError) {
					console.error(`Error deleting programs for project ${projectId}: ${deleteProgramsError.message}`);
					throw deleteProgramsError; // This is critical, so throw
				}
			}

			// 4. Delete generators associated with the project (if they are project-specific)
			// Assuming generators table has a project_id column and are not shared or referenced by other projects.
			// If generators can be orphaned or are user-level but linked, this needs careful consideration.
			// Current GlobalContext _duplicateProjectInDB suggests generators might have project_id.
			// Let's assume we still want to delete generators directly linked to the project if they exist.
			// The original code had this logic for generators linked by `project_id`:
			const { error: genError } = await supabase.from("generators").delete().eq("project_id", projectId);
			if (genError && genError.code !== "PGRST204") {
				// PGRST204: No rows found
				console.warn(`Error deleting generators for project ${projectId}: ${genError.message}`);
				// Not throwing here as project deletion should proceed if programs are gone.
			}

			// 5. Finally, delete the main project entry
			console.log(`Deleting project entry ${projectId}...`);
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

			// 1. Fetch original project details
			const { data: originalProjectData, error: fetchOrigError } = await supabase.from("projects").select("name").eq("id", originalProjectId).single();
			if (fetchOrigError) throw new Error(`Failed to fetch original project for duplication: ${fetchOrigError.message}`);
			if (!originalProjectData) throw new Error("Original project not found for duplication.");

			// 2. Create new project entry
			const newProjectName = `(Copy) ${originalProjectData.name}`;
			const { data: newProjectResult, error: createProjectError } = await supabase.from("projects").insert({ name: newProjectName }).select("id, name, created_at, updated_at").single();
			if (createProjectError) throw createProjectError;
			if (!newProjectResult) throw new Error("Failed to create duplicated project entry.");
			const newProjectId = newProjectResult.id;
			const duplicatedProjectJSON = newProjectResult as ProjectJSON;

			// 3. Fetch all programs from the original project
			const { data: originalProgramsData, error: fetchProgramsError } = await supabase
				.from("programs")
				.select<"*", SupabaseProgram>("*") // Use SupabaseProgram type
				.eq("project_id", originalProjectId);

			if (fetchProgramsError) throw new Error(`Failed to fetch original programs for duplication: ${fetchProgramsError.message}`);
			const originalPrograms = originalProgramsData || [];

			// 4. Duplicate generators associated with the original project (if they have project_id)
			const generatorIdMap = new Map<string, string>();
			// Assuming generators might have a 'project_id' field for project-specific ones
			const { data: originalProjectGenerators, error: fetchGenError } = await supabase.from("generators").select<"*", SupabaseGeneratorNode>("*").eq("project_id", originalProjectId);

			if (fetchGenError && fetchGenError.code !== "42P01") {
				// 42P01: undefined_table (if project_id doesn't exist)
				// Log error if it's not an undefined_table or project_id missing error, otherwise proceed
				if (!fetchGenError.message.includes("column") || !fetchGenError.message.includes("project_id")) {
					console.warn(`Error fetching original project-specific generators, potential schema mismatch or other issue: ${fetchGenError.message}`);
				}
				// Continue if it's just project_id missing, means generators are not project-scoped in this way
			}

			if (originalProjectGenerators && originalProjectGenerators.length > 0) {
				const newGeneratorsToInsert = originalProjectGenerators.map((gn) => {
					const newId = uuidv4();
					generatorIdMap.set(gn.id, newId);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id: _id, user_id, created_at: _created_at, project_id: _project_id_original, ...rest } = gn as SupabaseGeneratorNode;
					return { ...rest, id: newId, project_id: newProjectId, user_id };
				});
				if (newGeneratorsToInsert.length > 0) {
					const { error } = await supabase.from("generators").insert(newGeneratorsToInsert);
					if (error) throw new Error(`Failed to duplicate project-specific generators: ${error.message}`);
				}
			}

			// 5. For each original program, duplicate it and its contents
			for (const originalProgram of originalPrograms) {
				const idMap = new Map<string, string>(); // Local ID map for nodes within this program

				// a. Create new program entry for the new project
				const newProgramId = uuidv4();
				const now = new Date().toISOString();
				const newProgramPayload = {
					id: newProgramId,
					project_id: newProjectId,
					name: originalProgram.name ? `(Copy) ${originalProgram.name}` : "(Copy) Program",
					created_at: originalProgram.created_at,
					updated_at: now,
				};
				const { error: createProgramError } = await supabase.from("programs").insert(newProgramPayload);
				if (createProgramError) throw new Error(`Failed to create duplicated program entry: ${createProgramError.message}`);

				// b. Fetch graph components from the original program
				const [constraintsResult, sequencesResult] = await Promise.all([
					supabase.from("constraint_nodes").select<"*", SupabaseConstraintNode>("*").eq("program_id", originalProgram.id),
					supabase.from("sequence_nodes").select<"*", SupabaseSequenceNode>("*").eq("program_id", originalProgram.id),
				]);
				if (constraintsResult.error) throw new Error(`Failed to fetch original constraint nodes for program ${originalProgram.id}: ${constraintsResult.error.message}`);
				if (sequencesResult.error) throw new Error(`Failed to fetch original sequence nodes for program ${originalProgram.id}: ${sequencesResult.error.message}`);

				const originalConstraints = constraintsResult.data || [];
				const originalSequences = sequencesResult.data || [];

				// c. Duplicate Constraint Nodes
				const newConstraintsToInsert = originalConstraints.map((cn) => {
					const newId = uuidv4();
					idMap.set(cn.id, newId);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id: _id, project_id: _project_id, program_id: _program_id, created_at: _created_at, ...rest } = cn;
					return { ...rest, id: newId, project_id: newProjectId, program_id: newProgramId };
				});
				if (newConstraintsToInsert.length > 0) {
					const { error } = await supabase.from("constraint_nodes").insert(newConstraintsToInsert);
					if (error) throw new Error(`Failed to duplicate constraint_nodes for program ${newProgramId}: ${error.message}`);
				}

				// d. Duplicate Sequence Nodes (handling generator_id mapping)
				const newSequencesToInsert = originalSequences.map((sn) => {
					const newId = uuidv4();
					idMap.set(sn.id, newId);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id: _id, project_id: _project_id, program_id: _program_id, created_at: _created_at, generator_id: _generator_id_destructured, ...rest } = sn;
					const newGeneratorId = sn.generator_id ? generatorIdMap.get(sn.generator_id) || sn.generator_id : null;
					return { ...rest, id: newId, project_id: newProjectId, program_id: newProgramId, generator_id: newGeneratorId };
				});
				if (newSequencesToInsert.length > 0) {
					const { error } = await supabase.from("sequence_nodes").insert(newSequencesToInsert);
					if (error) throw new Error(`Failed to duplicate sequence_nodes for program ${newProgramId}: ${error.message}`);
				}

				// e. Fetch and Duplicate Edges for the current original program
				const { data: originalEdgesData, error: fetchEdgesError } = await supabase.from("edges").select<"*", SupabaseDBEdge>("*").eq("program_id", originalProgram.id);
				if (fetchEdgesError) throw new Error(`Failed to fetch original edges for program ${originalProgram.id}: ${fetchEdgesError.message}`);
				const originalEdges = originalEdgesData || [];

				const newEdgesToInsert = originalEdges
					.map((edge) => {
						const newSourceId = idMap.get(edge.constraint_id);
						const newTargetId = idMap.get(edge.sequence_id);
						if (!newSourceId || !newTargetId) {
							console.warn(`Skipping edge ${edge.id} during duplication due to missing new node ID mapping.`);
							return null;
						}
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const { id: _id, program_id: _program_id, created_at: _created_at, ...rest } = edge;
						return { ...rest, id: uuidv4(), program_id: newProgramId, constraint_id: newSourceId, sequence_id: newTargetId };
					})
					.filter((e) => e !== null) as Omit<SupabaseDBEdge, "created_at" | "project_id">[];

				if (newEdgesToInsert.length > 0) {
					const { error } = await supabase.from("edges").insert(newEdgesToInsert);
					if (error) throw new Error(`Failed to duplicate edges for program ${newProgramId}: ${error.message}`);
				}
				console.log(`Successfully duplicated program ${originalProgram.id} to ${newProgramId} for project ${newProjectId}`);
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
		console.log("Creating new project and initial program...");
		try {
			// _createProjectInDB now returns both project and initialProgram
			const { project: newProjectJson } = await _createProjectInDB();
			const newProject = mapProjectJsonToProject(newProjectJson);

			// Update local state for projects
			setProjects((prevProjects) => sortProjects([newProject, ...prevProjects]));
			setCurrentProject(newProject);
			// The ProjectContext will handle fetching this new project's initial program when currentProject changes.

			console.log("New project and initial program created successfully:", newProject.id);
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
