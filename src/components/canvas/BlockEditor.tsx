import { ReactFlow, Controls, Background, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const edges = [
	{
		id: "1-2",
		source: "1",
		target: "2",
	},
];

const nodes = [
	{
		id: "1",
		data: { label: "X_1" },
		position: { x: 0, y: 0 },
		type: "input",
	},
	{
		id: "2",
		data: { label: "X_2" },
		position: { x: 100, y: 100 },
	},
];

const defaultEdgeOptions = {
	style: { stroke: "#94a3b8" }, // zinc-400
	type: "bezier",
	animated: false,
};

const BlockEditor = () => {
	return (
		<div style={{ height: "100%" }}>
			<ReactFlow nodes={nodes} edges={edges} defaultEdgeOptions={defaultEdgeOptions} proOptions={{ hideAttribution: true }}>
				<Background color="#cbd5e1" gap={15} size={1.75} style={{ opacity: 1 }} />
				<Controls position="bottom-left" style={{ display: "flex", flexDirection: "row", marginBottom: "125px" }} showZoom={true} showFitView={true} showInteractive={true} />
				<MiniMap
					nodeColor={"#94a3b8"}
					nodeStrokeWidth={3}
					zoomable
					pannable
					position="bottom-left"
					style={{ width: 150, height: 100 }}
					nodeBorderRadius={2}
					maskColor="oklch(92.9% 0.013 255.508 / 0.7)"
				/>
			</ReactFlow>
		</div>
	);
};

export default BlockEditor;
