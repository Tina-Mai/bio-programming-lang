import { Handle, Position } from "@xyflow/react";
import { SettingsAdjust, Term } from "@carbon/icons-react";
import NodeDropdown from "./NodeDropdown";

const Node = ({
	children,
	selected,
	type,
	handlePosition,
	id,
	invalid = false,
}: {
	children: React.ReactNode;
	selected: boolean;
	type: "constraint" | "sequence";
	handlePosition?: "top" | "bottom";
	id: string;
	invalid?: boolean;
}) => {
	return (
		<div
			className={`${type === "constraint" ? "bg-system-yellow/30" : type === "sequence" ? "bg-system-blue/30" : "bg-system-slate/30"} w-52 ${
				invalid ? (selected ? "border-2 border-rose-600/50" : "border border-rose-600/50") : selected ? "border-2 border-blue-900/30" : " border border-slate-300"
			} rounded-md text-xs backdrop-blur relative`}
		>
			<div
				className={`horizontal justify-between ${
					type === "constraint" ? "bg-system-yellow/70" : type === "sequence" ? "bg-system-blue/70" : "bg-system-slate/70"
				} text-slate-500 px-3 py-2 items-center border-b border-slate-300 rounded-t-md`}
			>
				<div className="horizontal items-center gap-2 font-mono capitalize">
					{type === "constraint" ? <SettingsAdjust className="text-zinc-500/75" /> : type === "sequence" ? <Term className="text-zinc-500/75" /> : null}
					{type}
				</div>
				<NodeDropdown nodeId={id} />
			</div>
			<div className="vertical text-slate-800">
				{handlePosition === "top" && id && <Handle type="target" position={Position.Top} id={`${id}-target`} className="!bg-slate-500/80 !size-2.5" />}
				{children}
				{handlePosition === "bottom" && id && <Handle type="source" position={Position.Bottom} id={`${id}-source`} className="!bg-slate-500/80 !size-2.5" />}
			</div>
		</div>
	);
};

export default Node;
