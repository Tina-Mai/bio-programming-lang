import { Button } from "@/components/ui/button";
import { Code, Folder, ParentChild, PlayFilledAlt } from "@carbon/icons-react";
import { useGlobal } from "@/context/GlobalContext";
import BlockEditor from "@/components/canvas/BlockEditor";
import CodeEditor from "@/components/canvas/CodeEditor";
import { useEffect, useState } from "react";

const Canvas = () => {
	const { mode, setMode, currentProject } = useGlobal();
	const [showBlockEditor, setShowBlockEditor] = useState(mode === "blocks");
	const [showCodeEditor, setShowCodeEditor] = useState(mode === "code");
	const [transitioning, setTransitioning] = useState(false);

	// Handle mode switch animation
	useEffect(() => {
		if (mode === "blocks" && !showBlockEditor) {
			// Switch to blocks from code
			setTransitioning(true);

			// First fade out the code editor
			setShowCodeEditor(false);

			// After a delay, show the block editor
			setTimeout(() => {
				setShowBlockEditor(true);
				setTransitioning(false);
			}, 300);
		} else if (mode === "code" && !showCodeEditor) {
			// Switch to code from blocks
			setTransitioning(true);

			// First fade out the block editor
			setShowBlockEditor(false);

			// After a delay, show the code editor
			setTimeout(() => {
				setShowCodeEditor(true);
				setTransitioning(false);
			}, 300);
		}
	}, [mode, showBlockEditor, showCodeEditor]);

	// Debug to check if currentProject contains nodes and edges
	useEffect(() => {
		console.log("Canvas - Current Project:", currentProject);
		console.log("Canvas - Nodes available:", currentProject?.nodes?.length || 0);
		console.log("Canvas - Edges available:", currentProject?.edges?.length || 0);
	}, [currentProject]);

	return (
		<div className="relative vertical h-full w-full border border-slate-300 bg-white/80 rounded-sm overflow-hidden">
			<div className="z-50 absolute top-0 left-0 w-full bg-white/50 backdrop-blur">
				<div className="relative horizontal w-full gap-2 border-b border-slate-300 px-5 py-3 text-slate-400 text-sm">
					<Folder size={20} />
					<div>/</div>
					<div className="text-slate-500 font-medium">{currentProject?.name || "No project selected"}</div>
				</div>
			</div>

			<div className="relative h-full w-full pt-11 overflow-y-auto">
				<Button size="sm" className="z-50 absolute mt-11 top-3 right-3 w-min" onClick={() => setMode(mode === "blocks" ? "code" : "blocks")} disabled={transitioning}>
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
				<Button variant="accent" className="z-50 absolute mt-11 bottom-3 right-3 w-min">
					<PlayFilledAlt size={20} />
					Compile
				</Button>

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
						<BlockEditor project={currentProject} />
					</div>

					{/* Code Editor with animation */}
					<div
						className={`absolute inset-0 h-full w-full transition-all duration-300 ease-in-out origin-top-left
							${
								showCodeEditor
									? "scale-100 opacity-100 [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
									: "scale-0 opacity-0 pointer-events-none [transition-timing-function:cubic-bezier(0.4,0.0,0.2,1)]"
							}`}
					>
						<CodeEditor />
					</div>
				</div>
			</div>
		</div>
	);
};

export default Canvas;
