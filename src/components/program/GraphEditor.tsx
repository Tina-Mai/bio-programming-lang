import React, { useEffect, useState } from "react";
import { ReactFlow, Background, MiniMap, ReactFlowProvider, Panel, useReactFlow } from "@xyflow/react";
import { useProject } from "@/context/ProjectContext";
import { useProgram } from "@/context/ProgramContext";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Grid, Term, SettingsAdjust } from "@carbon/icons-react";
import ConstraintNode from "./nodes/constraints/ConstraintNode";
import SequenceNode from "./nodes/sequences/SequenceNode";
import Edge from "./edges/Edge";
import { useGlobal } from "@/context/GlobalContext";

const nodeTypes = {
	constraint: ConstraintNode,
	sequence: SequenceNode,
};

const edgeTypes = {
	default: Edge,
};

const GraphEditor = () => {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect, applyLayout, isGraphLoading, addConstraintNode, addSequenceNode } = useProgram();
	const { currentProject } = useGlobal();
	const { fitView } = useReactFlow();
	const [isInitialLayoutDone, setIsInitialLayoutDone] = useState(false);
	const { currentProgram } = useProject();

	useEffect(() => {
		setIsInitialLayoutDone(false);
		console.log(`Program or Project changed (Program: ${currentProgram?.id}, Project: ${currentProject?.id}), resetting initial layout flag.`);
	}, [currentProgram?.id, currentProject?.id]);

	useEffect(() => {
		if (!isGraphLoading && nodes.length > 0 && !isInitialLayoutDone) {
			const timer = setTimeout(() => {
				applyLayout();
				requestAnimationFrame(() => fitView({ padding: 0.2 }));
				setIsInitialLayoutDone(true);
				console.log(`Initial layout applied for program ${currentProgram?.id} in project ${currentProject?.id}`);
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [isGraphLoading, nodes, applyLayout, fitView, isInitialLayoutDone, currentProgram?.id, currentProject?.id]);

	const handleAutoLayout = () => {
		applyLayout();
		requestAnimationFrame(() => fitView({ padding: 0.2 }));
	};

	return (
		<div style={{ height: "100%", width: "100%" }}>
			<ReactFlow
				className="bg-slate-50"
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				fitViewOptions={{ padding: 0.4 }}
				proOptions={{ hideAttribution: true }}
			>
				<Background color="oklch(70.4% 0.04 256.788 / 0.6)" gap={20} size={2} style={{ opacity: 1 }} />
				<MiniMap
					nodeColor={"oklch(70.4% 0.04 256.788 / 0.15)"}
					nodeStrokeWidth={3}
					zoomable
					pannable
					position="bottom-left"
					style={{ width: 125, height: 100 }}
					nodeBorderRadius={2}
					maskColor="oklch(86.9% 0.022 252.894 / 0.5)"
				/>
				<Panel position="bottom-left" style={{ marginBottom: "125px" }}>
					<Button onClick={handleAutoLayout} variant="outline" size="sm" className="group text-xs !px-1.5 h-6 bg-white !text-slate-500 hover:!text-slate-600 font-medium">
						<Grid className="text-slate-400" />
						Auto Layout
					</Button>
				</Panel>
				<Panel position="top-left" style={{ marginTop: "60px" }} className="vertical items-center gap-2">
					<Button
						onClick={addConstraintNode}
						variant="outline"
						size="sm"
						className="group text-xs bg-system-yellow/50 hover:bg-system-yellow/70 backdrop-blur-sm !text-slate-500 hover:!text-slate-600 gap-2 rounded-sm"
					>
						<SettingsAdjust className="text-slate-400 group-hover:text-slate-500 transition-all duration-200" />
						New Constraint
					</Button>
					<Button
						onClick={addSequenceNode}
						variant="outline"
						size="sm"
						className="group text-xs bg-system-blue/50 hover:bg-system-blue/70 backdrop-blur-sm !text-slate-500 hover:!text-slate-600 gap-2 rounded-sm"
					>
						<Term className="text-slate-400 group-hover:text-slate-500 transition-all duration-200" />
						New Sequence
					</Button>
				</Panel>
			</ReactFlow>
		</div>
	);
};

const GraphEditorWrapper = () => (
	<ReactFlowProvider>
		<GraphEditor />
	</ReactFlowProvider>
);

export default GraphEditorWrapper;
