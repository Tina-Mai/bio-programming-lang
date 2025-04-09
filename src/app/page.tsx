"use client";
import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Folder, Settings, AddLarge } from "@carbon/icons-react";
import mockProjects from "@/data/mock/mockProjects.json";
import Canvas from "@/components/canvas";
import { Project, ProjectJSON, convertJSONArrayToProjects } from "@/types";
import { useGlobal } from "@/context/GlobalContext";

const projects: Project[] = convertJSONArrayToProjects(mockProjects as ProjectJSON[]);

export default function Home() {
	const { currentProject, setCurrentProject } = useGlobal();
	return (
		<div className="horizontal h-[calc(100vh)] items-start p-5 gap-5 overflow-hidden">
			<div className="vertical gap-5 items-start max-w-52">
				<Image src="/logo.svg" alt="Logo" width={50} height={50} className="mb-5" />
				<Button variant="outline" size="sm" className="w-full text-slate-600">
					<AddLarge size={20} />
					New design
				</Button>
				<div className="vertical">
					<div className="horizontal items-center gap-2 mb-3 text-slate-500">
						<Folder size={20} />
						<div className="font-medium">Designs</div>
					</div>

					{projects.map((project) => (
						<div
							key={project.name}
							className={`horizontal items-center text-sm rounded px-2.5 py-1.5 transition-all duration-300 gap-2 cursor-pointer ${
								currentProject?.name === project.name ? "bg-slate-300/60 text-foreground" : "hover:bg-slate-200/80 text-slate-700"
							}`}
							onClick={() => setCurrentProject(project)}
						>
							{project.name}
						</div>
					))}
				</div>
				<div className="horizontal items-center gap-2 mb-3 text-slate-500">
					<Settings size={20} />
					<div className="font-medium">Settings</div>
				</div>
			</div>
			<Canvas />
		</div>
	);
}
