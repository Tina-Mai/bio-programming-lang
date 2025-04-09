import { Edge } from "@xyflow/react";

export const initialEdges: Edge[] = [
	// Connection from X₁ to left X₂
	{
		id: "x1-to-x2-left",
		source: "x1",
		target: "x2-left",
		type: "custom",
		style: {
			stroke: "#94a3b8",
			strokeWidth: 2,
			zIndex: 2000,
		},
	},
	// Connection from X₁ to right X₂
	{
		id: "x1-to-x2-right",
		source: "x1",
		target: "x2-right",
		type: "custom",
		style: {
			stroke: "#94a3b8",
			strokeWidth: 2,
			zIndex: 2000,
		},
	},
	// Connections from left X₂ to its A nodes
	{
		id: "x2-left-to-a-left-1",
		source: "x2-left",
		target: "a-left-1",
		type: "custom",
		style: {
			stroke: "#94a3b8",
			strokeWidth: 2,
			zIndex: 2000,
		},
	},
	{
		id: "x2-left-to-a-left-2",
		source: "x2-left",
		target: "a-left-2",
		type: "custom",
		style: {
			stroke: "#94a3b8",
			strokeWidth: 2,
			zIndex: 2000,
		},
	},
	// Connections from right X₂ to its A nodes
	{
		id: "x2-right-to-a-right-1",
		source: "x2-right",
		target: "a-right-1",
		type: "custom",
		style: {
			stroke: "#94a3b8",
			strokeWidth: 2,
			zIndex: 2000,
		},
	},
	{
		id: "x2-right-to-a-right-2",
		source: "x2-right",
		target: "a-right-2",
		type: "custom",
		style: {
			stroke: "#94a3b8",
			strokeWidth: 2,
			zIndex: 2000,
		},
	},
];
