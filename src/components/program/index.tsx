import React, { useEffect, useState, useRef } from "react";
import { useGlobal } from "@/context/GlobalContext";
import { ProjectProvider } from "@/context/ProjectContext";
import { EditorView } from "@codemirror/view";
import { Code, Folder, ParentChild, ChevronDown, ChevronUp } from "@carbon/icons-react";
import { Dna } from "lucide-react";
import { Button } from "@/components/ui/button";
import EnergyDialog from "@/components/energy/EnergyDialog";
import BlockEditor from "@/components/program/BlockEditor";
import CodeEditor from "@/components/program/CodeEditor";
import ProjectTabs from "@/components/program/ProjectTabs";
import Sequence from "@/components/program/Sequence";

const mockSequence = {
	id: "1",
	sequence:
		"ATTGGATGTGAATAAAGCGTATAGGTTTACCTCAAACTGCGCGGCTGTGTTATAATTTGCGACCTTTGAATCCGGGATACAGTAGAGGGATAGCGGTTAGATGAGCGACCTTGCGAGAGAAATTACACCGGTCAACATTGAGGAAGAGCTGAAGAGCTCCTATCTGGATTATGCGATGTCGGTCATTGTTGGCCGTGCGCTGCCAGATGTCCGAGATGGCCTGAAGCCGGTACACCGTCGCGTACTTTACGCCATGAACGTACTAGGCAATGACTGGAACAAAGCCTATAAAAAATCTGCCCGTGTCGTTGGTGACGTAATCGGTAAATACCATCCCCATGGTGACTCGGCGGTCTATGACACGATCGTCCGCATGGCGCAGCCATTCTCGCTGCGTTATATGCTGGTAGACGGTCAGGGTAACTTCGGTTCTATCGACGGCGACTCTGCGGCGGCAATGCGTTATACGGAAATCCGTCTGGCGAAAATTGCCCATGAAC",
};

const Program = () => {
	const { mode, setMode, currentProject } = useGlobal();
	const [showBlockEditor, setShowBlockEditor] = useState(mode === "blocks");
	const [showCodeEditor, setShowCodeEditor] = useState(mode === "code");
	const [transitioning, setTransitioning] = useState(false);
	const [showSequence, setShowSequence] = useState(false);
	const editorRef = useRef<EditorView | null>(null);

	// handle mode switch animation
	useEffect(() => {
		if (mode === "blocks" && !showBlockEditor) {
			setTransitioning(true);
			setShowCodeEditor(false);

			setTimeout(() => {
				setShowBlockEditor(true);
				setTransitioning(false);
			}, 300);
		} else if (mode === "code" && !showCodeEditor) {
			setTransitioning(true);
			setShowBlockEditor(false);

			setTimeout(() => {
				setShowCodeEditor(true);
				setTransitioning(false);
				// Force editor refresh after animation
				setTimeout(() => {
					if (editorRef.current) {
						editorRef.current.requestMeasure();
					}
				}, 50);
			}, 300);
		}
	}, [mode, showBlockEditor, showCodeEditor]);

	return (
		<div className="relative vertical h-full w-full border border-slate-300 bg-white/80 rounded-sm overflow-hidden">
			<div className="z-50 absolute top-0 left-0 w-full bg-white/50 backdrop-blur">
				<div className="relative horizontal w-full gap-2 border-b border-slate-300 px-5 py-3 text-slate-400 text-sm justify-between">
					<div className="horizontal items-center gap-2">
						<Folder size={20} />
						<div>/</div>
						<div className="text-slate-500 font-medium">{currentProject?.name || "No project selected"}</div>
					</div>
					<ProjectTabs />
				</div>
			</div>

			<div className="relative vertical h-full w-full">
				<div className="relative h-full w-full overflow-hidden">
					<Button size="sm" className="z-50 absolute mt-12 top-3 right-3 w-min" onClick={() => setMode(mode === "blocks" ? "code" : "blocks")} disabled={transitioning}>
						{mode === "blocks" ? (
							<div className="horizontal items-center gap-2">
								<Code />
								Show code
							</div>
						) : (
							<div className="horizontal items-center gap-2">
								<ParentChild /> Show blocks
							</div>
						)}
					</Button>
					<div className="z-50 absolute mt-12 bottom-3 right-3 ">
						<EnergyDialog />
					</div>

					<ProjectProvider>
						<div className="relative h-full w-full">
							{/* Block Editor with animation */}
							<div
								className={`absolute inset-0 h-full w-full transition-all duration-300 ease-in-out origin-top-left
								${
									showBlockEditor
										? "scale-100 opacity-100 [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
										: "scale-0 opacity-0 pointer-events-none [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
								}`}
							>
								<BlockEditor />
							</div>

							{/* Code Editor with animation */}
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
					</ProjectProvider>
				</div>
				{/* Sequence viewer */}
				<div className={`relative vertical border-t border-slate-300 py-3 ${showSequence ? "h-36" : "h-min cursor-pointer"}`} onClick={() => !showSequence && setShowSequence(!showSequence)}>
					{showSequence ? (
						<Sequence sequence={mockSequence} showSequence={showSequence} setShowSequence={setShowSequence} />
					) : (
						<div className="horizontal items-center justify-between text-slate-400 text-sm px-5">
							<div className="flex horizontal items-center gap-1.5">
								<Dna className="size-5" strokeWidth={1.3} />
								<div className="text-slate-500 font-medium">Sequence</div>
							</div>
							{showSequence ? (
								<ChevronDown size={20} className="hover:text-slate-700 cursor-pointer" onClick={() => setShowSequence(!showSequence)} />
							) : (
								<ChevronUp size={20} className="hover:text-slate-700 cursor-pointer" onClick={() => setShowSequence(!showSequence)} />
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Program;
