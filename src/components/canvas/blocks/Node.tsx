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
		boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
		transition: "all 0.2s ease",
		"&:hover": {
			boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
			transform: "scale(1.02)",
		},
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
					border: selected ? "2px solid #1a192b" : "1px solid #ddd",
				}}
			>
				{nodeData.label}
			</div>
			<Handle type="source" position={Position.Bottom} />
		</>
	);
};
