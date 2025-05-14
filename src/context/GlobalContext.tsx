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

		// Create the project
		const { data: newProjectData, error: projectError } = await supabase.from("projects").insert({ name: finalName }).select().single();
		if (projectError) throw projectError;
		if (!newProjectData) throw new Error("Failed to create project, no data returned.");
		const projectJson = newProjectData as ProjectJSON;

		// Create an initial default program for the new project
		const now = new Date().toISOString();
		const initialProgramPayload = {
			project_id: projectJson.id,
			// Ensure all required fields for 'programs' table are present or have defaults
			// For example, if 'description' or other fields are mandatory and don't have db defaults:
			// description: "Initial program.",
			created_at: now,
			// updated_at: now, // REMOVED based on SupabaseProgram type lacking updated_at
			// Add any other fields required by your 'programs' table schema here
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
		async (originalProjectId: string): Promise<{ duplicatedProject: ProjectJSON; newProgramId?: string }> => {
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

			// 3. Fetch the most recent program from the original project
			const { data: originalProgramsData, error: fetchProgramsError } = await supabase
				.from("programs")
				.select<"*", SupabaseProgram>("*") // Use SupabaseProgram type
				.eq("project_id", originalProjectId)
				.order("updated_at", { ascending: false })
				.limit(1); // Fetch only the most recent program

			if (fetchProgramsError) {
				// Rollback project creation if fetching programs fails
				await supabase.from("projects").delete().eq("id", newProjectId);
				throw new Error(`Failed to fetch original program for duplication: ${fetchProgramsError.message}`);
			}

			const mostRecentOriginalProgram = originalProgramsData && originalProgramsData.length > 0 ? (originalProgramsData[0] as SupabaseProgram) : null;

			let newProgramIdForDuplication: string | undefined = undefined;

			// 4. Duplicate generators (if any and if project-scoped)
			// This logic remains largely the same but ensure it's correctly scoped.
			// If generators are program-specific, this logic might need to move inside the program duplication block.
			// For now, assuming project-specific generators as per original structure.
			const generatorIdMap = new Map<string, string>();
			const { data: originalProjectGenerators, error: fetchGenError } = await supabase.from("generators").select<"*", SupabaseGeneratorNode>("*").eq("project_id", originalProjectId);

			if (fetchGenError && fetchGenError.code !== "42P01" && !(fetchGenError.message.includes("column") && fetchGenError.message.includes("project_id"))) {
				// Log error if it's not an undefined_table or project_id missing error
				console.warn(`Error fetching original project-specific generators: ${fetchGenError.message}`);
				// Potentially rollback project creation if this is critical
				// await supabase.from("projects").delete().eq("id", newProjectId);
				// throw new Error(`Failed to fetch original project-specific generators: ${fetchGenError.message}`);
			}

			if (originalProjectGenerators && originalProjectGenerators.length > 0) {
				const newGeneratorsToInsert = originalProjectGenerators.map((gn) => {
					const newId = uuidv4();
					generatorIdMap.set(gn.id, newId);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id: _id, user_id, created_at: _created_at, /* project_id: _project_id_original, */ ...rest } = gn; // Removed project_id from destructuring
					// When re-inserting, project_id is NOT added back, assuming generators are no longer project-specific
					return { ...rest, id: newId, user_id };
				});
				if (newGeneratorsToInsert.length > 0) {
					const { error } = await supabase.from("generators").insert(newGeneratorsToInsert);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId); // Rollback
						throw new Error(`Failed to duplicate project-specific generators: ${error.message}`);
					}
				}
			}

			// 5. If a most recent program exists, duplicate it and its contents
			if (mostRecentOriginalProgram) {
				const originalProgram = mostRecentOriginalProgram;
				const idMap = new Map<string, string>(); // Local ID map for nodes within this program

				// a. Create new program entry for the new project
				const newProgramId = uuidv4();
				newProgramIdForDuplication = newProgramId;
				const now = new Date().toISOString();
				const newProgramPayload = {
					id: newProgramId,
					project_id: newProjectId,
					created_at: now, // Set to current time for the new program
					// updated_at: now, // REMOVED based on SupabaseProgram type lacking updated_at
					// Copy other relevant fields from originalProgram if necessary, e.g., description
					// description: originalProgram.description,
				};
				const { error: createProgramError } = await supabase.from("programs").insert(newProgramPayload);
				if (createProgramError) {
					await supabase.from("projects").delete().eq("id", newProjectId); // Rollback
					console.error("Failed to create duplicated program entry. Full error object:", JSON.stringify(createProgramError, null, 2));
					throw new Error(`Failed to create duplicated program entry: ${createProgramError.message}`);
				}

				// b. Fetch graph components from the original program
				const [constraintsResult, sequencesResult, edgesResult] = await Promise.all([
					supabase.from("constraint_nodes").select<"*", SupabaseConstraintNode>("*").eq("program_id", originalProgram.id),
					supabase.from("sequence_nodes").select<"*", SupabaseSequenceNode>("*").eq("program_id", originalProgram.id),
					supabase.from("edges").select<"*", SupabaseDBEdge>("*").eq("program_id", originalProgram.id),
				]);

				if (constraintsResult.error) {
					await supabase.from("projects").delete().eq("id", newProjectId); // Rollback
					throw new Error(`Failed to fetch original constraint nodes for program ${originalProgram.id}: ${constraintsResult.error.message}`);
				}
				if (sequencesResult.error) {
					await supabase.from("projects").delete().eq("id", newProjectId); // Rollback
					throw new Error(`Failed to fetch original sequence nodes for program ${originalProgram.id}: ${sequencesResult.error.message}`);
				}
				if (edgesResult.error) {
					await supabase.from("projects").delete().eq("id", newProjectId); // Rollback
					throw new Error(`Failed to fetch original edges for program ${originalProgram.id}: ${edgesResult.error.message}`);
				}

				const originalConstraints = constraintsResult.data || [];
				const originalSequences = sequencesResult.data || [];
				const originalEdges = edgesResult.data || [];

				// c. Duplicate Constraint Nodes
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

				// d. Duplicate Sequence Nodes (handling generator_id mapping)
				if (originalSequences.length > 0) {
					const newSequencesToInsert = originalSequences.map((sn) => {
						const newId = uuidv4();
						idMap.set(sn.id, newId);
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const { id: _id, /* project_id: _project_id, */ program_id: _program_id, created_at: _created_at, generator_id: _generator_id_destructured, ...rest } = sn; // Removed project_id
						const newGeneratorId = sn.generator_id ? generatorIdMap.get(sn.generator_id) || sn.generator_id : null;
						return { ...rest, id: newId, program_id: newProgramId, generator_id: newGeneratorId }; // project_id is not re-added
					});
					const { error } = await supabase.from("sequence_nodes").insert(newSequencesToInsert);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId); // Rollback
						throw new Error(`Failed to duplicate sequence_nodes for program ${newProgramId}: ${error.message}`);
					}
				}

				// e. Duplicate Edges
				if (originalEdges.length > 0) {
					const newEdgesToInsert = originalEdges
						.map((edge) => {
							const newSourceId = idMap.get(edge.constraint_id); // Assuming edge.constraint_id is the source
							const newTargetId = idMap.get(edge.sequence_id); // Assuming edge.sequence_id is the target

							// Check if both source and target nodes were successfully mapped
							if (!newSourceId && edge.constraint_id) {
								console.warn(`Skipping edge during duplication: Source node ${edge.constraint_id} not found in idMap for new program ${newProgramId}. Original edge ID: ${edge.id}`);
								return null;
							}
							if (!newTargetId && edge.sequence_id) {
								console.warn(`Skipping edge during duplication: Target node ${edge.sequence_id} not found in idMap for new program ${newProgramId}. Original edge ID: ${edge.id}`);
								return null;
							}
							// If an edge part is legitimately null (e.g. an edge that CAN have a null source or target),
							// then newSourceId/newTargetId would be undefined if original idMap.get(null) if that's how it's stored.
							// This current logic assumes constraint_id and sequence_id are always present on an edge.

							// eslint-disable-next-line @typescript-eslint/no-unused-vars
							const { id: _id, program_id: _program_id, created_at: _created_at, constraint_id: _orig_constraint_id, sequence_id: _orig_sequence_id, ...rest } = edge;
							return {
								...rest,
								id: uuidv4(),
								program_id: newProgramId,
								constraint_id: newSourceId || null, // Ensure it's null if not found, though previous checks should catch this.
								sequence_id: newTargetId || null, // Ensure it's null if not found
							};
						})
						.filter((e) => e !== null) as Omit<SupabaseDBEdge, "created_at" | "project_id">[]; // Adjust type if project_id is not on your direct edge insert type

					if (newEdgesToInsert.length > 0) {
						const { error } = await supabase.from("edges").insert(newEdgesToInsert);
						if (error) {
							await supabase.from("projects").delete().eq("id", newProjectId); // Rollback
							throw new Error(`Failed to duplicate edges for program ${newProgramId}: ${error.message}`);
						}
					}
				}
				console.log(`Successfully duplicated program ${originalProgram.id} to ${newProgramId} for project ${newProjectId}`);
			} else {
				console.log(`No programs found in original project ${originalProjectId}. Duplicated project ${newProjectId} will start with no programs.`);
				// Optionally, create a default initial program here if that's the desired behavior
				// const now = new Date().toISOString();
				// const initialProgramPayload = { /* ... similar to _createProjectInDB ... */ project_id: newProjectId, name: "Main Program" /* ... */};
				// const { data: newProgramData, error: programError } = await supabase.from("programs").insert(initialProgramPayload).select().single();
				// if (programError) { /* handle error, rollback */ }
				// newProgramIdForDuplication = newProgramData.id;
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
			const { project: newProjectJson, initialProgram } = await _createProjectInDB();
			const newProject = mapProjectJsonToProject(newProjectJson);

			setProjects((prevProjects) => sortProjects([newProject, ...prevProjects]));
			setCurrentProject(newProject);

			// After creating a new project and its initial program,
			// ProjectContext will listen to currentProject change and fetch its programs,
			// automatically setting the new initialProgram as the currentProgram.

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
				// _duplicateProjectInDB now returns the newProgramId as well
				const { duplicatedProject: dupProjectJson, newProgramId } = await _duplicateProjectInDB(projectId);
				const duplicatedProject = mapProjectJsonToProject(dupProjectJson);
				setProjects((prevProjects) => sortProjects([duplicatedProject, ...prevProjects]));
				setCurrentProject(duplicatedProject);

				// If a program was duplicated, ProjectContext will handle setting it
				// when it fetches programs for the new duplicatedProject.
				console.log(`Project ${duplicatedProject.id} duplicated successfully. ${newProgramId ? `New program ${newProgramId} created.` : "No program was duplicated."}`);
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
