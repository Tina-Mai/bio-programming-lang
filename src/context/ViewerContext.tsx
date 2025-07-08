"use client";
import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { Segment, ConstraintInstance, GeneratorInstance } from "@/types";

interface ViewerContextType {
	// Hover states
	hoveredSegment: Segment | null;
	setHoveredSegment: (segment: Segment | null) => void;
	hoveredConstraintKey: string | null;
	setHoveredConstraintKey: (key: string | null) => void;
	hoveredGeneratorKey: string | null;
	setHoveredGeneratorKey: (key: string | null) => void;

	// Computed states
	highlightedSegmentIds: Set<string>;
	highlightedConstraintKeys: Set<string>;
	highlightedGeneratorKeys: Set<string>;
	hasAnyHover: boolean;

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
	const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null);
	const [hoveredConstraintKey, setHoveredConstraintKey] = useState<string | null>(null);
	const [hoveredGeneratorKey, setHoveredGeneratorKey] = useState<string | null>(null);

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
		hoveredSegment,
		setHoveredSegment,
		hoveredConstraintKey,
		setHoveredConstraintKey,
		hoveredGeneratorKey,
		setHoveredGeneratorKey,
		highlightedSegmentIds,
		highlightedConstraintKeys,
		highlightedGeneratorKeys,
		hasAnyHover,
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
