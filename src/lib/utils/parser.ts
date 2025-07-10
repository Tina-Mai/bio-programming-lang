import { Construct, ConstraintInstance, GeneratorInstance } from "@/types";

// Hardcoded values - move these to a config file later
const DEFAULT_VERSION = "1.0";
const DEFAULT_OPTIMIZATION = {
	method: "mcmc",
	steps: 100,
	track_step_size: 1,
	temperature: 2.0,
};

const DEFAULT_GC_CONTENT_CONFIG = {
	min_gc: 80,
	max_gc: 90,
};

const DEFAULT_COMPLEXITY_CONFIG = {
	min_complexity: 0.0,
	max_complexity: 1.0,
};

const DEFAULT_UNIFORM_MUTATION_CONFIG = {
	mutation_rate: 0.01,
	batch_size: 1,
};

interface ParsedConstruct {
	id: string;
	type: "dna";
	segments: Array<{
		id: string;
	}>;
}

interface ParsedConstraint {
	id: string;
	key: string;
	config: Record<string, number>;
	targets: string[];
}

interface ParsedGenerator {
	id: string;
	key: string;
	config: Record<string, number>;
	targets: string[];
}

interface ParsedProgram {
	name: string;
	description: string;
	version: string;
	optimization: typeof DEFAULT_OPTIMIZATION;
	constructs: ParsedConstruct[];
	constraints: ParsedConstraint[];
	generators: ParsedGenerator[];
}

export function parseProgram(constructs: Construct[], constraints: ConstraintInstance[], generators: GeneratorInstance[], programName: string): ParsedProgram {
	// Parse constructs
	const parsedConstructs: ParsedConstruct[] = constructs.map((construct) => ({
		id: construct.id,
		type: "dna",
		segments: (construct.segments || []).map((segment) => ({
			id: segment.id,
		})),
	}));

	// Parse constraints
	const parsedConstraints: ParsedConstraint[] = constraints.map((constraint) => {
		let config: Record<string, number> = {};

		// Add config based on constraint key
		if (constraint.key === "gc-content") {
			config = DEFAULT_GC_CONTENT_CONFIG;
		} else if (constraint.key === "complexity") {
			config = DEFAULT_COMPLEXITY_CONFIG;
		}
		// Add more constraint types here as needed

		return {
			id: constraint.id,
			key: constraint.key || "",
			config,
			targets: constraint.segments || [],
		};
	});

	// Parse generators - need to split if multiple segments
	const parsedGenerators: ParsedGenerator[] = [];

	generators.forEach((generator) => {
		const segmentIds = generator.segments || [];

		if (segmentIds.length === 0) {
			// No segments, still include the generator
			parsedGenerators.push({
				id: generator.id,
				key: generator.key || "",
				config: getGeneratorConfig(generator.key || "", 0),
				targets: [],
			});
		} else {
			// Create separate generator instance for each segment
			segmentIds.forEach((segmentId: string, index: number) => {
				// Find the segment to get its length
				let segmentLength = 20; // default
				for (const construct of constructs) {
					const segment = construct.segments?.find((s) => s.id === segmentId);
					if (segment) {
						segmentLength = segment.length || 20;
						break;
					}
				}

				parsedGenerators.push({
					id: index === 0 ? generator.id : `${generator.id}_${index}`,
					key: generator.key || "",
					config: getGeneratorConfig(generator.key || "", segmentLength),
					targets: [segmentId],
				});
			});
		}
	});

	return {
		name: programName,
		description: "",
		version: DEFAULT_VERSION,
		optimization: DEFAULT_OPTIMIZATION,
		constructs: parsedConstructs,
		constraints: parsedConstraints,
		generators: parsedGenerators,
	};
}

function getGeneratorConfig(key: string, sequenceLength: number): Record<string, number> {
	if (key === "uniform-mutation") {
		return {
			...DEFAULT_UNIFORM_MUTATION_CONFIG,
			sequence_length: sequenceLength,
		};
	}
	// Add more generator types here as needed
	return {
		sequence_length: sequenceLength,
	};
}
