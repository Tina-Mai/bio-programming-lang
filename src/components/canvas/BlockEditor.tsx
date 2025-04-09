import { ReactFlow, Controls, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const edges = [{ id: "1-2", source: "1", target: "2" }];

const nodes = [
	{
		id: "1",
		data: { label: "Hello" },
		position: { x: 0, y: 0 },
		type: "input",
	},
	{
		id: "2",
		data: { label: "World" },
		position: { x: 100, y: 100 },
	},
];

const BlockEditor = () => {
	return (
		<div style={{ height: "100%" }}>
			<ReactFlow nodes={nodes} edges={edges}>
				<Background color="#cbd5e1" gap={15} size={1.75} style={{ opacity: 1 }} />
				<Controls />
			</ReactFlow>
		</div>
	);
};

export default BlockEditor;
