import React, { useEffect, useState, useRef } from "react";
import { useGlobal } from "@/context/GlobalContext";
// import { useProject, useProgram } from "@/context/ProjectContext";
import { EditorView } from "@codemirror/view";
import { Code, Folder, ParentChild, Information } from "@carbon/icons-react";
import { Button } from "@/components/ui/button";
import CompileButton from "@/components/energy/CompileButton";
import VisualEditor from "@/components/program/VisualEditor";
import CodeEditor from "@/components/program/CodeEditor";

const ProgramContents = () => {
	const { mode, setMode, currentProject: globalCurrentProject } = useGlobal();
	// const { currentProgram: programFromProject } = useProject();
	// const { currentProgramGraphData } = useProgram();
	const [showGraphEditor, setShowGraphEditor] = useState(mode === "graph");
	const [showCodeEditor, setShowCodeEditor] = useState(mode === "code");
	const [transitioning, setTransitioning] = useState(false);
	const editorRef = useRef<EditorView | null>(null);

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
				<div className="relative horizontal w-full gap-2 border-b border-slate-300 pl-5 pr-2.5 py-2.5 text-slate-400 text-sm justify-between">
					<div className="horizontal items-center gap-2">
						<Folder size={20} />
						<div>/</div>
						<div className="text-slate-500 font-medium">{globalCurrentProject!.name}</div>
					</div>
					<CompileButton />
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

					<div className="relative h-full w-full">
						<div
							className={`absolute inset-0 h-full w-full transition-all duration-300 ease-in-out origin-top-left
							${
								showGraphEditor
									? "scale-100 opacity-100 [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
									: "scale-0 opacity-0 pointer-events-none [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
							}`}
						>
							{/* <GraphEditor /> */}
							<VisualEditor />
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
