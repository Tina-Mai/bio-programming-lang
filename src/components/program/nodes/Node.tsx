import { Handle, Position } from "@xyflow/react";
import { useProgram } from "@/context/ProgramContext";
import { SettingsAdjust, Term, Warning } from "@carbon/icons-react";
import NodeDropdown from "./NodeDropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const Node = ({ children, selected, type, handlePosition, id }: { children: React.ReactNode; selected: boolean; type: "constraint" | "sequence"; handlePosition?: "top" | "bottom"; id: string }) => {
	const { validationErrors } = useProgram();
	const isNodeInvalid = validationErrors ? validationErrors.some((err) => err.nodeId === id) : false;

	const WarningTooltip = () => {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Warning className="text-rose-600/75 cursor-pointer" />
				</TooltipTrigger>
				<TooltipContent>
					<div className="text-rose-600/75">{validationErrors?.find((err) => err.nodeId === id)?.message}</div>
				</TooltipContent>
			</Tooltip>
		);
	};
	return (
		<div
			className={`${type === "constraint" ? "bg-system-yellow/30" : type === "sequence" ? "bg-system-blue/30" : "bg-system-slate/30"} w-52 ${
				isNodeInvalid ? (selected ? "border-[2.5px] border-rose-600/65" : "border-2 border-rose-600/40") : selected ? "border-2 border-blue-900/30" : " border border-slate-300"
			} rounded-md text-xs backdrop-blur-sm relative`}
		>
			<div
				className={`horizontal justify-between ${
					type === "constraint" ? "bg-system-yellow/70" : type === "sequence" ? "bg-system-blue/70" : "bg-system-slate/70"
				} text-slate-500 px-3 py-2 items-center border-b border-slate-300 rounded-t-md`}
			>
				<div className="horizontal gap-2 items-center">
					<div className="horizontal items-center gap-2 font-mono capitalize">
						{type === "constraint" ? <SettingsAdjust className="text-zinc-500/75" /> : type === "sequence" ? <Term className="text-zinc-500/75" /> : null}
						{type}
					</div>
					{isNodeInvalid && <WarningTooltip />}
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
