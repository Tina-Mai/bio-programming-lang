import { NodeProps, Handle, Position } from "@xyflow/react";
import { Add } from "@carbon/icons-react";
import { Button } from "@/components/ui/button";

export const defaultNodeOptions = {
	style: {
		width: 60,
		height: 60,
		backgroundColor: "white",
		borderRadius: "50%",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		fontWeight: 600,
		fontSize: 20,
		border: "1px solid #ddd",
		zIndex: 1000,
		transition: "all 0.2s ease",
	},
};

export const StandardNode = ({ data }: NodeProps) => {
	const nodeData = data as { label: string };
	return (
		<>
			<Handle type="target" position={Position.Top} />
			<div
				style={{
					...defaultNodeOptions.style,
					border: "1px solid #64748b",
				}}
			>
				{nodeData.label}
			</div>
			<Handle type="source" position={Position.Bottom} />
			<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
				<Button size="icon" className="!px-0 !py-0 !size-4 !rounded-xs bg-slate-600" onClick={(e) => e.stopPropagation()}>
					<Add size={4} />
				</Button>
			</div>
		</>
	);
};
