"use client";
import React from "react";
import LinearViewer from "./LinearViewer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";

const LinearViewerDemo = () => {
	// Sample DNA sequence
	const sequence = "ATGCGATCGTAGCTACGTACGATCGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC";
	const longSequence =
		"CATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCAT";

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
		},
	];

	const annotations2 = [
		{
			text: "Promoter",
			type: "promoter",
			direction: "forward" as const,
			start: 0,
			end: 10,
		},
		{
			text: "CDS",
			type: "CDS",
			direction: "forward" as const,
			start: 11,
			end: 40,
		},
		{
			text: "Custom Gene",
			type: "gene",
			direction: "forward" as const,
			start: 41,
			end: 65,
		},
		{
			text: "CDS",
			type: "CDS",
			direction: "forward" as const,
			start: 66,
			end: 80,
		},
	];

	const Example1 = () => {
		return (
			<div>
				<h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
					Example 1 <span className="text-slate-400 font-normal">{sequence.length} bp</span>
				</h2>
				<LinearViewer sequence={sequence} annotations={annotations} />
			</div>
		);
	};

	const Example2 = () => {
		return (
			<div>
				<h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
					Example 2 <span className="text-slate-400 font-normal">{sequence.length} bp</span>
				</h2>
				<LinearViewer sequence={sequence} annotations={annotations2} />
			</div>
		);
	};

	const LongExample = () => {
		return (
			<div>
				<h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
					Longer Sequence <span className="text-slate-400 font-normal">{longSequence.length} bp</span>
				</h2>
				<LinearViewer
					sequence={longSequence}
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
		<div className="vertical w-full h-full px-5 pt-16 justify-start">
			<Tabs defaultValue="example1">
				<TabsList className="mb-4">
					<TabsTrigger value="example1">Example 1</TabsTrigger>
					<TabsTrigger value="example2">Example 2</TabsTrigger>
					<TabsTrigger value="long">Long Example</TabsTrigger>
				</TabsList>

				<TabsContent value="example1">
					<Example1 />
				</TabsContent>
				<TabsContent value="example2">
					<Example2 />
				</TabsContent>
				<TabsContent value="long">
					<LongExample />
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
