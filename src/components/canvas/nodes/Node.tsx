import { Handle, Position } from "@xyflow/react";

const Node = ({
	bgClassName,
	children,
	selected,
	title,
	handlePosition,
	id,
}: {
	bgClassName: string;
	children: React.ReactNode;
	selected: boolean;
	title?: string;
	handlePosition?: "top" | "bottom";
	id?: string; // id is needed for the Handle
}) => {
	return (
		<div
			className={`${bgClassName} w-48 p-3 ${
				selected ? "border-[1.5px] border-blue-700/50 opacity-100" : " border border-slate-300 opacity-90"
			} rounded-md text-xs text-slate-700 text-center backdrop-blur relative`}
		>
			{handlePosition === "top" && id && <Handle type="target" position={Position.Top} id={`${id}-target`} className="!bg-slate-500/80 !size-2.5" />}
			{title && <div className="text-sm font-semibold mb-2 text-slate-800">{title}</div>}
			{children}
			{handlePosition === "bottom" && id && <Handle type="source" position={Position.Bottom} id={`${id}-source`} className="!bg-slate-500/80 !size-2.5" />}
		</div>
	);
};

export default Node;
