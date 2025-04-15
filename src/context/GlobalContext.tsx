"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Project, ProjectJSON } from "@/types";

type Mode = "blocks" | "code";

interface GlobalContextType {
	mode: Mode;
	setMode: (mode: Mode) => void;
	projects: Project[];
	currentProject: Project | null;
	setCurrentProject: (project: Project | null) => void;
	fetchProjects: () => Promise<void>;
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

				setProjects(fetchedProjects);
				if (fetchedProjects.length > 0 && !currentProject) {
					setCurrentProject(fetchedProjects[0]);
				} else if (fetchedProjects.length === 0) {
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
