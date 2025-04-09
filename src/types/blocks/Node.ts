// Import directly with relative path to avoid circular dependencies
import { ContainerNode } from "../../components/canvas/blocks/Container";
import { StandardNode } from "../../components/canvas/blocks/Node";

export const nodeTypes = {
	container: ContainerNode,
	group: ContainerNode,
	standard: StandardNode,
};
