import { Handle, Position } from "@xyflow/react";
import { SettingsAdjust, Term } from "@carbon/icons-react";

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
	id?: string;
	invalid?: boolean;
}) => {
	return (
		<div
			className={`${type === "constraint" ? "bg-system-yellow/50" : type === "sequence" ? "bg-system-blue/50" : "bg-system-slate/50"} w-52 ${
				invalid ? (selected ? "border-2 border-rose-600/50" : "border border-rose-600/50") : selected ? "border-2 border-blue-800/50" : " border border-slate-300"
			} rounded-md text-xs backdrop-blur relative`}
		>
			<div
				className={`horizontal ${
					type === "constraint" ? "bg-system-yellow/75" : type === "sequence" ? "bg-system-blue/75" : "bg-system-slate/75"
				} text-slate-500 px-3 py-2 items-center font-mono border-b border-slate-300 gap-2 rounded-t-md capitalize`}
			>
				{type === "constraint" ? <SettingsAdjust className="text-zinc-500/75" /> : type === "sequence" ? <Term className="text-zinc-500/75" /> : null}
				{type}
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
