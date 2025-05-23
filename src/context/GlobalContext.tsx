"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { Project } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { SupabaseProgram, SupabaseConstraintNode, SupabaseSequenceNode, SupabaseDBEdge } from "@/lib/utils";

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

	const _createProjectInDB = useCallback(async (): Promise<{ project: ProjectJSON; initialProgram: SupabaseProgram }> => {
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

		// create the project
		const { data: newProjectData, error: projectError } = await supabase.from("projects").insert({ name: finalName }).select().single();
		if (projectError) throw projectError;
		if (!newProjectData) throw new Error("Failed to create project, no data returned.");
		const projectJson = newProjectData as ProjectJSON;

		// create an initial default program
		const now = new Date().toISOString();
		const initialProgramPayload = {
			project_id: projectJson.id,
			created_at: now,
		};
		const { data: newProgramData, error: programError } = await supabase.from("programs").insert(initialProgramPayload).select().single();
		if (programError) {
			console.error("Failed to create initial program for new project. Full error object:", JSON.stringify(programError, null, 2));
			// Attempt to delete the just-created project if program creation fails
			await supabase.from("projects").delete().eq("id", projectJson.id);
			throw new Error(`Failed to create initial program: ${programError.message}`);
		}
		if (!newProgramData) throw new Error("Failed to create initial program, no data returned.");

		return { project: projectJson, initialProgram: newProgramData as SupabaseProgram };
	}, [supabase]);

	const _deleteProjectFromDB = useCallback(
		async (projectId: string): Promise<void> => {
			console.log(`Deleting project data from DB for project: ${projectId}...`);

			// 1. fetch all program IDs for the project
			const { data: programs, error: fetchProgramsError } = await supabase.from("programs").select("id").eq("project_id", projectId);

			if (fetchProgramsError) {
				console.error(`Error fetching programs for project ${projectId}: ${fetchProgramsError.message}`);
				throw fetchProgramsError;
			}

			const programIds = programs?.map((p) => p.id) || [];

			if (programIds.length > 0) {
				console.log(`Found ${programIds.length} programs to delete for project ${projectId}:`, programIds);

				// 2. for each program, delete its associated nodes and edges
				// (batching these deletes would be more efficient for many programs)
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
							// TODO: decide if to throw or continue. For now, log and continue.
						}
					});
				}

				// 3. delete all programs for the project
				console.log(`Deleting programs for project ${projectId}...`);
				const { error: deleteProgramsError } = await supabase.from("programs").delete().in("id", programIds);
				if (deleteProgramsError) {
					console.error(`Error deleting programs for project ${projectId}: ${deleteProgramsError.message}`);
					throw deleteProgramsError;
				}
			}

			// 4. finally, delete the main project entry
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
		async (originalProjectId: string): Promise<{ duplicatedProject: ProjectJSON; newProgramId?: string }> => {
			console.log(`Duplicating project in DB: ${originalProjectId}...`);

			// 1. fetch original project details
			const { data: originalProjectData, error: fetchOrigError } = await supabase.from("projects").select("name").eq("id", originalProjectId).single();
			if (fetchOrigError) throw new Error(`Failed to fetch original project for duplication: ${fetchOrigError.message}`);
			if (!originalProjectData) throw new Error("Original project not found for duplication.");

			// 2. create new project entry
			const newProjectName = `(Copy) ${originalProjectData.name}`;
			const { data: newProjectResult, error: createProjectError } = await supabase.from("projects").insert({ name: newProjectName }).select("id, name, created_at, updated_at").single();
			if (createProjectError) throw createProjectError;
			if (!newProjectResult) throw new Error("Failed to create duplicated project entry.");
			const newProjectId = newProjectResult.id;
			const duplicatedProjectJSON = newProjectResult as ProjectJSON;

			// 3. fetch the most recent program from the original project
			const { data: originalProgramsData, error: fetchProgramsError } = await supabase
				.from("programs")
				.select<"*", SupabaseProgram>("*")
				.eq("project_id", originalProjectId)
				.order("updated_at", { ascending: false })
				.limit(1);

			if (fetchProgramsError) {
				await supabase.from("projects").delete().eq("id", newProjectId);
				throw new Error(`Failed to fetch original program for duplication: ${fetchProgramsError.message}`);
			}

			const mostRecentOriginalProgram = originalProgramsData && originalProgramsData.length > 0 ? (originalProgramsData[0] as SupabaseProgram) : null;

			let newProgramIdForDuplication: string | undefined = undefined;

			// 5. if a most recent program exists, duplicate it and its contents
			if (mostRecentOriginalProgram) {
				const originalProgram = mostRecentOriginalProgram;
				const idMap = new Map<string, string>();

				const newProgramId = uuidv4();
				newProgramIdForDuplication = newProgramId;
				const now = new Date().toISOString();
				const newProgramPayload = {
					id: newProgramId,
					project_id: newProjectId,
					created_at: now,
				};
				const { error: createProgramError } = await supabase.from("programs").insert(newProgramPayload);
				if (createProgramError) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					console.error("Failed to create duplicated program entry. Full error object:", JSON.stringify(createProgramError, null, 2));
					throw new Error(`Failed to create duplicated program entry: ${createProgramError.message}`);
				}

				const [constraintsResult, sequencesResult, edgesResult] = await Promise.all([
					supabase.from("constraint_nodes").select<"*", SupabaseConstraintNode>("*").eq("program_id", originalProgram.id),
					supabase.from("sequence_nodes").select<"*", SupabaseSequenceNode>("*").eq("program_id", originalProgram.id),
					supabase.from("edges").select<"*", SupabaseDBEdge>("*").eq("program_id", originalProgram.id),
				]);

				if (constraintsResult.error) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					throw new Error(`Failed to fetch original constraint nodes for program ${originalProgram.id}: ${constraintsResult.error.message}`);
				}
				if (sequencesResult.error) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					throw new Error(`Failed to fetch original sequence nodes for program ${originalProgram.id}: ${sequencesResult.error.message}`);
				}
				if (edgesResult.error) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					throw new Error(`Failed to fetch original edges for program ${originalProgram.id}: ${edgesResult.error.message}`);
				}

				const originalConstraints = constraintsResult.data || [];
				const originalSequences = sequencesResult.data || [];
				const originalEdges = edgesResult.data || [];

				// c. duplicate constraint nodes
				if (originalConstraints.length > 0) {
					const newConstraintsToInsert = originalConstraints.map((cn) => {
						const newId = uuidv4();
						idMap.set(cn.id, newId);
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const { id: _id, /* project_id: _project_id, */ program_id: _program_id, created_at: _created_at, ...rest } = cn; // Removed project_id
						return { ...rest, id: newId, program_id: newProgramId }; // project_id is not re-added
					});
					const { error } = await supabase.from("constraint_nodes").insert(newConstraintsToInsert);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId); // Rollback
						throw new Error(`Failed to duplicate constraint_nodes for program ${newProgramId}: ${error.message}`);
					}
				}

				// d. duplicate sequence nodes (handling generator_id mapping)
				if (originalSequences.length > 0) {
					const newSequencesToInsert = originalSequences.map((sn) => {
						const newId = uuidv4();
						idMap.set(sn.id, newId);
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const { id: _id, /* project_id: _project_id, */ program_id: _program_id, created_at: _created_at, generator_id: _generator_id_destructured, ...rest } = sn;
						const newGeneratorId = sn.generator_id;
						return { ...rest, id: newId, program_id: newProgramId, generator_id: newGeneratorId };
					});
					const { error } = await supabase.from("sequence_nodes").insert(newSequencesToInsert);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId);
						throw new Error(`Failed to duplicate sequence_nodes for program ${newProgramId}: ${error.message}`);
					}
				}

				// e. duplicate edges
				if (originalEdges.length > 0) {
					const newEdgesToInsert = originalEdges
						.map((edge) => {
							const newSourceId = idMap.get(edge.constraint_id);
							const newTargetId = idMap.get(edge.sequence_id);

							if (!newSourceId && edge.constraint_id) {
								console.warn(`Skipping edge during duplication: Source node ${edge.constraint_id} not found in idMap for new program ${newProgramId}. Original edge ID: ${edge.id}`);
								return null;
							}
							if (!newTargetId && edge.sequence_id) {
								console.warn(`Skipping edge during duplication: Target node ${edge.sequence_id} not found in idMap for new program ${newProgramId}. Original edge ID: ${edge.id}`);
								return null;
							}

							// eslint-disable-next-line @typescript-eslint/no-unused-vars
							const { id: _id, program_id: _program_id, created_at: _created_at, constraint_id: _orig_constraint_id, sequence_id: _orig_sequence_id, ...rest } = edge;
							return {
								...rest,
								id: uuidv4(),
								program_id: newProgramId,
								constraint_id: newSourceId || null,
								sequence_id: newTargetId || null,
							};
						})
						.filter((e) => e !== null) as Omit<SupabaseDBEdge, "created_at" | "project_id">[];

					if (newEdgesToInsert.length > 0) {
						const { error } = await supabase.from("edges").insert(newEdgesToInsert);
						if (error) {
							await supabase.from("projects").delete().eq("id", newProjectId);
							throw new Error(`Failed to duplicate edges for program ${newProgramId}: ${error.message}`);
						}
					}
				}
				console.log(`Successfully duplicated program ${originalProgram.id} to ${newProgramId} for project ${newProjectId}`);
			} else {
				console.log(`No programs found in original project ${originalProjectId}. Creating a default initial program for duplicated project ${newProjectId}.`);
				// create a default initial program for the new project
				const now = new Date().toISOString();
				const initialProgramPayload = {
					project_id: newProjectId,
					created_at: now,
				};
				const { data: newProgramData, error: programError } = await supabase.from("programs").insert(initialProgramPayload).select().single();
				if (programError) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					throw new Error(`Failed to create initial program for duplicated project: ${programError.message}`);
				}
				if (!newProgramData) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					throw new Error("Failed to create initial program for duplicated project, no data returned.");
				}
				newProgramIdForDuplication = (newProgramData as SupabaseProgram).id;
				console.log(`Created default initial program ${newProgramIdForDuplication} for duplicated project ${newProjectId}.`);
			}

			return { duplicatedProject: duplicatedProjectJSON, newProgramId: newProgramIdForDuplication };
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
	}, [_fetchProjectsFromDB, currentProject, setCurrentProject]);

	const createNewProject = useCallback(async () => {
		console.log("Creating new project and initial program...");
		try {
			const { project: newProjectJson, initialProgram } = await _createProjectInDB();
			const newProject = mapProjectJsonToProject(newProjectJson);

			setProjects((prevProjects) => sortProjects([newProject, ...prevProjects]));
			setCurrentProject(newProject);

			console.log(`New project ${newProject.id} and initial program ${initialProgram.id} created successfully.`);
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
				const { duplicatedProject: dupProjectJson, newProgramId } = await _duplicateProjectInDB(projectId);
				const duplicatedProject = mapProjectJsonToProject(dupProjectJson);
				setProjects((prevProjects) => sortProjects([duplicatedProject, ...prevProjects]));
				setCurrentProject(duplicatedProject);
				console.log(`Project ${duplicatedProject.id} duplicated successfully. ${newProgramId ? `New program ${newProgramId} created.` : "No program was duplicated."}`);
			} catch (err: unknown) {
				console.error("Error duplicating project:", err);
				// TODO: add user-facing error message
			}
		},
		[_duplicateProjectInDB, setProjects, setCurrentProject]
	);

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
