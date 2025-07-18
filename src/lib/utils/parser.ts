import { Construct, ConstraintInstance, GeneratorInstance } from "@/types";

type ConfigValue = string | number | boolean | string[] | number[];
type ProgramConfig = Record<string, ConfigValue>;

// hardcoded values - move these to a config file later
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

const DEFAULT_EVO_2_CONFIG = {
    prompt_seqs: ["+~GAGTTTTA"],
    evo2_type: "evo2_7b_phage_12k_gen",
    evo2_local_path: "/scratch/hielab/gbrixi/evo2/vortex_interleaved/7b_phage/iter_12000.pt",
    sequence_length: 5500,
    temperature: 0.9,
    batch_size: 10,
    prepend_prompt: true,
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
	config: ProgramConfig;
	targets: string[];
}

interface ParsedGenerator {
	id: string;
	key: string;
	config: ProgramConfig;
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
		let config: ProgramConfig = {};

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

	// Parse generators
	const parsedGenerators: ParsedGenerator[] = [];
	constructs.forEach((construct) => {
		(construct.segments || []).forEach((segment) => {
			if (segment.generator) {
				parsedGenerators.push({
					id: segment.generator.id,
					key: segment.generator.key || "uniform-mutation",
					config: getGeneratorConfig(segment.generator.key || "uniform-mutation", segment.length || 20),
					targets: [segment.id],
				});
			}
		});
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

function getGeneratorConfig(key: string, sequenceLength: number): ProgramConfig {
	if (key === "uniform-mutation") {
		return {
			...DEFAULT_UNIFORM_MUTATION_CONFIG,
			sequence_length: sequenceLength,
		};
	} else if (key === "evo-2") {
		return {
			...DEFAULT_EVO_2_CONFIG,
			sequence_length: sequenceLength,
		};
	}
	// Add more generator types here as needed
	return {
		sequence_length: sequenceLength,
	};
}
