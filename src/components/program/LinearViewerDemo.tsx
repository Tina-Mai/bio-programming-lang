"use client";
import React from "react";
import LinearViewer from "./LinearViewer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";

const LinearViewerDemo = () => {
	// Sample DNA sequence
	const sequence = "ATGCGATCGTAGCTACGTACGATCGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC";

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

	const BasicViewer = () => {
		return (
			<div>
				<h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Basic Example</h2>
				<LinearViewer sequence={sequence} annotations={annotations} />
			</div>
		);
	};

	const CustomViewer = () => {
		return (
			<div>
				<h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Custom Height and Ruler Interval</h2>
				<LinearViewer sequence={sequence} annotations={annotations} height={300} />
			</div>
		);
	};

	const LongViewer = () => {
		return (
			<div>
				<h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Longer Sequence</h2>
				<LinearViewer
					sequence={
						"CATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCAT"
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
				/>
			</div>
		);
	};

	return (
		<div className="vertical w-full h-full px-5 pt-16 justify-start overflow-y-auto debug">
			<Tabs defaultValue="basic">
				<TabsList className="mb-4">
					<TabsTrigger value="basic">Basic Viewer</TabsTrigger>
					<TabsTrigger value="custom">Custom Viewer</TabsTrigger>
					<TabsTrigger value="long">Long Viewer</TabsTrigger>
				</TabsList>

				<TabsContent value="basic">
					<BasicViewer />
				</TabsContent>
				<TabsContent value="custom">
					<CustomViewer />
				</TabsContent>
				<TabsContent value="long">
					<LongViewer />
				</TabsContent>
			</Tabs>

			<div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded">
				<h3 className="font-semibold mb-1 text-gray-800 dark:text-gray-200">How to use:</h3>
				<ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
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
