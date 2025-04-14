// Remove old imports if they exist
// import { ContainerNode } from "@/components/canvas/blocks/Container";
// import { StandardNode } from "@/components/canvas/blocks/Node";

// Import ContainerNode for the group content
import { ContainerNode } from "@/components/canvas/blocks/Container";
// Import StandardNode from its actual location
import { StandardNode } from "@/components/canvas/blocks/Node";
// Remove import for the custom GroupNode
// import GroupNode from "@/components/nodes/GroupNode";

export const nodeTypes = {
	// Map 'group' back to ContainerNode
	group: ContainerNode,
	standard: StandardNode,
};
