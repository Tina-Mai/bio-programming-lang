import { Button } from "@/components/ui/button";
import { Code, Folder, ParentChild } from "@carbon/icons-react";
import DotBackground from "@/components/global/DotBackground";
import { useGlobal } from "@/context/GlobalContext";

const Canvas = () => {
	const { mode, setMode, currentProject } = useGlobal();
	return (
		<div className="relative vertical h-full w-full border border-slate-300 bg-white/80 rounded-sm overflow-hidden">
			<div className="horizontal gap-2 border-b border-slate-300 px-5 py-3 text-slate-400 text-sm">
				<Folder size={20} />
				<div>/</div>
				<div className="text-slate-500 font-medium">{currentProject?.name || "No project selected"}</div>
			</div>
			<div className="relative">
				<Button className="absolute z-100 top-3 right-3 w-min" onClick={() => setMode(mode === "blocks" ? "code" : "blocks")}>
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
				{mode === "blocks" ? (
					<div>
						<DotBackground />
					</div>
				) : (
					<div>
						<div className="vertical p-5">Code!</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Canvas;
