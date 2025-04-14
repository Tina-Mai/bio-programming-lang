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
	// Restore original circular dimensions
	const nodeWidth = 60;
	const nodeHeight = 60;

	return (
		<>
			<Handle type="target" position={Position.Top} />
			<div
				style={{
					// Apply explicit dimensions matching ELK config
					width: nodeWidth,
					height: nodeHeight,
					// Styling from defaultNodeOptions (adjust as needed)
					backgroundColor: "white",
					borderRadius: "50%", // Ensure circle
					display: "flex", // Use flexbox for centering
					justifyContent: "center", // Center horizontally
					alignItems: "center", // Center vertically
					fontWeight: 600,
					fontSize: 20,
					border: "1px solid #64748b", // Use the border from the original example
					zIndex: 1000,
					transition: "all 0.2s ease",
				}}
			>
				{nodeData.label}
			</div>
			<Handle type="source" position={Position.Bottom} />
			<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
				<Button size="icon" className="!px-0 !py-0 !size-4 !rounded-xs bg-slate-600 hover:bg-slate-500" onClick={(e) => e.stopPropagation()}>
					<Add size={4} />
				</Button>
			</div>
		</>
	);
};
