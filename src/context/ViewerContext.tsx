"use client";
import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { Segment, ConstraintInstance, GeneratorInstance, Constraint, Generator, constraintOptions, generatorOptions } from "@/types";

interface ViewerContextType {
	// Hover states
	hoveredSegment: Segment | null;
	setHoveredSegment: (segment: Segment | null) => void;
	hoveredConstraintKey: string | null;
	setHoveredConstraintKey: (key: string | null) => void;
	hoveredGeneratorKey: string | null;
	setHoveredGeneratorKey: (key: string | null) => void;

	// Click states
	clickedSegment: Segment | null;
	setClickedSegment: (segment: Segment | null) => void;

	// Drag states
	draggedSegment: Segment | null;
	setDraggedSegment: (segment: Segment | null) => void;
	draggedSegmentIndex: number | null;
	setDraggedSegmentIndex: (index: number | null) => void;
	isDragging: boolean;
	setIsDragging: (isDragging: boolean) => void;

	// Resize states
	resizingSegment: Segment | null;
	setResizingSegment: (segment: Segment | null) => void;
	isResizing: boolean;
	setIsResizing: (isResizing: boolean) => void;

	// Computed states
	highlightedSegmentIds: Set<string>;
	highlightedConstraintKeys: Set<string>;
	highlightedGeneratorKeys: Set<string>;
	hasAnyHover: boolean;
	isAnySegmentDragging: boolean;
	isAnySegmentResizing: boolean;

	// Grouped data
	constraintGroups: Map<
		string,
		{
			constraint: Constraint;
			segments: string[];
			instance: ConstraintInstance;
		}
	>;
	generatorGroups: Map<
		string,
		{
			generator: Generator;
			segments: string[];
			instance: GeneratorInstance;
		}
	>;

	// Helper functions
	isSegmentHighlighted: (segmentId: string) => boolean;
	isConstraintHighlighted: (constraintKey: string) => boolean;
	isGeneratorHighlighted: (generatorKey: string) => boolean;
	shouldDimElement: (type: "segment" | "constraint" | "generator", id: string) => boolean;
}

const ViewerContext = createContext<ViewerContextType | undefined>(undefined);

interface ViewerProviderProps {
	children: ReactNode;
	constraints: ConstraintInstance[];
	generators: GeneratorInstance[];
}

export const ViewerProvider: React.FC<ViewerProviderProps> = ({ children, constraints, generators }) => {
	// Hover states
	const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null);
	const [hoveredConstraintKey, setHoveredConstraintKey] = useState<string | null>(null);
	const [hoveredGeneratorKey, setHoveredGeneratorKey] = useState<string | null>(null);

	// Click states
	const [clickedSegment, setClickedSegment] = useState<Segment | null>(null);

	// Drag states
	const [draggedSegment, setDraggedSegment] = useState<Segment | null>(null);
	const [draggedSegmentIndex, setDraggedSegmentIndex] = useState<number | null>(null);
	const [isDragging, setIsDragging] = useState<boolean>(false);

	// Resize states
	const [resizingSegment, setResizingSegment] = useState<Segment | null>(null);
	const [isResizing, setIsResizing] = useState<boolean>(false);

	// Group constraints and generators by key to avoid duplicates
	const constraintGroups = useMemo(() => {
		const groups = new Map<
			string,
			{
				constraint: Constraint;
				segments: string[];
				instance: ConstraintInstance;
			}
		>();

		constraints.forEach((constraint) => {
			if (!constraint.key) return;

			const existing = groups.get(constraint.key);
			if (existing) {
				constraint.segments.forEach((segId) => {
					if (!existing.segments.includes(segId)) {
						existing.segments.push(segId);
					}
				});
			} else {
				const constraintDef = constraintOptions.find((c: Constraint) => c.key === constraint.key);
				if (constraintDef) {
					groups.set(constraint.key, {
						constraint: constraintDef,
						segments: [...constraint.segments],
						instance: constraint,
					});
				}
			}
		});

		return groups;
	}, [constraints]);

	const generatorGroups = useMemo(() => {
		const groups = new Map<
			string,
			{
				generator: Generator;
				segments: string[];
				instance: GeneratorInstance;
			}
		>();

		generators.forEach((generator) => {
			if (!generator.key) return;

			const existing = groups.get(generator.key);
			if (existing) {
				generator.segments.forEach((segId) => {
					if (!existing.segments.includes(segId)) {
						existing.segments.push(segId);
					}
				});
			} else {
				const generatorDef = generatorOptions.find((g: Generator) => g.key === generator.key);
				if (generatorDef) {
					groups.set(generator.key, {
						generator: generatorDef,
						segments: [...generator.segments],
						instance: generator,
					});
				}
			}
		});

		return groups;
	}, [generators]);

	// Calculate highlighted elements based on hover states
	const { highlightedSegmentIds, highlightedConstraintKeys, highlightedGeneratorKeys } = useMemo(() => {
		const segmentIds = new Set<string>();
		const constraintKeys = new Set<string>();
		const generatorKeys = new Set<string>();

		// If a constraint is hovered, highlight its segments
		if (hoveredConstraintKey) {
			constraintKeys.add(hoveredConstraintKey);
			constraints.forEach((constraint) => {
				if (constraint.key === hoveredConstraintKey) {
					constraint.segments.forEach((segId) => segmentIds.add(segId));
				}
			});
		}

		// If a generator is hovered, highlight its segments
		if (hoveredGeneratorKey) {
			generatorKeys.add(hoveredGeneratorKey);
			generators.forEach((generator) => {
				if (generator.key === hoveredGeneratorKey) {
					generator.segments.forEach((segId) => segmentIds.add(segId));
				}
			});
		}

		// If a segment is hovered, highlight its constraints and generators
		if (hoveredSegment) {
			segmentIds.add(hoveredSegment.id);

			// Find all constraints that include this segment
			constraints.forEach((constraint) => {
				if (constraint.key && constraint.segments.includes(hoveredSegment.id)) {
					constraintKeys.add(constraint.key);
				}
			});

			// Find all generators that include this segment
			generators.forEach((generator) => {
				if (generator.key && generator.segments.includes(hoveredSegment.id)) {
					generatorKeys.add(generator.key);
				}
			});
		}

		return { highlightedSegmentIds: segmentIds, highlightedConstraintKeys: constraintKeys, highlightedGeneratorKeys: generatorKeys };
	}, [hoveredSegment, hoveredConstraintKey, hoveredGeneratorKey, constraints, generators]);

	const hasAnyHover = hoveredSegment !== null || hoveredConstraintKey !== null || hoveredGeneratorKey !== null;
	const isAnySegmentDragging = isDragging;
	const isAnySegmentResizing = isResizing;

	const isSegmentHighlighted = (segmentId: string) => highlightedSegmentIds.has(segmentId);
	const isConstraintHighlighted = (constraintKey: string) => highlightedConstraintKeys.has(constraintKey);
	const isGeneratorHighlighted = (generatorKey: string) => highlightedGeneratorKeys.has(generatorKey);

	const shouldDimElement = (type: "segment" | "constraint" | "generator", id: string) => {
		if (!hasAnyHover) return false;

		switch (type) {
			case "segment":
				return !isSegmentHighlighted(id);
			case "constraint":
				return !isConstraintHighlighted(id);
			case "generator":
				return !isGeneratorHighlighted(id);
			default:
				return false;
		}
	};

	const value: ViewerContextType = {
		// Hover states
		hoveredSegment,
		setHoveredSegment,
		hoveredConstraintKey,
		setHoveredConstraintKey,
		hoveredGeneratorKey,
		setHoveredGeneratorKey,

		// Click states
		clickedSegment,
		setClickedSegment,

		// Drag states
		draggedSegment,
		setDraggedSegment,
		draggedSegmentIndex,
		setDraggedSegmentIndex,
		isDragging,
		setIsDragging,

		// Resize states
		resizingSegment,
		setResizingSegment,
		isResizing,
		setIsResizing,

		// Computed states
		highlightedSegmentIds,
		highlightedConstraintKeys,
		highlightedGeneratorKeys,
		hasAnyHover,
		isAnySegmentDragging,
		isAnySegmentResizing,

		// Grouped data
		constraintGroups,
		generatorGroups,

		// Helper functions
		isSegmentHighlighted,
		isConstraintHighlighted,
		isGeneratorHighlighted,
		shouldDimElement,
	};

	return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
};

export const useViewer = () => {
	const context = useContext(ViewerContext);
	if (!context) {
		throw new Error("useViewer must be used within a ViewerProvider");
	}
	return context;
};
