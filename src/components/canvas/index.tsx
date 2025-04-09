import { Button } from "@/components/ui/button";
import { Code, Folder, ParentChild, PlayFilledAlt } from "@carbon/icons-react";
import { useGlobal } from "@/context/GlobalContext";
import BlockEditor from "@/components/canvas/BlockEditor";
import CodeEditor from "@/components/canvas/CodeEditor";

const Canvas = () => {
	const { mode, setMode, currentProject } = useGlobal();

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
				<Button size="sm" className="z-50 absolute mt-11 top-3 right-3 w-min" onClick={() => setMode(mode === "blocks" ? "code" : "blocks")}>
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
				{mode === "blocks" ? <BlockEditor /> : <CodeEditor />}
			</div>
		</div>
	);
};

export default Canvas;
