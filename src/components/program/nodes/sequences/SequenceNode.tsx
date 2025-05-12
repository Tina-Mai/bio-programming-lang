import React from "react";
import { NodeProps, Node as ReactFlowNode } from "@xyflow/react";
import { GeneratorNode, SequenceType } from "@/types";
import { Chip } from "@carbon/icons-react";
import Node from "@/components/program/nodes/Node";
import SequenceTypeDropdown from "./SequenceTypeDropdown";
import GeneratorDropdown from "../generators/GeneratorDropdown";

export interface SequenceNodeData {
	type: string;
	generator: GeneratorNode;
	[key: string]: unknown;
}

export type SequenceNodeType = ReactFlowNode<SequenceNodeData, "sequence">;

const SequenceNodeComponent: React.FC<NodeProps<SequenceNodeType>> = ({ data, id, selected }) => {
	return (
		<Node type="sequence" selected={selected} handlePosition="top" id={id}>
			<div className="vertical gap-px">
				<div className="p-3">
					<SequenceTypeDropdown
						sequenceType={data.type as SequenceType}
						setSequenceType={(sequenceType) => {
							data.type = sequenceType;
						}}
					/>
				</div>
				<div className="horizontal bg-system-slate/50 text-slate-500 px-3 py-2 items-center font-mono border-y border-slate-300 gap-2 capitalize">
					<Chip className="text-zinc-500/75" /> Generator
				</div>
				<div className="vertical bg-system-slate/25 justify-start items-start gap-1 p-3">
					<GeneratorDropdown
						generator={data.generator}
						setGenerator={(generator) => {
							data.generator = generator;
						}}
					/>
				</div>
			</div>
		</Node>
	);
};

export default SequenceNodeComponent;
