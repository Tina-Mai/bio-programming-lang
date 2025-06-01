"use client";
import { useState } from "react";
import { Annotation, AriadneSelection, LinearViewer } from "@nitro-bio/sequence-viewers";

const LinearViewerComponent = () => {
	const [selection, setSelection] = useState<AriadneSelection | null>({
		start: 14,
		end: 20,
		direction: "forward",
	});
	const annotations: Annotation[] = [
		{
			text: "example",
			type: "CDS",
			direction: "forward",
			start: 10,
			end: 200,
			className: "mt-2 pl-1 dark:text-amber-800 dark:bg-amber-400 bg-amber-600 text-white",
		},
		{
			text: "example",
			type: "foo",
			direction: "reverse",
			start: 300,
			end: 20,
			className: "mt-2 pl-12 dark:text-rose-800 dark:bg-rose-400 bg-rose-600 text-white",
		},
	];
	const classNameBySequenceIdx = ({ sequenceIdx }: { sequenceIdx: number }) => {
		if (sequenceIdx === 0) {
			return "dark:text-brand-300 text-brand-600";
		} else {
			return "dark:text-blue-300 text-blue-600";
		}
	};

	return (
		<LinearViewer
			containerClassName="text-brand-400 "
			sequences={["ATGC".repeat(100), "ATGC".repeat(20)]}
			annotations={annotations}
			selection={selection}
			setSelection={setSelection}
			selectionClassName={() => "bg-blue-500 fill-blue-500 text-blue-500"}
			sequenceClassName={classNameBySequenceIdx}
		/>
	);
};

export default LinearViewerComponent;
