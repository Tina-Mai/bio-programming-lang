import { ReactFlow, Controls, Background, MiniMap, Node, ConnectionLineType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "@/types";
import { useProject } from "@/context/ProjectContext";

const BlockEditor = () => {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useProject();

	return (
		<div style={{ height: "100%" }}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
				connectionLineType={ConnectionLineType.SmoothStep}
				proOptions={{ hideAttribution: true }}
				fitView
				fitViewOptions={{ padding: 0.15 }}
				nodesDraggable={true}
			>
				<Background color="oklch(70.4% 0.04 256.788 / 0.6)" gap={20} size={2} style={{ opacity: 1 }} />
				<Controls position="bottom-left" style={{ display: "flex", flexDirection: "row", marginBottom: "125px" }} showZoom={true} showFitView={true} showInteractive={true} />
				<MiniMap
					nodeColor={(n: Node) => (n.type === "group" ? "rgba(210, 230, 255, 0.5)" : "oklch(70.4% 0.04 256.788 / 0.15)")}
					nodeStrokeWidth={3}
					zoomable
					pannable
					position="bottom-left"
					style={{ width: 125, height: 100 }}
					nodeBorderRadius={2}
					maskColor="oklch(92.9% 0.013 255.508 / 0.7)"
				/>
			</ReactFlow>
		</div>
	);
};

export default BlockEditor;
