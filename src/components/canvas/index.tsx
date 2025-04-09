import { Button } from "@/components/ui/button";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { tokyoNightDay } from "@uiw/codemirror-theme-tokyo-night-day";
import { Code, Folder, ParentChild } from "@carbon/icons-react";
import DotBackground from "@/components/global/DotBackground";
import { useGlobal } from "@/context/GlobalContext";

const Canvas = () => {
	const { mode, setMode, currentProject, setCurrentProject } = useGlobal();

	return (
		<div className="relative vertical h-full w-full border border-slate-300 bg-white/80 rounded-sm overflow-hidden">
			<div className="z-50 absolute top-0 left-0 w-full bg-white/50 backdrop-blur">
				<div className="relative horizontal w-full gap-2 border-b border-slate-300 px-5 py-3 text-slate-400 text-sm">
					<Folder size={20} />
					<div>/</div>
					<div className="text-slate-500 font-medium">{currentProject?.name || "No project selected"}</div>
				</div>
			</div>

			<div className="relative h-full w-full pt-11">
				<Button className="z-50 absolute mt-11 top-3 right-3 w-min" onClick={() => setMode(mode === "blocks" ? "code" : "blocks")}>
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
					<div className="flex h-full w-full overflow-y-auto -z-100">
						<CodeMirror
							extensions={[python()]}
							value={currentProject?.code || ""}
							onChange={(value) => {
								setCurrentProject({ ...currentProject, code: value });
							}}
							height="100%"
							width="100%"
							className="h-full w-full"
							theme={tokyoNightDay}
							style={{
								backgroundColor: "transparent",
							}}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default Canvas;
