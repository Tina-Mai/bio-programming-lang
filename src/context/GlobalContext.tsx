"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Project } from "@/types";
import mockProjects from "@/data/mock/mockProjects.json";
import { convertJSONArrayToProjects, ProjectJSON } from "@/types";

type Mode = "blocks" | "code";

interface GlobalContextType {
	mode: Mode;
	setMode: (mode: Mode) => void;
	currentProject: Project | null;
	setCurrentProject: (project: Project | null) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
	const [mode, setMode] = useState<Mode>("blocks");
	const [currentProject, setCurrentProject] = useState<Project | null>(() => {
		const projects = convertJSONArrayToProjects(mockProjects as ProjectJSON[]);
		return projects[0] || null;
	});

	return (
		<GlobalContext.Provider
			value={{
				mode,
				setMode,
				currentProject,
				setCurrentProject,
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
