import { Node } from "@xyflow/react";

export const initialNodes: Node[] = [
	// ===== LEVEL 1: Top container box (highest level) =====
	{
		id: "container-top",
		type: "group",
		data: {
			label: "Constraints:\npTM, pLDDT",
			backgroundColor: "rgba(255, 250, 227, 0.5)",
		},
		position: { x: 0, y: 0 },
		style: {
			width: 600,
			height: 500,
			borderRadius: 15,
			zIndex: 0, // Lower zIndex to allow edges to appear above
		},
	},

	// Top level node X₁ (child of container-top)
	{
		id: "x1",
		data: { label: "X₁" },
		position: { x: 250, y: 50 },
		parentId: "container-top",
		extent: "parent",
		draggable: false,
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
			zIndex: 1,
		},
	},

	// ===== LEVEL 2: Middle containers (children of container-top) =====
	{
		id: "container-middle-left",
		type: "group",
		data: {
			label: "Constraints:\nSymmetry",
			backgroundColor: "rgba(235, 244, 255, 0.5)",
		},
		position: { x: 50, y: 150 },
		parentId: "container-top",
		extent: "parent",
		style: {
			width: 200,
			height: 300,
			borderRadius: 15,
			zIndex: 1,
		},
	},

	{
		id: "container-middle-right",
		type: "group",
		data: {
			label: "Constraints:\nSymmetry",
			backgroundColor: "rgba(235, 244, 255, 0.5)",
		},
		position: { x: 300, y: 150 },
		parentId: "container-top",
		extent: "parent",
		style: {
			width: 250,
			height: 300,
			borderRadius: 15,
			zIndex: 1,
		},
	},

	// Left X₂ node (child of container-middle-left)
	{
		id: "x2-left",
		data: { label: "X₂" },
		position: { x: 100, y: 50 },
		parentId: "container-middle-left",
		extent: "parent",
		draggable: false,
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
			zIndex: 2,
		},
	},

	// Right X₂ node (child of container-middle-right)
	{
		id: "x2-right",
		data: { label: "X₂" },
		position: { x: 70, y: 50 },
		parentId: "container-middle-right",
		extent: "parent",
		draggable: false,
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
			zIndex: 2,
		},
	},

	// ===== LEVEL 3: A node containers (children of middle containers) =====
	// Left side A node containers
	{
		id: "container-a-left-1",
		type: "group",
		data: {
			label: "Constraints:\nLength",
			backgroundColor: "rgba(226, 232, 240, 0.5)",
		},
		position: { x: 20, y: 150 },
		parentId: "container-middle-left",
		extent: "parent",
		style: {
			width: 80,
			height: 100,
			borderRadius: 10,
			zIndex: 3,
			paddingTop: 20,
		},
	},
	{
		id: "container-a-left-2",
		type: "group",
		data: {
			label: "Constraints:\nLength",
			backgroundColor: "rgba(226, 232, 240, 0.5)",
		},
		position: { x: 100, y: 150 },
		parentId: "container-middle-left",
		extent: "parent",
		style: {
			width: 80,
			height: 100,
			borderRadius: 10,
			zIndex: 3,
			paddingTop: 20,
		},
	},

	// Right side A node containers
	{
		id: "container-a-right-1",
		type: "group",
		data: {
			label: "Constraints:\nLength",
			backgroundColor: "rgba(226, 232, 240, 0.5)",
		},
		position: { x: 20, y: 150 },
		parentId: "container-middle-right",
		extent: "parent",
		style: {
			width: 80,
			height: 100,
			borderRadius: 10,
			zIndex: 3,
			paddingTop: 20,
		},
	},
	{
		id: "container-a-right-2",
		type: "group",
		data: {
			label: "Constraints:\nLength",
			backgroundColor: "rgba(226, 232, 240, 0.5)",
		},
		position: { x: 100, y: 150 },
		parentId: "container-middle-right",
		extent: "parent",
		style: {
			width: 80,
			height: 100,
			borderRadius: 10,
			zIndex: 3,
			paddingTop: 20,
		},
	},

	// A nodes on left side (children of their respective containers)
	{
		id: "a-left-1",
		data: { label: "A" },
		position: { x: 10, y: 30 },
		parentId: "container-a-left-1",
		extent: "parent",
		draggable: false,
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: 10,
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
			zIndex: 4,
		},
	},
	{
		id: "a-left-2",
		data: { label: "A" },
		position: { x: 10, y: 30 },
		parentId: "container-a-left-2",
		extent: "parent",
		draggable: false,
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: 10,
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
			zIndex: 4,
		},
	},

	// A nodes on right side (children of their respective containers)
	{
		id: "a-right-1",
		data: { label: "A" },
		position: { x: 10, y: 30 },
		parentId: "container-a-right-1",
		extent: "parent",
		draggable: false,
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: 10,
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
			zIndex: 4,
		},
	},
	{
		id: "a-right-2",
		data: { label: "A" },
		position: { x: 10, y: 30 },
		parentId: "container-a-right-2",
		extent: "parent",
		draggable: false,
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: 10,
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
			zIndex: 4,
		},
	},
];
