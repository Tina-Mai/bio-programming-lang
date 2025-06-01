"use client";
import React from "react";
import LinearViewer from "./LinearViewer";

const LinearViewerDemo = () => {
	// Sample DNA sequence
	const sequence = "ATGCGATCGTAGCTACGTACGATCGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC";

	// Sample annotations
	const annotations = [
		{
			text: "Promoter",
			type: "promoter",
			direction: "forward" as const,
			start: 5,
			end: 20,
		},
		{
			text: "CDS",
			type: "CDS",
			direction: "forward" as const,
			start: 25,
			end: 45,
		},
		{
			text: "Terminator",
			type: "terminator",
			direction: "reverse" as const,
			start: 50,
			end: 65,
		},
		{
			text: "Custom Gene",
			type: "gene",
			direction: "forward" as const,
			start: 30,
			end: 60,
			color: "bg-purple-500",
		},
	];

	return (
		<div className="p-8 bg-white dark:bg-gray-950 min-h-screen">
			<h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Linear Sequence Viewer Demo</h1>

			<div className="space-y-8">
				{/* Basic viewer */}
				<div>
					<h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Basic Example</h2>
					<LinearViewer sequence={sequence} annotations={annotations} />
				</div>

				{/* Custom height and ruler interval */}
				<div>
					<h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Custom Height and Ruler Interval</h2>
					<LinearViewer sequence={sequence} annotations={annotations} height={300} rulerInterval={5} />
				</div>

				{/* Longer sequence example */}
				<div>
					<h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Longer Sequence</h2>
					<LinearViewer
						sequence={
							"CATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCAT"
						}
						annotations={[
							{
								text: "Long Promoter Region",
								type: "promoter",
								direction: "forward" as const,
								start: 10,
								end: 50,
							},
							{
								text: "Gene A",
								type: "CDS",
								direction: "forward" as const,
								start: 60,
								end: 120,
							},
							{
								text: "Gene B",
								type: "CDS",
								direction: "reverse" as const,
								start: 130,
								end: 180,
							},
						]}
						rulerInterval={20}
					/>
				</div>
			</div>

			<div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
				<h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">How to use:</h3>
				<ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
					<li>Click and drag on the sequence to select a region</li>
					<li>Hover over the sequence to see the position and surrounding nucleotides</li>
					<li>Annotations show above (forward) or below (reverse) the sequence line</li>
					<li>Selected regions will display the full sequence text below</li>
				</ul>
			</div>
		</div>
	);
};

export default LinearViewerDemo;
