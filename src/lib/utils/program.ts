import { Program, Construct, Segment, ConstraintInstance, GeneratorInstance, Output, OutputMetadata } from "@/types";

// Helper interfaces for Supabase data
export interface SupabaseProgram extends Program {
	constructs?: SupabaseConstruct[];
}

export interface SupabaseConstruct extends Construct {
	output?: SupabaseOutput;
	segmentOrder?: SupabaseConstructSegmentOrder[];
}

export interface SupabaseConstructSegmentOrder {
	construct_id: string;
	segment_id: string;
	order_idx: number;
	segments?: SupabaseSegment;
}

export type SupabaseSegment = Segment;

export interface SupabaseConstraint extends ConstraintInstance {
	segmentLinks?: SupabaseConstraintSegmentLink[];
}

export interface SupabaseConstraintSegmentLink {
	constraint_id: string;
	segment_id: string;
}

export interface SupabaseGenerator extends GeneratorInstance {
	segmentLinks?: SupabaseGeneratorSegmentLink[];
}

export interface SupabaseGeneratorSegmentLink {
	generator_id: string;
	segment_id: string;
}

export type SupabaseOutput = Output;

// Helper function to parse output metadata
export function parseOutputMetadata(rawMetadata: Record<string, unknown> | undefined | null): OutputMetadata {
	if (!rawMetadata) return {};

	const { sequence, num_step, energy_score, ...other } = rawMetadata;

	return {
		sequence: typeof sequence === "string" ? sequence : undefined,
		num_step: typeof num_step === "number" ? num_step : undefined,
		energy_score: typeof energy_score === "number" ? energy_score : undefined,
		...other,
	};
}

// Transform constraint data with segment links
export function transformConstraintWithSegments(constraint: SupabaseConstraint, segmentLinks: SupabaseConstraintSegmentLink[]): ConstraintInstance {
	const linkedSegmentIds = segmentLinks.filter((link) => link.constraint_id === constraint.id).map((link) => link.segment_id);

	return {
		...constraint,
		segments: linkedSegmentIds,
	};
}

// Transform generator data with segment links
export function transformGeneratorWithSegments(generator: SupabaseGenerator, segmentLinks: SupabaseGeneratorSegmentLink[]): GeneratorInstance {
	const linkedSegmentIds = segmentLinks.filter((link) => link.generator_id === generator.id).map((link) => link.segment_id);

	return {
		...generator,
		segments: linkedSegmentIds,
	};
}

// Transform construct data with ordered segments
export function transformConstructWithSegments(construct: SupabaseConstruct, segmentOrder: SupabaseConstructSegmentOrder[]): Construct {
	const orderedSegments = segmentOrder
		.filter((order) => order.construct_id === construct.id)
		.sort((a, b) => a.order_idx - b.order_idx)
		.map((order) => order.segments)
		.filter((segment): segment is SupabaseSegment => segment !== undefined);

	return {
		...construct,
		segments: orderedSegments,
	};
}
