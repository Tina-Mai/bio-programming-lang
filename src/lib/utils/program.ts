import { Program, Construct, Segment, ConstraintInstance, GeneratorInstance, Output, OutputMetadata } from "@/types";

// helper interfaces for Supabase data
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

export interface SupabaseSegment extends Omit<Segment, "generator"> {
	generators: GeneratorInstance | null;
}

export interface SupabaseConstraint extends Omit<ConstraintInstance, "segments"> {
	constraint_segment_links: { segment_id: string }[];
}

export interface SupabaseConstraintSegmentLink {
	constraint_id: string;
	segment_id: string;
}

export type SupabaseGenerator = GeneratorInstance;

export type SupabaseOutput = Output;

// parse output metadata
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

// transform constraint data with segment links
export function transformConstraintWithSegments(constraint: SupabaseConstraint): ConstraintInstance {
	const linkedSegmentIds = constraint.constraint_segment_links?.map((link) => link.segment_id) || [];

	const { id, program_id, key, label, created_at, updated_at } = constraint;

	return {
		id,
		program_id,
		key,
		label,
		created_at,
		updated_at,
		segments: linkedSegmentIds,
	};
}

// transform construct data with ordered segments
export function transformConstructWithSegments(construct: SupabaseConstruct, segmentOrder: SupabaseConstructSegmentOrder[]): Construct {
	const orderedSegments: Segment[] = segmentOrder
		.filter((order) => order.construct_id === construct.id)
		.sort((a, b) => a.order_idx - b.order_idx)
		.map((order) => {
			const supabaseSegment = order.segments;
			if (!supabaseSegment) return undefined;

			const { generators, ...segmentData } = supabaseSegment;

			if (!generators) {
				console.error(`Segment ${segmentData.id} has no generator, this should not happen.`);
				// Provide a fallback generator to avoid crashing the UI
				return {
					...segmentData,
					generator: {
						id: "error-no-generator",
						program_id: construct.program_id,
						key: "unknown",
						label: "Unknown",
						created_at: new Date().toISOString(),
					},
				};
			}

			const segment: Segment = {
				...segmentData,
				generator: generators,
			};
			return segment;
		})
		.filter((segment): segment is Segment => !!segment);

	return {
		...construct,
		segments: orderedSegments,
	};
}
