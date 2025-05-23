import React, { useEffect, useState, useRef } from "react";
import { useGlobal } from "@/context/GlobalContext";
import { useProject, useProgram } from "@/context/ProjectContext";
import { EditorView } from "@codemirror/view";
import { Code, Folder, ParentChild, ChevronDown, ChevronUp, Information } from "@carbon/icons-react";
import { Dna } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompileButton from "@/components/energy/CompileButton";
import GraphEditor from "@/components/program/GraphEditor";
import CodeEditor from "@/components/program/CodeEditor";
import ProjectTabs from "@/components/program/ProjectTabs";
import SequenceViewer from "@/components/program/SequenceViewer";

const ProgramContents = () => {
	const { mode, setMode, currentProject: globalCurrentProject } = useGlobal();
	const { currentProgram: programFromProject } = useProject();
	const { currentProgramGraphData } = useProgram();

	const [showGraphEditor, setShowGraphEditor] = useState(mode === "graph");
	const [showCodeEditor, setShowCodeEditor] = useState(mode === "code");
	const [transitioning, setTransitioning] = useState(false);
	const [showSequence, setShowSequence] = useState(true);
	const editorRef = useRef<EditorView | null>(null);

	let programForDisplay = programFromProject;
	const programFromGraphContext = currentProgramGraphData?.program;

	if (programFromGraphContext && programFromProject && programFromGraphContext.id === programFromProject.id) {
		programForDisplay = programFromGraphContext;
	} else if (programFromGraphContext && !programFromProject) {
		programForDisplay = programFromGraphContext;
	}

	useEffect(() => {
		if (mode === "graph" && !showGraphEditor) {
			setTransitioning(true);
			setShowCodeEditor(false);
			setTimeout(() => {
				setShowGraphEditor(true);
				setTransitioning(false);
			}, 300);
		} else if (mode === "code" && !showCodeEditor) {
			setTransitioning(true);
			setShowGraphEditor(false);
			setTimeout(() => {
				setShowCodeEditor(true);
				setTransitioning(false);
				setTimeout(() => {
					if (editorRef.current) {
						editorRef.current.requestMeasure();
					}
				}, 50);
			}, 300);
		}
	}, [mode, showGraphEditor, showCodeEditor]);

	return (
		<div className="relative vertical h-full w-full border border-slate-300 bg-white/80 rounded-sm overflow-hidden">
			<div className="z-50 absolute top-0 left-0 w-full bg-white/50 backdrop-blur">
				<div className="relative horizontal w-full gap-2 border-b border-slate-300 px-5 py-3 text-slate-400 text-sm justify-between">
					<div className="horizontal items-center gap-2">
						<Folder size={20} />
						<div>/</div>
						<div className="text-slate-500 font-medium">{globalCurrentProject!.name}</div>
					</div>
					<ProjectTabs />
				</div>
			</div>

			<div className="relative vertical h-full w-full">
				<div className="relative h-full w-full overflow-hidden">
					<Button size="sm" className="hidden z-50 absolute mt-12 top-3 right-3 w-min" onClick={() => setMode(mode === "graph" ? "code" : "graph")} disabled={transitioning}>
						{mode === "graph" ? (
							<div className="horizontal items-center gap-2">
								<Code />
								Show code
							</div>
						) : (
							<div className="horizontal items-center gap-2">
								<ParentChild /> Show graph
							</div>
						)}
					</Button>
					<div className="z-50 absolute mt-12 bottom-3 right-3 ">
						<CompileButton />
					</div>

					<div className="relative h-full w-full">
						<div
							className={`absolute inset-0 h-full w-full transition-all duration-300 ease-in-out origin-top-left
							${
								showGraphEditor
									? "scale-100 opacity-100 [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
									: "scale-0 opacity-0 pointer-events-none [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
							}`}
						>
							<GraphEditor />
						</div>

						<div
							className={`absolute overflow-y-auto inset-0 mt-12 pb-12 h-full w-full transition-all duration-300 ease-in-out origin-top-left
							${
								showCodeEditor
									? "scale-100 opacity-100 [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
									: "scale-0 opacity-0 pointer-events-none [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
							}`}
						>
							<CodeEditor editorRef={editorRef} />
						</div>
					</div>
				</div>

				{programForDisplay?.output &&
					typeof programForDisplay.output === "object" &&
					(() => {
						const outputData = programForDisplay.output;
						const hasSequence = !!outputData.metadata?.sequence;

						return (
							<div
								className={`relative vertical border-t border-slate-300 py-3 ${showSequence && hasSequence ? "h-36" : "h-min"} ${hasSequence ? "cursor-pointer" : "cursor-default"}`}
								onClick={() => {
									if (hasSequence) {
										setShowSequence(!showSequence);
									}
								}}
							>
								{showSequence && hasSequence ? (
									<SequenceViewer output={outputData.metadata} showSequence={showSequence} setShowSequence={setShowSequence} />
								) : (
									<div className="horizontal items-center justify-between text-slate-400 text-sm px-5">
										<div className="flex horizontal items-center gap-1.5">
											<Dna className="size-5" strokeWidth={1.3} />
											<div className="text-slate-500 font-medium">Sequence Output</div>
											{!showSequence && <span className="text-xs text-slate-400">{hasSequence ? "(Click to expand)" : "(No sequence data in output)"}</span>}
										</div>
										{hasSequence &&
											(showSequence ? (
												<ChevronDown
													size={20}
													className="hover:text-slate-700 cursor-pointer"
													onClick={(e) => {
														e.stopPropagation();
														setShowSequence(!showSequence);
													}}
												/>
											) : (
												<ChevronUp
													size={20}
													className="hover:text-slate-700 cursor-pointer"
													onClick={(e) => {
														e.stopPropagation();
														setShowSequence(!showSequence);
													}}
												/>
											))}
									</div>
								)}
							</div>
						);
					})()}
			</div>
		</div>
	);
};

const Program = () => {
	const { currentProject: globalCurrentProject } = useGlobal();

	if (!globalCurrentProject) {
		return (
			<div className="relative vertical h-full w-full border border-slate-300 bg-white/80 rounded-sm overflow-hidden flex items-center justify-center p-10 text-center">
				<div className="vertical items-center gap-3 text-slate-400">
					<Information size={32} />
					<p className="text-lg font-medium">No Project Selected</p>
					<p>Please select a project from the sidebar to view its programs, or create a new one.</p>
					{/* TODO: add a loading spinner or skeleton here if projects are actively being fetched */}
				</div>
			</div>
		);
	}

	return <ProgramContents />;
};

export default Program;
