import React, { useEffect, useState, useRef } from "react";
import { useGlobal } from "@/context/GlobalContext";
import { EditorView } from "@codemirror/view";
import { Code, Folder, ParentChild, Information } from "@carbon/icons-react";
import { Dna, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompileButton from "@/components/energy/CompileButton";
import VisualEditor from "@/components/program/VisualEditor";
import CodeEditor from "@/components/program/CodeEditor";
import ProjectTabs from "@/components/program/ProjectTabs";
import SequenceViewer from "@/components/program/sequence/SequenceViewer";

const ProgramContents = () => {
	const { mode, setMode, currentProject: globalCurrentProject, projectOutputs } = useGlobal();
	const [showVisualEditor, setShowVisualEditor] = useState(mode === "visual");
	const [showCodeEditor, setShowCodeEditor] = useState(mode === "code");
	const [transitioning, setTransitioning] = useState(false);
	const [showSequence, setShowSequence] = useState(false);
	const editorRef = useRef<EditorView | null>(null);

	useEffect(() => {
		if (mode === "visual" && !showVisualEditor) {
			setTransitioning(true);
			setShowCodeEditor(false);
			setTimeout(() => {
				setShowVisualEditor(true);
				setTransitioning(false);
			}, 300);
		} else if (mode === "code" && !showCodeEditor) {
			setTransitioning(true);
			setShowVisualEditor(false);
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
	}, [mode, showVisualEditor, showCodeEditor]);

	const outputSequence = globalCurrentProject ? projectOutputs[globalCurrentProject.id] : null;

	return (
		<div className="relative vertical h-full w-full border border-slate-300 bg-white/80 rounded-sm overflow-hidden">
			<div className="z-50 absolute top-0 left-0 w-full bg-white/50 backdrop-blur">
				<div className="relative horizontal w-full gap-2 border-b border-slate-300 pl-5 pr-2.5 py-2.5 text-slate-400 text-sm justify-between">
					<div className="horizontal items-center gap-2">
						<Folder size={20} />
						<div>/</div>
						<div className="text-slate-500 font-medium">{globalCurrentProject!.name}</div>
					</div>
					<div className="horizontal items-center gap-5">
						<ProjectTabs />
						<CompileButton />
					</div>
				</div>
			</div>

			<div className="relative vertical h-full w-full">
				<div className="relative h-full w-full overflow-hidden">
					<Button size="sm" className="hidden z-50 absolute mt-12 top-3 right-3 w-min" onClick={() => setMode(mode === "visual" ? "code" : "visual")} disabled={transitioning}>
						{mode === "visual" ? (
							<div className="horizontal items-center gap-2">
								<Code />
								Show code
							</div>
						) : (
							<div className="horizontal items-center gap-2">
								<ParentChild /> Show visual
							</div>
						)}
					</Button>

					<div className="relative h-full w-full">
						<div
							className={`absolute inset-0 h-full w-full transition-all duration-300 ease-in-out origin-top-left
							${
								showVisualEditor
									? "scale-100 opacity-100 [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
									: "scale-0 opacity-0 pointer-events-none [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
							}`}
						>
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
				{outputSequence && (
					<div className={`relative vertical border-t border-slate-300 py-3 ${showSequence ? "h-36" : "h-min"} cursor-pointer`} onClick={() => setShowSequence(!showSequence)}>
						{showSequence ? (
							<SequenceViewer sequence={outputSequence} showSequence={showSequence} setShowSequence={setShowSequence} />
						) : (
							<div className="horizontal items-center justify-between text-slate-400 text-sm px-5">
								<div className="flex horizontal items-center gap-1.5">
									<Dna className="size-5" strokeWidth={1.3} />
									<div className="text-slate-500 font-medium">Sequence Output</div>
									<span className="relative flex size-2.5 items-center justify-center mx-0.5">
										<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
										<span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
									</span>
									{!showSequence && <span className="text-xs text-slate-400">(Click to expand)</span>}
								</div>
								{showSequence ? (
									<ChevronDown
										size={20}
										className="hover:text-slate-700 cursor-pointer"
										onClick={(e: React.MouseEvent) => {
											e.stopPropagation();
											setShowSequence(!showSequence);
										}}
									/>
								) : (
									<ChevronUp
										size={20}
										className="hover:text-slate-700 cursor-pointer"
										onClick={(e: React.MouseEvent) => {
											e.stopPropagation();
											setShowSequence(!showSequence);
										}}
									/>
								)}
							</div>
						)}
					</div>
				)}
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
