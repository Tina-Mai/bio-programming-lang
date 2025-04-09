import { NodeProps, Handle, Position } from "@xyflow/react";

export const defaultNodeOptions = {
	style: {
		width: 60,
		height: 60,
		backgroundColor: "white",
		borderRadius: "50%",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		fontWeight: "bold",
		fontSize: 20,
		border: "1px solid #ddd",
		zIndex: 1000,
		transition: "all 0.2s ease",
	},
};

export const StandardNode = ({ data, selected }: NodeProps) => {
	const nodeData = data as { label: string };
	return (
		<>
			<Handle type="target" position={Position.Top} />
			<div
				style={{
					...defaultNodeOptions.style,
					border: selected ? "1.5px solid #334155" : "1px solid #64748b",
				}}
			>
				{nodeData.label}
			</div>
			<Handle type="source" position={Position.Bottom} />
		</>
	);
};
