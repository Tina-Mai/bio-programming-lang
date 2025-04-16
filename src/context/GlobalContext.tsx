"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Project, ProjectJSON, ProgramNode } from "@/types";
import { v4 as uuidv4 } from "uuid";

type Mode = "blocks" | "code";

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
	const [mode, setMode] = useState<Mode>("blocks");
	const [projects, setProjects] = useState<Project[]>([]);
	const [currentProject, setCurrentProject] = useState<Project | null>(null);
	const supabase = createClient();

	const fetchProjects = async () => {
		console.log("Fetching projects from Supabase...");
		try {
			const { data, error: fetchError } = await supabase.from("projects").select<"*", ProjectJSON>("*");
			if (fetchError) {
				throw fetchError;
			}
			if (data) {
				console.log("Fetched projects:", data);
				const fetchedProjects: Project[] = data.map((p: ProjectJSON) => ({
					id: p.id,
					name: p.name,
					createdAt: new Date(p.createdAt),
					updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(p.createdAt),
				}));

				// Sort projects by updatedAt descending
				const sortedProjects = fetchedProjects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

				setProjects(sortedProjects);

				// Set current project based on sorted list
				if (sortedProjects.length > 0) {
					// If no project is currently selected, select the most recent one
					if (!currentProject) {
						setCurrentProject(sortedProjects[0]);
					} else {
						// If a project IS selected, check if it still exists in the fetched list
						const currentProjectStillExists = sortedProjects.some((p) => p.id === currentProject.id);
						if (!currentProjectStillExists) {
							// If the previously current project is gone (e.g., deleted elsewhere), select the most recent one
							setCurrentProject(sortedProjects[0]);
						}
						// Otherwise, keep the current selection
					}
				} else if (sortedProjects.length === 0) {
					setCurrentProject(null);
				}
			} else {
				setProjects([]);
				setCurrentProject(null);
			}
		} catch (err: unknown) {
			console.error("Error fetching projects:", err);
			setProjects([]);
			setCurrentProject(null);
		}
	};

	// create new project
	const createNewProject = async () => {
		console.log("Creating new project...");
		try {
			// create new project in projects table
			const { data: newProjectData, error: projectError } = await supabase.from("projects").insert({ name: "New design" }).select().single();

			if (projectError) throw projectError;
			if (!newProjectData) throw new Error("Failed to create project, no data returned.");

			console.log("New project created:", newProjectData);
			const newProjectId = newProjectData.id;

			// create default program in programs table
			const defaultProgram: ProgramNode = {
				id: uuidv4(),
				children: [],
				constraints: [],
			};

			const { error: programError } = await supabase.from("programs").insert({
				project_id: newProjectId,
				program: defaultProgram,
			});

			if (programError) {
				console.error("Error creating program, attempting to delete project:", programError);
				await supabase.from("projects").delete().eq("id", newProjectId);
				throw programError;
			}

			console.log("Default program created for new project:", newProjectId);

			// 3. refresh projects and set the new one as current
			await fetchProjects();

			// 4. set the new project as current
			const { data: fetchedProjects, error: fetchAfterCreateError } = await supabase.from("projects").select<"*", ProjectJSON>("*");
			if (fetchAfterCreateError) throw fetchAfterCreateError;

			if (fetchedProjects) {
				const newlyCreatedProject = fetchedProjects.find((p) => p.id === newProjectId);
				if (newlyCreatedProject) {
					const projectToSet: Project = {
						id: newlyCreatedProject.id,
						name: newlyCreatedProject.name,
						createdAt: new Date(newlyCreatedProject.createdAt),
						updatedAt: newlyCreatedProject.updatedAt ? new Date(newlyCreatedProject.updatedAt) : new Date(newlyCreatedProject.createdAt),
					};
					setCurrentProject(projectToSet);
					console.log("Set current project to the newly created one:", projectToSet.id);
				} else {
					console.warn("Could not find the newly created project after refetching.");
				}
			} else {
				console.warn("Failed to refetch projects after creation.");
			}
		} catch (err: unknown) {
			console.error("Error creating new project:", err);
		}
	};

	// delete a project (and its program)
	const deleteProject = async (projectId: string) => {
		console.log(`Deleting project: ${projectId}...`);
		try {
			// 1. delete associated program
			const { error: programError } = await supabase.from("programs").delete().eq("project_id", projectId);
			if (programError && programError.code !== "PGRST204") {
				throw new Error(`Failed to delete associated program: ${programError.message}`);
			}
			console.log(`Associated program for project ${projectId} deleted (or did not exist).`);

			// 2. delete project itself
			const { error: projectError } = await supabase.from("projects").delete().eq("id", projectId);

			if (projectError) {
				throw projectError;
			}
			console.log(`Project ${projectId} deleted successfully.`);

			// 3. update local state (already sorted)
			const remainingProjects = projects.filter((p) => p.id !== projectId);
			setProjects(remainingProjects); // Assuming 'projects' was already sorted

			// if deleted project was the current one, switch to another or null
			if (currentProject?.id === projectId) {
				if (remainingProjects.length > 0) {
					setCurrentProject(remainingProjects[0]);
					console.log(`Switched current project to ${remainingProjects[0].id}`);
				} else {
					setCurrentProject(null);
					console.log("No projects left, setting current project to null.");
				}
			}
		} catch (err: unknown) {
			console.error("Error deleting project:", err);
		}
	};

	// duplicate a project (and its program)
	const duplicateProject = async (projectId: string) => {
		console.log(`Duplicating project: ${projectId}...`);
		try {
			// 1. fetch original project details
			const { data: originalProjectData, error: fetchProjectError } = await supabase.from("projects").select("name").eq("id", projectId).single();

			if (fetchProjectError) throw new Error(`Failed to fetch original project details: ${fetchProjectError.message}`);
			if (!originalProjectData) throw new Error("Original project not found.");

			// 2. fetch original program data
			const { data: originalProgramData, error: fetchProgramError } = await supabase.from("programs").select("program").eq("project_id", projectId).maybeSingle(); // Use maybeSingle as program might not exist yet

			if (fetchProgramError) throw new Error(`Failed to fetch original program data: ${fetchProgramError.message}`);

			const originalProgram = originalProgramData?.program || { id: uuidv4(), children: [], constraints: [] }; // Use default if no program exists

			// 3. create new duplicated project
			const newProjectName = `(Copy) ${originalProjectData.name}`;
			const { data: newProjectData, error: createProjectError } = await supabase.from("projects").insert({ name: newProjectName }).select().single();

			if (createProjectError) throw new Error(`Failed to create duplicated project: ${createProjectError.message}`);
			if (!newProjectData) throw new Error("Failed to create duplicated project, no data returned.");

			const newProjectId = newProjectData.id;
			console.log("Duplicated project created:", newProjectData);

			// 4. create new duplicated program
			const { error: createProgramError } = await supabase.from("programs").insert({
				project_id: newProjectId,
				program: originalProgram,
			});

			if (createProgramError) {
				console.error("Error creating duplicated program, attempting to delete duplicated project:", createProgramError);
				await supabase.from("projects").delete().eq("id", newProjectId);
				throw new Error(`Failed to create duplicated program: ${createProgramError.message}`);
			}
			console.log("Duplicated program created for new project:", newProjectId);

			// 5. refresh projects and set the new duplicate as current
			await fetchProjects();

			// find the newly created project in the updated list and set it as current
			const { data: fetchedProjects, error: fetchAfterCreateError } = await supabase.from("projects").select<"*", ProjectJSON>("*");
			if (fetchAfterCreateError) throw fetchAfterCreateError;

			if (fetchedProjects) {
				const newlyCreatedProject = fetchedProjects.find((p) => p.id === newProjectId);
				if (newlyCreatedProject) {
					const projectToSet: Project = {
						id: newlyCreatedProject.id,
						name: newlyCreatedProject.name,
						createdAt: new Date(newlyCreatedProject.createdAt),
						updatedAt: newlyCreatedProject.updatedAt ? new Date(newlyCreatedProject.updatedAt) : new Date(newlyCreatedProject.createdAt),
					};
					setCurrentProject(projectToSet);
					console.log("Set current project to the newly duplicated one:", projectToSet.id);
				} else {
					console.warn("Could not find the newly duplicated project after refetching.");
				}
			} else {
				console.warn("Failed to refetch projects after duplication.");
			}
		} catch (err: unknown) {
			console.error("Error duplicating project:", err);
		}
	};

	// update a project's timestamp locally and re-sort
	const updateProjectTimestamp = (projectId: string, newTimestamp: Date) => {
		setProjects((prevProjects) => {
			const updatedProjects = prevProjects.map((project) => (project.id === projectId ? { ...project, updatedAt: newTimestamp } : project));
			// Re-sort after updating the timestamp
			return updatedProjects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
		});
	};

	useEffect(() => {
		fetchProjects();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
