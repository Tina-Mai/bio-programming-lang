import { Node } from "@xyflow/react";

export const initialNodes: Node[] = [
	// ===== LEVEL 1: Top container box (highest level) =====
	{
		id: "container-top",
		type: "container",
		data: {
			label: "pTM, pLDDT",
			backgroundColor: "rgba(255, 250, 227, 0.5)",
		},
		position: { x: 0, y: 0 },
		style: {
			width: 600,
			height: 500,
			borderRadius: 10,
			zIndex: 0,
		},
	},

	// Top level node X₁ (child of container-top)
	{
		id: "x1",
		type: "standard",
		data: { label: "X₁" },
		position: { x: 250, y: 50 },
		parentId: "container-top",
		extent: "parent",
		draggable: false,
		zIndex: 1000,
	},

	// ===== LEVEL 2: Middle containers (children of container-top) =====
	{
		id: "container-middle-left",
		type: "container",
		data: {
			label: "Symmetry",
			backgroundColor: "rgba(235, 244, 255, 0.5)",
		},
		position: { x: 50, y: 150 },
		parentId: "container-top",
		extent: "parent",
		style: {
			width: 200,
			height: 300,
			borderRadius: 10,
			zIndex: 0,
		},
	},

	{
		id: "container-middle-right",
		type: "container",
		data: {
			label: "Symmetry",
			backgroundColor: "rgba(235, 244, 255, 0.5)",
		},
		position: { x: 300, y: 150 },
		parentId: "container-top",
		extent: "parent",
		style: {
			width: 250,
			height: 300,
			borderRadius: 10,
			zIndex: 0,
		},
	},

	// Left X₂ node (child of container-middle-left)
	{
		id: "x2-left",
		type: "standard",
		data: { label: "X₂" },
		position: { x: 100, y: 50 },
		parentId: "container-middle-left",
		extent: "parent",
		draggable: false,
		zIndex: 1000,
	},

	// Right X₂ node (child of container-middle-right)
	{
		id: "x2-right",
		type: "standard",
		data: { label: "X₂" },
		position: { x: 70, y: 50 },
		parentId: "container-middle-right",
		extent: "parent",
		draggable: false,
		zIndex: 1000,
	},

	// ===== LEVEL 3: A node containers (children of middle containers) =====
	// Left side A node containers
	{
		id: "container-a-left-1",
		type: "container",
		data: {
			label: "Length",
			backgroundColor: "rgba(226, 232, 240, 0.5)",
		},
		position: { x: 20, y: 150 },
		parentId: "container-middle-left",
		extent: "parent",
		style: {
			width: 80,
			height: 120,
			borderRadius: 10,
			zIndex: 0,
		},
	},
	{
		id: "container-a-left-2",
		type: "container",
		data: {
			label: "Length",
			backgroundColor: "rgba(226, 232, 240, 0.5)",
		},
		position: { x: 100, y: 150 },
		parentId: "container-middle-left",
		extent: "parent",
		style: {
			width: 80,
			height: 120,
			borderRadius: 10,
			zIndex: 0,
		},
	},

	{
		id: "container-a-right-1",
		type: "container",
		data: {
			label: "Length",
			backgroundColor: "rgba(226, 232, 240, 0.5)",
		},
		position: { x: 20, y: 150 },
		parentId: "container-middle-right",
		extent: "parent",
		style: {
			width: 80,
			height: 120,
			borderRadius: 10,
			zIndex: 0,
		},
	},
	{
		id: "container-a-right-2",
		type: "container",
		data: {
			label: "Length",
			backgroundColor: "rgba(226, 232, 240, 0.5)",
		},
		position: { x: 100, y: 150 },
		parentId: "container-middle-right",
		extent: "parent",
		style: {
			width: 80,
			height: 120,
			borderRadius: 10,
			zIndex: 0,
		},
	},

	// A nodes on left side (children of their respective containers)
	{
		id: "a-left-1",
		type: "standard",
		data: { label: "A" },
		position: { x: 10, y: 50 },
		parentId: "container-a-left-1",
		extent: "parent",
		draggable: false,
		zIndex: 1000,
	},
	{
		id: "a-left-2",
		type: "standard",
		data: { label: "A" },
		position: { x: 10, y: 50 },
		parentId: "container-a-left-2",
		extent: "parent",
		draggable: false,
		zIndex: 1000,
	},

	// A nodes on right side (children of their respective containers)
	{
		id: "a-right-1",
		type: "standard",
		data: { label: "A" },
		position: { x: 10, y: 50 },
		parentId: "container-a-right-1",
		extent: "parent",
		draggable: false,
		zIndex: 1000,
	},
	{
		id: "a-right-2",
		type: "standard",
		data: { label: "A" },
		position: { x: 10, y: 50 },
		parentId: "container-a-right-2",
		extent: "parent",
		draggable: false,
		zIndex: 1000,
	},
];
