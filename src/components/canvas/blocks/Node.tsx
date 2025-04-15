import { NodeProps, Handle, Position } from "@xyflow/react";
import { Add } from "@carbon/icons-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/ProjectContext";

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

export const StandardNode = ({ data, id }: NodeProps) => {
	const nodeData = data as { label: string };
	const nodeWidth = 60;
	const nodeHeight = 60;
	const { addChildNode } = useProject();

	return (
		<>
			<Handle type="target" position={Position.Top} />
			<div
				style={{
					width: nodeWidth,
					height: nodeHeight,
					backgroundColor: "white",
					borderRadius: "50%",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					fontWeight: 600,
					fontSize: 20,
					border: "1px solid #64748b",
					zIndex: 1000,
					transition: "all 0.2s ease",
				}}
			>
				{nodeData.label}
			</div>
			<Handle type="source" position={Position.Bottom} />
			<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
				<Button
					size="icon"
					className="!px-0 !py-0 !size-4 !rounded-xs bg-slate-600 hover:bg-slate-500"
					onClick={(e) => {
						e.stopPropagation();
						addChildNode(id);
					}}
				>
					<Add size={4} />
				</Button>
			</div>
		</>
	);
};
